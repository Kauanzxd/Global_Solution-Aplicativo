// Regras do paraquedas guiável (parafoil), usado na falha grave.
// Sem motores, o drone abre o paraquedas e plana de forma estável (como um
// planador, perdendo altura aos poucos) até o ponto escolhido. Lá, ele desce
// em espiral sobre o ponto e pousa suave. Só contas, sem desenho.
import { riscoNoPonto } from './risco.js';

export const PLANEIO = 3; // a cada 1 m que desce, anda 3 m para frente
export const ALTITUDE_MINIMA_PARAQUEDAS = 30; // m: abaixo disso, não dá tempo de abrir
export const MARGEM_POUSO_M = 40; // altura guardada para a espiral final e um pouso suave

// Nomes dos riscos para mostrar na tela (com acento)
export const NOMES_RISCO = { baixo: 'baixo', medio: 'médio', alto: 'alto', proibido: 'proibido' };

// Velocidades do paraquedas em relação ao AR (como se não houvesse vento)
export const VELOCIDADE_AR_MS = 9; // anda 9 m/s para frente...
export const DESCIDA_MS = VELOCIDADE_AR_MS / PLANEIO; // ...e desce 3 m/s (planeio 3:1)

export const SEM_VENTO = { x: 0, y: 0 };

// Para onde o vento empurra, conforme a direção DE ONDE ele vem.
// Lembrete: no nosso mapa, y cresce para o sul. Vento "do norte" empurra para o sul (y +).
const DIRECOES_VENTO = {
  norte: { x: 0, y: 1 },
  sul: { x: 0, y: -1 },
  leste: { x: -1, y: 0 },
  oeste: { x: 1, y: 0 },
  nordeste: { x: -0.707, y: 0.707 },
  noroeste: { x: 0.707, y: 0.707 },
  sudeste: { x: -0.707, y: -0.707 },
  sudoeste: { x: 0.707, y: -0.707 },
};

// O vento como um vetor { x, y } em m/s. Ex.: vetorVento(8, 'norte') → { x: 0, y: 8 }
export function vetorVento(velocidade, de) {
  const direcao = DIRECOES_VENTO[de];
  return { x: direcao.x * velocidade, y: direcao.y * velocidade };
}

// Quantos segundos o paraquedas leva para ir de um ponto a outro, com vento.
// "deslocamento" é { x, y } em metros. Infinity = impossível (vento contra forte demais).
//
// O drone aponta para onde precisar; o vento soma o empurrão dele.
// No chão, ele anda: deslocamento = (velocidade do drone no ar + vento) × tempo.
// A velocidade no ar tem tamanho fixo (9 m/s). Isso vira uma equação do 2º grau
// no tempo t:   a·t² + b·t + c = 0   — e resolvemos com Bhaskara.
// "velocidadeAr" é opcional: o padrão é a do paraquedas, mas o drone com motor
// fraco também usa esta conta, com a velocidade dele.
export function tempoAteOPonto(deslocamento, vento, velocidadeAr = VELOCIDADE_AR_MS) {
  if (deslocamento.x === 0 && deslocamento.y === 0) return 0; // já está lá

  const a = velocidadeAr ** 2 - (vento.x ** 2 + vento.y ** 2);
  const b = 2 * (deslocamento.x * vento.x + deslocamento.y * vento.y);
  const c = -(deslocamento.x ** 2 + deslocamento.y ** 2);

  // Vento exatamente igual à velocidade do drone: a equação vira do 1º grau
  if (Math.abs(a) < 1e-9) return b > 0 ? -c / b : Infinity;

  const delta = b * b - 4 * a * c;
  if (delta < 0) return Infinity; // sem solução: não dá para chegar lá

  const raizes = [(-b + Math.sqrt(delta)) / (2 * a), (-b - Math.sqrt(delta)) / (2 * a)];
  const positivas = raizes.filter((t) => t > 0); // tempo negativo não existe
  return positivas.length > 0 ? Math.min(...positivas) : Infinity;
}

// Com que altitude o drone chega ao ponto, planando a partir do local.
// Ex. sem vento: saiu de 120 m e planou 180 m → levou 20 s → desceu 60 m → chega a 60 m
export function altitudeAoChegar(altitude, local, ponto, vento) {
  const deslocamento = { x: (ponto.x - local.x) * 1000, y: (ponto.y - local.y) * 1000 }; // km → m
  return altitude - DESCIDA_MS * tempoAteOPonto(deslocamento, vento);
}

// Área que o drone consegue alcançar até ficar com uma certa altitude ("sobra").
// É um círculo: o raio é o quanto ele anda no ar nesse tempo, e o centro é
// empurrado pelo vento na mesma quantidade de tempo (é a "deriva"). Tudo em km.
export function areaDeAlcance(local, altitude, sobra, vento) {
  const tempo = Math.max(altitude - sobra, 0) / DESCIDA_MS; // segundos até chegar na sobra
  return {
    centro: { x: local.x + (vento.x * tempo) / 1000, y: local.y + (vento.y * tempo) / 1000 },
    raio: (VELOCIDADE_AR_MS * tempo) / 1000,
  };
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
export function escolherPouso(local, altitude, zonas, areas, vias, vento = SEM_VENTO) {
  // Alcance total (chega ao chão) e confortável (chega com a margem para a espiral final)
  const alcance = areaDeAlcance(local, altitude, 0, vento);
  const confortavel = areaDeAlcance(local, altitude, MARGEM_POUSO_M, vento);

  // Todas as opções: zonas de pouso + pontos candidatos dentro da área de alcance
  const opcoesZonas = zonas.map((zona) => ({ ponto: zona, risco: 'zona', nome: zona.id }));
  const opcoesPontos = pontosCandidatos(alcance.centro, alcance.raio).map((ponto) => {
    const risco = riscoNoPonto(ponto, areas, vias);
    return { ponto, risco, nome: `área de risco ${NOMES_RISCO[risco]}` };
  });
  const opcoes = [...opcoesZonas, ...opcoesPontos]
    .map((opcao) => ({ ...opcao, altitudeChegada: altitudeAoChegar(altitude, local, opcao.ponto, vento) }))
    .filter((opcao) => opcao.altitudeChegada > -0.01); // chega antes de tocar o chão (com folga de arredondamento)

  // Ordem de preferência (o sort coloca a melhor opção em primeiro):
  opcoes.sort((a, b) => {
    // 1º Opções aceitáveis (sem gente nem trânsito) sempre vencem as outras
    const aAceitavel = ACEITAVEIS.includes(a.risco);
    const bAceitavel = ACEITAVEIS.includes(b.risco);
    if (aAceitavel !== bAceitavel) return aAceitavel ? -1 : 1;

    // 2º Entre as aceitáveis: chegar com margem para um pouso suave vem antes
    if (aAceitavel) {
      const aConfortavel = a.altitudeChegada >= MARGEM_POUSO_M;
      const bConfortavel = b.altitudeChegada >= MARGEM_POUSO_M;
      if (aConfortavel !== bConfortavel) return aConfortavel ? -1 : 1;
    }

    // 3º Menor risco
    if (a.risco !== b.risco) return ORDEM_RISCO[a.risco] - ORDEM_RISCO[b.risco];

    // 4º Chega com mais altura (sem vento, é o mesmo que "mais perto")
    return b.altitudeChegada - a.altitudeChegada;
  });

  const melhor = opcoes[0];
  return { ...melhor, altitudeChegada: Math.max(melhor.altitudeChegada, 0), alcance, confortavel };
}
