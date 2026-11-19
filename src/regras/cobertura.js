// Cobertura das filiais: todo ponto da cidade precisa estar ao alcance de pelo menos
// DUAS filiais. Assim, se uma filial estiver sem drone livre (ou fora do ar), outra atende.
// Só contas, sem desenho.
import { distanciaKm } from './distancia.js';

// Raio de operação de uma filial: 10 km. Ir e voltar 10 km com o ACSL PF4 gasta
// (20 km × 2,5% + 4 subidas/descidas × 2,25%) × 1,3 = 76,7% da bateria: sobra folga.
// (O limite teórico, com 100% de bateria, seria 13,6 km.)
export const RAIO_FILIAL_KM = 10;

// Quantas filiais alcançam um ponto (a até "raio" km dele)
export function filiaisQueAlcancam(ponto, filiais, raio = RAIO_FILIAL_KM) {
  return filiais.filter((filial) => distanciaKm(ponto, filial) <= raio).length;
}

// Confere uma lista de pontos. Devolve quantos estão cobertos por pelo menos "minimo"
// filiais, a lista dos que não estão e o pior caso (o ponto com menos filiais).
export function verificarCobertura(pontos, filiais, minimo = 2, raio = RAIO_FILIAL_KM) {
  const contagens = pontos.map((ponto) => ({ ponto, filiais: filiaisQueAlcancam(ponto, filiais, raio) }));
  const descobertos = contagens.filter((c) => c.filiais < minimo);
  const pior = contagens.reduce((a, b) => (b.filiais < a.filiais ? b : a), contagens[0]);
  return { total: pontos.length, cobertos: pontos.length - descobertos.length, descobertos, pior };
}
