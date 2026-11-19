// Regras de bateria do drone.
import { distanciaKm } from './distancia.js';

// Quanto da bateria (em %) o drone gasta por km voado.
// Com 5% por km, uma bateria cheia (100%) aguenta 20 km.
export const CONSUMO_POR_KM = 5;

// Em voo, o gasto depende do TEMPO com os motores ligados (pairar gasta quase o
// mesmo que voar). Voando a 15 m/s (0,015 km/s), 5% por km vira 0,075% por segundo.
export const VELOCIDADE_CRUZEIRO_KM_S = 0.015;
export const CONSUMO_POR_SEGUNDO = CONSUMO_POR_KM * VELOCIDADE_CRUZEIRO_KM_S; // 0,075% por segundo

// Margem de segurança: a bateria precisa ter 30% A MAIS do que a rota gasta.
// 0.3 é o mesmo que 30%.
export const MARGEM_SEGURANCA = 0.3;

// Quanto de bateria (%) uma distância gasta
export function bateriaNecessaria(distanciaKm) {
  return distanciaKm * CONSUMO_POR_KM;
}

// Descer 120 m na vertical (3 m por segundo = 40 s) também gasta: 40 s × 0,075% = 3%
export const BATERIA_POUSO_VERTICAL = (120 / 3) * CONSUMO_POR_SEGUNDO;

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
// Devolve a decisão (pode) e os números que levaram a ela, para mostrar na tela.
export function verificarDecolagem(origem, destino, bateriaAtual) {
  const distanciaTotal = distanciaKm(origem, destino) * 2; // ida + volta
  const necessaria = bateriaNecessaria(distanciaTotal);
  const necessariaComMargem = necessaria * (1 + MARGEM_SEGURANCA);

  return {
    pode: bateriaAtual >= necessariaComMargem,
    distanciaTotal,
    necessaria,
    necessariaComMargem,
  };
}
