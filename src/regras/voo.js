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
import { ALTITUDE_MINIMA_PARAQUEDAS, MARGEM_POUSO_M, SEM_VENTO, escolherPouso } from './paraquedas.js';

export const ALTITUDE_CRUZEIRO = 120; // metros: teto comum para drones no Brasil
const VELOCIDADE_PARAQUEDAS = 0.15; // planando, anda a 15% da velocidade normal
const VERTICAL_POR_PASSO_M = 3; // na vertical, com motor: 3 m a cada tique do relógio
const VERTICAL_PARAQUEDAS_POR_PASSO_M = 1.5; // descendo de paraquedas: mais devagar
const ALTITUDE_EVENTO_DECOLAGEM = 60; // eventos no km 0 acontecem a 60 m, se não disser outra

const NO_AR = ['decolando', 'voando', 'desviando', 'planando', 'descendo'];

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

  const evento = eventos.find((e) => {
    const altitudeDoEvento = e.altitude ?? ALTITUDE_EVENTO_DECOLAGEM;
    return e.km === 0 && voo.altitude < altitudeDoEvento && altitude >= altitudeDoEvento;
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
    return { ...voo, altitude, situacao: 'voando', mensagem: 'Voando...' };
  }
  return { ...voo, altitude };
}

// Falha grave em voo: os motores param. Abre o paraquedas e escolhe onde pousar.
function falhaGrave(voo, evento, regiao) {
  const local = posicaoNaRota(voo.origem, voo.destino, evento.km);
  const vento = voo.vento || SEM_VENTO;
  const pouso = escolherPouso(local, ALTITUDE_CRUZEIRO, regiao.zonas, regiao.areas, regiao.vias, vento);

  return {
    origem: local,
    destino: pouso.ponto,
    km: 0,
    situacao: 'planando',
    emergencia: true,
    paraquedasAberto: true,
    vento: voo.vento,
    altitudeInicial: ALTITUDE_CRUZEIRO,
    altitudeChegada: pouso.altitudeChegada,
    alcance: pouso.alcance,
    confortavel: pouso.confortavel,
    nomePouso: pouso.nome,
    mensagem: `Falha grave no km ${evento.km}! Paraquedas aberto, planando para ${pouso.nome}`,
  };
}

// Chegou ao fim do trecho: em vez de descer em rampa, para e desce na vertical
function chegarAoFim(voo, total) {
  const chegou = { ...voo, km: total };

  if (voo.situacao === 'voando') {
    return iniciarDescida(chegou, ALTITUDE_CRUZEIRO, 'Sobre o destino: descendo na vertical', 'entregue', 'Entrega concluída!');
  }

  if (voo.situacao === 'desviando') {
    const zona = voo.destino.id;
    return iniciarDescida(chegou, ALTITUDE_CRUZEIRO, `Sobre a ${zona}: descendo na vertical`, 'pouso-emergencia', `Pouso seguro na ${zona}`);
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

  const passo = voo.situacao === 'planando' ? passoKm * VELOCIDADE_PARAQUEDAS : passoKm;
  const kmNovo = voo.km + passo;

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
      mensagem: `Pane no km ${evento.km}! Desviando para a ${zona.id}`,
    };
  }

  if (evento && evento.tipo === 'falha-grave') {
    return falhaGrave(voo, evento, regiao);
  }

  // Chegou ao fim do trecho?
  const total = distanciaKm(voo.origem, voo.destino);
  if (kmNovo >= total) return chegarAoFim(voo, total);

  // Nada de especial: só anda
  return { ...voo, km: kmNovo };
}
