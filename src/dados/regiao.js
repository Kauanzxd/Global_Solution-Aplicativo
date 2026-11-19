// Dados do mapa da área piloto: Perus e Anhanguera, noroeste de São Paulo.
// É um mapa ESQUEMÁTICO (simplificado), inspirado na região.
//
// Coordenadas em quilômetros, num quadrado de 10 x 10 km:
//   x vai de 0 (oeste) até 10 (leste)
//   y vai de 0 (norte) até 10 (sul)

export const TAMANHO_KM = 10;

// Rios e córregos: linhas abertas, como as vias
export const RIOS = [
  { nome: 'Ribeirão Perus', pontos: [[5.0, 6.4], [5.8, 4.6], [6.0, 3.0], [6.3, 1.6], [7.0, 0]] },
];

// Áreas de terra com uso diferente.
// tipo 'mata': parques e mata preservada (bons lugares para pouso de emergência).
// tipo 'urbano': bairros mais densos, que o drone deve evitar sobrevoar.
// "rotulo" (opcional): nome escrito no mapa e a posição dele, em km.
export const AREAS = [
  {
    nome: 'Parque Anhanguera',
    tipo: 'mata',
    rotulo: { texto: 'Parque Anhanguera', x: 3.0, y: 8.4 },
    pontos: [[0.8, 5.0], [3.6, 5.9], [5.2, 7.0], [4.8, 8.8], [2.2, 9.2], [0.4, 7.6]],
  },
  {
    nome: 'Parque Estadual do Jaraguá',
    tipo: 'mata',
    rotulo: { texto: 'Pq. Jaraguá', x: 6.4, y: 9.8 },
    pontos: [[5.8, 8.2], [8.6, 8.6], [9.2, 10], [5.6, 10]],
  },
  { nome: 'Mata Norte', tipo: 'mata', pontos: [[3.0, 0], [5.6, 0], [5.0, 1.3], [3.3, 1.5]] },
  { nome: 'Mata Noroeste', tipo: 'mata', pontos: [[0, 0], [1.8, 0], [1.4, 2.4], [0, 2.8]] },
  {
    nome: 'Centro de Perus',
    tipo: 'urbano',
    rotulo: { texto: 'Perus', x: 7.9, y: 2.9 },
    pontos: [[5.8, 1.0], [8.2, 0.8], [8.6, 2.8], [7.4, 3.6], [6.0, 3.4]],
  },
  {
    nome: 'Morro Doce',
    tipo: 'urbano',
    rotulo: { texto: 'Morro Doce', x: 2.7, y: 4.1 },
    pontos: [[1.8, 2.6], [3.6, 2.4], [3.8, 4.4], [2.0, 4.3]],
  },
  {
    nome: 'Jaraguá',
    tipo: 'urbano',
    rotulo: { texto: 'Jaraguá', x: 9.3, y: 7.0 },
    pontos: [[8.4, 6.0], [10, 5.8], [10, 7.6], [8.8, 7.4]],
  },
];

// Pico do Jaraguá: o ponto mais alto da cidade (1.135 m), desenhado como um triângulo
export const PICO = { nome: 'Pico do Jaraguá', x: 7.2, y: 9.0 };

// Vias principais: linhas abertas (o último ponto NÃO volta para o primeiro)
// tipo 'rodovia' | 'rodoanel' | 'estrada' | 'ferrovia' (trem da CPTM)
export const VIAS = [
  { nome: 'Rodovia Anhanguera', tipo: 'rodovia', pontos: [[0, 3.5], [3.0, 5.2], [6.0, 6.8], [10, 9.0]] },
  { nome: 'Rodovia dos Bandeirantes', tipo: 'rodovia', pontos: [[1.8, 0], [5.5, 3.6], [10, 6.6]] },
  { nome: 'Rodoanel', tipo: 'rodoanel', pontos: [[1.0, 0], [1.6, 3.6], [2.6, 6.0], [3.2, 10]] },
  { nome: 'Estrada de Perus', tipo: 'estrada', pontos: [[3.6, 3.4], [4.4, 4.4], [6.0, 3.4], [7.6, 1.6]] },
  { nome: 'Linha 7 da CPTM', tipo: 'ferrovia', pontos: [[7.0, 0], [6.6, 2.0], [7.4, 5.0], [8.6, 10]] },
];

// Locais importantes: de onde o drone sai e para onde ele leva entregas.
// "rotulo" é o nome curto que aparece no mapa (o nome completo é longo demais).
// tipo 'hub': base dos drones | 'hospital' | 'ubs': posto de saúde | 'comunidade'
export const LOCAIS = [
  { id: 'hub', nome: 'Hub SADEC', rotulo: 'Hub SADEC', tipo: 'hub', x: 4.4, y: 4.6 },
  { id: 'hosp-perus', nome: 'Hospital de referência de Perus', rotulo: 'Hosp. Perus', tipo: 'hospital', x: 7.4, y: 2.0 },
  { id: 'hosp-pirituba', nome: 'Hospital de referência de Pirituba', rotulo: 'Hosp. Pirituba', tipo: 'hospital', x: 8.9, y: 5.0 },
  { id: 'ubs-perus', nome: 'UBS Perus', rotulo: 'UBS Perus', tipo: 'ubs', x: 5.4, y: 1.0 },
  { id: 'ubs-morro-doce', nome: 'UBS Morro Doce', rotulo: 'UBS Morro Doce', tipo: 'ubs', x: 2.6, y: 2.9 },
  { id: 'aldeia-jaragua', nome: 'Aldeia Guarani do Jaraguá', rotulo: 'Aldeia Jaraguá', tipo: 'comunidade', x: 5.6, y: 8.6 },
];

// Zonas de pouso seguro: campos abertos, longe de casas e fora da água.
// Se o drone tiver uma pane, ele desvia para a zona mais próxima.
export const ZONAS_POUSO = [
  { id: 'ZP-01', x: 1.6, y: 6.6 },
  { id: 'ZP-02', x: 4.0, y: 7.6 },
  { id: 'ZP-03', x: 4.1, y: 0.7 },
  { id: 'ZP-04', x: 8.4, y: 3.7 },
  { id: 'ZP-05', x: 8.8, y: 9.3 },
  { id: 'ZP-06', x: 0.7, y: 1.4 },
];
