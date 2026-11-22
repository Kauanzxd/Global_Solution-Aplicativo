import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { bipDeFim, chiadoDeAbertura, decodificarAudio, tocarComoRadio } from './somDeRadio';

// Voz do rádio: lê em voz alta as mensagens dos drones (expo-speech, a voz do próprio
// celular ou navegador). As mensagens entram numa fila e são lidas uma de cada vez.
// Enquanto a voz conta um EVENTO (pane, GPS, conversa entre drones...), "narrandoEvento()"
// responde true: a tela usa isso para manter a câmera lenta até a fala terminar.

const IDIOMA = 'pt-BR';
const RITMO = 1.4; // bem mais rápido que o normal, como a fala de rádio (e para não atrasar em relação ao mapa)
const FILA_MAXIMA = 8; // cabe um relato inteiro; com muitos drones, as falas de rotina mais antigas saem primeiro

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

// Quanto tempo uma fala deve levar (para destravar a fila se a voz não avisar que acabou)
// (uns 70 ms por letra no ritmo normal; mais rápido, proporcionalmente menos)
function duracaoEstimadaMs(texto) {
  return 1000 + (texto.length * 70) / RITMO;
}

export default function useVozDoRadio() {
  const [ligada, setLigada] = useState(true);
  const ligadaRef = useRef(ligada);
  ligadaRef.current = ligada;

  const fila = useRef([]); // [{ nome, falado, audio, evento, parte }]
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
    const falado = atual.current.falado;
    const numero = ++contador.current;
    atual.current.numero = numero;
    // Só passa para a próxima se quem terminou for a fala atual (o aviso da voz e o timer
    // de segurança podem chegar os dois)
    const terminou = () => {
      if (atual.current && atual.current.numero === numero) {
        if (!['inicio', 'meio'].includes(atual.current.parte)) bipDeFim(); // fim da transmissão
        proxima();
      }
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

  // Coloca mensagens na fila. "mensagens": [{ nome, texto, evento }]
  const falar = (mensagens) => {
    if (!ligadaRef.current || mensagens.length === 0) return;
    // No relato, a voz fala só o começo ("checando zonas") e a decisão; a lista das zonas
    // checadas (as linhas do meio) fica só na tela
    mensagens
      .filter((mensagem) => mensagem.parte !== 'meio')
      .forEach((mensagem) => {
        const falado = textoParaFala(fraseDeRadio(mensagem));
        // o áudio da nuvem começa a baixar já, para estar pronto quando chegar a vez
        const audio = buscarAudio(falado, vozDaNuvem(mensagem.nome));
        fila.current.push({ nome: mensagem.nome, falado, audio, evento: mensagem.evento, parte: mensagem.parte });
      });
    // Fila cheia: descarta primeiro as falas de rotina mais antigas, depois as mais antigas
    while (fila.current.length > FILA_MAXIMA) {
      const rotina = fila.current.findIndex((item) => !item.evento && !item.parte);
      fila.current.splice(rotina >= 0 ? rotina : 0, 1);
    }
    if (!atual.current) proxima();
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

  // A voz está contando um evento (agora ou na fila)?
  const narrandoEvento = () =>
    ligadaRef.current && Boolean((atual.current && atual.current.evento) || fila.current.some((item) => item.evento));

  // Ao desligar a voz, ou ao sair da tela, para de falar
  useEffect(() => {
    if (!ligada) parar();
  }, [ligada]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => parar, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { ligada, setLigada, falar, parar, narrandoEvento };
}
