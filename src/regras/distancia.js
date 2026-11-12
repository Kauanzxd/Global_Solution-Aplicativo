// Regras de distância do drone.
// Aqui não tem desenho nenhum: só contas. Cada ponto é um objeto { x, y } em km.

// Distância em linha reta entre dois pontos (o drone voa em linha reta).
// É o Teorema de Pitágoras: a distância é a hipotenusa de um triângulo
// cujos catetos são a diferença em x e a diferença em y.
export function distanciaKm(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Entre várias zonas de pouso, descobre qual está mais perto de um ponto.
// Devolve a zona e a distância até ela.
export function zonaMaisProxima(ponto, zonas) {
  let maisProxima = zonas[0];
  let menorDistancia = distanciaKm(ponto, zonas[0]);

  for (const zona of zonas) {
    const distancia = distanciaKm(ponto, zona);
    if (distancia < menorDistancia) {
      maisProxima = zona;
      menorDistancia = distancia;
    }
  }

  return { zona: maisProxima, distancia: menorDistancia };
}
