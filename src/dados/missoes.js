// Tipos de missão (a prioridade do drone), do mais ao menos importante, com uma cor para
// cada. Usado na aba Simular (tipo de entrega) e na aba Pedidos (o que cada perfil pode pedir).
export const MISSOES = [
  { valor: 'orgaos', rotulo: 'Órgãos', nivel: 1, cor: '#C62828' },
  { valor: 'emergencia', rotulo: 'Emergência', nivel: 2, cor: '#E65100' },
  { valor: 'saude', rotulo: 'Saúde', nivel: 3, cor: '#2E7D32' },
  { valor: 'comercial', rotulo: 'Comercial', nivel: 4, cor: '#0B5CAD' },
];
