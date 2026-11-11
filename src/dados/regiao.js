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
