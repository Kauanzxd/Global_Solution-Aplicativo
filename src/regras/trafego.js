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
};

// Quem desvia? Devolve o id do drone que vai desviar.
// O segredo: os DOIS drones rodam esta MESMA função com os MESMOS dados (que eles
// trocaram pelo rádio). Por isso chegam sempre à MESMA resposta: nunca acontece de
// os dois desviarem, nem de os dois seguirem reto.
// "a" e "b": { id, prioridade, bateria }
export function quemDesvia(a, b) {
  // 1. Prioridade: desvia a missão MENOS importante (número maior)
  const nivelA = PRIORIDADES[a.prioridade].nivel;
  const nivelB = PRIORIDADES[b.prioridade].nivel;
  if (nivelA !== nivelB) return nivelA > nivelB ? a.id : b.id;

  // 2. Empate: desvia quem tem MAIS bateria (pode gastar com o desvio)
  if (a.bateria !== b.bateria) return a.bateria > b.bateria ? a.id : b.id;

  // 3. Empate total: desvia o de menor identificação (um desempate fixo, igual para os dois)
  return a.id < b.id ? a.id : b.id;
}
