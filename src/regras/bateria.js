// Regras de bateria do drone.
import { distanciaKm } from './distancia.js';

// Referência real: ACSL PF4, drone multirrotor de logística desenvolvido com o Japan Post
// para entregas "Level 4" no Japão (voo fora da visão do piloto, sobre áreas habitadas).
// Ficha da fabricante: carga até 5,5 kg; 50 min de voo e 40 km de alcance COM carga máxima
// (70 min e mais de 50 km sem carga); velocidade máxima 20 m/s; sobe a 3 m/s e desce a 2 m/s.
// Usamos o caso conservador: sempre com carga máxima.
export const ALCANCE_MAXIMO_KM = 40;

// Quanto da bateria (em %) o drone gasta por km voado: 100% ÷ 40 km = 2,5% por km
export const CONSUMO_POR_KM = 100 / ALCANCE_MAXIMO_KM;

// Em voo, o gasto depende do TEMPO com os motores ligados (pairar gasta quase o
// mesmo que voar). Voando a 15 m/s (0,015 km/s), 2,5% por km vira 0,0375% por segundo:
// a bateria cheia dura uns 44 minutos (um pouco menos que os 50 da ficha: mais conservador).
export const VELOCIDADE_CRUZEIRO_KM_S = 0.015;
export const CONSUMO_POR_SEGUNDO = CONSUMO_POR_KM * VELOCIDADE_CRUZEIRO_KM_S; // 0,0375% por segundo

// Margem de segurança: a bateria precisa ter 30% A MAIS do que a rota gasta.
// 0.3 é o mesmo que 30%.
export const MARGEM_SEGURANCA = 0.3;

// Quanto de bateria (%) uma distância gasta
export function bateriaNecessaria(distanciaKm) {
  return distanciaKm * CONSUMO_POR_KM;
}

// Subir ou descer 120 m na vertical também gasta. Usamos a descida, que é a mais lenta
// (2 m/s, como na ficha do PF4): 60 s × 0,0375% = 2,25% (a subida, a 3 m/s, gasta menos)
export const BATERIA_POUSO_VERTICAL = (120 / 2) * CONSUMO_POR_SEGUNDO;

// Reserva: bateria para voar uma distância E descer até o chão, COM a margem de 30%.
// A margem é para imprevistos: ela deve sobrar no fim, não ser gasta no pouso.
export function bateriaParaChegar(distanciaKm) {
  return (bateriaNecessaria(distanciaKm) + BATERIA_POUSO_VERTICAL) * (1 + MARGEM_SEGURANCA);
}

// Bateria para TERMINAR a entrega e depois ainda chegar a uma zona de pouso, com margem:
//   voar até o destino + descer para entregar + subir de novo
//   + voar do destino até a zona + descer na zona, tudo × 1,3
// (subir 120 m gasta o mesmo que descer: 3%)
export function bateriaParaEntregarEIrAZona(distanciaAteDestino, distanciaDestinoAteZona) {
  const gasto =
    bateriaNecessaria(distanciaAteDestino) +
    BATERIA_POUSO_VERTICAL * 2 + // desce para entregar e sobe de novo
    bateriaNecessaria(distanciaDestinoAteZona) +
    BATERIA_POUSO_VERTICAL; // desce na zona
  return gasto * (1 + MARGEM_SEGURANCA);
}

// Antes de decolar: a bateria aguenta ir até o destino E voltar para a base, com margem?
// Conta também as 4 subidas/descidas na vertical: sobe no hub, desce na entrega,
// sobe de novo e desce no hub (3% cada).
// Devolve a decisão (pode) e os números que levaram a ela, para mostrar na tela.
export function verificarDecolagem(origem, destino, bateriaAtual) {
  const distanciaTotal = distanciaKm(origem, destino) * 2; // ida + volta
  const necessaria = bateriaNecessaria(distanciaTotal) + BATERIA_POUSO_VERTICAL * 4;
  const necessariaComMargem = necessaria * (1 + MARGEM_SEGURANCA);

  return {
    pode: bateriaAtual >= necessariaComMargem,
    distanciaTotal,
    necessaria,
    necessariaComMargem,
  };
}
