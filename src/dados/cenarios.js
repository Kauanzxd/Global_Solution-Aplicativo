// Cenários prontos: situações montadas com um toque, para demonstrar as regras do drone.
// Depois de carregar, dá para mudar qualquer coisa (é só um ponto de partida).
// "destino" é o id de um hospital (src/dados/hospitais.js). A missão sai da filial mais
// próxima do destino. Os kms foram calibrados no mapa da cidade inteira: na rota
// Filial Itaim Bibi → Einstein (Morumbi), por exemplo, o drone cruza a Marginal Pinheiros
// entre o km 1,9 e o 2,2.
export const CENARIOS = [
  {
    id: 'tranquila',
    titulo: 'Entrega tranquila',
    descricao: 'Ida, entrega e volta à filial sem imprevistos.',
    destino: 'h098', // Hospital Japonês Santa Cruz, Vila Mariana (Filial Itaim Bibi)
    prioridade: 'saude',
    bateria: 60,
    eventos: [],
  },
  {
    id: 'pane-rodovia',
    titulo: 'Pane sobre a Marginal',
    descricao: 'Pane em cima da Marginal Pinheiros: volta para a filial, o lugar mais seguro.',
    destino: 'h095', // Hospital Israelita Albert Einstein, Morumbi (Filial Itaim Bibi)
    prioridade: 'saude',
    bateria: 60,
    eventos: [{ tipo: 'pane', km: 2.05 }],
  },
  {
    id: 'falha-vento',
    titulo: 'Falha grave com vento',
    descricao: 'Os motores param perto do Ibirapuera: o paraquedas plana com o vento até o parque.',
    destino: 'h098',
    prioridade: 'emergencia',
    bateria: 60,
    eventos: [
      { tipo: 'vento', km: 0.3, velocidade: 8, de: 'oeste' },
      { tipo: 'falha-grave', km: 0.8 },
    ],
  },
  {
    id: 'motor',
    titulo: 'Motor falhando',
    descricao: 'Um motor falha: o sistema de risco vê que chega com folga à filial e volta para lá.',
    destino: 'h095',
    prioridade: 'saude',
    bateria: 60,
    eventos: [{ tipo: 'motor', km: 1.5 }],
  },
  {
    id: 'gps',
    titulo: 'GPS perdido',
    descricao: 'O sinal cai sobre a Marginal Pinheiros: afasta-se, espera o sinal e volta para a filial.',
    destino: 'h095',
    prioridade: 'comercial',
    bateria: 60,
    eventos: [{ tipo: 'gps', km: 2.05, duracao: 0 }],
  },
  {
    id: 'orgao-transito',
    titulo: 'Órgão no tráfego aéreo',
    descricao: 'Levando um órgão ao HC, cruza um drone comercial (ele cede) e um sem rádio (nós desviamos).',
    destino: 'h065', // Hospital das Clínicas da FMUSP, Cerqueira César (Filial Centro)
    prioridade: 'orgaos',
    bateria: 60,
    eventos: [
      { tipo: 'drone', km: 1.0, comunicacao: true, prioridade: 'comercial', comportamento: 'reto' },
      { tipo: 'drone', km: 2.5, comunicacao: false, prioridade: 'comercial', comportamento: 'errante' },
    ],
  },
  {
    id: 'obstaculos',
    titulo: 'Guindaste e pássaros',
    descricao: 'Obstáculos em movimento na ida: desvio em tempo real, com zoom.',
    destino: 'h146', // Hospital São Camilo Pompeia (Filial Santana)
    prioridade: 'saude',
    bateria: 60,
    eventos: [
      { tipo: 'obstaculo', km: 1.2, objeto: 'guindaste' },
      { tipo: 'obstaculo', km: 3.4, objeto: 'passaros' },
    ],
  },
  {
    id: 'volta-dificil',
    titulo: 'Volta difícil',
    descricao: 'Na volta, a bateria cai e depois a temperatura sobe: sem margem para a filial, pousa no Parque do Carmo.',
    destino: 'h051', // Hospital Nova Iguatemi, São Mateus (Filial Cidade Líder; a rota cruza o Parque do Carmo)
    prioridade: 'saude',
    bateria: 50,
    eventos: [
      { tipo: 'bateria', km: 5.5, perda: 13 },
      { tipo: 'temperatura', km: 6, grau: 'alta' },
    ],
  },
];
