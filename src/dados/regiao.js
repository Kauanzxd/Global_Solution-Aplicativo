// Dados do mapa: a cidade de São Paulo inteira.
// O contorno é o oficial do IBGE; rios, represas, vias e parques são um traçado
// ESQUEMÁTICO (poucos pontos), escrito em [latitude, longitude] para poder ser
// conferido em qualquer mapa, e convertido para km com listaParaKm (regras/geo.js).
//
// Coordenadas finais em km, num quadrado de 76 x 76 km:
//   x vai de 0 (oeste) até 76 (leste)
//   y vai de 0 (norte) até 76 (sul)
import { grausParaKm, listaParaKm } from '../regras/geo.js';
import { CONTORNO_SP } from './contornoSP.js';
import { HOSPITAIS } from './hospitais.js';

export const TAMANHO_KM = 76;

// Contorno da cidade em km (desenhado no mapa; fora dele ficam as cidades vizinhas)
export const CONTORNO = listaParaKm(CONTORNO_SP);

// Rios: linhas abertas. "largura" (opcional, em km): rios grandes são desenhados mais grossos.
export const RIOS = [
  {
    nome: 'Rio Tietê',
    largura: 0.12,
    pontos: listaParaKm([
      [-23.478, -46.392], [-23.487, -46.44], [-23.488, -46.482], [-23.497, -46.52], [-23.508, -46.56],
      [-23.515, -46.6], [-23.519, -46.64], [-23.517, -46.68], [-23.522, -46.72], [-23.533, -46.748], [-23.525, -46.79],
    ]),
  },
  {
    nome: 'Rio Pinheiros',
    largura: 0.1,
    pontos: listaParaKm([
      [-23.533, -46.748], [-23.548, -46.737], [-23.566, -46.716], [-23.588, -46.697], [-23.607, -46.697],
      [-23.64, -46.713], [-23.675, -46.704], [-23.705, -46.68],
    ]),
  },
];

// Áreas de terra com uso diferente. ATENÇÃO À ORDEM: as regras de risco usam a PRIMEIRA
// área que contém o ponto. Por isso parques e represas vêm antes da cidade.
// tipo 'mata': parques e mata preservada (os melhores lugares para pouso de emergência)
// tipo 'agua': represas (sem gente, mas a carga se perde: risco alto)
// tipo 'urbano': a cidade e as cidades vizinhas (casas, ruas e pessoas)
// "rotulo" (opcional): nome escrito no mapa e a posição dele, em [latitude, longitude].
const AREAS_EM_GRAUS = [
  {
    nome: 'Serra da Cantareira',
    tipo: 'mata',
    rotulo: { texto: 'Cantareira', em: [-23.405, -46.63] },
    pontos: [[-23.36, -46.7], [-23.37, -46.6], [-23.39, -46.55], [-23.42, -46.565], [-23.44, -46.63], [-23.43, -46.68], [-23.4, -46.72]],
  },
  {
    nome: 'Parque Anhanguera',
    tipo: 'mata',
    rotulo: { texto: 'Pq. Anhanguera', em: [-23.418, -46.79] },
    pontos: [[-23.405, -46.805], [-23.403, -46.772], [-23.428, -46.766], [-23.44, -46.79], [-23.43, -46.81]],
  },
  {
    nome: 'Parque Estadual do Jaraguá',
    tipo: 'mata',
    pontos: [[-23.448, -46.775], [-23.449, -46.755], [-23.468, -46.752], [-23.471, -46.772]],
  },
  {
    nome: 'Parque Ecológico do Tietê',
    tipo: 'mata',
    rotulo: { texto: 'Pq. Ecológico do Tietê', em: [-23.478, -46.525] },
    pontos: [[-23.481, -46.545], [-23.48, -46.505], [-23.494, -46.505], [-23.496, -46.545]],
  },
  {
    nome: 'Cidade Universitária (USP)',
    tipo: 'mata',
    rotulo: { texto: 'USP', em: [-23.561, -46.73] },
    pontos: [[-23.552, -46.742], [-23.552, -46.72], [-23.569, -46.72], [-23.569, -46.742]],
  },
  {
    nome: 'Parque Ibirapuera',
    tipo: 'mata',
    rotulo: { texto: 'Ibirapuera', em: [-23.588, -46.657] },
    pontos: [[-23.581, -46.664], [-23.581, -46.651], [-23.594, -46.651], [-23.594, -46.664]],
  },
  {
    nome: 'Parque do Carmo',
    tipo: 'mata',
    rotulo: { texto: 'Pq. do Carmo', em: [-23.58, -46.465] },
    pontos: [[-23.571, -46.478], [-23.571, -46.452], [-23.591, -46.452], [-23.591, -46.478]],
  },
  {
    nome: 'Parque Fontes do Ipiranga',
    tipo: 'mata',
    rotulo: { texto: 'Fontes do Ipiranga', em: [-23.646, -46.626] },
    pontos: [[-23.633, -46.64], [-23.633, -46.613], [-23.659, -46.613], [-23.659, -46.64]],
  },
  {
    nome: 'Represa Guarapiranga',
    tipo: 'agua',
    rotulo: { texto: 'Guarapiranga', em: [-23.75, -46.745] },
    pontos: [
      [-23.68, -46.725], [-23.7, -46.712], [-23.735, -46.716], [-23.765, -46.735], [-23.8, -46.76],
      [-23.815, -46.79], [-23.79, -46.786], [-23.76, -46.765], [-23.73, -46.75], [-23.7, -46.741],
    ],
  },
  {
    nome: 'Represa Billings',
    tipo: 'agua',
    rotulo: { texto: 'Billings', em: [-23.79, -46.643] },
    pontos: [
      [-23.705, -46.668], [-23.725, -46.651], [-23.76, -46.641], [-23.8, -46.626], [-23.84, -46.611],
      [-23.86, -46.63], [-23.83, -46.65], [-23.79, -46.665], [-23.75, -46.68], [-23.72, -46.681],
    ],
  },
  {
    // Extremo sul (Parelheiros e Marsilac): zona rural e Mata Atlântica, quase sem casas
    nome: 'Zona rural do extremo sul',
    tipo: 'mata',
    rotulo: { texto: 'Zona rural (Parelheiros e Marsilac)', em: [-23.9, -46.7] },
    // Passa um pouco do contorno da cidade de propósito: o mapa só desenha a parte de dentro
    pontos: [[-23.84, -46.86], [-23.835, -46.7], [-23.855, -46.62], [-23.95, -46.55], [-24.05, -46.62], [-24.05, -46.86]],
  },
];

export const AREAS = [
  ...AREAS_EM_GRAUS.map((area) => ({
    ...area,
    pontos: listaParaKm(area.pontos),
    rotulo: area.rotulo && { texto: area.rotulo.texto, ...grausParaKm(...area.rotulo.em) },
  })),
  // A cidade: tudo o que não é parque nem represa é área urbana
  { nome: 'Cidade de São Paulo', tipo: 'urbano', pontos: CONTORNO },
  // Fora da cidade: as cidades vizinhas da região metropolitana, também urbanas
  { nome: 'Região metropolitana', tipo: 'urbano', pontos: [[0, 0], [TAMANHO_KM, 0], [TAMANHO_KM, TAMANHO_KM], [0, TAMANHO_KM]] },
];

// Pico do Jaraguá: o ponto mais alto da cidade (1.135 m), desenhado como um triângulo
export const PICO = { nome: 'Pico do Jaraguá', ...grausParaKm(-23.4569, -46.7664) };

// Vias principais: linhas abertas (o último ponto NÃO volta para o primeiro).
// tipo 'rodovia' | 'rodoanel' | 'estrada' | 'ferrovia' (trem da CPTM)
const VIAS_EM_GRAUS = [
  {
    nome: 'Marginal Tietê',
    tipo: 'rodovia',
    pontos: [[-23.482, -46.392], [-23.49, -46.44], [-23.491, -46.482], [-23.5, -46.52], [-23.511, -46.56], [-23.518, -46.6], [-23.522, -46.64], [-23.52, -46.68], [-23.525, -46.72], [-23.536, -46.748]],
  },
  {
    nome: 'Marginal Pinheiros',
    tipo: 'rodovia',
    pontos: [[-23.536, -46.745], [-23.55, -46.733], [-23.568, -46.712], [-23.589, -46.693], [-23.608, -46.693], [-23.641, -46.709], [-23.676, -46.7], [-23.703, -46.676]],
  },
  {
    nome: 'Rodoanel',
    tipo: 'rodoanel',
    pontos: [
      [-23.4, -46.79], [-23.45, -46.81], [-23.52, -46.825], [-23.58, -46.835], [-23.65, -46.825], [-23.72, -46.805],
      [-23.775, -46.75], [-23.785, -46.68], [-23.755, -46.6], [-23.7, -46.5], [-23.63, -46.4], [-23.5, -46.355],
      [-23.43, -46.4], [-23.39, -46.48], [-23.38, -46.58], [-23.39, -46.68], [-23.4, -46.79],
    ],
  },
  { nome: 'Rodovia Anhanguera', tipo: 'rodovia', pontos: [[-23.519, -46.735], [-23.48, -46.758], [-23.45, -46.783], [-23.4, -46.83]] },
  { nome: 'Rodovia dos Bandeirantes', tipo: 'rodovia', pontos: [[-23.521, -46.725], [-23.49, -46.738], [-23.455, -46.752], [-23.36, -46.83]] },
  { nome: 'Rodovia Fernão Dias', tipo: 'rodovia', pontos: [[-23.517, -46.605], [-23.47, -46.585], [-23.38, -46.57]] },
  { nome: 'Rodovia Presidente Dutra', tipo: 'rodovia', pontos: [[-23.511, -46.585], [-23.47, -46.53], [-23.44, -46.45], [-23.41, -46.36]] },
  { nome: 'Rodovia Ayrton Senna', tipo: 'rodovia', pontos: [[-23.508, -46.56], [-23.493, -46.48], [-23.465, -46.38]] },
  { nome: 'Rodovia Raposo Tavares', tipo: 'rodovia', pontos: [[-23.575, -46.71], [-23.59, -46.76], [-23.6, -46.84]] },
  { nome: 'Rodovia Régis Bittencourt', tipo: 'rodovia', pontos: [[-23.625, -46.711], [-23.65, -46.77], [-23.7, -46.84]] },
  { nome: 'Rodovia dos Imigrantes', tipo: 'rodovia', pontos: [[-23.612, -46.625], [-23.665, -46.622], [-23.73, -46.6]] },
  { nome: 'Via Anchieta', tipo: 'rodovia', pontos: [[-23.59, -46.605], [-23.64, -46.583], [-23.7, -46.55]] },
  { nome: 'Radial Leste', tipo: 'rodovia', pontos: [[-23.549, -46.625], [-23.546, -46.55], [-23.541, -46.47]] },
  { nome: 'Linha 7 da CPTM', tipo: 'ferrovia', pontos: [[-23.534, -46.636], [-23.526, -46.666], [-23.523, -46.703], [-23.49, -46.727], [-23.44, -46.748], [-23.4, -46.778], [-23.36, -46.82]] },
  { nome: 'Linha 10 da CPTM', tipo: 'ferrovia', pontos: [[-23.534, -46.636], [-23.56, -46.612], [-23.6, -46.585], [-23.64, -46.555]] },
  { nome: 'Linhas 11 e 12 da CPTM', tipo: 'ferrovia', pontos: [[-23.538, -46.615], [-23.541, -46.552], [-23.536, -46.47], [-23.53, -46.4]] },
  { nome: 'Linha 8 da CPTM', tipo: 'ferrovia', pontos: [[-23.535, -46.645], [-23.529, -46.7], [-23.533, -46.775]] },
];

export const VIAS = VIAS_EM_GRAUS.map((via) => ({ ...via, pontos: listaParaKm(via.pontos) }));

// Zonas de pouso seguro: campos abertos dentro dos parques, longe de casas, vias e água.
// Numa emergência o drone desvia para uma delas (ou para uma filial, que é ainda melhor).
const ZONAS_EM_GRAUS = [
  { id: 'ZP-Anhanguera', em: [-23.42, -46.79] },
  { id: 'ZP-Jaraguá', em: [-23.462, -46.763] },
  { id: 'ZP-Cantareira Oeste', em: [-23.405, -46.67] },
  { id: 'ZP-Cantareira Leste', em: [-23.41, -46.6] },
  { id: 'ZP-Ecológico do Tietê', em: [-23.487, -46.525] },
  { id: 'ZP-USP', em: [-23.56, -46.731] },
  { id: 'ZP-Ibirapuera', em: [-23.588, -46.658] },
  { id: 'ZP-Carmo', em: [-23.581, -46.465] },
  { id: 'ZP-Fontes do Ipiranga', em: [-23.646, -46.627] },
  { id: 'ZP-Parelheiros', em: [-23.875, -46.715] },
  { id: 'ZP-Marsilac', em: [-23.95, -46.7] },
];

export const ZONAS_POUSO = ZONAS_EM_GRAUS.map((zona) => ({ id: zona.id, ...grausParaKm(...zona.em) }));

// Bairros de referência: dão nome às filiais (a filial leva o nome do bairro mais próximo).
const BAIRROS_EM_GRAUS = [
  ['Perus', -23.405, -46.754], ['Pirituba', -23.485, -46.725], ['Brasilândia', -23.468, -46.69],
  ['Freguesia do Ó', -23.5, -46.698], ['Cachoeirinha', -23.47, -46.665], ['Santana', -23.5, -46.625],
  ['Tremembé', -23.455, -46.61], ['Tucuruvi', -23.48, -46.603], ['Jaçanã', -23.462, -46.58],
  ['Vila Maria', -23.512, -46.58], ['Penha', -23.525, -46.545], ['Ermelino Matarazzo', -23.495, -46.48],
  ['São Miguel Paulista', -23.498, -46.443], ['Itaim Paulista', -23.5, -46.4], ['Guaianases', -23.542, -46.412],
  ['Cidade Tiradentes', -23.592, -46.403], ['Itaquera', -23.54, -46.457], ['São Mateus', -23.605, -46.475],
  ['Sapopemba', -23.605, -46.51], ['Aricanduva', -23.565, -46.505], ['Vila Prudente', -23.583, -46.58],
  ['Mooca', -23.56, -46.598], ['Tatuapé', -23.54, -46.576], ['Centro', -23.55, -46.634],
  ['Lapa', -23.522, -46.705], ['Butantã', -23.57, -46.72], ['Pinheiros', -23.566, -46.69],
  ['Vila Mariana', -23.59, -46.636], ['Ipiranga', -23.59, -46.605], ['Jabaquara', -23.645, -46.643],
  ['Santo Amaro', -23.65, -46.71], ['Campo Limpo', -23.64, -46.762], ['Capão Redondo', -23.668, -46.77],
  ['Jardim Ângela', -23.705, -46.77], ['Cidade Ademar', -23.672, -46.655], ['Socorro', -23.69, -46.705],
  ['Pedreira', -23.7, -46.665], ['Grajaú', -23.765, -46.695], ['Parelheiros', -23.825, -46.728],
  ['Marsilac', -23.93, -46.7], ['Anhanguera', -23.43, -46.79], ['Jaraguá', -23.45, -46.74],
  ['Mandaqui', -23.48, -46.63], ['Vila Medeiros', -23.49, -46.58], ['Cangaíba', -23.5, -46.52],
  ['Vila Curuçá', -23.51, -46.42], ['Lajeado', -23.55, -46.4], ['Iguatemi', -23.6, -46.43],
  ['José Bonifácio', -23.56, -46.43], ['Cidade Líder', -23.56, -46.49], ['Água Rasa', -23.56, -46.57],
  ['São Lucas', -23.6, -46.55], ['Cursino', -23.62, -46.62], ['Saúde', -23.62, -46.64],
  ['Campo Belo', -23.62, -46.67], ['Moema', -23.6, -46.66], ['Itaim Bibi', -23.58, -46.68],
  ['Morumbi', -23.6, -46.72], ['Raposo Tavares', -23.59, -46.78], ['Rio Pequeno', -23.57, -46.76],
  ['Jaguaré', -23.55, -46.75], ['Vila Leopoldina', -23.53, -46.73], ['Vila Andrade', -23.63, -46.73],
  ['Jardim São Luís', -23.66, -46.74], ['Cidade Dutra', -23.72, -46.7], ['Colônia', -23.86, -46.7],
  ['Vargem Grande', -23.85, -46.67], ['Barragem', -23.97, -46.66],
];

export const BAIRROS = BAIRROS_EM_GRAUS.map(([nome, lat, lon]) => ({ nome, ...grausParaKm(lat, lon) }));

// Filiais da SADEC: as bases de onde os drones decolam (no código, "hub").
// As posições foram CALCULADAS por scripts/calcular-filiais.mjs (algoritmo guloso + poda):
//   - toda a área urbana e todos os hospitais a até 10 km de pelo menos DUAS filiais;
//   - a zona rural do extremo sul a até 10 km de pelo menos UMA;
//   - nenhuma filial a menos de 3 km de outra.
// As três primeiras são as filiais que o grupo já usa no Java e no chatbot.
// Para recalcular (se o mapa mudar): node scripts/calcular-filiais.mjs
const FILIAIS_EM_GRAUS = [
  { id: 'F-01', nome: 'Filial Centro', em: [-23.5476, -46.6347] },
  { id: 'F-02', nome: 'Filial Santo Amaro', em: [-23.6469, -46.7131] },
  { id: 'F-03', nome: 'Filial Itaquera', em: [-23.5386, -46.4582] },
  { id: 'F-04', nome: 'Filial Santana', em: [-23.5115, -46.6543] },
  { id: 'F-05', nome: 'Filial Cidade Dutra', em: [-23.71, -46.7131] },
  { id: 'F-06', nome: 'Filial Marsilac', em: [-23.8996, -46.7033] },
  { id: 'F-07', nome: 'Filial Cidade Líder', em: [-23.5656, -46.4778] },
  { id: 'F-08', nome: 'Filial Grajaú', em: [-23.7732, -46.7033] },
  { id: 'F-09', nome: 'Filial Brasilândia', em: [-23.4573, -46.7131] },
  { id: 'F-10', nome: 'Filial Pirituba', em: [-23.4754, -46.7523] },
  { id: 'F-11', nome: 'Filial Itaim Bibi', em: [-23.5927, -46.6739] },
  { id: 'F-12', nome: 'Filial Tremembé', em: [-23.4212, -46.6151] },
  { id: 'F-13', nome: 'Filial Parelheiros', em: [-23.8003, -46.7131] },
  { id: 'F-14', nome: 'Filial Tremembé II', em: [-23.3942, -46.5955] },
  { id: 'F-15', nome: 'Filial José Bonifácio', em: [-23.5566, -46.4288] },
  { id: 'F-16', nome: 'Filial Cursino', em: [-23.6288, -46.5955] },
  { id: 'F-17', nome: 'Filial Campo Limpo', em: [-23.6469, -46.7915] },
  { id: 'F-18', nome: 'Filial Anhanguera', em: [-23.4032, -46.8209] },
  { id: 'F-19', nome: 'Filial Raposo Tavares', em: [-23.5837, -46.8013] },
  { id: 'F-20', nome: 'Filial Barragem', em: [-23.9718, -46.7033] },
  { id: 'F-21', nome: 'Filial Anhanguera II', em: [-23.4303, -46.8111] },
  { id: 'F-22', nome: 'Filial Marsilac II', em: [-23.9086, -46.8111] },
  { id: 'F-23', nome: 'Filial Campo Belo', em: [-23.6378, -46.6837] },
];

export const FILIAIS = FILIAIS_EM_GRAUS.map((filial) => ({ id: filial.id, nome: filial.nome, ...grausParaKm(...filial.em) }));

// Nome curto para o mapa: sem "Hospital"/"Hosp" no começo e com no máximo 22 letras
function rotuloCurto(nome) {
  const semPrefixo = nome.replace(/^(Hospital|Hosp)\s+/i, '');
  return semPrefixo.length > 22 ? `${semPrefixo.slice(0, 21).trim()}…` : semPrefixo;
}

// Locais importantes: de onde o drone sai (filiais) e para onde ele leva entregas (hospitais).
// tipo 'hub': filial | 'hospital'
export const LOCAIS = [
  ...FILIAIS.map((filial) => ({ ...filial, tipo: 'hub', rotulo: filial.nome })),
  ...HOSPITAIS.map((hospital) => ({
    id: hospital.id,
    nome: hospital.nome,
    rotulo: rotuloCurto(hospital.nome),
    bairro: hospital.bairro,
    endereco: hospital.endereco,
    tipo: 'hospital',
    ...grausParaKm(hospital.lat, hospital.lon),
  })),
];
