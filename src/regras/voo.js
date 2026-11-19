// Regras do voo do drone. Só contas, sem desenho.
//
// Fases do voo (voo.situacao):
//   'decolando'  sobe na vertical em cima do hub até 120 m
//   'voando'     vai do hub até o destino a 120 m
//   'desviando'  depois de uma pane, vai até a zona de pouso a 120 m
//   'planando'   depois de uma falha grave, plana de paraquedas até o ponto escolhido
//   'descendo'   desce na vertical (com motor, ou de paraquedas em espiral)
// Fases finais (no chão): 'entregue', 'pouso-emergencia', 'pouso-paraquedas',
// 'pousou-hub' e 'queda'.
import { distanciaKm, zonaMaisProxima } from './distancia.js';
import {
  ALTITUDE_MINIMA_PARAQUEDAS,
  MARGEM_POUSO_M,
  SEM_VENTO,
  escolherPouso,
  tempoAteOPonto,
  vetorVento,
} from './paraquedas.js';

export const ALTITUDE_CRUZEIRO = 120; // metros: teto comum para drones no Brasil
const VELOCIDADE_PARAQUEDAS = 0.15; // planando, anda a 15% da velocidade normal
const VERTICAL_POR_PASSO_M = 3; // na vertical, com motor: 3 m a cada tique do relógio
const VERTICAL_PARAQUEDAS_POR_PASSO_M = 1.5; // descendo de paraquedas: mais devagar
const ALTITUDE_EVENTO_DECOLAGEM = 60; // eventos no km 0 acontecem a 60 m, se não disser outra

// Motor fraco (falha em um dos motores)
const VELOCIDADE_MOTOR_FRACO = 0.6; // na animação, anda a 60% da velocidade normal
const VELOCIDADE_MOTOR_FRACO_MS = 9; // em relação ao ar: 9 m/s (o normal seria 15 m/s)
const PERDA_MOTOR_M_POR_KM = 40; // sem vento, perde 40 m de altura a cada km voado...
const DESCIDA_MOTOR_FRACO_MS = (PERDA_MOTOR_M_POR_KM * VELOCIDADE_MOTOR_FRACO_MS) / 1000; // ...ou 0,36 m/s
const CHEGADA_SEGURA_M = 60; // só segue para a zona se a previsão for chegar com 60 m ou mais

const NO_AR = ['decolando', 'voando', 'desviando', 'motor-fraco', 'planando', 'descendo'];

export function estaNoAr(voo) {
  return NO_AR.includes(voo.situacao);
}

// Altitude do drone, em metros
export function altitudeDoVoo(voo) {
  if (!estaNoAr(voo)) return 0;

  // Na vertical, a altitude fica guardada no próprio voo
  if (voo.situacao === 'decolando' || voo.situacao === 'descendo') return Math.round(voo.altitude);

  // Planando: vai perdendo altura aos poucos, da altitude da falha até a de chegada
  if (voo.situacao === 'planando') {
    const progresso = voo.km / distanciaKm(voo.origem, voo.destino);
    return Math.round(voo.altitudeInicial - (voo.altitudeInicial - voo.altitudeChegada) * progresso);
  }

  // Motor fraco: perde altura conforme anda
  if (voo.situacao === 'motor-fraco') return Math.round(voo.altitudeInicial - voo.perdaPorKm * voo.km);

  // Voando ou desviando: sempre na altitude de cruzeiro
  return ALTITUDE_CRUZEIRO;
}

// Onde o drone está depois de voar "kmVoados" na reta da origem até o destino.
// Usamos km (e não porcentagem) porque os eventos vão acontecer em km
// específicos, como "pane no km 1,5".
export function posicaoNaRota(origem, destino, kmVoados) {
  const total = distanciaKm(origem, destino);
  if (total === 0) return origem; // trecho sem comprimento: evita dividir por zero

  const progresso = Math.min(kmVoados / total, 1); // 0 = saindo, 1 = chegou

  return {
    x: origem.x + (destino.x - origem.x) * progresso,
    y: origem.y + (destino.y - origem.y) * progresso,
  };
}

// Transforma um evento de vento ({ tipo: 'vento', velocidade: 8, de: 'sul' })
// no vento guardado no voo: o vetor { x, y } em m/s + os dados para mostrar na tela
function criarVento(evento) {
  return { ...vetorVento(evento.velocidade, evento.de), velocidade: evento.velocidade, de: evento.de };
}

// Texto do vento para a tela. Ex.: "Vento do sul a 29 km/h"
function textoVento(vento) {
  return `Vento do ${vento.de} a ${Math.round(vento.velocidade * 3.6)} km/h`; // m/s × 3,6 = km/h
}

// Começa uma descida vertical: o drone para onde está e desce reto.
// "situacaoFinal" e "mensagemFinal" valem quando ele tocar o chão.
function iniciarDescida(voo, altitude, mensagem, situacaoFinal, mensagemFinal) {
  return { ...voo, altitude, situacao: 'descendo', mensagem, situacaoFinal, mensagemFinal };
}

// Um tique da descida vertical
function descer(voo) {
  const passo = voo.paraquedasAberto ? VERTICAL_PARAQUEDAS_POR_PASSO_M : VERTICAL_POR_PASSO_M;
  const altitude = Math.max(voo.altitude - passo, 0); // não passa do chão

  if (altitude === 0) {
    return { ...voo, altitude, situacao: voo.situacaoFinal, mensagem: voo.mensagemFinal };
  }
  return { ...voo, altitude };
}

// Decolagem vertical: o drone sobe em cima do hub e só sai do lugar a 120 m.
// Eventos no km 0 acontecem durante a decolagem, na altitude do evento
// (ex.: { tipo: 'falha-grave', km: 0, altitude: 20 }) ou a 60 m.
function decolar(voo, eventos) {
  const altitude = Math.min(voo.altitude + VERTICAL_POR_PASSO_M, ALTITUDE_CRUZEIRO);

  // O vento não é um problema na decolagem: ele só passa a valer quando o drone começa a andar
  const evento = eventos.find((e) => {
    const altitudeDoEvento = e.altitude ?? ALTITUDE_EVENTO_DECOLAGEM;
    return e.km === 0 && e.tipo !== 'vento' && voo.altitude < altitudeDoEvento && altitude >= altitudeDoEvento;
  });

  // Falha grave baixa demais para o paraquedas: o drone cai, mas dentro do hub,
  // longe de ruas e pessoas. É por isso que ele sobe na vertical antes de andar.
  if (evento && evento.tipo === 'falha-grave' && altitude < ALTITUDE_MINIMA_PARAQUEDAS) {
    return {
      ...voo,
      altitude: 0,
      situacao: 'queda',
      mensagem: `Falha grave a ${altitude} m: sem altura para o paraquedas. Caiu dentro do hub, longe de ruas e pessoas`,
    };
  }

  // Outros problemas na decolagem: desce de volta em cima do próprio hub
  if (evento) {
    const comParaquedas = evento.tipo === 'falha-grave';
    const mensagem = comParaquedas
      ? 'Falha grave na decolagem! Paraquedas aberto, descendo sobre o hub'
      : 'Pane na decolagem! Descendo de volta no hub';
    return iniciarDescida(
      { ...voo, paraquedasAberto: comParaquedas },
      altitude,
      mensagem,
      'pousou-hub',
      'Pousou em segurança no hub da SADEC'
    );
  }

  if (altitude === ALTITUDE_CRUZEIRO) {
    // Chegou a 120 m: se houver vento no km 0, ele começa a valer agora
    const ventoNoKm0 = eventos.find((e) => e.km === 0 && e.tipo === 'vento');
    if (ventoNoKm0) {
      const vento = criarVento(ventoNoKm0);
      return { ...voo, altitude, situacao: 'voando', vento, mensagem: textoVento(vento) };
    }
    return { ...voo, altitude, situacao: 'voando', mensagem: 'Voando...' };
  }
  return { ...voo, altitude };
}

// Abre o paraquedas num local e altitude, escolhe onde pousar e começa a planar.
// "motivo" é o começo da mensagem (ex.: "Falha grave no km 1.7!").
function abrirParaquedas(voo, local, altitude, regiao, motivo) {
  const vento = voo.vento || SEM_VENTO;
  const pouso = escolherPouso(local, altitude, regiao.zonas, regiao.areas, regiao.vias, vento);

  return {
    origem: local,
    destino: pouso.ponto,
    km: 0,
    situacao: 'planando',
    emergencia: true,
    paraquedasAberto: true,
    vento: voo.vento,
    altitudeInicial: altitude,
    altitudeChegada: pouso.altitudeChegada,
    alcance: pouso.alcance,
    confortavel: pouso.confortavel,
    nomePouso: pouso.nome,
    mensagem: `${motivo} Paraquedas aberto, planando para ${pouso.nome}`,
  };
}

// ---------- Sistema de risco do motor fraco ----------
// Pergunta que o drone faz o tempo todo: "consigo chegar tranquilamente à zona
// de pouso na minha condição atual?". A resposta vem da altitude prevista na chegada.

// Com que altitude o drone chegaria à zona, saindo de "local" a "altitude", com motor fraco.
// O vento conta: contra ele, o drone demora mais e perde mais altura no caminho.
function chegadaPrevista(local, altitude, zona, vento) {
  const deslocamento = { x: (zona.x - local.x) * 1000, y: (zona.y - local.y) * 1000 }; // km → m
  const tempo = tempoAteOPonto(deslocamento, vento, VELOCIDADE_MOTOR_FRACO_MS);
  return altitude - DESCIDA_MOTOR_FRACO_MS * tempo;
}

// 'sim': chega com folga | 'talvez': chega, mas com pouca margem | 'nao': não chega
function respostaChegada(altitudePrevista) {
  if (Math.round(altitudePrevista) >= CHEGADA_SEGURA_M) return 'sim';
  if (altitudePrevista >= 0) return 'talvez';
  return 'nao';
}

// Falha em um motor: o drone ainda voa, mas sem força para manter a altura.
// Ele avalia TODAS as zonas de pouso e só segue para uma se a resposta for "sim".
// Se for "talvez" ou "não" para todas, abre o paraquedas na hora, ainda a 120 m.
function falhaMotor(voo, evento, regiao) {
  const local = posicaoNaRota(voo.origem, voo.destino, evento.km);
  const vento = voo.vento || SEM_VENTO;

  const avaliadas = regiao.zonas.map((zona) => ({
    zona,
    prevista: chegadaPrevista(local, ALTITUDE_CRUZEIRO, zona, vento),
    distancia: distanciaKm(local, zona),
  }));
  const seguras = avaliadas
    .filter((a) => respostaChegada(a.prevista) === 'sim')
    .sort((a, b) => a.distancia - b.distancia); // menos tempo voando com motor quebrado

  if (seguras.length === 0) {
    const motivo = `Falha em um motor no km ${evento.km}! Nenhuma zona alcançável com segurança.`;
    return abrirParaquedas(voo, local, ALTITUDE_CRUZEIRO, regiao, motivo);
  }

  const { zona, prevista } = seguras[0];
  return {
    origem: local,
    destino: zona,
    km: 0,
    situacao: 'motor-fraco',
    emergencia: true,
    vento: voo.vento,
    altitudeInicial: ALTITUDE_CRUZEIRO,
    perdaPorKm: (ALTITUDE_CRUZEIRO - prevista) / distanciaKm(local, zona), // já com o vento
    mensagem: `Falha em um motor no km ${evento.km}! Rumo à ${zona.id}, chegada prevista: ${Math.round(prevista)} m`,
  };
}

// Falha grave em voo: os motores param. Abre o paraquedas na hora, a 120 m.
function falhaGrave(voo, evento, regiao) {
  const local = posicaoNaRota(voo.origem, voo.destino, evento.km);
  return abrirParaquedas(voo, local, ALTITUDE_CRUZEIRO, regiao, `Falha grave no km ${evento.km}!`);
}

// Chegou ao fim do trecho: em vez de descer em rampa, para e desce na vertical
function chegarAoFim(voo, total) {
  const chegou = { ...voo, km: total };

  if (voo.situacao === 'voando') {
    return iniciarDescida(chegou, ALTITUDE_CRUZEIRO, 'Sobre o destino: descendo na vertical', 'entregue', 'Entrega concluída!');
  }

  if (voo.situacao === 'desviando' || voo.situacao === 'motor-fraco') {
    const zona = voo.destino.id;
    const altitude = altitudeDoVoo(chegou); // com motor fraco, chega mais baixo
    return iniciarDescida(chegou, altitude, `Sobre a ${zona}: descendo na vertical`, 'pouso-emergencia', `Pouso seguro na ${zona}`);
  }

  // Planando: chega com a altura que sobrou e desce em espiral sobre o ponto
  const altitudeChegada = voo.altitudeChegada;
  const forcado = altitudeChegada < MARGEM_POUSO_M;
  return iniciarDescida(
    chegou,
    altitudeChegada,
    `Sobre o ponto de pouso a ${Math.round(altitudeChegada)} m: descendo em espiral`,
    'pouso-paraquedas',
    forcado ? `Pouso forçado em ${voo.nomePouso}` : `Pouso suave de paraquedas em ${voo.nomePouso}`
  );
}

// Avança o voo um tique (passoKm na horizontal) e verifica se aconteceu algum evento.
// "regiao" junta os dados do mapa: { zonas, areas, vias }.
export function avancarVoo(voo, passoKm, eventos, regiao) {
  // Se o drone já está no chão, nada muda
  if (!estaNoAr(voo)) return voo;

  // Subindo ou descendo na vertical: o drone não sai do lugar
  if (voo.situacao === 'decolando') return decolar(voo, eventos);
  if (voo.situacao === 'descendo') return descer(voo);

  let passo = passoKm;
  if (voo.situacao === 'planando') passo = passoKm * VELOCIDADE_PARAQUEDAS;
  if (voo.situacao === 'motor-fraco') passo = passoKm * VELOCIDADE_MOTOR_FRACO;
  const kmNovo = voo.km + passo;
  const total = distanciaKm(voo.origem, voo.destino);

  // Motor fraco: a cada tique, refaz a pergunta "ainda consigo chegar com folga?".
  // Se a resposta deixar de ser "sim", abre o paraquedas JÁ, enquanto ainda há altura.
  if (voo.situacao === 'motor-fraco' && kmNovo < total) {
    const local = posicaoNaRota(voo.origem, voo.destino, kmNovo);
    const altitude = voo.altitudeInicial - voo.perdaPorKm * kmNovo;
    const prevista = chegadaPrevista(local, altitude, voo.destino, voo.vento || SEM_VENTO);
    const zona = voo.destino.id;

    if (respostaChegada(prevista) !== 'sim') {
      const motivo = `Chegada à ${zona} ficou arriscada (${Math.round(prevista)} m previstos)!`;
      return abrirParaquedas(voo, local, altitude, regiao, motivo);
    }
    return { ...voo, km: kmNovo, mensagem: `Motor fraco, rumo à ${zona}. Chegada prevista: ${Math.round(prevista)} m` };
  }

  // Eventos em voo só valem na rota original, no momento em que o drone passa pelo km deles
  const evento =
    voo.situacao === 'voando' ? eventos.find((e) => voo.km < e.km && kmNovo >= e.km) : undefined;

  if (evento && evento.tipo === 'pane') {
    const local = posicaoNaRota(voo.origem, voo.destino, evento.km);
    const { zona } = zonaMaisProxima(local, regiao.zonas);
    return {
      origem: local,
      destino: zona,
      km: 0,
      situacao: 'desviando',
      emergencia: true,
      vento: voo.vento, // o vento continua soprando
      mensagem: `Pane no km ${evento.km}! Desviando para a ${zona.id}`,
    };
  }

  // Vento: não muda a rota (com motor, o drone compensa), mas fica guardado no voo.
  // Se depois houver uma falha grave, o paraquedas vai levar o vento em conta.
  if (evento && evento.tipo === 'vento') {
    const vento = criarVento(evento);
    return { ...voo, km: kmNovo, vento, mensagem: textoVento(vento) };
  }

  if (evento && evento.tipo === 'falha-grave') {
    return falhaGrave(voo, evento, regiao);
  }

  if (evento && evento.tipo === 'motor') {
    return falhaMotor(voo, evento, regiao);
  }

  // Chegou ao fim do trecho?
  if (kmNovo >= total) return chegarAoFim(voo, total);

  // Nada de especial: só anda
  return { ...voo, km: kmNovo };
}
