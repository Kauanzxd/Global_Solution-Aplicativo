// Cenários prontos: situações montadas com um toque, para demonstrar as regras do drone.
// Depois de carregar, dá para mudar qualquer coisa (é só um ponto de partida).
// "destino" é o id de um dos LOCAIS do mapa.
export const CENARIOS = [
  {
    id: 'tranquila',
    titulo: 'Entrega tranquila',
    descricao: 'Ida, entrega e volta sem imprevistos.',
    destino: 'aldeia-jaragua',
    prioridade: 'saude',
    bateria: 60,
    eventos: [],
  },
  {
    id: 'pane-rodovia',
    titulo: 'Pane sobre a rodovia',
    descricao: 'Pane em cima da Anhanguera: desvia para a zona de pouso.',
    destino: 'aldeia-jaragua',
    prioridade: 'saude',
    bateria: 60,
    eventos: [{ tipo: 'pane', km: 1.7 }],
  },
  {
    id: 'falha-vento',
    titulo: 'Falha grave com vento',
    descricao: 'Motores param sobre a rodovia: paraquedas planando a favor do vento.',
    destino: 'aldeia-jaragua',
    prioridade: 'emergencia',
    bateria: 60,
    eventos: [
      { tipo: 'vento', km: 0.5, velocidade: 8, de: 'sul' },
      { tipo: 'falha-grave', km: 1.7 },
    ],
  },
  {
    id: 'motor',
    titulo: 'Motor falhando',
    descricao: 'Um motor falha: o sistema de risco vê que chega com folga ao hub e volta para lá.',
    destino: 'aldeia-jaragua',
    prioridade: 'saude',
    bateria: 60,
    eventos: [{ tipo: 'motor', km: 1.5 }],
  },
  {
    id: 'gps',
    titulo: 'GPS perdido',
    descricao: 'Sinal cai sobre a rodovia: afasta-se, espera e vai para a zona.',
    destino: 'aldeia-jaragua',
    prioridade: 'comercial',
    bateria: 60,
    eventos: [{ tipo: 'gps', km: 1.7, duracao: 0 }],
  },
  {
    id: 'orgao-transito',
    titulo: 'Órgão no tráfego aéreo',
    descricao: 'Levando um órgão, cruza um drone comercial (ele cede) e um sem rádio (nós desviamos).',
    destino: 'hosp-pirituba',
    prioridade: 'orgaos',
    bateria: 60,
    eventos: [
      { tipo: 'drone', km: 1.2, comunicacao: true, prioridade: 'comercial', comportamento: 'reto' },
      { tipo: 'drone', km: 3.2, comunicacao: false, prioridade: 'comercial', comportamento: 'errante' },
    ],
  },
  {
    id: 'obstaculos',
    titulo: 'Guindaste e pássaros',
    descricao: 'Obstáculos em movimento na ida: desvio em tempo real, com zoom.',
    destino: 'aldeia-jaragua',
    prioridade: 'saude',
    bateria: 60,
    eventos: [
      { tipo: 'obstaculo', km: 1.5, objeto: 'guindaste' },
      { tipo: 'obstaculo', km: 3.3, objeto: 'passaros' },
    ],
  },
  {
    id: 'volta-dificil',
    titulo: 'Volta difícil',
    descricao: 'Entrega feita, mas na volta a bateria cai e a temperatura sobe.',
    destino: 'aldeia-jaragua',
    prioridade: 'saude',
    bateria: 50,
    eventos: [
      { tipo: 'bateria', km: 5, perda: 20 },
      { tipo: 'temperatura', km: 6, grau: 'alta' },
    ],
  },
];
