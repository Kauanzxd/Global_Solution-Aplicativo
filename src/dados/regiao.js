// Dados do mapa da área piloto: Parelheiros, extremo sul de São Paulo.
// É um mapa ESQUEMÁTICO (simplificado), inspirado na região.
//
// Coordenadas em quilômetros, num quadrado de 10 x 10 km:
//   x vai de 0 (oeste) até 10 (leste)
//   y vai de 0 (norte) até 10 (sul)

export const TAMANHO_KM = 10;

// Represas, desenhadas como polígonos (lista de pontos [x, y] ligados em ordem)
export const REPRESAS = [
  {
    nome: 'Represa Guarapiranga',
    pontos: [[0, 0], [3.2, 0], [3.0, 0.8], [2.2, 1.4], [1.6, 2.6], [0.8, 3.0], [0, 3.4]],
  },
  {
    nome: 'Represa Billings',
    pontos: [[8.3, 0], [10, 0], [10, 6.5], [9.2, 6.0], [8.6, 4.8], [8.9, 3.6], [8.2, 2.6], [8.6, 1.4], [8.0, 0.6]],
  },
];

// Áreas de terra com uso diferente.
// tipo 'mata': Mata Atlântica preservada.
// tipo 'urbano': bairros mais densos, que o drone deve evitar sobrevoar.
export const AREAS = [
  { nome: 'Mata Oeste', tipo: 'mata', pontos: [[0, 6.0], [2.5, 5.5], [3.2, 7.0], [2.6, 10], [0, 10]] },
  { nome: 'Mata Leste', tipo: 'mata', pontos: [[7.2, 7.5], [10, 7.0], [10, 10], [7.0, 10]] },
  { nome: 'Centro de Parelheiros', tipo: 'urbano', pontos: [[3.6, 1.6], [5.6, 1.4], [6.2, 2.6], [5.6, 3.6], [4.0, 3.5]] },
  { nome: 'Jardim Silveira', tipo: 'urbano', pontos: [[5.9, 3.9], [7.3, 3.8], [7.4, 5.0], [6.0, 5.1]] },
];

// Cratera de Colônia: formação geológica real da região, desenhada como círculo
export const CRATERA = { x: 5.0, y: 7.6, raio: 1.6 };

// Vias principais: linhas abertas (o último ponto NÃO volta para o primeiro)
export const VIAS = [
  { nome: 'Estrada da Colônia', tipo: 'estrada', pontos: [[4.4, 0], [4.6, 2.5], [5.2, 4.5], [5.0, 6.0], [5.1, 9.0], [5.6, 10]] },
  { nome: 'Estrada para a Billings', tipo: 'estrada', pontos: [[5.2, 4.5], [7.0, 4.4], [8.1, 3.1]] },
  { nome: 'Rodoanel', tipo: 'rodoanel', pontos: [[0, 4.4], [2.0, 4.15], [4.0, 4.2], [6.0, 4.35], [8.0, 4.15], [10, 4.0]] },
];

// Locais importantes: de onde o drone sai e para onde ele leva entregas.
// "rotulo" é o nome curto que aparece no mapa (o nome completo é longo demais).
// tipo 'hub': base dos drones | 'hospital' | 'ubs': posto de saúde | 'comunidade'
export const LOCAIS = [
  { id: 'hub', nome: 'Hub AeroCuidado', rotulo: 'Hub AeroCuidado', tipo: 'hub', x: 3.4, y: 5.0 },
  { id: 'hosp-parelheiros', nome: 'Hospital Municipal de Parelheiros', rotulo: 'Hosp. Parelheiros', tipo: 'hospital', x: 4.8, y: 2.4 },
  { id: 'hosp-grajau', nome: 'Hospital Geral do Grajaú', rotulo: 'Hosp. Grajaú', tipo: 'hospital', x: 6.4, y: 0.7 },
  { id: 'ubs-silveira', nome: 'UBS Jardim Silveira', rotulo: 'UBS Jd. Silveira', tipo: 'ubs', x: 6.6, y: 4.5 },
  { id: 'ubs-colonia', nome: 'UBS Vargem Grande (Colônia)', rotulo: 'UBS Colônia', tipo: 'ubs', x: 5.4, y: 7.4 },
  { id: 'borore', nome: 'Ilha do Bororé', rotulo: 'Ilha do Bororé', tipo: 'comunidade', x: 9.0, y: 2.4 },
];

// Zonas de pouso seguro: campos abertos, longe de casas e fora da água.
// Se o drone tiver uma pane, ele desvia para a zona mais próxima.
export const ZONAS_POUSO = [
  { id: 'ZP-01', x: 1.5, y: 4.9 },
  { id: 'ZP-02', x: 2.6, y: 2.4 },
  { id: 'ZP-03', x: 7.4, y: 2.2 },
  { id: 'ZP-04', x: 8.0, y: 5.8 },
  { id: 'ZP-05', x: 6.4, y: 6.4 },
  { id: 'ZP-06', x: 6.6, y: 9.0 },
];
