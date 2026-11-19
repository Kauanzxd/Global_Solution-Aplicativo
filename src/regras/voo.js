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
import {
  CONSUMO_POR_KM,
  CONSUMO_POR_SEGUNDO,
  VELOCIDADE_CRUZEIRO_KM_S,
  bateriaParaChegar,
  bateriaParaEntregarEIrAZona,
} from './bateria.js';
import { distanciaKm, zonaMaisProxima } from './distancia.js';
import { riscoNoPonto } from './risco.js';
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
const INCERTEZA_INICIAL_M = 10; // ao perder o GPS, a posição já pode estar errada em 10 m...
const INCERTEZA_POR_SEGUNDO_M = 0.4; // ...e o erro cresce 0,4 m a cada segundo sem GPS
const INCERTEZA_MAXIMA_M = 150; // acima disso, voar até a zona fica arriscado: para de esperar
const FOLGA_AFASTAMENTO_M = 40; // o erro ainda vai crescer enquanto o drone se afasta
const PASSO_BUSCA_KM = 0.02; // procura o ponto seguro de 20 em 20 m
const EMPATE_KM = 0.1; // se os dois caminhos forem parecidos (até 100 m), prefere o destino
const SEGUNDOS_EVENTO_SEM_GPS = 10; // eventos { durante: 'gps' } acontecem 10 s depois da perda

// Bateria: quantos segundos de verdade cada tique representa nas fases paradas.
// (Andando, o tique é o tempo de voar o pedaço do caminho: 0,05 km a 15 m/s ≈ 3,3 s.)
const SEGUNDOS_TIQUE_VERTICAL = 1; // subindo ou descendo 3 m por tique, a 3 m/s
const SEGUNDOS_TIQUE_PAIRANDO = 5; // parado no ar, cada tique vale 5 s (para a espera não demorar na tela)

const NO_AR = ['decolando', 'voando', 'afastando', 'desviando', 'motor-fraco', 'sem-gps', 'planando', 'descendo'];

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
// o vento, o hodômetro, se ele está sem GPS e o tamanho do erro da posição
function continuar(voo) {
  return {
    vento: voo.vento,
    hodometro: voo.hodometro || 0,
    bateria: voo.bateria,
    destinoFinal: voo.destinoFinal, // o ponto de entrega, para retomar a rota se der
    // GPS
    semGps: voo.semGps,
    incerteza: voo.incerteza,
    segundosSemGps: voo.segundosSemGps,
    gpsDuracao: voo.gpsDuracao,
  };
}

// Quantos segundos de verdade este tique representa
function segundosDoTique(voo, passoKm) {
  if (voo.situacao === 'decolando' || voo.situacao === 'descendo') return SEGUNDOS_TIQUE_VERTICAL;
  if (voo.situacao === 'sem-gps') return SEGUNDOS_TIQUE_PAIRANDO;
  return passoKm / VELOCIDADE_CRUZEIRO_KM_S; // andando: o tempo de voar o pedaço (≈ 3,3 s)
}

// Quanto de bateria (%) o drone gasta neste tique
function consumoDoTique(voo, passoKm) {
  // De paraquedas, os motores estão desligados: não gasta nada
  if (voo.situacao === 'planando' || (voo.situacao === 'descendo' && voo.paraquedasAberto)) return 0;
  return CONSUMO_POR_SEGUNDO * segundosDoTique(voo, passoKm);
}

// Sem GPS, o drone estima onde está (bússola + sensores + câmera), e o erro
// dessa estimativa cresce com o tempo. Devolve o erro em metros.
export function incertezaDoVoo(voo) {
  return voo.semGps ? Math.round(voo.incerteza) : 0;
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
  const incerteza = incertezaDoVoo(voo);
  const pouso = escolherPouso(local, altitude, regiao.zonas, regiao.areas, regiao.vias, vento, incerteza / 1000);

  // Sem GPS, avisa que as margens foram ampliadas
  const aviso = incerteza > 0 ? ` Posição incerta (±${Math.round(incerteza)} m): margens ampliadas.` : '';

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
    mensagem: `${motivo}${aviso} Paraquedas aberto, planando para ${pouso.nome}`,
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
// Sem GPS, o drone não sabe direito onde está, e o erro cresce com o tempo.
// Em voo normal:
//   1. Se perdeu o sinal sobre uma via ou bairro, se afasta para um ponto seguro,
//      indo em direção ao destino OU à zona de pouso (o que tirar do risco mais cedo).
//   2. Num ponto seguro, para no ar (paira) e espera, até um dos limites:
//      a bateria chegar à reserva para a zona de pouso, ou o erro passar de 150 m.
//   3. Bateu um limite: vai para a zona com a navegação de reserva (bússola + câmera).
// O tempo todo, em qualquer fase, ele verifica se o sinal voltou. Voltou: retoma a entrega.
// Evento: { tipo: 'gps', km: 2, duracao: 20 } = o sinal volta depois de 20 s.
//         Sem "duracao", o sinal não volta.

// Dá para parar no ar aqui? Só se não estiver sobre via ou bairro (contando a incerteza)
function seguroParaPairar(ponto, incertezaKm, regiao) {
  const risco = riscoNoPonto(ponto, regiao.areas, regiao.vias, incertezaKm);
  return risco === 'medio' || risco === 'baixo';
}

// Anda (na conta) pela reta de "local" até "alvo", de 20 em 20 m, e devolve a
// distância até o primeiro ponto seguro. Infinity se não houver nenhum no caminho.
function distanciaAteSeguro(local, alvo, incertezaKm, regiao) {
  const total = distanciaKm(local, alvo);
  for (let d = 0; d <= total; d += PASSO_BUSCA_KM) {
    if (seguroParaPairar(posicaoNaRota(local, alvo, d), incertezaKm, regiao)) return d;
  }
  return Infinity;
}

// Perdeu o sinal em voo normal: decide se para ali mesmo ou se precisa se afastar
function perderGps(voo, evento, regiao) {
  const local = posicaoAtual(voo);
  const semSinal = {
    ...voo,
    semGps: true,
    incerteza: INCERTEZA_INICIAL_M,
    segundosSemGps: 0,
    gpsDuracao: evento.duracao ?? Infinity, // sem duração: o sinal não volta
  };
  const incertezaKm = (INCERTEZA_INICIAL_M + FOLGA_AFASTAMENTO_M) / 1000;

  // Já está num lugar seguro: para ali mesmo
  if (seguroParaPairar(local, incertezaKm, regiao)) {
    return { ...semSinal, situacao: 'sem-gps', mensagem: `Sinal de GPS perdido no km ${evento.km}! Parado no ar, verificando o sinal` };
  }

  // Sobre via ou bairro: compara os dois caminhos para sair do risco
  const destino = voo.destinoFinal;
  const { zona } = zonaMaisProxima(local, regiao.zonas);
  const ateSeguroDestino = distanciaAteSeguro(local, destino, incertezaKm, regiao);
  const ateSeguroZona = Math.min(distanciaAteSeguro(local, zona, incertezaKm, regiao), distanciaKm(local, zona));

  // Indo para o destino, a bateria ainda cobre a ida até uma zona a partir de lá?
  let vaiParaDestino = false;
  if (Number.isFinite(ateSeguroDestino) && ateSeguroDestino <= ateSeguroZona + EMPATE_KM) {
    const ponto = posicaoNaRota(local, destino, ateSeguroDestino);
    const reserva = bateriaParaChegar(zonaMaisProxima(ponto, regiao.zonas).distancia);
    const sobra = (voo.bateria ?? 100) - CONSUMO_POR_KM * ateSeguroDestino;
    vaiParaDestino = sobra >= reserva;
  }

  const alvo = vaiParaDestino
    ? posicaoNaRota(local, destino, ateSeguroDestino)
    : posicaoNaRota(local, zona, ateSeguroZona);
  const rumo = vaiParaDestino ? 'em direção ao destino' : `em direção à ${zona.id}`;

  return {
    ...continuar(semSinal),
    origem: local,
    destino: alvo,
    km: 0,
    situacao: 'afastando',
    emergencia: true,
    mensagem: `Sinal de GPS perdido sobre área de risco! Afastando-se ${rumo} enquanto verifica o sinal`,
  };
}

// O sinal voltou. Se o drone estava se afastando, esperando, ou indo para a zona
// por causa do GPS, ele retoma a entrega, mas só se a bateria cobrir a entrega
// E a ida, depois, até uma zona de pouso, com a margem. Senão, vai direto para a zona.
function recuperarGps(voo, regiao) {
  const limpo = { ...voo, semGps: false, incerteza: 0, segundosSemGps: 0 };
  const retomar =
    voo.situacao === 'afastando' || voo.situacao === 'sem-gps' || (voo.situacao === 'desviando' && voo.desvioPorGps);
  if (!retomar) return { ...limpo, mensagem: 'Sinal de GPS recuperado' }; // outra emergência: segue nela

  const local = posicaoAtual(voo);
  const destino = voo.destinoFinal;
  const zonaDepois = zonaMaisProxima(destino, regiao.zonas); // a zona mais perto do ponto de entrega
  const precisa = bateriaParaEntregarEIrAZona(distanciaKm(local, destino), zonaDepois.distancia);
  const tem = voo.bateria ?? 100;

  if (tem < precisa) {
    const motivo = `Sinal voltou, mas a bateria (${Math.round(tem)}%) não cobre entrega + zona de pouso (${Math.round(precisa)}%).`;
    if (voo.situacao === 'desviando') return { ...limpo, mensagem: `${motivo} Seguindo para a ${voo.destino.id}` };
    return desviarParaZona(limpo, local, regiao, motivo);
  }

  return {
    ...continuar(limpo),
    origem: local,
    destino,
    km: 0,
    situacao: 'voando',
    mensagem: 'Sinal de GPS recuperado! Retomando a entrega',
  };
}

// Um tique parado no ar sem GPS: continua esperando até bater um dos limites
function pairarSemGps(voo, regiao) {
  const local = posicaoAtual(voo);
  const { zona, distancia } = zonaMaisProxima(local, regiao.zonas);
  const reserva = bateriaParaChegar(distancia);

  const naReserva = voo.bateria !== undefined && voo.bateria <= reserva;
  const perdido = voo.incerteza >= INCERTEZA_MAXIMA_M;

  if (naReserva || perdido) {
    const motivo = naReserva
      ? `GPS não voltou e a bateria chegou à reserva para a ${zona.id}.`
      : `GPS não voltou e a posição ficou incerta demais (±${Math.round(voo.incerteza)} m).`;
    return { ...desviarParaZona(voo, local, regiao, `${motivo} Navegação de reserva:`), desvioPorGps: true };
  }

  return {
    ...voo,
    mensagem: `Sem GPS, parado em local seguro, verificando o sinal (reserva para a ${zona.id}: ${Math.round(reserva)}%)`,
  };
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
      if (voo.semGps) return null; // já está sem GPS
      if (emEmergencia) {
        return {
          ...voo,
          semGps: true,
          incerteza: INCERTEZA_INICIAL_M,
          segundosSemGps: 0,
          gpsDuracao: evento.duracao ?? Infinity,
          mensagem: 'GPS perdido durante a emergência: seguindo com navegação de reserva',
        };
      }
      return perderGps(voo, evento, regiao);

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

  // Terminou de se afastar da área de risco: agora para no ar e espera o sinal
  if (voo.situacao === 'afastando') {
    return { ...chegou, situacao: 'sem-gps', mensagem: 'Local seguro alcançado: parado no ar, verificando o sinal' };
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

  // Guarda o ponto de entrega, para retomar a rota depois de um desvio por GPS
  if (voo.destinoFinal === undefined) voo = { ...voo, destinoFinal: voo.destino };

  // Sem GPS: o tempo passa, o erro da posição cresce e o drone confere se o sinal voltou
  if (voo.semGps) {
    const segundos = segundosDoTique(voo, passoKm);
    const antes = voo.segundosSemGps;
    const depois = antes + segundos;
    voo = { ...voo, segundosSemGps: depois, incerteza: voo.incerteza + INCERTEZA_POR_SEGUNDO_M * segundos };

    // Verificação constante: o sinal voltou?
    if (depois >= voo.gpsDuracao) return recuperarGps(voo, regiao);

    // Eventos { durante: 'gps' } acontecem 10 s depois da perda (ou "apos" segundos)
    const evento = eventos.find((e) => {
      const quando = e.apos ?? SEGUNDOS_EVENTO_SEM_GPS;
      return e.durante === 'gps' && antes < quando && depois >= quando;
    });
    const reacao = evento ? aplicarEvento(voo, evento, regiao) : null;
    if (reacao) return reacao;
  }

  // A cada tique com os motores ligados, gasta bateria
  if (voo.bateria !== undefined) {
    voo = { ...voo, bateria: Math.max(voo.bateria - consumoDoTique(voo, passoKm), 0) };

    // Acabou a bateria no ar: os motores param. É como uma falha grave.
    const motoresLigados = consumoDoTique(voo, passoKm) > 0;
    if (voo.bateria === 0 && motoresLigados) {
      return abrirParaquedas(voo, posicaoAtual(voo), altitudeDoVoo(voo), regiao, 'Bateria esgotada!');
    }
  }

  // Subindo ou descendo na vertical: o drone não sai do lugar
  if (voo.situacao === 'decolando') return decolar(voo, eventos);
  if (voo.situacao === 'descendo') return descer(voo);

  // Sem GPS: parado no ar, tentando recuperar o sinal
  if (voo.situacao === 'sem-gps') return pairarSemGps(voo, regiao);

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
