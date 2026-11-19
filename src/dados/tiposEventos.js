// Catálogo dos eventos que dá para colocar numa simulação.
// Cada tipo tem: o nome na tela, uma cor, uma explicação curta e os valores iniciais
// (o que ele já vem preenchido ao ser adicionado).
export const TIPOS_EVENTO = [
  { tipo: 'pane', rotulo: 'Pane', cor: '#E08A00', descricao: 'Problema leve: o drone desvia para a zona de pouso mais próxima.', padrao: {} },
  { tipo: 'falha-grave', rotulo: 'Falha grave', cor: '#C62828', descricao: 'Os motores param: paraquedas guiável até o local mais seguro.', padrao: {} },
  { tipo: 'motor', rotulo: 'Motor', cor: '#AD1457', descricao: 'Um motor falha: o drone perde altura e decide se chega à zona ou abre o paraquedas.', padrao: {} },
  { tipo: 'gps', rotulo: 'GPS', cor: '#5E35B1', descricao: 'Perde o sinal de GPS: afasta-se do risco e espera o sinal voltar.', padrao: { duracao: 60 } },
  { tipo: 'vento', rotulo: 'Vento', cor: '#0277BD', descricao: 'Vento passa a soprar: afeta o planeio do paraquedas e o motor fraco.', padrao: { velocidade: 8, de: 'sul' } },
  { tipo: 'bateria', rotulo: 'Bateria', cor: '#F9A825', descricao: 'Uma célula falha e a bateria cai de repente.', padrao: { perda: 20 } },
  { tipo: 'temperatura', rotulo: 'Temperatura', cor: '#D84315', descricao: 'Superaquecimento: reduz a velocidade; se crítica, pouso imediato.', padrao: { grau: 'alta' } },
  { tipo: 'obstaculo', rotulo: 'Obstáculo', cor: '#6D4C41', descricao: 'Guindaste girando ou bando de pássaros: desvio em tempo real.', padrao: { objeto: 'guindaste' } },
  { tipo: 'drone', rotulo: 'Outro drone', cor: '#7B1FA2', descricao: 'Outro drone vem de frente: conversam para decidir quem desvia.', padrao: { comunicacao: true, prioridade: 'comercial', comportamento: 'reto' } },
];

export function tipoDoEvento(tipo) {
  return TIPOS_EVENTO.find((t) => t.tipo === tipo);
}

// Opções que aparecem como pílulas dentro do cartão de cada evento
export const OPCOES_GPS = [
  { valor: 0, rotulo: 'Não volta' },
  { valor: 30, rotulo: 'Volta em 30 s' },
  { valor: 60, rotulo: 'Volta em 60 s' },
  { valor: 120, rotulo: 'Volta em 2 min' },
];

export const OPCOES_DIRECAO = [
  { valor: 'norte', rotulo: 'N' },
  { valor: 'nordeste', rotulo: 'NE' },
  { valor: 'leste', rotulo: 'L' },
  { valor: 'sudeste', rotulo: 'SE' },
  { valor: 'sul', rotulo: 'S' },
  { valor: 'sudoeste', rotulo: 'SO' },
  { valor: 'oeste', rotulo: 'O' },
  { valor: 'noroeste', rotulo: 'NO' },
];

export const OPCOES_TEMPERATURA = [
  { valor: 'alta', rotulo: 'Alta' },
  { valor: 'critica', rotulo: 'Crítica' },
];

export const OPCOES_OBSTACULO = [
  { valor: 'guindaste', rotulo: 'Guindaste' },
  { valor: 'passaros', rotulo: 'Pássaros' },
];

export const OPCOES_RADIO = [
  { valor: true, rotulo: 'Com rádio' },
  { valor: false, rotulo: 'Sem rádio' },
];

export const OPCOES_PRIORIDADE_OUTRO = [
  { valor: 'orgaos', rotulo: 'Órgãos' },
  { valor: 'emergencia', rotulo: 'Emergência' },
  { valor: 'saude', rotulo: 'Saúde' },
  { valor: 'comercial', rotulo: 'Comercial' },
  { valor: 'retorno', rotulo: 'Vazio' },
];

export const OPCOES_COMPORTAMENTO = [
  { valor: 'reto', rotulo: 'Vindo de frente' },
  { valor: 'pairando', rotulo: 'Parado no ar' },
  { valor: 'errante', rotulo: 'Mudando de rumo' },
];
