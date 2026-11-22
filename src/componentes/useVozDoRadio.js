import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { bipDeFim, chiadoDeAbertura } from './somDeRadio';

// Voz do rádio: lê em voz alta as mensagens dos drones (expo-speech, a voz do próprio
// celular ou navegador). As mensagens entram numa fila e são lidas uma de cada vez.
// Enquanto a voz conta um EVENTO (pane, GPS, conversa entre drones...), "narrandoEvento()"
// responde true: a tela usa isso para manter a câmera lenta até a fala terminar.

const IDIOMA = 'pt-BR';
const RITMO = 1.2; // mais rápido que o normal, como a fala de rádio (e para não atrasar em relação ao mapa)
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

// Número de um nome de rádio: "SADEC-12" → 12; a Central (sem número) → 0
function numeroDoDrone(nome) {
  const achado = /(\d+)/.exec(nome);
  return achado ? Number(achado[1]) : 0;
}

// Texto do rádio → texto falado (siglas e unidades por extenso, como um operador falaria)
export function textoParaFala(texto) {
  return texto
    .replace(/SADEC-0*(\d+)/g, 'Sadec $1') // "SADEC-01" → "Sadec 1"
    .replace(/\bZP-/g, 'zona de pouso ') // "ZP-Carmo" → "zona de pouso Carmo"
    .replace(/(\d)\.(\d)/g, '$1,$2') // decimal com vírgula: "2.05" → "2,05"
    .replace(/\bkm (\d+(?:,\d+)?)/g, 'quilômetro $1') // "no km 2,05" → "no quilômetro 2,05"
    .replace(/(\d+(?:,\d+)?) ?km\b/g, '$1 quilômetros') // "4,2 km" → "4,2 quilômetros"
    .replace(/(\d+) ?m\b/g, '$1 metros') // "120 m" → "120 metros"
    .replace(/\.{3}/g, '.') // reticências viram uma pausa simples
    .replace(/\s*\(/g, ', ') // parênteses viram pausas
    .replace(/\)/g, '');
}

// Como no rádio de aviação: quem fala, para quem, a mensagem e "câmbio" nos eventos.
// A Central fala para todos ("a todos os drones").
// "parte" (relatos de várias linhas, uma transmissão só): 'inicio', 'meio' ou 'fim'.
// Só o início tem a abertura; só o fim tem o "câmbio".
function fraseDeRadio({ nome, texto, evento, parte }) {
  const abertura = nome.startsWith('Central') ? `${nome} a todos os drones` : `${nome} para Central`;
  const comAbertura = !parte || parte === 'inicio';
  const comCambio = evento && (!parte || parte === 'fim');
  return `${comAbertura ? `${abertura}: ` : ''}${texto}${comCambio ? ' Câmbio.' : ''}`;
}

// Quanto tempo uma fala deve levar (para destravar a fila se a voz não avisar que acabou)
function duracaoEstimadaMs(texto) {
  return 1500 + texto.length * 75;
}

export default function useVozDoRadio() {
  const [ligada, setLigada] = useState(true);
  const ligadaRef = useRef(ligada);
  ligadaRef.current = ligada;

  const fila = useRef([]); // [{ texto, evento }]
  const atual = useRef(null); // a fala que está tocando agora
  const seguranca = useRef(null); // timer que destrava a fila se o onDone não vier
  const contador = useRef(0); // número de cada fala (para saber qual terminou)
  const vozes = useRef([]); // as vozes em português do aparelho

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
  const proxima = () => {
    clearTimeout(seguranca.current);
    atual.current = fila.current.shift() || null;
    if (!atual.current) return;
    const falado = textoParaFala(atual.current.texto);
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
    Speech.speak(falado, { ...jeitoDeFalar(atual.current.nome), onDone: terminou, onError: terminou });
    seguranca.current = setTimeout(terminou, duracaoEstimadaMs(falado));
  };

  // Coloca mensagens na fila. "mensagens": [{ nome, texto, evento }]
  const falar = (mensagens) => {
    if (!ligadaRef.current || mensagens.length === 0) return;
    mensagens.forEach((mensagem) => fila.current.push({ nome: mensagem.nome, texto: fraseDeRadio(mensagem), evento: mensagem.evento, parte: mensagem.parte }));
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
