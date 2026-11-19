// Tráfego entre drones da rede SADEC: quem desvia quando dois drones se cruzam.
// Só contas, sem desenho.

export const ID_NOSSO_DRONE = 'SADEC-01';
export const DETECCAO_RADIO_KM = 0.5; // pelo rádio, um drone "ouve" o outro a 500 m

// Os níveis de prioridade do projeto: quanto MENOR o número, MAIS importante a missão
export const PRIORIDADES = {
  orgaos: { nivel: 1, nome: 'órgãos' },
  emergencia: { nivel: 2, nome: 'emergência' },
  saude: { nivel: 3, nome: 'saúde' },
  comercial: { nivel: 4, nome: 'comercial' },
  // Voltando vazio para o hub: a menor prioridade de todas (quem está vazio cede a vez)
  retorno: { nivel: 5, nome: 'retorno, vazio' },
};

// Quem desvia? Devolve { desvia, criterio }:
//   desvia: o id do drone que vai desviar
//   criterio: o que decidiu ('prioridade', 'bateria' ou 'identificacao'), para explicar na tela
// O segredo: os DOIS drones rodam esta MESMA função com os MESMOS dados (que eles
// trocaram pelo rádio). Por isso chegam sempre à MESMA resposta: nunca acontece de
// os dois desviarem, nem de os dois seguirem reto.
// "a" e "b": { id, prioridade, bateria }
export function quemDesvia(a, b) {
  // 1. Prioridade: desvia a missão MENOS importante (número maior)
  const nivelA = PRIORIDADES[a.prioridade].nivel;
  const nivelB = PRIORIDADES[b.prioridade].nivel;
  if (nivelA !== nivelB) return { desvia: nivelA > nivelB ? a.id : b.id, criterio: 'prioridade' };

  // 2. Mesma prioridade (por exemplo, os DOIS vazios voltando): desvia quem tem MAIS
  //    bateria, porque pode gastar com o desvio; o de menos bateria segue reto para casa
  if (a.bateria !== b.bateria) return { desvia: a.bateria > b.bateria ? a.id : b.id, criterio: 'bateria' };

  // 3. Empate total: desvia o de menor identificação (um desempate fixo, igual para os dois)
  return { desvia: a.id < b.id ? a.id : b.id, criterio: 'identificacao' };
}

// O critério em palavras, para a mensagem do acordo
export function explicarCriterio(criterio, a, b) {
  const doisVazios = a.prioridade === 'retorno' && b.prioridade === 'retorno';
  if (criterio === 'prioridade') return 'missão menos importante desvia';
  if (criterio === 'bateria') {
    return doisVazios ? 'os dois vazios: desvia quem tem mais bateria' : 'mesma prioridade: desvia quem tem mais bateria';
  }
  return 'empate total: desvia o de menor identificação';
}
