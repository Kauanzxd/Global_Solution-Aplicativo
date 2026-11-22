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
//   'entregando'   pousado no ponto de entrega, deixando a carga (depois decola de volta)
// Fases finais (no chão): 'missao-concluida' (voltou ao hub), 'pouso-emergencia',
// 'pouso-paraquedas', 'pousou-hub', 'aguardando-resgate' e 'queda'.
//
// Etapas da missão (voo.etapa): 'ida' (hub → ponto de entrega) e 'volta' (de volta ao hub).
// Na missão de órgãos (voo.coleta definido), antes da ida vem a 'coleta':
// hub → hospital da coleta (pousa e pega o órgão) → hospital da entrega → filial.
//
// Eventos acontecem no "km da viagem", contado pelo HODÔMETRO: a distância total
// voada desde o hub, somando todos os trechos (como o odômetro de um carro).
// Assim, uma segunda falha pode acontecer no meio de um desvio de emergência.
import {
  BATERIA_POUSO_VERTICAL,
  CONSUMO_POR_KM,
  CONSUMO_POR_SEGUNDO,
  MARGEM_SEGURANCA,
  VELOCIDADE_CRUZEIRO_KM_S,
  bateriaParaChegar,
  bateriaParaEntregarEIrAZona,
  verificarDecolagem,
  verificarPercurso,
} from './bateria.js';
import { distanciaKm, zonaMaisProxima } from './distancia.js';
import {
  ANTECEDENCIA_KM,
  TIPOS_OBSTACULO,
  bolhaDe,
  criarObstaculo,
  deteccaoDe,
  medirObstaculo,
  posicaoObstaculo,
} from './obstaculos.js';
import { riscoNoPonto } from './risco.js';
import { DETECCAO_RADIO_KM, ID_NOSSO_DRONE, PRIORIDADES, explicarCriterio, quemDesvia } from './trafego.js';
import {
  ALTITUDE_MINIMA_PARAQUEDAS,
  MARGEM_POUSO_M,
  SEM_VENTO,
  escolherPouso,
  pontosCandidatos,
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

// Temperatura (superaquecimento de motores ou bateria)
// 'alta':    reduz a velocidade para esquentar menos; a bateria quente rende menos
// 'critica': risco de incêndio na bateria: pousa o quanto antes
const VELOCIDADE_TEMPERATURA_ALTA = 0.8; // anda a 80% da velocidade
const CONSUMO_TEMPERATURA_ALTA = 1.1; // gasta 10% a mais por segundo
// Por km, gasta mais ainda: demora 1/0,8 do tempo × 1,1 por segundo ≈ 1,4 vez o normal
const FATOR_KM_TEMPERATURA_ALTA = CONSUMO_TEMPERATURA_ALTA / VELOCIDADE_TEMPERATURA_ALTA;
const DISTANCIA_MAXIMA_CRITICA_KM = 1; // em temperatura crítica, só vai a uma zona até 1 km

// Desvio de obstáculos: segurança primeiro, o gasto não importa
const POTENCIA_MAXIMA = 1.5; // no desvio, anda 1,5 vez mais rápido
const CONSUMO_DESVIO = 2; // e gasta o dobro por segundo
const HORIZONTE_PREVISAO_S = 60; // só se preocupa com aproximações nos próximos 60 s
const DISTANCIA_SAI_DE_CENA_KM = 1; // depois de passar, o obstáculo some do mapa a 1 km
const FOLGA_IMPREVISIVEL_KM = 0.1; // com um drone que muda de rumo, 100 m a mais de margem
// Histerese: para COMEÇAR a desviar, basta a previsão entrar na bolha; para PARAR,
// a previsão precisa ficar 50% além da bolha. Sem isso, o drone "raspa" na borda
// (para de desviar, volta para a rota, encosta na bolha, desvia de novo...).
const HISTERESE = 1.5;
const VELOCIDADE_DRONE_KM_S = 0.015; // 15 m/s

// Bateria: quantos segundos de verdade cada tique representa nas fases paradas.
// (Andando, o tique é o tempo de voar o pedaço do caminho: 0,05 km a 15 m/s ≈ 3,3 s.)
const SEGUNDOS_TIQUE_VERTICAL = 1; // subindo ou descendo 3 m por tique, a 3 m/s
const SEGUNDOS_TIQUE_PAIRANDO = 5; // parado no ar, cada tique vale 5 s (para a espera não demorar na tela)

// Os valores "por tique" acima valem para um passo de 0,05 km. Se o passo for menor
// (o drone decidindo mais vezes, com mais precisão), tudo é proporcional: com metade
// do passo, sobe metade dos metros e passa metade do tempo. Assim a duração das fases
// na tela não muda, só a precisão.
const PASSO_REFERENCIA_KM = 0.05;
function fatorDoPasso(passoKm) {
  return passoKm / PASSO_REFERENCIA_KM;
}

// Entrega: quanto tempo o drone fica pousado no destino deixando a carga
const SEGUNDOS_ENTREGA = 30;
// Para subir e planar de paraquedas, precisa chegar a pelo menos 60 m (o paraquedas
// precisa de 30 m para abrir, e o resto vira alcance do planeio)
const ALTITUDE_MINIMA_SUBIR_PARA_PLANAR = 60;

// Fases em que a missão ainda está acontecendo (inclui a parada para entregar)
const NO_AR = [
  'decolando',
  'voando',
  'afastando',
  'desviando',
  'motor-fraco',
  'sem-gps',
  'planando',
  'descendo',
  'entregando',
];

export function estaNoAr(voo) {
  return NO_AR.includes(voo.situacao);
}

// Altitude do drone, em metros
export function altitudeDoVoo(voo) {
  if (!estaNoAr(voo) || voo.situacao === 'entregando') return 0;

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

// Nome de uma zona com o artigo certo. Zonas ("a ZP-USP") e filiais ("a Filial Santana")
// são femininas, então a regra é a mesma para as duas.
// forma: 'a' (para a ZP-USP), 'à' (à ZP-USP), 'na' (na ZP-USP)
function comArtigo(zona, forma) {
  return { a: `a ${zona.id}`, à: `à ${zona.id}`, na: `na ${zona.id}` }[forma];
}

// A filial (no código, "hub") mais perto de um ponto. As filiais estão na lista de zonas
// com ehHub: true, porque também são áreas seguras da SADEC.
function filialMaisProxima(local, zonas) {
  const filiais = zonas.filter((zona) => zona.ehHub);
  if (filiais.length === 0) return null;
  return filiais.reduce((melhor, filial) => (distanciaKm(local, filial) < distanciaKm(local, melhor) ? filial : melhor));
}

// Primeira letra maiúscula (para começar uma frase com o nome da zona)
function maiuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
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
    temperaturaAlta: voo.temperaturaAlta,
    prioridade: voo.prioridade, // tipo de missão: orgaos, emergencia, saude ou comercial
    tempo: voo.tempo, // relógio da simulação, em segundos
    obstaculos: voo.obstaculos, // obstáculos em movimento já em cena
    etapa: voo.etapa, // 'ida' ou 'volta'
    hub: voo.hub, // de onde o drone saiu (e para onde volta)
    destinoFinal: voo.destinoFinal, // o alvo da etapa: ponto de entrega na ida, hub na volta
    destinoEntrega: voo.destinoEntrega, // missão de órgãos: o hospital da entrega (depois da coleta)
    // GPS
    semGps: voo.semGps,
    incerteza: voo.incerteza,
    segundosSemGps: voo.segundosSemGps,
    gpsDuracao: voo.gpsDuracao,
  };
}

// Quantos segundos de verdade este tique representa
function segundosDoTique(voo, passoKm) {
  const parado = voo.situacao === 'decolando' || voo.situacao === 'descendo' || voo.situacao === 'entregando';
  if (parado) return SEGUNDOS_TIQUE_VERTICAL * fatorDoPasso(passoKm);
  if (voo.situacao === 'sem-gps') return SEGUNDOS_TIQUE_PAIRANDO * fatorDoPasso(passoKm);
  return passoKm / VELOCIDADE_CRUZEIRO_KM_S; // andando: o tempo de voar o pedaço (≈ 3,3 s)
}

// Quanto de bateria (%) o drone gasta neste tique
function consumoDoTique(voo, passoKm) {
  // De paraquedas ou pousado entregando, os motores estão desligados: não gasta nada
  if (voo.situacao === 'planando' || voo.situacao === 'entregando') return 0;
  if (voo.situacao === 'descendo' && voo.paraquedasAberto) return 0;
  let extra = voo.temperaturaAlta ? CONSUMO_TEMPERATURA_ALTA : 1; // bateria quente rende menos
  if (voo.desviandoObstaculo) extra *= CONSUMO_DESVIO; // potência máxima no desvio
  return CONSUMO_POR_SEGUNDO * segundosDoTique(voo, passoKm) * extra;
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
function descer(voo, passoKm) {
  const passo = (voo.paraquedasAberto ? VERTICAL_PARAQUEDAS_POR_PASSO_M : VERTICAL_POR_PASSO_M) * fatorDoPasso(passoKm);
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
function decolar(voo, eventos, passoKm, regiao) {
  const altitude = Math.min(voo.altitude + VERTICAL_POR_PASSO_M * fatorDoPasso(passoKm), ALTITUDE_CRUZEIRO);

  // Subindo só para planar (sem bateria para voar até uma zona): no topo, abre o paraquedas
  if (voo.subirParaPlanar && altitude >= voo.alvoAltitude) {
    const subiu = { ...voo, altitude };
    const motivo = `Sem bateria para voar até uma zona: subiu a ${Math.round(altitude)} m e desligou os motores.`;
    return abrirParaquedas(subiu, posicaoAtual(subiu), altitude, regiao, motivo);
  }

  // O vento não é um problema na decolagem: ele só passa a valer quando o drone começa a andar.
  // Eventos no km 0 são só da PRIMEIRA decolagem, no hub (hodômetro ainda zerado). As outras
  // decolagens (depois da coleta e depois da entrega) não têm km 0.
  const naIda = (voo.hodometro ?? 0) === 0;
  const evento = eventos.find((e) => {
    const altitudeDoEvento = e.altitude ?? ALTITUDE_EVENTO_DECOLAGEM;
    return naIda && e.km === 0 && e.tipo !== 'vento' && voo.altitude < altitudeDoEvento && altitude >= altitudeDoEvento;
  });

  // Falha grave baixa demais para o paraquedas: o drone cai, mas dentro do hub,
  // longe de ruas e pessoas. É por isso que ele sobe na vertical antes de andar.
  if (evento && evento.tipo === 'falha-grave' && altitude < ALTITUDE_MINIMA_PARAQUEDAS) {
    return {
      ...voo,
      altitude: 0,
      situacao: 'queda',
      mensagem: `Falha grave a ${altitude} m: sem altura para o paraquedas. Caiu dentro da filial, longe de ruas e pessoas`,
    };
  }

  // Outros problemas na decolagem: desce de volta em cima do próprio hub
  if (evento) {
    const comParaquedas = evento.tipo === 'falha-grave';
    const mensagem = comParaquedas
      ? 'Falha grave na decolagem! Paraquedas aberto, descendo sobre a filial'
      : 'Problema na decolagem! Descendo de volta na filial';
    return iniciarDescida(
      { ...voo, paraquedasAberto: comParaquedas },
      altitude,
      mensagem,
      'pousou-hub',
      'Pousou em segurança na filial da SADEC'
    );
  }

  if (altitude === ALTITUDE_CRUZEIRO) {
    // Chegou a 120 m: começa a andar. Se houver vento no km 0, ele começa a valer agora.
    const ventoNoKm0 = naIda ? eventos.find((e) => e.km === 0 && e.tipo === 'vento') : undefined;
    const vento = ventoNoKm0 ? criarVento(ventoNoKm0) : voo.vento;
    let mensagem = 'Voando...';
    if (voo.etapa === 'volta') mensagem = 'Voltando para a filial...';
    else if (voo.etapa === 'ida' && voo.destinoEntrega) mensagem = `Levando o órgão para ${voo.destinoEntrega.nome}...`;
    if (ventoNoKm0) mensagem = textoVento(vento);
    // O hodômetro conta a viagem inteira: na volta, continua de onde parou
    return { ...voo, altitude, situacao: 'voando', hodometro: voo.hodometro ?? 0, vento, mensagem };
  }
  return { ...voo, altitude };
}

// ---------- Entrega e volta ----------

// Bateria para sair do ponto de entrega e chegar a uma zona controlada:
// subir de novo (3%) + voar até lá + descer, tudo com a margem
function bateriaParaSairEChegar(distancia) {
  return bateriaParaChegar(distancia) + BATERIA_POUSO_VERTICAL * (1 + MARGEM_SEGURANCA);
}

// Pousado no ponto de entrega: espera o tempo da entrega e então decide para onde ir.
// O drone NÃO fica no ponto de entrega: ele precisa terminar numa zona controlada.
//   1. bateria para voltar ao hub? Volta.
//   2. senão: vai para a zona controlada mais perto que a bateria alcança com margem.
//   3. só se não alcançar nenhuma (não consegue voar com segurança) ele fica ali.
function entregar(voo, passoKm, regiao) {
  const segundos = (voo.segundosEntregando || 0) + segundosDoTique(voo, passoKm);
  if (segundos < SEGUNDOS_ENTREGA) return { ...voo, segundosEntregando: segundos };

  const local = posicaoAtual(voo);
  const tem = voo.bateria ?? 100;

  // Missão de órgãos: aqui foi a COLETA. Pega o órgão e decola para o hospital da entrega,
  // se a bateria cobrir a entrega e, depois, a ida até uma zona controlada (com a margem).
  if (voo.etapa === 'coleta') return decolarComOrgao(voo, local, tem, regiao);

  const hub = filialMaisProxima(local, regiao.zonas);

  // Para onde vai: a filial mais próxima, se der; senão, a zona mais perto que dá para alcançar
  let alvo = null;
  if (tem >= bateriaParaSairEChegar(distanciaKm(local, hub))) {
    alvo = hub;
  } else {
    const alcancaveis = regiao.zonas
      .filter((zona) => tem >= bateriaParaSairEChegar(distanciaKm(local, zona)))
      .sort((a, b) => distanciaKm(local, a) - distanciaKm(local, b));
    alvo = alcancaveis[0] || null;
  }

  // 3. Nenhuma zona ao alcance voando. Se der para SUBIR, sobe o quanto a bateria deixar,
  //    abre o paraquedas e plana para longe do ponto de entrega (que tem gente em volta),
  //    escolhendo uma zona de pouso se ela estiver ao alcance do planeio.
  if (!alvo) {
    // Altura que a bateria consegue subir (3% para 120 m), guardando 10% dela de reserva
    const altitudePossivel = Math.min(ALTITUDE_CRUZEIRO, (tem / BATERIA_POUSO_VERTICAL) * ALTITUDE_CRUZEIRO * 0.9);
    if (altitudePossivel >= ALTITUDE_MINIMA_SUBIR_PARA_PLANAR) {
      const alvoAltitude = Math.floor(altitudePossivel);
      return {
        ...continuar(voo),
        origem: local,
        destino: local,
        km: 0,
        altitude: 0,
        etapa: 'volta',
        prioridade: 'retorno',
        situacao: 'decolando',
        subirParaPlanar: true,
        alvoAltitude,
        mensagem: `Entrega feita, mas a bateria (${Math.round(tem)}%) não alcança nenhuma zona voando. Subindo a ${alvoAltitude} m para planar de paraquedas`,
      };
    }

    // Último caso: nem subir dá
    return {
      ...voo,
      situacao: 'aguardando-resgate',
      mensagem: `Entrega feita, mas a bateria (${Math.round(tem)}%) não dá nem para subir com segurança. O drone fica no ponto de entrega aguardando resgate`,
    };
  }

  const mensagem = alvo.ehHub
    ? `Entrega feita! Decolando para ${comArtigo(alvo, 'a')}`
    : `Entrega feita! A bateria não cobre a volta à filial: indo para ${comArtigo(alvo, 'a')}`;

  // Decola: o alvo da etapa passa a ser a filial (ou a zona), e a prioridade cai (está vazio)
  return {
    ...continuar(voo),
    origem: local,
    destino: alvo,
    destinoFinal: alvo,
    km: 0,
    altitude: 0,
    etapa: 'volta',
    prioridade: 'retorno',
    situacao: 'decolando',
    mensagem,
  };
}

// Depois da coleta: decola com o órgão para o hospital da entrega
function decolarComOrgao(voo, local, tem, regiao) {
  const entrega = voo.destinoEntrega;
  const zonaDepois = zonaMaisProxima(entrega, regiao.zonas);
  const precisa = bateriaParaEntregarEIrAZona(distanciaKm(local, entrega), zonaDepois.distancia) + BATERIA_POUSO_VERTICAL * (1 + MARGEM_SEGURANCA);
  if (tem < precisa) {
    return {
      ...voo,
      situacao: 'aguardando-resgate',
      mensagem: `Órgão coletado, mas a bateria (${Math.round(tem)}%) não cobre a entrega com margem (${Math.round(precisa)}%). O drone fica no hospital e o órgão segue por outro meio de transporte`,
    };
  }
  return {
    ...continuar(voo),
    origem: local,
    destino: entrega,
    destinoFinal: entrega,
    km: 0,
    altitude: 0,
    etapa: 'ida',
    situacao: 'decolando',
    mensagem: `Órgão coletado! Decolando para ${entrega.nome}`,
  };
}

// O que falta para terminar a etapa, e quanto de bateria isso exige (já com a margem).
// Na ida: entregar e depois ainda chegar a uma zona de pouso. Na volta: chegar ao hub.
function bateriaParaTerminar(voo, local, regiao) {
  if (voo.etapa === 'volta') {
    const alvo = voo.destinoFinal; // a filial, ou a zona escolhida depois da entrega
    const oQue = alvo.ehHub ? `a volta ${comArtigo(alvo, 'à')}` : `a ida ${comArtigo(alvo, 'à')}`;
    return { precisa: bateriaParaChegar(distanciaKm(local, alvo)), oQue };
  }
  // Na coleta: chegar ao hospital da coleta, pousar, subir, levar o órgão até a entrega e,
  // de lá, ainda chegar a uma zona controlada
  if (voo.etapa === 'coleta') {
    const coleta = voo.destinoFinal;
    const entrega = voo.destinoEntrega;
    const zonaDepois = zonaMaisProxima(entrega, regiao.zonas);
    const distancia = distanciaKm(local, coleta) + distanciaKm(coleta, entrega);
    return {
      precisa: bateriaParaEntregarEIrAZona(distancia, zonaDepois.distancia) + BATERIA_POUSO_VERTICAL * 2 * (1 + MARGEM_SEGURANCA),
      oQue: 'a coleta e a entrega do órgão',
    };
  }
  const destino = voo.destinoFinal;
  const zonaDepois = zonaMaisProxima(destino, regiao.zonas); // a zona mais perto do ponto de entrega
  return {
    precisa: bateriaParaEntregarEIrAZona(distanciaKm(local, destino), zonaDepois.distancia),
    oQue: 'a entrega',
  };
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
  const pouso = escolherPouso(
    local,
    altitude,
    regiao.zonas,
    regiao.areas,
    regiao.vias,
    vento,
    incerteza / 1000,
    regiao.locais || [] // pontos de entrega: só desce perto deles se não houver outra opção
  );

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

// Para onde ir numa emergência com os motores bons: uma FILIAL é sempre o melhor lugar
// (área controlada da SADEC). A mais próxima é escolhida se der para chegar lá com segurança:
//   - bateria para chegar com a margem de 30% (e o gasto extra se estiver quente);
//   - sem GPS, o erro da posição não pode passar do máximo no caminho até lá.
// Senão, a zona controlada mais próxima.
function escolherZona(voo, local, regiao) {
  const hub = filialMaisProxima(local, regiao.zonas);
  if (hub) {
    const distancia = distanciaKm(local, hub);
    const fator = voo.temperaturaAlta ? FATOR_KM_TEMPERATURA_ALTA : 1;
    const bateriaOk = (voo.bateria ?? 100) >= bateriaParaChegar(distancia) * fator;
    const segundosAteLa = distancia / VELOCIDADE_CRUZEIRO_KM_S;
    const gpsOk = !voo.semGps || voo.incerteza + INCERTEZA_POR_SEGUNDO_M * segundosAteLa <= INCERTEZA_MAXIMA_M;
    if (bateriaOk && gpsOk) return hub;
  }
  return zonaMaisProxima(local, regiao.zonas).zona;
}

// Desvia para uma zona controlada (o hub, se der), com os motores bons, a 120 m.
// "imediato": true = vai para a zona MAIS PRÓXIMA, sem preferir o hub (ex.: risco de incêndio)
function desviarParaZona(voo, local, regiao, motivo, imediato = false) {
  const zona = imediato ? zonaMaisProxima(local, regiao.zonas).zona : escolherZona(voo, local, regiao);
  // Se é a zona mais próxima, a mensagem diz isso. Explica um caso que parecia contraditório:
  // "não cobre a volta à filial (com margem)... desviando para a filial": sem margem, ela
  // continua sendo a melhor opção quando é também a zona controlada mais perto.
  const maisProxima = zonaMaisProxima(local, regiao.zonas).zona === zona;
  const explicacao = maisProxima ? ', a zona controlada mais próxima' : '';
  return {
    ...continuar(voo),
    origem: local,
    destino: zona,
    km: 0,
    situacao: 'desviando',
    emergencia: true,
    mensagem: `${motivo} Desviando para ${comArtigo(zona, 'a')}${explicacao}`,
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
    return abrirParaquedas(voo, local, altitude, regiao, `${motivo} Chegada ${comArtigo(zona, 'à')} arriscada.`);
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
    mensagem: `${motivo} Rumo ${comArtigo(zona, 'à')}, chegada prevista: ${Math.round(prevista)} m`,
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
  // Entre as zonas em que ele chega com folga, o hub é o preferido; senão, a mais perto
  const hubSeguro = seguras.find((a) => a.zona.ehHub);
  return seguirComMotorFraco(voo, local, altitude, (hubSeguro || seguras[0]).zona, regiao, motivo);
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
  const risco = riscoNoPonto(ponto, regiao.areas, regiao.vias, incertezaKm, regiao.locais || []);
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
  const rumo = vaiParaDestino ? 'em direção ao destino' : `em direção ${comArtigo(zona, 'à')}`;

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
  const { precisa, oQue } = bateriaParaTerminar(voo, local, regiao);
  const tem = voo.bateria ?? 100;

  if (tem < precisa) {
    const motivo = `Sinal voltou, mas a bateria (${Math.round(tem)}%) não cobre ${oQue} com margem (${Math.round(precisa)}%).`;
    if (voo.situacao === 'desviando') return { ...limpo, mensagem: `${motivo} Seguindo para ${comArtigo(voo.destino, 'a')}` };
    return desviarParaZona(limpo, local, regiao, motivo);
  }

  return {
    ...continuar(limpo),
    origem: local,
    destino,
    km: 0,
    situacao: 'voando',
    mensagem: `Sinal de GPS recuperado! Retomando ${oQue}`,
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
      ? `GPS não voltou e a bateria chegou à reserva para ${comArtigo(zona, 'a')}.`
      : `GPS não voltou e a posição ficou incerta demais (±${Math.round(voo.incerteza)} m).`;
    return { ...desviarParaZona(voo, local, regiao, `${motivo} Navegação de reserva:`), desvioPorGps: true };
  }

  return {
    ...voo,
    mensagem: `Sem GPS, parado em local seguro, verificando o sinal (reserva para ${comArtigo(zona, 'a')}: ${Math.round(reserva)}%)`,
  };
}

// ---------- Temperatura ----------
// Evento: { tipo: 'temperatura', km: 2 } = temperatura alta
//         { tipo: 'temperatura', km: 2, grau: 'critica' } = crítica
// Uma segunda temperatura alta, com o drone já quente, vira crítica.

// Temperatura alta: reduz a velocidade e recalcula a bateria com o gasto maior.
// Se não der para entregar e ainda ir a uma zona com margem, vai direto para a zona.
function temperaturaAlta(voo, local, regiao, motivo) {
  const quente = { ...voo, temperaturaAlta: true };
  if (voo.situacao !== 'voando') {
    return { ...quente, mensagem: `${motivo} Velocidade reduzida para esfriar` }; // já em emergência
  }

  const terminar = bateriaParaTerminar(voo, local, regiao);
  const precisa = terminar.precisa * FATOR_KM_TEMPERATURA_ALTA;
  const tem = voo.bateria ?? 100;

  if (tem < precisa) {
    return desviarParaZona(
      quente,
      local,
      regiao,
      `${motivo} Mais devagar e gastando mais, a bateria (${Math.round(tem)}%) não cobre ${terminar.oQue} (${Math.round(precisa)}%).`
    );
  }
  return { ...quente, mensagem: `${motivo} Velocidade reduzida para esfriar, ${terminar.oQue} continua` };
}

// Temperatura crítica: risco de incêndio. Pousa o quanto antes, num lugar sem gente:
// a zona de pouso mais próxima, se estiver a até 1 km; senão, o ponto seguro mais perto.
function temperaturaCritica(voo, local, regiao, motivo) {
  const { zona, distancia } = zonaMaisProxima(local, regiao.zonas);
  if (distancia <= DISTANCIA_MAXIMA_CRITICA_KM) {
    return desviarParaZona(voo, local, regiao, `${motivo} Pouso imediato.`, true);
  }

  // Procura, num raio de 1 km, o ponto seguro (sem via nem bairro) mais perto
  const seguros = pontosCandidatos(local, DISTANCIA_MAXIMA_CRITICA_KM)
    .filter((ponto) => seguroParaPairar(ponto, incertezaDoVoo(voo) / 1000, regiao))
    .sort((a, b) => distanciaKm(local, a) - distanciaKm(local, b));

  if (seguros.length === 0) return desviarParaZona(voo, local, regiao, `${motivo} Pouso imediato.`, true);

  const areaSegura = { ...seguros[0], id: 'área segura mais próxima' };
  return {
    ...continuar(voo),
    origem: local,
    destino: areaSegura,
    km: 0,
    situacao: 'desviando',
    emergencia: true,
    mensagem: `${motivo} ${maiuscula(comArtigo(zona, 'a'))} está longe: pouso imediato na área segura mais próxima`,
  };
}

// ---------- Bateria ----------
// Evento: { tipo: 'bateria', km: 2, perda: 30 } = uma célula falha e a bateria cai 30 pontos.
// Sem "perda", cai 20. Depois da queda, o drone refaz as contas, do melhor para o pior caso:
//   1. ainda cobre a entrega + zona + margem? Segue a entrega.
//   2. cobre ir a uma zona com margem? Vai para a zona.
//   3. nem isso? Resposta "não ou talvez": abre o paraquedas agora, enquanto está alto.
const PERDA_BATERIA_PADRAO = 20;

function falhaBateria(voo, local, altitude, regiao, motivo) {
  const tem = voo.bateria;
  const fator = voo.temperaturaAlta ? FATOR_KM_TEMPERATURA_ALTA : 1; // quente, gasta mais por km

  // 1. Em voo normal: ainda dá para terminar a etapa (a entrega, ou a volta ao hub)?
  const terminar = bateriaParaTerminar(voo, local, regiao);
  if (voo.situacao === 'voando') {
    const precisa = terminar.precisa * fator;
    if (tem >= precisa) {
      return { ...voo, mensagem: `${motivo} Ainda cobre ${terminar.oQue} (tem ${Math.round(tem)}%, precisa ${Math.round(precisa)}%)` };
    }
  }

  // Esperando o GPS: a espera já confere a reserva a cada tique
  if (voo.situacao === 'sem-gps' || voo.situacao === 'afastando') return { ...voo, mensagem: motivo };

  // 2. Dá para chegar a uma zona com margem? (se já estava indo para uma, confere essa)
  const jaIndoParaZona = voo.situacao === 'desviando' || voo.situacao === 'motor-fraco';
  const alvo = jaIndoParaZona
    ? { zona: voo.destino, distancia: distanciaKm(local, voo.destino) }
    : (() => {
        const zona = escolherZona(voo, local, regiao); // o hub, se der; senão, a mais próxima
        return { zona, distancia: distanciaKm(local, zona) };
      })();

  if (tem >= bateriaParaChegar(alvo.distancia) * fator) {
    if (jaIndoParaZona) return { ...voo, mensagem: `${motivo} Ainda chega ${comArtigo(alvo.zona, 'à')} com margem` };
    return desviarParaZona(voo, local, regiao, `${motivo} Não cobre mais ${terminar.oQue}.`);
  }

  // 3. Não chega com margem a lugar nenhum: paraquedas agora
  return abrirParaquedas(voo, local, altitude, regiao, `${motivo} Sem bateria para chegar com segurança a uma zona.`);
}

// ---------- Obstáculos em movimento ----------
// A cada tique, para cada obstáculo que os sensores enxergam (até 400 m), o drone:
//   1. mede a posição e a velocidade dele (comparando com 1 segundo antes);
//   2. prevê o PONTO DE MAIOR APROXIMAÇÃO: se os dois seguirem assim, quando e a
//      que distância vão ficar um do outro;
//   3. se essa distância for menor que a bolha de segurança, desvia AGORA, com
//      potência máxima, para o lado que o afasta de onde o obstáculo vai estar.
// Como tudo é refeito a cada tique, se o obstáculo mudar de rumo, o desvio muda junto.
// Evento: { tipo: 'obstaculo', km: 2, objeto: 'passaros' } ou objeto: 'guindaste'

// Direção (tamanho 1) do drone até o alvo do trecho atual
function direcaoDoTrecho(voo) {
  const local = posicaoAtual(voo);
  const total = distanciaKm(local, voo.destino);
  if (total === 0) return { x: 0, y: 0 };
  return { x: (voo.destino.x - local.x) / total, y: (voo.destino.y - local.y) / total };
}

// A ameaça mais urgente, ou null se nenhum obstáculo vai chegar perto demais
function ameacaMaisUrgente(voo) {
  const local = posicaoAtual(voo);
  const direcao = direcaoDoTrecho(voo);
  const velocidadeDrone = { x: direcao.x * VELOCIDADE_DRONE_KM_S, y: direcao.y * VELOCIDADE_DRONE_KM_S };
  let maisUrgente = null;

  for (const obstaculo of voo.obstaculos || []) {
    // 1. O sensor mede o ponto mais perigoso do obstáculo, agora e 1 segundo antes
    const { agora, antes } = medirObstaculo(obstaculo, voo.tempo, local);
    const distancia = distanciaKm(local, agora);
    if (distancia > deteccaoDe(obstaculo)) continue; // o sensor ainda não enxerga

    // A velocidade é quanto esse ponto andou no último segundo
    const velocidadeObstaculo = { x: agora.x - antes.x, y: agora.y - antes.y };

    // 2. Ponto de maior aproximação, com posição e velocidade RELATIVAS
    const r = { x: agora.x - local.x, y: agora.y - local.y }; // onde ele está, visto do drone
    const v = { x: velocidadeObstaculo.x - velocidadeDrone.x, y: velocidadeObstaculo.y - velocidadeDrone.y };
    const v2 = v.x ** 2 + v.y ** 2;
    const t = v2 > 0 ? Math.max(0, -(r.x * v.x + r.y * v.y) / v2) : 0; // segundos até lá
    const futuro = { x: r.x + v.x * t, y: r.y + v.y * t }; // onde ele estará, visto do drone
    const menorDistancia = Math.sqrt(futuro.x ** 2 + futuro.y ** 2);

    // Outro drone com acordo de que ELE desvia: confiamos no combinado e seguimos reto,
    // mas continuamos vigiando: se ele entrar na nossa bolha, reagimos mesmo assim
    let bolha = bolhaDe(obstaculo);
    const eleDesvia = obstaculo.tipo === 'drone' && obstaculo.acordo && obstaculo.acordo.desvia === obstaculo.id;
    if (eleDesvia && distancia > bolha) continue;

    // Os dois sem rádio: o outro CONTA que nós também vamos desviar pela direita.
    // Por isso não basta "ele já está desviando": usamos uma bolha bem maior e desviamos também.
    if (obstaculo.tipo === 'drone' && obstaculo.regraDoAr) bolha = bolha + TIPOS_OBSTACULO.drone.desvioKm;

    // Drone sem rádio mudando de rumo: a previsão em linha reta envelhece rápido (ele anda
    // em zigue-zague). Pensando no pior caso, somamos uma folga à bolha e, além da previsão,
    // usamos uma regra de distância: perto demais E se aproximando = continua se afastando.
    const imprevisivel = obstaculo.tipo === 'drone' && obstaculo.comportamento === 'errante';
    if (imprevisivel) bolha = bolha + FOLGA_IMPREVISIVEL_KM;

    // Já desviando? Só para quando houver folga de verdade (histerese)
    if (voo.desviandoObstaculo) bolha = bolha * HISTERESE;

    // Regra de distância (só para os imprevisíveis): perto demais e chegando mais perto
    const seAproximando = r.x * v.x + r.y * v.y < 0;
    if (imprevisivel && distancia < bolha && seAproximando && (!maisUrgente || 0 < maisUrgente.t)) {
      maisUrgente = { obstaculo, t: 0, futuro: r, distancia, direcao };
      continue;
    }

    // 3. Vai entrar na bolha nos próximos 60 s? É uma ameaça. Fica com a mais próxima no tempo.
    if (t <= HORIZONTE_PREVISAO_S && menorDistancia < bolha && (!maisUrgente || t < maisUrgente.t)) {
      maisUrgente = { obstaculo, t, futuro, distancia, direcao };
    }
  }
  return maisUrgente;
}

// Um tique de desvio: anda com potência máxima, quase de lado, para longe de onde o obstáculo vai estar
function desviarDeObstaculo(voo, ameaca, passoKm) {
  const local = posicaoAtual(voo);
  const { direcao, futuro } = ameaca;

  // Para longe do ponto futuro do obstáculo, só a parte de lado (a frente continua sendo a rota)
  let fuga = { x: -futuro.x, y: -futuro.y };
  const frente = fuga.x * direcao.x + fuga.y * direcao.y;
  fuga = { x: fuga.x - frente * direcao.x, y: fuga.y - frente * direcao.y };
  let tamanho = Math.sqrt(fuga.x ** 2 + fuga.y ** 2);
  // Vai pela direita (regra do ar) quando: está bem de frente (sem lado melhor), quando
  // combinou com o outro drone, ou quando os dois estão sem rádio. O outro CONTA com isso.
  // Com um drone sem rádio imprevisível, foge para longe de onde ele vai estar.
  const combinado = ameaca.obstaculo.tipo === 'drone' && ameaca.obstaculo.comunicacao;
  const regraDoAr = ameaca.obstaculo.tipo === 'drone' && ameaca.obstaculo.regraDoAr;
  if (tamanho < 1e-6 || combinado || regraDoAr) {
    fuga = { x: -direcao.y, y: direcao.x };
    tamanho = 1;
  }

  // Drone imprevisível (zigue-zague): o lado do desvio fica TRAVADO do começo ao fim.
  // Sem isso, o balanço dele faria o nosso drone trocar de lado a cada instante.
  const errante = ameaca.obstaculo.tipo === 'drone' && ameaca.obstaculo.comportamento === 'errante';
  let ladoDesvio = voo.ladoDesvio;
  if (errante) {
    const ladoAgora = { x: fuga.x / tamanho, y: fuga.y / tamanho };
    if (!ladoDesvio) ladoDesvio = ladoAgora; // primeiro tique do desvio: escolhe o lado
    fuga = ladoDesvio;
    tamanho = 1;
  }

  // Mistura: um pouco para frente + bastante de lado
  let movimento = { x: direcao.x * 0.3 + fuga.x / tamanho, y: direcao.y * 0.3 + fuga.y / tamanho };

  // Drone imprevisível DENTRO da bolha de verdade: perigo imediato, o mais seguro é se
  // AFASTAR dele, até recuando. Fora dela (só na margem extra), contorna pelo lado
  // travado, avançando um pouco: assim o drone passa por ele em vez de ir e voltar.
  if (errante && ameaca.distancia < bolhaDe(ameaca.obstaculo)) {
    movimento = { x: -ameaca.futuro.x, y: -ameaca.futuro.y };
  }
  const tamanhoMovimento = Math.sqrt(movimento.x ** 2 + movimento.y ** 2);
  const passo = passoKm * POTENCIA_MAXIMA;
  const novo = {
    x: local.x + (movimento.x / tamanhoMovimento) * passo,
    y: local.y + (movimento.y / tamanhoMovimento) * passo,
  };

  const nome = TIPOS_OBSTACULO[ameaca.obstaculo.tipo].nome;
  const metros = Math.round(ameaca.distancia * 1000);
  let mensagem = `${nome} a ${metros} m! Desvio com potência máxima`;
  if (combinado) mensagem = `Desviando pela direita do ${ameaca.obstaculo.id}, como combinado (${metros} m)`;
  else if (regraDoAr) mensagem = `Regra do ar: desviando pela direita (${metros} m)`;
  else if (ameaca.obstaculo.tipo === 'drone') mensagem = `Drone sem rádio a ${metros} m! Nós desviamos, com potência máxima`;
  return {
    ...voo,
    origem: novo, // o trecho recomeça de onde o drone foi parar, rumo ao mesmo alvo
    km: 0,
    hodometro: (voo.hodometro || 0) + passo,
    desviandoObstaculo: true,
    ladoDesvio: errante ? ladoDesvio : voo.ladoDesvio,
    mensagem,
  };
}

// ---------- Conversa entre drones ----------
// Ao se ouvirem pelo rádio (500 m), os dois drones trocam id, prioridade e bateria,
// e cada um roda a mesma regra (quemDesvia). Como os dados e a regra são iguais,
// os dois chegam ao mesmo acordo: só um desvia, pela direita; o outro segue reto.
function negociar(voo, outro) {
  const nos = { id: ID_NOSSO_DRONE, prioridade: voo.prioridade ?? 'saude', bateria: Math.round(voo.bateria ?? 100) };
  const dele = { id: outro.id, prioridade: outro.prioridade, bateria: Math.round(outro.bateria) };
  const { desvia, criterio } = quemDesvia(nos, dele);

  const acordo = { desvia, tempo: voo.tempo };
  const obstaculos = voo.obstaculos.map((o) => (o === outro ? { ...o, acordo } : o));

  const nomeNos = PRIORIDADES[nos.prioridade].nome;
  const nomeDele = PRIORIDADES[dele.prioridade].nome;
  const decisao =
    desvia === ID_NOSSO_DRONE
      ? `nós (${nomeNos}, ${nos.bateria}%) desviamos pela direita; ${outro.id} (${nomeDele}) segue reto`
      : `${outro.id} (${nomeDele}, ${dele.bateria}%) desvia pela direita; nós (${nomeNos}) seguimos reto`;

  return {
    ...voo,
    obstaculos,
    mensagem: `Drone ${outro.id} a ${Math.round(DETECCAO_RADIO_KM * 1000)} m. Conversa pelo rádio... Acordo (${explicarCriterio(criterio, nos, dele)}): ${decisao}`,
  };
}

// Drone SEM rádio detectado pelos sensores: não dá para conversar.
// Se só ele está sem rádio, o nosso drone assume o desvio (mesmo levando um órgão),
// porque o outro não pode garantir nada. Se os dois estão sem rádio, vale a regra do ar:
// cada um desvia pela própria direita, e assim os lados nunca coincidem.
const NOMES_COMPORTAMENTO = { reto: 'vindo de frente', pairando: 'parado no ar', errante: 'mudando de rumo' };

function detectarSemRadio(voo, outro) {
  const desvia = outro.regraDoAr ? 'ambos' : ID_NOSSO_DRONE;
  const obstaculos = voo.obstaculos.map((o) => (o === outro ? { ...o, acordo: { desvia, tempo: voo.tempo } } : o));
  const metros = Math.round(outro.deteccaoKm * 1000);
  const como = NOMES_COMPORTAMENTO[outro.comportamento];
  const gps = outro.semGps ? ', sem GPS (bolha maior)' : '';

  const mensagem = outro.regraDoAr
    ? `Drone sem rádio a ${metros} m, e nós também sem rádio! Regra do ar: cada um desvia pela própria direita`
    : `Drone sem rádio a ${metros} m (${como}${gps})! Sem conversa possível: nós desviamos`;
  return { ...voo, obstaculos, mensagem };
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

    case 'obstaculo':
    case 'drone':
      return null; // já entrou em cena antes (ANTECEDENCIA_KM); quem reage é o desviador

    case 'bateria': {
      if (voo.situacao === 'planando') return null; // motores desligados: a bateria não importa mais
      const perda = evento.perda ?? PERDA_BATERIA_PADRAO;
      const comMenos = { ...voo, bateria: Math.max((voo.bateria ?? 100) - perda, 0) };
      return falhaBateria(comMenos, local, altitude, regiao, `Falha numa célula da bateria ${onde}! Perdeu ${perda}%.`);
    }

    case 'temperatura':
      if (voo.situacao === 'planando') return null; // motores desligados: já não esquentam
      // Crítica, ou alta com o drone já quente
      if (evento.grau === 'critica' || voo.temperaturaAlta) {
        return temperaturaCritica(voo, local, regiao, `Temperatura crítica ${onde}!`);
      }
      return temperaturaAlta(voo, local, regiao, `Temperatura alta ${onde}!`);

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

  if (voo.situacao === 'voando' && voo.etapa === 'volta') {
    const alvo = voo.destino;
    if (alvo.ehHub) {
      return iniciarDescida(
        chegou,
        ALTITUDE_CRUZEIRO,
        `Sobre ${comArtigo(alvo, 'a')}: descendo na vertical`,
        'missao-concluida',
        `Missão concluída: pousou ${comArtigo(alvo, 'na')}!`
      );
    }
    return iniciarDescida(
      chegou,
      ALTITUDE_CRUZEIRO,
      `Sobre ${comArtigo(alvo, 'a')}: descendo na vertical`,
      'pouso-emergencia',
      `Entrega concluída. Pouso seguro ${comArtigo(alvo, 'na')} (a bateria não cobria a volta à filial)`
    );
  }

  if (voo.situacao === 'voando' && voo.etapa === 'coleta') {
    return iniciarDescida(
      chegou,
      ALTITUDE_CRUZEIRO,
      `Sobre ${voo.destino.nome}: descendo para coletar o órgão`,
      'entregando',
      'Pousou no hospital da coleta: carregando o órgão na caixa térmica...'
    );
  }

  if (voo.situacao === 'voando') {
    return iniciarDescida(
      chegou,
      ALTITUDE_CRUZEIRO,
      'Sobre o destino: descendo na vertical',
      'entregando',
      'Pousou no ponto de entrega: entregando a carga...'
    );
  }

  // Terminou de se afastar da área de risco: agora para no ar e espera o sinal
  if (voo.situacao === 'afastando') {
    return { ...chegou, situacao: 'sem-gps', mensagem: 'Local seguro alcançado: parado no ar, verificando o sinal' };
  }

  if (voo.situacao === 'desviando' || voo.situacao === 'motor-fraco') {
    const zona = voo.destino;
    const altitude = altitudeDoVoo(chegou); // com motor fraco, chega mais baixo
    return iniciarDescida(
      chegou,
      altitude,
      `Sobre ${comArtigo(zona, 'a')}: descendo na vertical`,
      'pouso-emergencia',
      `Pouso seguro ${comArtigo(zona, 'na')}`
    );
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

  // No começo: guarda o hub (de onde saiu), o ponto de entrega e a etapa da missão.
  // Missão de órgãos: o primeiro alvo é o hospital da coleta; a entrega fica guardada.
  if (voo.hub === undefined && voo.coleta) {
    voo = { ...voo, destinoEntrega: voo.destino, destino: voo.coleta, destinoFinal: voo.coleta, etapa: 'coleta' };
  }
  if (voo.destinoFinal === undefined) voo = { ...voo, destinoFinal: voo.destino };
  if (voo.hub === undefined) {
    voo = { ...voo, hub: voo.origem, etapa: voo.etapa || 'ida' };

    // Regra que vale sempre: só decola se a bateria cobrir o percurso inteiro, com margem
    // (ida + volta; na missão de órgãos, filial → coleta → entrega → filial)
    if (voo.bateria !== undefined) {
      const decolagem = voo.destinoEntrega
        ? verificarPercurso([voo.origem, voo.coleta, voo.destinoEntrega, filialMaisProxima(voo.destinoEntrega, regiao.zonas) || voo.origem], voo.bateria)
        : verificarDecolagem(voo.origem, voo.destino, voo.bateria);
      if (!decolagem.pode) {
        return {
          ...voo,
          situacao: 'decolagem-negada',
          mensagem: `Decolagem negada: a bateria tem ${Math.round(voo.bateria)}%, mas o percurso + 30% de margem precisa de ${Math.round(decolagem.necessariaComMargem)}%`,
        };
      }
    }
  }

  // Zonas controladas: as zonas de pouso E as filiais (que também são áreas seguras da SADEC).
  // Em qualquer emergência, o drone procura uma delas, nunca o ponto de entrega.
  // Se quem chamou não mandou filiais na lista, a filial de onde ele saiu entra nela.
  if (!regiao.zonas.some((zona) => zona.ehHub)) {
    const nome = voo.hub.nome || 'Filial SADEC';
    regiao = { ...regiao, zonas: [...regiao.zonas, { id: nome, x: voo.hub.x, y: voo.hub.y, ehHub: true }] };
  }

  // O relógio da simulação anda (os obstáculos se movem conforme esse tempo)
  voo = { ...voo, tempo: (voo.tempo || 0) + segundosDoTique(voo, passoKm) };

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
  if (voo.situacao === 'entregando') return entregar(voo, passoKm, regiao);
  if (voo.situacao === 'decolando') return decolar(voo, eventos, passoKm, regiao);
  if (voo.situacao === 'descendo') return descer(voo, passoKm);

  // Sem GPS: parado no ar, tentando recuperar o sinal
  if (voo.situacao === 'sem-gps') return pairarSemGps(voo, regiao);

  let passo = passoKm;
  if (voo.situacao === 'planando') passo = passoKm * VELOCIDADE_PARAQUEDAS;
  if (voo.situacao === 'motor-fraco') passo = passoKm * VELOCIDADE_MOTOR_FRACO;
  if (voo.temperaturaAlta && voo.situacao !== 'planando') passo *= VELOCIDADE_TEMPERATURA_ALTA;

  const kmNovo = voo.km + passo;
  const total = distanciaKm(voo.origem, voo.destino);
  const hodometro = voo.hodometro || 0;
  const hodometroNovo = hodometro + passo;

  // Obstáculos entram em cena 800 m antes do km do evento (ainda fora do alcance do sensor)
  const novos = eventos.filter(
    (e) =>
      (e.tipo === 'obstaculo' || e.tipo === 'drone') &&
      hodometro < e.km - ANTECEDENCIA_KM &&
      hodometroNovo >= e.km - ANTECEDENCIA_KM
  );
  if (novos.length > 0) {
    const local = posicaoAtual(voo);
    const direcao = direcaoDoTrecho(voo);
    const criados = novos.map((e) => criarObstaculo(e, local, direcao, voo.tempo));
    voo = { ...voo, obstaculos: [...(voo.obstaculos || []), ...criados] };
  }

  // Obstáculos que já ficaram para trás (passou da hora do encontro e estão a mais de 1 km) saem de cena
  if (voo.obstaculos && voo.obstaculos.length > 0) {
    const aqui = posicaoAtual(voo);
    const aindaEmCena = voo.obstaculos.filter(
      (o) => voo.tempo < o.chegada || distanciaKm(aqui, medirObstaculo(o, voo.tempo, aqui).agora) < DISTANCIA_SAI_DE_CENA_KM
    );
    if (aindaEmCena.length !== voo.obstaculos.length) voo = { ...voo, obstaculos: aindaEmCena };
  }

  // Desviador em tempo real (com motor fraco ou de paraquedas não há potência para manobrar)
  const podeManobrar = voo.situacao !== 'planando' && voo.situacao !== 'motor-fraco';
  if (podeManobrar && voo.obstaculos && voo.obstaculos.length > 0) {
    // Outro drone da rede ao alcance do rádio e ainda sem acordo? Conversa primeiro.
    const local = posicaoAtual(voo);
    const semAcordo = voo.obstaculos.find(
      (o) =>
        o.tipo === 'drone' &&
        o.comunicacao &&
        !o.acordo &&
        distanciaKm(local, posicaoObstaculo(o, voo.tempo)) <= DETECCAO_RADIO_KM
    );
    if (semAcordo) return negociar(voo, semAcordo);

    // Drone sem rádio que os sensores acabaram de enxergar
    const semRadio = voo.obstaculos.find(
      (o) =>
        o.tipo === 'drone' &&
        !o.comunicacao &&
        !o.acordo &&
        distanciaKm(local, posicaoObstaculo(o, voo.tempo)) <= o.deteccaoKm
    );
    // A detecção não pode custar um tique: o drone já começa a desviar no mesmo instante
    if (semRadio) voo = detectarSemRadio(voo, semRadio);

    const ameaca = ameacaMaisUrgente(voo);
    if (ameaca) {
      const desviou = desviarDeObstaculo(voo, ameaca, passoKm);
      // No instante da detecção, mostra o aviso de detecção (o desvio já começou)
      return semRadio ? { ...desviou, mensagem: voo.mensagem } : desviou;
    }
    if (semRadio) return voo; // detectou, mas ainda não há rota de colisão

    // O perigo passou: refaz a conta da bateria, porque o desvio gastou mais
    if (voo.desviandoObstaculo) {
      const passou = { ...voo, desviandoObstaculo: false, ladoDesvio: undefined }; // destrava o lado
      return falhaBateria(passou, posicaoAtual(passou), altitudeDoVoo(passou), regiao, 'Desvio concluído.');
    }
  }

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
    const zona = comArtigo(voo.destino, 'à');

    if (respostaChegada(prevista) !== 'sim') {
      return abrirParaquedas(andou, local, altitude, regiao, `Chegada ${zona} ficou arriscada (${Math.round(prevista)} m previstos)!`);
    }
    const reserva = voo.semGps ? ' (navegação de reserva)' : '';
    return { ...andou, mensagem: `Motor fraco, rumo ${zona}${reserva}. Chegada prevista: ${Math.round(prevista)} m` };
  }

  // Chegou ao fim do trecho?
  if (kmNovo >= total) return chegarAoFim(voo, total);

  // Nada de especial: só anda
  return { ...voo, km: kmNovo, hodometro: hodometroNovo };
}
