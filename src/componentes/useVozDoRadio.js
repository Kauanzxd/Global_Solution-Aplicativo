import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';

// Voz do rádio: lê em voz alta as mensagens dos drones (expo-speech, a voz do próprio
// celular ou navegador). As mensagens entram numa fila e são lidas uma de cada vez.
// Enquanto a voz conta um EVENTO (pane, GPS, conversa entre drones...), "narrandoEvento()"
// responde true: a tela usa isso para manter a câmera lenta até a fala terminar.

const IDIOMA = 'pt-BR';
const RITMO = 1.1; // um pouco mais rápido que o normal, para não atrasar em relação ao mapa
const FILA_MAXIMA = 4; // com muitos drones, as falas mais antigas de rotina são descartadas

// Cada drone fala com um tom diferente (e, se o aparelho tiver mais de uma voz em
// português, com uma voz diferente também): assim dá para saber quem está falando.
const TONS = [1.0, 0.75, 1.3, 0.9, 1.15, 0.65, 1.45];

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
    .replace(/[()]/g, ', '); // parênteses viram pausas
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
        vozes.current = lista.filter((voz) => voz.language && voz.language.toLowerCase().startsWith('pt'));
      })
      .catch(() => {});
  }, []);

  // A voz e o tom de cada drone (a Central fala com a voz padrão, no tom normal)
  const jeitoDeFalar = (nome) => {
    const numero = numeroDoDrone(nome);
    const opcoes = { language: IDIOMA, rate: RITMO, pitch: TONS[numero % TONS.length] };
    if (numero > 0 && vozes.current.length > 1) opcoes.voice = vozes.current[numero % vozes.current.length].identifier;
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
      if (atual.current && atual.current.numero === numero) proxima();
    };
    Speech.speak(falado, { ...jeitoDeFalar(atual.current.nome), onDone: terminou, onError: terminou });
    seguranca.current = setTimeout(terminou, duracaoEstimadaMs(falado));
  };

  // Coloca mensagens na fila. "mensagens": [{ nome, texto, evento }]
  const falar = (mensagens) => {
    if (!ligadaRef.current || mensagens.length === 0) return;
    mensagens.forEach((mensagem) => fila.current.push({ nome: mensagem.nome, texto: `${mensagem.nome}. ${mensagem.texto}`, evento: mensagem.evento }));
    // Fila cheia: descarta primeiro as falas de rotina mais antigas, depois as mais antigas
    while (fila.current.length > FILA_MAXIMA) {
      const rotina = fila.current.findIndex((item) => !item.evento);
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
