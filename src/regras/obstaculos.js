// Obstáculos que se movem no caminho do drone: guindaste girando e bando de pássaros.
// Só contas, sem desenho. Distâncias em km, tempo em segundos.
//
// Atenção: as medidas são ESQUEMÁTICAS (maiores que as reais) para o desvio
// aparecer no mapa de 10 km. Um guindaste real tem uns 60 m de braço.

export const DETECCAO_SENSOR_KM = 0.4; // os sensores (câmera e radar) enxergam a 400 m
export const ANTECEDENCIA_KM = 0.8; // o obstáculo "entra em cena" 800 m antes, fora do alcance do sensor
const VELOCIDADE_DRONE_KM_S = 0.015; // 15 m/s

export const TIPOS_OBSTACULO = {
  // O braço gira em volta da base. O perigo é o pedaço do braço que passa por cima da rota.
  guindaste: { nome: 'Guindaste', bolhaKm: 0.12, bracoKm: 0.3, distanciaBaseKm: 0.2, velocidadeKmS: 0.004 },
  // O bando cruza a rota de lado, balançando um pouco (pássaros não voam em linha reta)
  passaros: { nome: 'Bando de pássaros', bolhaKm: 0.15, velocidadeKmS: 0.01, balancoKm: 0.06 },
};

// Cria o obstáculo à frente do drone, na rota, de um jeito que ele CRUZE o caminho
// justamente quando o drone chegar lá (é o pior caso, o que testa o desvio).
// "local": onde o drone está | "direcao": para onde ele vai (vetor de tamanho 1)
export function criarObstaculo(evento, local, direcao, tempoAgora) {
  const pontoNaRota = { x: local.x + direcao.x * ANTECEDENCIA_KM, y: local.y + direcao.y * ANTECEDENCIA_KM };
  const chegada = tempoAgora + ANTECEDENCIA_KM / VELOCIDADE_DRONE_KM_S; // quando o drone chegaria lá
  const lado = { x: -direcao.y, y: direcao.x }; // perpendicular à rota

  if (evento.objeto === 'guindaste') {
    const tipo = TIPOS_OBSTACULO.guindaste;
    const base = { x: pontoNaRota.x + lado.x * tipo.distanciaBaseKm, y: pontoNaRota.y + lado.y * tipo.distanciaBaseKm };
    return {
      tipo: 'guindaste',
      base,
      giro: tipo.velocidadeKmS / tipo.distanciaBaseKm, // radianos por segundo
      anguloNaChegada: Math.atan2(pontoNaRota.y - base.y, pontoNaRota.x - base.x), // aponta para a rota
      chegada,
    };
  }

  // Pássaros: vêm de um lado da rota e passam pelo ponto na hora em que o drone chega
  const tipo = TIPOS_OBSTACULO.passaros;
  return {
    tipo: 'passaros',
    pontoNaRota,
    velocidade: { x: -lado.x * tipo.velocidadeKmS, y: -lado.y * tipo.velocidadeKmS },
    direcaoRota: direcao,
    chegada,
  };
}

// Onde o perigo está num instante "tempo"
export function posicaoObstaculo(obstaculo, tempo) {
  const dt = tempo - obstaculo.chegada; // negativo = antes de cruzar a rota

  if (obstaculo.tipo === 'guindaste') {
    const tipo = TIPOS_OBSTACULO.guindaste;
    const angulo = obstaculo.anguloNaChegada + obstaculo.giro * dt;
    return {
      x: obstaculo.base.x + Math.cos(angulo) * tipo.distanciaBaseKm,
      y: obstaculo.base.y + Math.sin(angulo) * tipo.distanciaBaseKm,
    };
  }

  // Pássaros: andam em linha reta + um balanço de lado a lado (uma onda: seno)
  const balanco = Math.sin(tempo / 6) * TIPOS_OBSTACULO.passaros.balancoKm;
  return {
    x: obstaculo.pontoNaRota.x + obstaculo.velocidade.x * dt + obstaculo.direcaoRota.x * balanco,
    y: obstaculo.pontoNaRota.y + obstaculo.velocidade.y * dt + obstaculo.direcaoRota.y * balanco,
  };
}

// Algum obstáculo está a até "raioKm" do ponto? (usado para o mapa aproximar o zoom)
export function algumObstaculoPerto(obstaculos, tempo, ponto, raioKm) {
  return (obstaculos || []).some((obstaculo) => {
    const p = posicaoObstaculo(obstaculo, tempo);
    return Math.sqrt((p.x - ponto.x) ** 2 + (p.y - ponto.y) ** 2) <= raioKm;
  });
}

// Dados para o mapa desenhar: posição do perigo, a bolha e, no guindaste, a base e a ponta do braço
export function desenhoObstaculo(obstaculo, tempo) {
  const tipo = TIPOS_OBSTACULO[obstaculo.tipo];
  const desenho = { tipo: obstaculo.tipo, posicao: posicaoObstaculo(obstaculo, tempo), bolhaKm: tipo.bolhaKm };

  if (obstaculo.tipo === 'guindaste') {
    const angulo = obstaculo.anguloNaChegada + obstaculo.giro * (tempo - obstaculo.chegada);
    desenho.base = obstaculo.base;
    desenho.ponta = {
      x: obstaculo.base.x + Math.cos(angulo) * tipo.bracoKm,
      y: obstaculo.base.y + Math.sin(angulo) * tipo.bracoKm,
    };
  }
  return desenho;
}
