// Cenários prontos: situações montadas com um toque, para demonstrar as regras do drone.
// Depois de carregar, dá para mudar qualquer coisa (é só um ponto de partida).
// "destino" é o id de um dos LOCAIS do mapa.
// Os kms foram calibrados no mapa de 20 km: na rota Hub → Hosp. Taipas, por exemplo,
// o drone cruza a Rodovia dos Bandeirantes entre o km 2,0 e o 2,3.
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
    descricao: 'Pane em cima da Bandeirantes: volta para o hub, o lugar mais seguro.',
    destino: 'hosp-taipas',
    prioridade: 'saude',
    bateria: 60,
    eventos: [{ tipo: 'pane', km: 2.15 }],
  },
  {
    id: 'falha-vento',
    titulo: 'Falha grave com vento',
    descricao: 'Motores param sobre a Bandeirantes: paraquedas planando a favor do vento.',
    destino: 'hosp-taipas',
    prioridade: 'emergencia',
    bateria: 60,
    eventos: [
      { tipo: 'vento', km: 0.5, velocidade: 8, de: 'sul' },
      { tipo: 'falha-grave', km: 2.15 },
    ],
  },
  {
    id: 'motor',
    titulo: 'Motor falhando',
    descricao: 'Um motor falha: o sistema de risco vê que chega com folga ao hub e volta para lá.',
    destino: 'hosp-taipas',
    prioridade: 'saude',
    bateria: 60,
    eventos: [{ tipo: 'motor', km: 1.5 }],
  },
  {
    id: 'gps',
    titulo: 'GPS perdido',
    descricao: 'Sinal cai sobre a Bandeirantes: afasta-se, espera o sinal e volta para o hub.',
    destino: 'hosp-taipas',
    prioridade: 'comercial',
    bateria: 60,
    eventos: [{ tipo: 'gps', km: 2.15, duracao: 0 }],
  },
  {
    id: 'orgao-transito',
    titulo: 'Órgão no tráfego aéreo',
    descricao: 'Levando um órgão, cruza um drone comercial (ele cede) e um sem rádio (nós desviamos).',
    destino: 'hosp-pirituba',
    prioridade: 'orgaos',
    bateria: 70,
    eventos: [
      { tipo: 'drone', km: 1.5, comunicacao: true, prioridade: 'comercial', comportamento: 'reto' },
      { tipo: 'drone', km: 3.4, comunicacao: false, prioridade: 'comercial', comportamento: 'errante' },
    ],
  },
  {
    id: 'obstaculos',
    titulo: 'Guindaste e pássaros',
    descricao: 'Obstáculos em movimento na ida: desvio em tempo real, com zoom.',
    destino: 'hosp-pirituba',
    prioridade: 'saude',
    bateria: 70,
    eventos: [
      { tipo: 'obstaculo', km: 1.5, objeto: 'guindaste' },
      { tipo: 'obstaculo', km: 3.6, objeto: 'passaros' },
    ],
  },
  {
    id: 'volta-dificil',
    titulo: 'Volta difícil',
    descricao: 'Na volta, a bateria cai e depois a temperatura sobe: não chega mais ao hub e pousa numa zona.',
    destino: 'hosp-perus',
    prioridade: 'saude',
    bateria: 60,
    eventos: [
      { tipo: 'bateria', km: 7.5, perda: 18 },
      { tipo: 'temperatura', km: 8.5, grau: 'alta' },
    ],
  },
];
