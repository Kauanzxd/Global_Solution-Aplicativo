// Regras do voo do drone. Só contas, sem desenho.
import { distanciaKm } from './distancia.js';

// Onde o drone está depois de voar "kmVoados" na reta da origem até o destino.
// Usamos km (e não porcentagem) porque os eventos vão acontecer em km
// específicos, como "pane no km 1,5".
export function posicaoNaRota(origem, destino, kmVoados) {
  const total = distanciaKm(origem, destino);
  const progresso = Math.min(kmVoados / total, 1); // 0 = saindo, 1 = chegou

  return {
    x: origem.x + (destino.x - origem.x) * progresso,
    y: origem.y + (destino.y - origem.y) * progresso,
  };
}
