// Regras do paraquedas guiável (parafoil), usado na falha grave.
// Sem motores, o drone abre o paraquedas e plana até o lugar mais seguro
// que consegue alcançar. Só contas, sem desenho.
import { distanciaKm } from './distancia.js';
import { riscoNoPonto } from './risco.js';

export const PLANEIO = 3; // a cada 1 m que desce, anda 3 m para frente
export const ALTITUDE_MINIMA_PARAQUEDAS = 30; // m: abaixo disso, não dá tempo de abrir

// Até onde o drone consegue planar, em km, a partir de uma altitude em metros.
// Ex.: 120 m × 3 = 360 m = 0,36 km
export function alcanceKm(altitude) {
  return (altitude * PLANEIO) / 1000;
}

// Pontos que o drone poderia alcançar: 16 direções (como uma rosa dos ventos)
// e, em cada direção, 3 distâncias (1/3, 2/3 e o alcance inteiro).
export function pontosCandidatos(local, alcance) {
  const pontos = [];

  for (let direcao = 0; direcao < 16; direcao++) {
    const angulo = (direcao / 16) * 2 * Math.PI; // volta completa = 2π radianos

    for (const fracao of [1 / 3, 2 / 3, 1]) {
      pontos.push({
        x: local.x + Math.cos(angulo) * alcance * fracao,
        y: local.y + Math.sin(angulo) * alcance * fracao,
      });
    }
  }

  return pontos;
}

// Para comparar riscos: quanto menor o número, melhor
const ORDEM_RISCO = { baixo: 0, medio: 1, alto: 2, proibido: 3 };

// Escolhe onde pousar de paraquedas, a partir do local e da altitude da falha.
// Devolve { ponto, risco, nome }.
export function escolherPouso(local, altitude, zonas, areas, vias) {
  const alcance = alcanceKm(altitude);

  // 1. Tem zona de pouso dentro do alcance? É sempre a melhor opção: vai na mais perto.
  const zonasAlcancaveis = zonas.filter((zona) => distanciaKm(local, zona) <= alcance);
  if (zonasAlcancaveis.length > 0) {
    zonasAlcancaveis.sort((a, b) => distanciaKm(local, a) - distanciaKm(local, b));
    const zona = zonasAlcancaveis[0];
    return { ponto: zona, risco: riscoNoPonto(zona, areas, vias), nome: zona.id };
  }

  // 2. Senão, testa todos os candidatos: ganha o de menor risco; no empate, o mais perto
  let melhor = null;

  for (const ponto of pontosCandidatos(local, alcance)) {
    const risco = riscoNoPonto(ponto, areas, vias);
    const distancia = distanciaKm(local, ponto);

    const menosArriscado = melhor === null || ORDEM_RISCO[risco] < ORDEM_RISCO[melhor.risco];
    const empateMaisPerto = melhor !== null && risco === melhor.risco && distancia < melhor.distancia;

    if (menosArriscado || empateMaisPerto) {
      melhor = { ponto, risco, distancia };
    }
  }

  return { ponto: melhor.ponto, risco: melhor.risco, nome: `área de risco ${melhor.risco}` };
}
