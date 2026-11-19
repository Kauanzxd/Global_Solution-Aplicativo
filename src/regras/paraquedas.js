// Regras do paraquedas guiável (parafoil), usado na falha grave.
// Sem motores, o drone abre o paraquedas e plana de forma estável (como um
// planador, perdendo altura aos poucos) até o ponto escolhido. Lá, ele desce
// em espiral sobre o ponto e pousa suave. Só contas, sem desenho.
import { distanciaKm } from './distancia.js';
import { riscoNoPonto } from './risco.js';

export const PLANEIO = 3; // a cada 1 m que desce, anda 3 m para frente
export const ALTITUDE_MINIMA_PARAQUEDAS = 30; // m: abaixo disso, não dá tempo de abrir
export const MARGEM_POUSO_M = 40; // altura guardada para a espiral final e um pouso suave

// Nomes dos riscos para mostrar na tela (com acento)
export const NOMES_RISCO = { baixo: 'baixo', medio: 'médio', alto: 'alto', proibido: 'proibido' };

// Até onde o drone consegue planar, em km, a partir de uma altitude em metros.
// Ex.: 120 m × 3 = 360 m = 0,36 km
export function alcanceKm(altitude) {
  return (Math.max(altitude, 0) * PLANEIO) / 1000;
}

// Com que altitude o drone chega depois de planar "distancia" km.
// Ex.: saiu de 120 m e planou 0,18 km (180 m) → perdeu 60 m → chega a 60 m
export function altitudeAoChegar(altitude, distancia) {
  return altitude - (distancia * 1000) / PLANEIO;
}

// Pontos que o drone poderia alcançar: 16 direções (como uma rosa dos ventos)
// e, em cada direção, 6 distâncias (de 1/6 do alcance até o alcance inteiro).
export function pontosCandidatos(local, alcance) {
  const pontos = [];

  for (let direcao = 0; direcao < 16; direcao++) {
    const angulo = (direcao / 16) * 2 * Math.PI; // volta completa = 2π radianos

    for (let anel = 1; anel <= 6; anel++) {
      const distancia = (alcance * anel) / 6;
      pontos.push({
        x: local.x + Math.cos(angulo) * distancia,
        y: local.y + Math.sin(angulo) * distancia,
      });
    }
  }

  return pontos;
}

// Para comparar riscos: quanto menor o número, melhor.
// Uma zona de pouso oficial é melhor que qualquer ponto improvisado.
const ORDEM_RISCO = { zona: 0, baixo: 1, medio: 2, alto: 3, proibido: 4 };

// Riscos aceitáveis: aqui não há gente nem trânsito embaixo
const ACEITAVEIS = ['zona', 'baixo', 'medio'];

// Escolhe onde pousar de paraquedas, a partir do local e da altitude da falha.
export function escolherPouso(local, altitude, zonas, areas, vias) {
  const alcance = alcanceKm(altitude);
  // Alcance confortável: até onde ele chega ainda com a margem para a espiral final
  const alcanceConfortavel = alcanceKm(altitude - MARGEM_POUSO_M);

  // Todas as opções: zonas de pouso + pontos candidatos, só as que dá para alcançar
  const opcoesZonas = zonas.map((zona) => ({ ponto: zona, risco: 'zona', nome: zona.id }));
  const opcoesPontos = pontosCandidatos(local, alcance).map((ponto) => {
    const risco = riscoNoPonto(ponto, areas, vias);
    return { ponto, risco, nome: `área de risco ${NOMES_RISCO[risco]}` };
  });
  const opcoes = [...opcoesZonas, ...opcoesPontos]
    .map((opcao) => ({ ...opcao, distancia: distanciaKm(local, opcao.ponto) }))
    .filter((opcao) => opcao.distancia <= alcance);

  // Ordem de preferência (o sort coloca a melhor opção em primeiro):
  opcoes.sort((a, b) => {
    // 1º Opções aceitáveis (sem gente nem trânsito) sempre vencem as outras
    const aAceitavel = ACEITAVEIS.includes(a.risco);
    const bAceitavel = ACEITAVEIS.includes(b.risco);
    if (aAceitavel !== bAceitavel) return aAceitavel ? -1 : 1;

    // 2º Entre as aceitáveis: chegar com margem para um pouso suave vem antes
    if (aAceitavel) {
      const aConfortavel = a.distancia <= alcanceConfortavel;
      const bConfortavel = b.distancia <= alcanceConfortavel;
      if (aConfortavel !== bConfortavel) return aConfortavel ? -1 : 1;
    }

    // 3º Menor risco
    if (a.risco !== b.risco) return ORDEM_RISCO[a.risco] - ORDEM_RISCO[b.risco];

    // 4º Mais perto
    return a.distancia - b.distancia;
  });

  return { ...opcoes[0], alcance, alcanceConfortavel };
}
