// Regras do voo do drone. Só contas, sem desenho.
//
// Fases do voo (voo.situacao):
//   'decolando'    sobe na vertical em cima do hub até 120 m
//   'voando'       vai do hub até o destino a 120 m
//   'desviando'    vai até uma zona de pouso a 120 m (pane, GPS sem sinal...)
//   'motor-fraco'  vai até uma zona de pouso perdendo altura
//   'sem-gps'      parado no ar, tentando recuperar o sinal de GPS
//   'planando'     de paraquedas, planando até o ponto escolhido
//   'descendo'     desce na vertical (com motor, ou de paraquedas em espiral)
// Fases finais (no chão): 'entregue', 'pouso-emergencia', 'pouso-paraquedas',
// 'pousou-hub' e 'queda'.
//
// Eventos acontecem no "km da viagem", contado pelo HODÔMETRO: a distância total
// voada desde o hub, somando todos os trechos (como o odômetro de um carro).
// Assim, uma segunda falha pode acontecer no meio de um desvio de emergência.
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

// GPS
const TIQUES_TENTANDO_GPS = 60; // fica 60 tiques (3 s na tela) parado tentando recuperar o sinal

const NO_AR = ['decolando', 'voando', 'desviando', 'motor-fraco', 'sem-gps', 'planando', 'descendo'];

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
    const total = distanciaKm(voo.origem, voo.destino);
    if (total === 0) return Math.round(voo.altitudeInicial); // pousa onde está: evita 0 ÷ 0
    const progresso = voo.km / total;
    return Math.round(voo.altitudeInicial - (voo.altitudeInicial - voo.altitudeChegada) * progresso);
  }

  // Motor fraco: perde altura conforme anda
  if (voo.situacao === 'motor-fraco') return Math.round(voo.altitudeInicial - voo.perdaPorKm * voo.km);

  // Voando, desviando ou parado sem GPS: na altitude de cruzeiro
  return ALTITUDE_CRUZEIRO;
}

// Onde o drone está depois de voar "kmVoados" na reta da origem até o destino.
export function posicaoNaRota(origem, destino, kmVoados) {
  const total = distanciaKm(origem, destino);
  if (total === 0) return origem; // trecho sem comprimento: evita dividir por zero

  const progresso = Math.min(kmVoados / total, 1); // 0 = saindo, 1 = chegou

  return {
    x: origem.x + (destino.x - origem.x) * progresso,
    y: origem.y + (destino.y - origem.y) * progresso,
  };
}

// Onde o drone está agora
function posicaoAtual(voo) {
  return posicaoNaRota(voo.origem, voo.destino, voo.km);
}

// O que continua valendo quando o drone começa um trecho novo:
// o vento, o hodômetro e se ele está sem GPS
function continuar(voo) {
  return { vento: voo.vento, hodometro: voo.hodometro || 0, semGps: voo.semGps };
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

// ---------- Descida vertical ----------

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

// ---------- Decolagem ----------

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
      : 'Problema na decolagem! Descendo de volta no hub';
    return iniciarDescida(
      { ...voo, paraquedasAberto: comParaquedas },
      altitude,
      mensagem,
      'pousou-hub',
      'Pousou em segurança no hub da SADEC'
    );
  }

  if (altitude === ALTITUDE_CRUZEIRO) {
    // Chegou a 120 m: começa a andar. Se houver vento no km 0, ele começa a valer agora.
    const ventoNoKm0 = eventos.find((e) => e.km === 0 && e.tipo === 'vento');
    const vento = ventoNoKm0 ? criarVento(ventoNoKm0) : voo.vento;
    const mensagem = ventoNoKm0 ? textoVento(vento) : 'Voando...';
    return { ...voo, altitude, situacao: 'voando', hodometro: 0, vento, mensagem };
  }
  return { ...voo, altitude };
}

// ---------- Reações de emergência ----------
// Todas recebem o drone no ponto exato do problema: "local" (onde está) e "altitude".
// "motivo" é o começo da mensagem (ex.: "Pane no km 1.5!").

// Abre o paraquedas, escolhe onde pousar e começa a planar.
// Abaixo da altitude mínima, o paraquedas não abre a tempo: é uma queda.
function abrirParaquedas(voo, local, altitude, regiao, motivo) {
  if (altitude < ALTITUDE_MINIMA_PARAQUEDAS) {
    return {
      ...continuar(voo),
      origem: local,
      destino: local,
      km: 0,
      situacao: 'queda',
      emergencia: true,
      mensagem: `${motivo} A ${Math.round(altitude)} m não há altura para o paraquedas: queda no local`,
    };
  }

  const vento = voo.vento || SEM_VENTO;
  const pouso = escolherPouso(local, altitude, regiao.zonas, regiao.areas, regiao.vias, vento);

  return {
    ...continuar(voo),
    origem: local,
    destino: pouso.ponto,
    km: 0,
    situacao: 'planando',
    emergencia: true,
    paraquedasAberto: true,
    altitudeInicial: altitude,
    altitudeChegada: pouso.altitudeChegada,
    alcance: pouso.alcance,
    confortavel: pouso.confortavel,
    nomePouso: pouso.nome,
    mensagem: `${motivo} Paraquedas aberto, planando para ${pouso.nome}`,
  };
}

// Desvia para a zona de pouso mais próxima, com os motores bons, a 120 m.
function desviarParaZona(voo, local, regiao, motivo) {
  const { zona } = zonaMaisProxima(local, regiao.zonas);
  return {
    ...continuar(voo),
    origem: local,
    destino: zona,
    km: 0,
    situacao: 'desviando',
    emergencia: true,
    mensagem: `${motivo} Desviando para a ${zona.id}`,
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

// Segue (ou continua) com motor fraco rumo a uma zona, a partir de "local" e "altitude".
// Se a resposta não for "sim", abre o paraquedas na hora.
function seguirComMotorFraco(voo, local, altitude, zona, regiao, motivo) {
  const prevista = chegadaPrevista(local, altitude, zona, voo.vento || SEM_VENTO);

  if (respostaChegada(prevista) !== 'sim') {
    return abrirParaquedas(voo, local, altitude, regiao, `${motivo} Chegada à ${zona.id} arriscada.`);
  }

  return {
    ...continuar(voo),
    origem: local,
    destino: zona,
    km: 0,
    situacao: 'motor-fraco',
    emergencia: true,
    altitudeInicial: altitude,
    perdaPorKm: (altitude - prevista) / distanciaKm(local, zona), // já com o vento
    mensagem: `${motivo} Rumo à ${zona.id}, chegada prevista: ${Math.round(prevista)} m`,
  };
}

// Falha em um motor: avalia TODAS as zonas e só segue para uma se a resposta for "sim".
// Se for "talvez" ou "não" para todas, abre o paraquedas na hora.
function falhaMotor(voo, local, altitude, regiao, motivo) {
  const vento = voo.vento || SEM_VENTO;
  const seguras = regiao.zonas
    .map((zona) => ({ zona, prevista: chegadaPrevista(local, altitude, zona, vento) }))
    .filter((a) => respostaChegada(a.prevista) === 'sim')
    .sort((a, b) => distanciaKm(local, a.zona) - distanciaKm(local, b.zona)); // a mais perto

  if (seguras.length === 0) {
    return abrirParaquedas(voo, local, altitude, regiao, `${motivo} Nenhuma zona alcançável com segurança.`);
  }
  return seguirComMotorFraco(voo, local, altitude, seguras[0].zona, regiao, motivo);
}

// ---------- GPS ----------
// Sem GPS, o drone não sabe direito onde está. Na rota normal, ele para no ar
// (paira) e tenta recuperar o sinal. Se voltar, segue a rota. Se não voltar, usa
// a navegação de reserva (bússola + câmera), menos precisa: por segurança, vai
// para a zona de pouso mais próxima em vez de continuar a entrega.
// Evento: { tipo: 'gps', km: 2 } (o sinal volta) ou { tipo: 'gps', km: 2, recupera: false }

// Um tique pairando sem GPS. Eventos com { durante: 'gps' } acontecem na metade da espera.
function pairarSemGps(voo, eventos, regiao) {
  const tiques = voo.tiquesPairando + 1;

  if (tiques === TIQUES_TENTANDO_GPS / 2) {
    const evento = eventos.find((e) => e.durante === 'gps');
    const reacao = evento ? aplicarEvento(voo, evento, regiao) : null;
    if (reacao) return reacao;
  }

  if (tiques < TIQUES_TENTANDO_GPS) return { ...voo, tiquesPairando: tiques };

  // Acabou o tempo de tentativa
  if (voo.gpsVolta) {
    return { ...voo, situacao: 'voando', semGps: false, mensagem: 'Sinal de GPS recuperado! Seguindo a rota' };
  }
  return desviarParaZona(voo, posicaoAtual(voo), regiao, 'GPS não voltou: navegação de reserva (bússola e câmera).');
}

// ---------- Eventos ----------

// O que o drone faz quando um evento acontece. Recebe o drone no ponto exato do evento.
// Devolve o voo novo, ou null quando o evento não muda nada naquela fase.
function aplicarEvento(voo, evento, regiao) {
  const local = posicaoAtual(voo);
  const altitude = altitudeDoVoo(voo);
  const onde = evento.durante === 'gps' ? 'sem GPS' : `no km ${evento.km}`;
  const emEmergencia = voo.situacao !== 'voando';

  switch (evento.tipo) {
    case 'vento': {
      // Com motor, o drone compensa o vento: a rota não muda, mas o vento fica guardado.
      // Com motor fraco, o vento muda a previsão de chegada: o drone recalcula na hora.
      const vento = criarVento(evento);
      const comVento = { ...voo, vento };
      if (voo.situacao === 'motor-fraco') {
        return seguirComMotorFraco(comVento, local, altitude, voo.destino, regiao, `${textoVento(vento)}!`);
      }
      return { ...comVento, mensagem: textoVento(vento) };
    }

    case 'pane':
      // Já está indo para uma zona de pouso (ou com motor fraco): a pane não muda o plano
      if (voo.situacao === 'desviando' || voo.situacao === 'motor-fraco') return null;
      return desviarParaZona(voo, local, regiao, `Pane ${onde}!`);

    case 'motor':
      if (voo.situacao === 'motor-fraco') return null; // já está com motor fraco
      return falhaMotor(voo, local, altitude, regiao, `Falha em um motor ${onde}!`);

    case 'falha-grave':
      return abrirParaquedas(voo, local, altitude, regiao, `Falha grave ${onde}!`);

    case 'gps':
      // No meio de uma emergência, o drone não para: segue com a navegação de reserva
      if (emEmergencia) {
        return { ...voo, semGps: true, mensagem: 'GPS perdido durante a emergência: seguindo com navegação de reserva' };
      }
      return {
        ...voo,
        situacao: 'sem-gps',
        semGps: true,
        tiquesPairando: 0,
        gpsVolta: evento.recupera !== false, // se o evento não disser nada, o sinal volta
        mensagem: `Sinal de GPS perdido ${onde}! Parado no ar, tentando recuperar...`,
      };

    default:
      return null;
  }
}

// ---------- Chegada ----------

// Chegou ao fim do trecho: em vez de descer em rampa, para e desce na vertical
function chegarAoFim(voo, total) {
  const chegou = { ...voo, km: total, hodometro: (voo.hodometro || 0) + (total - voo.km) };

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

// ---------- O tique do relógio ----------

// Avança o voo um tique (passoKm na horizontal) e verifica se aconteceu algum evento.
// "regiao" junta os dados do mapa: { zonas, areas, vias }.
export function avancarVoo(voo, passoKm, eventos, regiao) {
  // Se o drone já está no chão, nada muda
  if (!estaNoAr(voo)) return voo;

  // Subindo ou descendo na vertical: o drone não sai do lugar
  if (voo.situacao === 'decolando') return decolar(voo, eventos);
  if (voo.situacao === 'descendo') return descer(voo);

  // Sem GPS: parado no ar, tentando recuperar o sinal
  if (voo.situacao === 'sem-gps') return pairarSemGps(voo, eventos, regiao);

  let passo = passoKm;
  if (voo.situacao === 'planando') passo = passoKm * VELOCIDADE_PARAQUEDAS;
  if (voo.situacao === 'motor-fraco') passo = passoKm * VELOCIDADE_MOTOR_FRACO;

  const kmNovo = voo.km + passo;
  const total = distanciaKm(voo.origem, voo.destino);
  const hodometro = voo.hodometro || 0;
  const hodometroNovo = hodometro + passo;

  // Eventos: valem em qualquer fase em que o drone anda, menos planando
  // (de paraquedas, sem motor, não há mais o que uma falha possa piorar).
  // O evento acontece quando o hodômetro passa pelo km dele.
  if (voo.situacao !== 'planando') {
    const evento = eventos.find((e) => e.durante === undefined && hodometro < e.km && hodometroNovo >= e.km);
    const kmNoEvento = evento ? voo.km + (evento.km - hodometro) : 0; // onde, neste trecho

    if (evento && kmNoEvento <= total) {
      const noPontoDoEvento = { ...voo, km: kmNoEvento, hodometro: evento.km };
      const reacao = aplicarEvento(noPontoDoEvento, evento, regiao);
      if (reacao) return reacao;
    }
  }

  // Motor fraco: a cada tique, refaz a pergunta "ainda consigo chegar com folga?".
  // Se a resposta deixar de ser "sim", abre o paraquedas JÁ, enquanto ainda há altura.
  if (voo.situacao === 'motor-fraco' && kmNovo < total) {
    const andou = { ...voo, km: kmNovo, hodometro: hodometroNovo };
    const local = posicaoAtual(andou);
    const altitude = voo.altitudeInicial - voo.perdaPorKm * kmNovo;
    const prevista = chegadaPrevista(local, altitude, voo.destino, voo.vento || SEM_VENTO);
    const zona = voo.destino.id;

    if (respostaChegada(prevista) !== 'sim') {
      return abrirParaquedas(andou, local, altitude, regiao, `Chegada à ${zona} ficou arriscada (${Math.round(prevista)} m previstos)!`);
    }
    const reserva = voo.semGps ? ' (navegação de reserva)' : '';
    return { ...andou, mensagem: `Motor fraco, rumo à ${zona}${reserva}. Chegada prevista: ${Math.round(prevista)} m` };
  }

  // Chegou ao fim do trecho?
  if (kmNovo >= total) return chegarAoFim(voo, total);

  // Nada de especial: só anda
  return { ...voo, km: kmNovo, hodometro: hodometroNovo };
}
