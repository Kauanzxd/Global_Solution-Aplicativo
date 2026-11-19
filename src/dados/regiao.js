// Dados do mapa da área piloto: noroeste de São Paulo, de Perus até o Rio Tietê.
// É um mapa ESQUEMÁTICO (simplificado), inspirado na região.
//
// Coordenadas em quilômetros, num quadrado de 20 x 20 km:
//   x vai de 0 (oeste) até 20 (leste)
//   y vai de 0 (norte) até 20 (sul)

export const TAMANHO_KM = 20;

// Rios e córregos: linhas abertas, como as vias.
// "largura" (opcional, em km): rios grandes, como o Tietê, são desenhados mais grossos.
export const RIOS = [
  { nome: 'Ribeirão Perus', pontos: [[6.4, 8.0], [7.0, 5.5], [7.4, 3.0], [7.2, 0]] },
  { nome: 'Rio Tietê', largura: 0.25, pontos: [[0, 19.6], [5, 19.2], [10, 19.5], [15, 19.1], [20, 19.4]] },
];

// Áreas de terra com uso diferente.
// tipo 'mata': parques e mata preservada (bons lugares para pouso de emergência).
// tipo 'urbano': bairros mais densos, que o drone deve evitar sobrevoar.
// "rotulo" (opcional): nome escrito no mapa e a posição dele, em km.
export const AREAS = [
  {
    nome: 'Parque Anhanguera',
    tipo: 'mata',
    rotulo: { texto: 'Parque Anhanguera', x: 5.0, y: 11.7 },
    pontos: [[1.0, 7.0], [5.0, 8.0], [7.0, 9.5], [6.4, 12.0], [3.0, 12.5], [0.5, 10.5]],
  },
  {
    nome: 'Parque Estadual do Jaraguá',
    tipo: 'mata',
    rotulo: { texto: 'Pq. Jaraguá', x: 12.0, y: 12.45 },
    pontos: [[9.2, 9.6], [12.4, 9.4], [13.2, 11.0], [12.6, 12.6], [9.6, 12.6], [8.8, 11.0]],
  },
  {
    nome: 'Serra da Cantareira',
    tipo: 'mata',
    rotulo: { texto: 'Cantareira', x: 17.0, y: 2.0 },
    pontos: [[13.0, 0], [20, 0], [20, 7.5], [18.5, 7.0], [15.5, 4.5], [13.5, 3.0]],
  },
  { nome: 'Mata Norte', tipo: 'mata', pontos: [[4.0, 0], [7.0, 0], [6.8, 1.5], [4.4, 1.8]] },
  { nome: 'Mata Noroeste', tipo: 'mata', pontos: [[0, 0], [2.5, 0], [2.0, 3.0], [0, 3.5]] },
  {
    nome: 'Centro de Perus',
    tipo: 'urbano',
    rotulo: { texto: 'Perus', x: 9.6, y: 1.3 },
    pontos: [[7.8, 1.0], [10.5, 0.8], [11.0, 3.0], [9.6, 3.8], [8.0, 3.6]],
  },
  {
    nome: 'Morro Doce',
    tipo: 'urbano',
    rotulo: { texto: 'Morro Doce', x: 3.75, y: 4.3 },
    pontos: [[2.5, 4.0], [4.8, 3.8], [5.0, 6.0], [2.7, 6.0]],
  },
  {
    nome: 'Taipas',
    tipo: 'urbano',
    rotulo: { texto: 'Taipas', x: 13.0, y: 5.5 },
    pontos: [[12.0, 5.0], [14.5, 5.0], [14.5, 7.5], [12.2, 7.5]],
  },
  {
    nome: 'Brasilândia',
    tipo: 'urbano',
    rotulo: { texto: 'Brasilândia', x: 17.4, y: 8.6 },
    pontos: [[15.0, 8.0], [18.5, 8.0], [18.5, 12.0], [15.0, 12.0]],
  },
  {
    nome: 'Pirituba',
    tipo: 'urbano',
    rotulo: { texto: 'Pirituba', x: 11.4, y: 13.9 },
    pontos: [[8.0, 13.5], [12.0, 13.2], [12.5, 16.0], [8.5, 16.2]],
  },
  {
    nome: 'Freguesia do Ó',
    tipo: 'urbano',
    rotulo: { texto: 'Freguesia do Ó', x: 15.6, y: 14.1 },
    pontos: [[14.0, 13.5], [18.0, 13.5], [18.0, 17.0], [14.2, 17.0]],
  },
  {
    nome: 'Vila Jaguara',
    tipo: 'urbano',
    rotulo: { texto: 'Vila Jaguara', x: 10.0, y: 17.6 },
    pontos: [[9.0, 17.0], [13.0, 16.8], [13.0, 18.0], [9.0, 18.0]],
  },
];

// Pico do Jaraguá: o ponto mais alto da cidade (1.135 m), desenhado como um triângulo
export const PICO = { nome: 'Pico do Jaraguá', x: 11.2, y: 10.6 };

// Vias principais: linhas abertas (o último ponto NÃO volta para o primeiro)
// tipo 'rodovia' | 'rodoanel' | 'estrada' | 'ferrovia' (trem da CPTM)
export const VIAS = [
  { nome: 'Marginal Tietê', tipo: 'rodovia', pontos: [[0, 18.6], [10, 18.7], [20, 18.5]] },
  {
    nome: 'Rodovia Anhanguera',
    tipo: 'rodovia',
    pontos: [[12.6, 18.6], [12.0, 15.5], [10.2, 13.0], [7.5, 9.6], [4.0, 7.4], [0, 5.2]],
  },
  {
    nome: 'Rodovia dos Bandeirantes',
    tipo: 'rodovia',
    pontos: [[13.5, 18.6], [13.6, 15.0], [13.6, 11.0], [11.0, 7.0], [7.0, 3.5], [3.0, 0]],
  },
  { nome: 'Rodoanel', tipo: 'rodoanel', pontos: [[3.2, 20], [3.6, 13.5], [2.3, 7.0], [3.0, 3.0], [1.2, 0]] },
  { nome: 'Estrada de Perus', tipo: 'estrada', pontos: [[4.8, 5.0], [6.5, 4.2], [8.0, 3.6], [9.0, 2.0]] },
  { nome: 'Estrada de Taipas', tipo: 'estrada', pontos: [[12.2, 7.5], [15.0, 8.5]] },
  { nome: 'Av. Inajar de Souza', tipo: 'estrada', pontos: [[16.0, 8.0], [16.2, 12.5], [15.8, 17.5], [15.6, 18.5]] },
  {
    nome: 'Linha 7 da CPTM',
    tipo: 'ferrovia',
    pontos: [[8.6, 0], [8.6, 2.5], [9.4, 6.0], [8.6, 9.0], [9.2, 13.5], [11.2, 17.5], [12.0, 20]],
  },
];

// Locais importantes: de onde o drone sai e para onde ele leva entregas.
// "rotulo" é o nome curto que aparece no mapa (o nome completo é longo demais).
// tipo 'hub': base dos drones | 'hospital' | 'ubs': posto de saúde | 'comunidade'
export const LOCAIS = [
  { id: 'hub', nome: 'Hub SADEC', rotulo: 'Hub SADEC', tipo: 'hub', x: 9.5, y: 8.5 },
  { id: 'hosp-perus', nome: 'Hospital de referência de Perus', rotulo: 'Hosp. Perus', tipo: 'hospital', x: 10.0, y: 2.6 },
  { id: 'hosp-taipas', nome: 'Hospital de referência de Taipas', rotulo: 'Hosp. Taipas', tipo: 'hospital', x: 13.4, y: 6.4 },
  { id: 'hosp-brasilandia', nome: 'Hospital de referência da Brasilândia', rotulo: 'Hosp. Brasilândia', tipo: 'hospital', x: 17.0, y: 9.6 },
  { id: 'hosp-pirituba', nome: 'Hospital de referência de Pirituba', rotulo: 'Hosp. Pirituba', tipo: 'hospital', x: 10.9, y: 14.9 },
  { id: 'hosp-freguesia', nome: 'Hospital de referência da Freguesia do Ó', rotulo: 'Hosp. Freguesia', tipo: 'hospital', x: 16.9, y: 15.3 },
  { id: 'ubs-perus', nome: 'UBS Perus', rotulo: 'UBS Perus', tipo: 'ubs', x: 8.1, y: 1.3 },
  { id: 'ubs-morro-doce', nome: 'UBS Morro Doce', rotulo: 'UBS Morro Doce', tipo: 'ubs', x: 3.4, y: 5.2 },
  { id: 'ubs-pirituba', nome: 'UBS Pirituba', rotulo: 'UBS Pirituba', tipo: 'ubs', x: 8.8, y: 15.6 },
  { id: 'ubs-brasilandia', nome: 'UBS Brasilândia', rotulo: 'UBS Brasilândia', tipo: 'ubs', x: 17.6, y: 11.5 },
  { id: 'aldeia-jaragua', nome: 'Aldeia Guarani do Jaraguá', rotulo: 'Aldeia Jaraguá', tipo: 'comunidade', x: 9.8, y: 11.2 },
];

// Zonas de pouso seguro: campos abertos, longe de casas e fora da água.
// Se o drone tiver uma pane, ele desvia para a zona mais próxima.
export const ZONAS_POUSO = [
  { id: 'ZP-01', x: 3.5, y: 10.0 },
  { id: 'ZP-02', x: 5.5, y: 10.5 },
  { id: 'ZP-03', x: 5.8, y: 0.9 },
  { id: 'ZP-04', x: 13.8, y: 1.5 },
  { id: 'ZP-05', x: 12.6, y: 10.9 },
  { id: 'ZP-06', x: 1.0, y: 1.6 },
  { id: 'ZP-07', x: 16.5, y: 4.5 },
  { id: 'ZP-08', x: 19.0, y: 6.5 },
  { id: 'ZP-09', x: 6.5, y: 15.0 },
  { id: 'ZP-10', x: 19.2, y: 15.0 },
  { id: 'ZP-11', x: 11.6, y: 4.2 },
];
