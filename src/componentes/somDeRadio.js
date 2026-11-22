import { Platform } from 'react-native';

// Efeitos de rádio para a voz dos drones, gerados na hora com a Web Audio do navegador
// (sem arquivos de som): o chiado de quando o rádio abre e o "bip" de fim de transmissão,
// como no rádio de aviação. No app nativo (sem Web Audio), os efeitos ficam mudos.

let contexto = null;

// O contexto de áudio precisa ser criado (ou liberado) num toque do usuário: a primeira
// chamada acontece no botão "Iniciar simulação"
function audio() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!Contexto) return null;
  if (!contexto) contexto = new Contexto();
  if (contexto.state === 'suspended') contexto.resume();
  return contexto;
}

// Chiado: ruído branco curto, filtrado na faixa de voz do rádio (300 a 3000 Hz)
export function chiadoDeAbertura() {
  const ctx = audio();
  if (!ctx) return;
  const duracao = 0.18;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duracao), ctx.sampleRate);
  const amostras = buffer.getChannelData(0);
  for (let i = 0; i < amostras.length; i++) amostras[i] = Math.random() * 2 - 1;

  const ruido = ctx.createBufferSource();
  ruido.buffer = buffer;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 1500;
  filtro.Q.value = 0.8;
  const volume = ctx.createGain();
  volume.gain.setValueAtTime(0.12, ctx.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao); // some aos poucos

  ruido.connect(filtro).connect(volume).connect(ctx.destination);
  ruido.start();
}

// Bip de fim de transmissão ("câmbio"): um tom curto e agudo
export function bipDeFim() {
  const ctx = audio();
  if (!ctx) return;
  const tom = ctx.createOscillator();
  tom.type = 'sine';
  tom.frequency.value = 1750;
  const volume = ctx.createGain();
  volume.gain.setValueAtTime(0.08, ctx.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  tom.connect(volume).connect(ctx.destination);
  tom.start();
  tom.stop(ctx.currentTime + 0.12);
}

// ---------- Voz da nuvem ----------
// O áudio (MP3) que vem da rota /api/voz vira um "buffer" que a Web Audio sabe tocar.
// Sem Web Audio (app nativo), dá erro e quem chamou usa a voz do aparelho.
export function decodificarAudio(bytes) {
  const ctx = audio();
  if (!ctx) return Promise.reject(new Error('Sem Web Audio'));
  return ctx.decodeAudioData(bytes);
}

// Toca a voz com filtro de rádio: só a faixa de 300 a 3400 Hz (a faixa do rádio de voz),
// o que deixa o som "de rádio" de aviação. "aoTerminar" é chamado no fim da fala.
// Devolve uma função que corta a fala (para o botão de interromper).
export function tocarComoRadio(buffer, aoTerminar) {
  const ctx = audio();
  if (!ctx) return () => {};
  const fonte = ctx.createBufferSource();
  fonte.buffer = buffer;
  const graves = ctx.createBiquadFilter(); // corta os graves
  graves.type = 'highpass';
  graves.frequency.value = 300;
  const agudos = ctx.createBiquadFilter(); // corta os agudos
  agudos.type = 'lowpass';
  agudos.frequency.value = 3400;
  fonte.connect(graves).connect(agudos).connect(ctx.destination);
  fonte.onended = aoTerminar;
  fonte.start();
  return () => {
    fonte.onended = null;
    fonte.stop();
  };
}
