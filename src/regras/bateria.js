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
