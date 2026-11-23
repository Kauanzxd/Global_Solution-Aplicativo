import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { chiadoDeAbertura, decodificarAudio, tocarComoRadio } from './somDeRadio';

// Voz do rádio: lê em voz alta as mensagens dos drones (expo-speech, a voz do próprio
// celular ou navegador). As mensagens entram numa fila e são lidas uma de cada vez.
// Enquanto a voz conta (ou ainda vai contar) um EVENTO de um drone (pane, GPS, conversa com
// outro drone...), "eventoNaVoz(nome)" avisa a tela, que segura esse drone até a fala.

const IDIOMA = 'pt-BR';
const RITMO = 1.4; // bem mais rápido que o normal, como a fala de rádio (e para não atrasar em relação ao mapa)

// Cada drone fala com uma voz diferente (quando o aparelho tem mais de uma em português)
// e um tom levemente diferente. Tons muito altos ou baixos deixam a voz robótica: por isso
// a variação é pequena.
const TONS = [1.0, 0.92, 1.08, 0.96, 1.04];

// Vozes mais naturais primeiro: as "neurais" do Edge ("Natural", "Online"), as do Google
// no Chrome e as "Enhanced"/"Premium" do iPhone soam bem menos robóticas que as padrão
const NATURAL = /natural|online|neural|google|enhanced|premium/i;
function naturalidade(voz) {
  return (NATURAL.test(voz.name || '') ? 2 : 0) + (voz.quality === 'Enhanced' ? 1 : 0);
}

// Voz da nuvem (Azure, pela rota /api/voz): vozes neurais, bem mais humanas. Só na versão
// web (é a que vai para a apresentação). Se a nuvem demorar ou falhar, usa a voz do aparelho.
const USAR_NUVEM = Platform.OS === 'web';
const ESPERA_MAXIMA_NUVEM_MS = 1500; // mais que isso, fala com a voz do aparelho
const PAUSA_APOS_FALHA_MS = 30000; // depois de uma falha, 30 s sem tentar a nuvem
// A Central fala com a primeira; cada drone com uma das outras, em rodízio
const VOZES_NUVEM = ['pt-BR-FranciscaNeural', 'pt-BR-AntonioNeural', 'pt-BR-ThalitaNeural', 'pt-BR-DonatoNeural', 'pt-BR-BrendaNeural', 'pt-BR-FabioNeural', 'pt-BR-GiovannaNeural'];
function vozDaNuvem(nome) {
  const numero = numeroDoDrone(nome);
  return numero === 0 ? VOZES_NUVEM[0] : VOZES_NUVEM[1 + ((numero - 1) % (VOZES_NUVEM.length - 1))];
}

// Promessa que desiste depois de "ms" milissegundos (responde null)
function comLimite(promessa, ms) {
  return Promise.race([promessa, new Promise((responder) => setTimeout(() => responder(null), ms))]);
}

// Número de um nome de rádio: "SADEC-12" → 12; a Central (sem número) → 0
function numeroDoDrone(nome) {
  const achado = /(\d+)/.exec(nome);
  return achado ? Number(achado[1]) : 0;
}

// Texto do rádio → texto falado, curto, como um operador falaria: os detalhes entre
// parênteses (bateria, motivo da escolha) ficam só na tela; siglas e unidades por extenso
export function textoParaFala(texto) {
  return texto
    .replace(/\s*\([^)]*\)/g, '') // tira os detalhes entre parênteses
    .replace(/Checando as zonas de pouso mais próximas/g, 'Checando zonas')
    .replace(/Conversa pelo rádio\.{3}\s*/g, '') // a conversa já está acontecendo no rádio
    .replace(/SADEC-0*(\d+)/g, 'Sadec $1') // "SADEC-01" → "Sadec 1"
    .replace(/\bZP-/g, 'zona de pouso ') // "ZP-Carmo" → "zona de pouso Carmo"
    .replace(/(\d)\.(\d)/g, '$1,$2') // decimal com vírgula: "2.05" → "2,05"
    .replace(/\bkm (\d+(?:,\d+)?)/g, 'quilômetro $1') // "no km 2,05" → "no quilômetro 2,05"
    .replace(/(\d+(?:,\d+)?) ?km\b/g, '$1 quilômetros') // "4,2 km" → "4,2 quilômetros"
    .replace(/(\d+) ?m\b/g, '$1 metros') // "120 m" → "120 metros"
    .replace(/\.{3}/g, '.') // reticências viram uma pausa simples
    .replace(/\s+/g, ' ')
    .trim();
}

// Como no rádio de aviação: quem fala, para quem, a mensagem e "câmbio" nos eventos.
// A Central fala para todos ("a todos os drones").
// "parte" (relatos de várias linhas, uma transmissão só): 'inicio', 'meio' ou 'fim'.
// Só o início tem a abertura; só o fim tem o "câmbio".
function fraseDeRadio({ nome, texto, evento, parte }) {
  const abertura = nome.startsWith('Central') ? 'Central' : nome; // só o nome de rádio, para ser curto
  const comAbertura = !parte || parte === 'inicio';
  const comCambio = evento && (!parte || parte === 'fim');
  // Antes do "câmbio", a frase precisa terminar com ponto (senão a voz emenda as duas)
  const frase = comCambio ? `${texto.replace(/[.!]*$/, '.')} Câmbio.` : texto;
  return `${comAbertura ? `${abertura}: ` : ''}${frase}`;
}

// ---------- Para a voz não ficar para trás ----------
// Uma voz só conta o que 6 drones fazem: se tudo fosse falado por inteiro e em ordem, a fila
// cresceria e a voz contaria coisas de 20 s atrás. Por isso:
//   1. eventos (acordo, desvio, pane...) passam na frente da rotina;
//   2. rotina que esperou demais na fila já ficou velha: aparece só no texto;
//   3. rotina igual de vários drones no mesmo instante vira uma fala só;
//   4. na voz, a rotina é dita de forma curta (o texto completo fica na tela).
const VALIDADE_ROTINA_MS = 2500;

// Versões curtas, só para a voz
const RESUMOS = [
  [/^Na .+, aguardando a vez de decolar$/, 'aguardando na filial'],
  [/^Decolando.*$/, 'decolando'],
  [/^Voando.*$/, 'em rota'],
  [/^Sobre o destino: descendo na vertical$/, 'descendo no destino'],
  [/^Pousou no ponto de entrega: entregando a carga.*$/, 'entregando'],
  [/^Entrega feita! Decolando para .*$/, 'entrega feita, voltando'],
  [/^Voltando para a filial.*$/, 'voltando'],
  [/^Sobre a (Filial .+): descendo na vertical$/, 'descendo na $1'],
  [/^Missão concluída: pousou na (Filial .+)!$/, 'missão concluída na $1'],
  [/^Desvio concluído\..*$/, 'desvio concluído'],
  [/^Desviando pela direita do (SADEC-\d+).*$/, 'desviando pela direita do $1'],
  // Acordos (já sem os detalhes entre parênteses): quem desvia, em poucas palavras
  [/^Drone (SADEC-\d+) a \d+ m\. Conversa pelo rádio\.{3} Acordo: nós desviamos pela direita.*$/, '$1 no rádio, eu desvio pela direita'],
  [/^Drone (SADEC-\d+) a \d+ m\. Conversa pelo rádio\.{3} Acordo: .*nós seguimos reto.*$/, '$1 no rádio, ele desvia e eu sigo reto'],
  [/^Entendido, SADEC-\d+: nós desviamos.*$/, 'entendido, eu desvio pela direita'],
  [/^Entendido, SADEC-\d+: você desvia.*$/, 'entendido, eu sigo reto'],
  [/^(SADEC-\d+) está (abaixo|acima).*fora da bolha de altura.*$/, '$1 em outra altura, sem risco'],
];
function resumirParaFala(texto) {
  const semDetalhes = texto.replace(/\s*\([^)]*\)/g, ''); // bateria, critério... ficam na tela
  const regra = RESUMOS.find(([padrao]) => padrao.test(semDetalhes));
  return regra ? semDetalhes.replace(regra[0], regra[1]) : texto;
}

// Os dois drones de um cruzamento anunciaram o acordo no mesmo instante? Quem fala por
// segundo só confirma ("entendido"), como num rádio de verdade.
function respostaAoAcordo(mensagem, fila) {
  const outro = /^Drone (SADEC-\d+) a \d+ m\. Conversa pelo rádio/.exec(mensagem.texto);
  if (!outro) return null;
  const jaFalou = fila.some((item) => item.nome === outro[1] && item.falado && item.mensagem.texto.includes(`Drone ${mensagem.nome} `));
  if (!jaFalou) return null;
  const semDetalhes = mensagem.texto.replace(/\s*\([^)]*\)/g, ''); // "nós (retorno, 51%) desviamos" → "nós desviamos"
  return /Acordo: nós desviamos/.test(semDetalhes) ? 'entendido, eu desvio pela direita' : 'entendido, eu sigo reto';
}

// "SADEC-11", "SADEC-14", "SADEC-16" → "SADEC-11, SADEC-14 e SADEC-16"
function juntarNomes(nomes) {
  return nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

// Quanto tempo uma fala deve levar (para destravar a fila se a voz não avisar que acabou)
// (uns 70 ms por letra no ritmo normal; mais rápido, proporcionalmente menos)
function duracaoEstimadaMs(texto) {
  return 1000 + (texto.length * 70) / RITMO;
}

// "aoMostrar(mensagem)": a tela recebe cada mensagem do rádio NA HORA em que a voz chega
// nela (assim o texto e a voz andam juntos, na mesma ordem)
export default function useVozDoRadio({ aoMostrar }) {
  const aoMostrarRef = useRef(aoMostrar);
  aoMostrarRef.current = aoMostrar;

  const [ligada, setLigada] = useState(true);
  const ligadaRef = useRef(ligada);
  ligadaRef.current = ligada;

  const fila = useRef([]); // [{ mensagem, nome, falado (null = só texto), audio, evento, parte }]
  const atual = useRef(null); // a fala que está tocando agora
  const seguranca = useRef(null); // timer que destrava a fila se o onDone não vier
  const contador = useRef(0); // número de cada fala (para saber qual terminou)
  const vozes = useRef([]); // as vozes em português do aparelho
  const audiosProntos = useRef(new Map()); // memória: "voz|texto" → áudio já baixado da nuvem
  const nuvemPausadaAte = useRef(0); // depois de uma falha, a nuvem descansa um pouco
  const cortarAudio = useRef(null); // corta o áudio da nuvem que está tocando

  // Baixa (ou pega da memória) o áudio de uma fala na voz da nuvem; null se não der
  const buscarAudio = (texto, voz) => {
    if (!USAR_NUVEM || Date.now() < nuvemPausadaAte.current) return null;
    const chave = `${voz}|${texto}`;
    if (!audiosProntos.current.has(chave)) {
      const pedido = fetch('/api/voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, voz }),
      })
        .then((resposta) => (resposta.ok ? resposta.arrayBuffer() : Promise.reject(new Error(String(resposta.status)))))
        .then(decodificarAudio)
        .catch(() => {
          audiosProntos.current.delete(chave); // não guarda a falha na memória
          nuvemPausadaAte.current = Date.now() + PAUSA_APOS_FALHA_MS;
          return null;
        });
      audiosProntos.current.set(chave, pedido);
    }
    return audiosProntos.current.get(chave);
  };

  // Busca as vozes do aparelho uma vez (no navegador elas podem demorar a carregar)
  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then((lista) => {
        vozes.current = lista
          .filter((voz) => voz.language && voz.language.toLowerCase().startsWith('pt-br'))
          .sort((a, b) => naturalidade(b) - naturalidade(a));
      })
      .catch(() => {});
  }, []);

  // A voz e o tom de cada drone. A Central usa a voz mais natural; cada drone, uma das
  // vozes da lista (as mais naturais primeiro), em rodízio.
  const jeitoDeFalar = (nome) => {
    const numero = numeroDoDrone(nome);
    const opcoes = { language: IDIOMA, rate: RITMO, pitch: TONS[numero % TONS.length] };
    if (vozes.current.length > 0) opcoes.voice = vozes.current[numero % vozes.current.length].identifier;
    return opcoes;
  };

  // Toca a próxima da fila (se não houver nada tocando)
  const proxima = async () => {
    clearTimeout(seguranca.current);
    cortarAudio.current = null;
    atual.current = fila.current.shift() || null;
    if (!atual.current) return;
    // A mensagem aparece no rádio escrito agora, junto com o começo da fala
    aoMostrarRef.current(atual.current.mensagem);
    // Rotina que esperou demais já ficou velha: fica só no texto
    const velha = !atual.current.evento && Date.now() - atual.current.criadoEm > VALIDADE_ROTINA_MS;
    const falado = velha ? null : atual.current.falado;
    if (!falado) {
      proxima(); // só texto: já passa para a próxima
      return;
    }
    const numero = ++contador.current;
    atual.current.numero = numero;
    // Só passa para a próxima se quem terminou for a fala atual (o aviso da voz e o timer
    // de segurança podem chegar os dois)
    const terminou = () => {
      if (atual.current && atual.current.numero === numero) proxima();
    };
    if (!['meio', 'fim'].includes(atual.current.parte)) chiadoDeAbertura(); // o rádio abre

    // 1. Voz da nuvem (já começou a baixar quando a fala entrou na fila)
    const buffer = atual.current.audio ? await comLimite(atual.current.audio, ESPERA_MAXIMA_NUVEM_MS) : null;
    if (!atual.current || atual.current.numero !== numero) return; // pararam a voz enquanto esperava
    if (buffer) {
      cortarAudio.current = tocarComoRadio(buffer, terminou);
      seguranca.current = setTimeout(terminou, buffer.duration * 1000 + 1000);
      return;
    }
    // 2. Reserva: a voz do aparelho
    if (atual.current.audio) nuvemPausadaAte.current = Date.now() + PAUSA_APOS_FALHA_MS; // demorou demais
    Speech.speak(falado, { ...jeitoDeFalar(atual.current.nome), onDone: terminou, onError: terminou });
    seguranca.current = setTimeout(terminou, duracaoEstimadaMs(falado));
  };

  // Coloca mensagens na fila. "mensagens": [{ id, nome, cor, texto, evento, parte }]
  // Todas entram (para o texto sair na ordem certa), mas a voz fala só o que ainda é atual
  // (veja "Para a voz não ficar para trás", lá em cima). As zonas checadas no meio de um
  // relato também ficam só no texto (a voz fala "checando zonas" e a decisão).
  const falar = (mensagens) => {
    if (!ligadaRef.current) {
      mensagens.forEach((mensagem) => aoMostrarRef.current(mensagem)); // voz desligada: só texto
      return;
    }
    const agora = Date.now();
    const grupos = new Map(); // rotina igual neste instante: texto curto → item que fala por todos
    mensagens.forEach((mensagem) => {
      // Uma mensagem nova deixa velha a rotina anterior do mesmo drone que ainda não foi falada
      fila.current.forEach((item) => {
        if (item.nome === mensagem.nome && !item.evento && !item.parte) item.falado = null;
      });
      const curto = respostaAoAcordo(mensagem, fila.current) || resumirParaFala(mensagem.texto);
      const item = { mensagem, nome: mensagem.nome, falado: null, audio: null, evento: mensagem.evento, parte: mensagem.parte, criadoEm: agora };

      if (mensagem.parte !== 'meio') {
        const grupo = !mensagem.evento && grupos.get(curto);
        if (grupo) {
          // Mesma rotina de outro drone neste instante: entra na fala do grupo
          grupo.nomes.push(mensagem.nome);
          grupo.falado = textoParaFala(`${juntarNomes(grupo.nomes)}: ${curto}`);
        } else {
          item.falado = textoParaFala(fraseDeRadio({ ...mensagem, texto: curto }));
          if (!mensagem.evento) {
            item.nomes = [mensagem.nome];
            grupos.set(curto, item);
          }
        }
      }

      // Evento passa na frente de toda a rotina que está esperando (depois dos outros eventos)
      const primeiraRotina = mensagem.evento ? fila.current.findIndex((outro) => !outro.evento) : -1;
      if (primeiraRotina >= 0) fila.current.splice(primeiraRotina, 0, item);
      else fila.current.push(item);
    });
    // O áudio da nuvem começa a baixar já (com o texto final de cada grupo), para estar
    // pronto quando chegar a vez
    fila.current.forEach((item) => {
      if (item.falado && !item.audio && item.criadoEm === agora) item.audio = buscarAudio(item.falado, vozDaNuvem(item.nome));
    });
    if (!atual.current) proxima();
  };

  // Um evento deste drone está na voz? 'falando' (a voz está contando agora), 'esperando'
  // (ainda vai contar: está na fila) ou null. A tela usa isso para que a ação no mapa
  // aconteça junto com a fala: esperando, o drone quase para; falando, anda em câmera lenta.
  const eventoNaVoz = (nome) => {
    if (!ligadaRef.current) return null;
    if (atual.current && atual.current.nome === nome && atual.current.evento) return 'falando';
    return fila.current.some((item) => item.nome === nome && item.evento) ? 'esperando' : null;
  };

  // Cala a voz e esvazia a fila (nova simulação, interromper, desligar a voz)
  const parar = () => {
    clearTimeout(seguranca.current);
    fila.current = [];
    atual.current = null;
    if (cortarAudio.current) cortarAudio.current();
    cortarAudio.current = null;
    Speech.stop();
  };


  // Ao desligar a voz: o que ainda estava na fila vai direto para o texto, e a voz cala
  useEffect(() => {
    if (ligada) return;
    fila.current.forEach((item) => aoMostrarRef.current(item.mensagem));
    parar();
  }, [ligada]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => parar, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { ligada, setLigada, falar, parar, eventoNaVoz };
}
