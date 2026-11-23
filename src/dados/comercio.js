// O que dá para pedir na aba Pedidos (os mesmos produtos do site do SADEC).
// Lojas, farmácias, produtos e preços são FICTÍCIOS; as posições são de bairros reais de
// São Paulo, para o drone ter de onde coletar no mapa.
import { grausParaKm } from '../regras/geo.js';

// Maior carga que o drone leva (ACSL PF4: 5,5 kg). Acima disso, vai pela entrega convencional.
export const CARGA_MAXIMA_KG = 5.5;

// Taxa de entrega por drone (centavos), igual à do site
export const TAXA_DRONE_CENTAVOS = 790;

// Restaurantes (pedidos comerciais, prioridade 4). "img": foto do produto (assets/images/lojas).
export const LOJAS = [
  {
    id: 'loja-burger',
    tipo: 'loja',
    nome: 'Burger House',
    rotulo: 'Burger House',
    bairro: 'Pinheiros',
    categoria: 'Hambúrgueres',
    slogan: 'Sabor de verdade, em cada mordida.',
    capa: require('../../assets/images/lojas/cover-burger.jpg'),
    ...grausParaKm(-23.5665, -46.6915),
    itens: [
      { id: 'double-cheese', nome: 'Double Cheese', desc: 'Dois smash, cheddar e cebola caramelizada.', centavos: 3990, pesoKg: 0.42, img: require('../../assets/images/lojas/bh-double-cheese.jpg') },
      { id: 'fritas', nome: 'Batata frita', desc: 'Porção média, sal e páprica.', centavos: 1690, pesoKg: 0.2, img: require('../../assets/images/lojas/bh-fritas.jpg') },
      { id: 'onion', nome: 'Onion rings', desc: 'Anéis de cebola com molho da casa.', centavos: 1990, pesoKg: 0.22, img: require('../../assets/images/lojas/bh-onion.jpg') },
      { id: 'frango', nome: 'Frango crocante', desc: '8 tiras empanadas.', centavos: 2490, pesoKg: 0.3, img: require('../../assets/images/lojas/bh-frango.jpg') },
      { id: 'shake-morango', nome: 'Milkshake de morango', desc: '400 ml com chantilly.', centavos: 1890, pesoKg: 0.45, img: require('../../assets/images/lojas/bh-shake.jpg') },
      { id: 'refri', nome: 'Refrigerante de cola', desc: '400 ml com gelo.', centavos: 890, pesoKg: 0.42, img: require('../../assets/images/lojas/bh-refri.jpg') },
      { id: 'fardo-refri', nome: 'Fardo de refrigerante (6 × 2 L)', desc: 'Pesado: passa do limite de carga dos drones.', centavos: 5490, pesoKg: 12.6 },
    ],
  },
  {
    id: 'loja-pizza',
    tipo: 'loja',
    nome: 'Bella Pizza',
    rotulo: 'Bella Pizza',
    bairro: 'Mooca',
    categoria: 'Pizzaria',
    slogan: 'Mais que pizza, uma paixão.',
    capa: require('../../assets/images/lojas/cover-bella.jpg'),
    ...grausParaKm(-23.559, -46.599),
    itens: [
      { id: 'pizza-pepperoni', nome: 'Pizza de pepperoni', desc: 'Grande, 8 fatias, muçarela.', centavos: 6490, pesoKg: 0.9, img: require('../../assets/images/lojas/bp-pizza.jpg') },
      { id: 'fatia', nome: 'Fatia de pepperoni', desc: 'Individual, bem recheada.', centavos: 1490, pesoKg: 0.18, img: require('../../assets/images/lojas/bp-fatia.jpg') },
      { id: 'carbonara', nome: 'Espaguete à carbonara', desc: '400 g, bacon e parmesão.', centavos: 4290, pesoKg: 0.45, img: require('../../assets/images/lojas/bp-massa.jpg') },
      { id: 'salada-frango', nome: 'Salada de frango grelhado', desc: 'Folhas, tomate e frango.', centavos: 3290, pesoKg: 0.35, img: require('../../assets/images/lojas/bp-salada.jpg') },
      { id: 'petit', nome: 'Petit gâteau', desc: 'Chocolate com morango.', centavos: 2290, pesoKg: 0.2, img: require('../../assets/images/lojas/bp-petit.jpg') },
    ],
  },
  {
    id: 'loja-sushi',
    tipo: 'loja',
    nome: 'Sakura Sushi',
    rotulo: 'Sakura Sushi',
    bairro: 'Liberdade',
    categoria: 'Japonês',
    slogan: 'Tradição e sabor em cada detalhe.',
    capa: require('../../assets/images/lojas/cover-sakura.jpg'),
    ...grausParaKm(-23.5585, -46.635),
    itens: [
      { id: 'uramaki', nome: 'Uramaki de salmão', desc: '8 peças com gergelim.', centavos: 3890, pesoKg: 0.25, img: require('../../assets/images/lojas/ss-uramaki.jpg') },
      { id: 'hotroll', nome: 'Hot roll', desc: '8 peças com molho tarê.', centavos: 3690, pesoKg: 0.27, img: require('../../assets/images/lojas/ss-hotroll.jpg') },
      { id: 'nigiri', nome: 'Nigiri salmão e atum', desc: '6 peças.', centavos: 3490, pesoKg: 0.2, img: require('../../assets/images/lojas/ss-nigiri.jpg') },
      { id: 'poke', nome: 'Poke de salmão', desc: 'Tigela de 450 g.', centavos: 4690, pesoKg: 0.5, img: require('../../assets/images/lojas/ss-poke.jpg') },
      { id: 'limonada', nome: 'Limonada com hortelã', desc: '400 ml.', centavos: 1290, pesoKg: 0.42, img: require('../../assets/images/lojas/ss-limonada.jpg') },
      { id: 'shake-chocolate', nome: 'Milkshake de chocolate', desc: '400 ml com biscoito.', centavos: 1990, pesoKg: 0.45, img: require('../../assets/images/lojas/ss-shake.jpg') },
    ],
  },
];

// Farmácias (remédios, prioridade 3): de onde o drone retira o medicamento
export const FARMACIAS = [
  { id: 'farmacia-centro', tipo: 'farmacia', nome: 'Farmácia Popular Centro', rotulo: 'Farmácia Centro', bairro: 'Centro', ...grausParaKm(-23.547, -46.637) },
  { id: 'farmacia-vila-mariana', tipo: 'farmacia', nome: 'Drogaria Vila Mariana', rotulo: 'Drogaria V. Mariana', bairro: 'Vila Mariana', ...grausParaKm(-23.589, -46.634) },
  { id: 'farmacia-santana', tipo: 'farmacia', nome: 'Farmácia Santana', rotulo: 'Farmácia Santana', bairro: 'Santana', ...grausParaKm(-23.501, -46.626) },
];

// Medicamentos que o cidadão pode pedir (os do SADEC Saúde do site)
export const MEDICAMENTOS = [
  { id: 'losartana', nome: 'Losartana 50 mg', desc: 'Pressão alta, uso contínuo.' },
  { id: 'metformina', nome: 'Metformina 850 mg', desc: 'Diabetes, uso contínuo.' },
  { id: 'insulina', nome: 'Insulina NPH (refrigerada)', desc: 'Vai na caixa térmica, entre 2 e 8 °C.' },
  { id: 'curativos', nome: 'Kit de curativos', desc: 'Gaze, esparadrapo e antisséptico.' },
];

// Órgãos e tecidos (prioridade 1): só hospital ou operador da Central pedem
export const ORGAOS = ['Rim', 'Fígado', 'Coração', 'Córneas'];

// Suprimentos de socorro (prioridade 2): só a Defesa Civil ou o operador pedem
export const SUPRIMENTOS = [
  { id: 'agua', nome: 'Água potável (5 L)', pesoKg: 5 },
  { id: 'primeiros-socorros', nome: 'Kit de primeiros socorros', pesoKg: 2.5 },
  { id: 'remedios-abrigo', nome: 'Medicamentos básicos para abrigo', pesoKg: 1.5 },
];

// Centavos → "R$ 39,90"
export function emReais(centavos) {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
}

// A sacola { idDoItem: quantidade } de uma loja → linhas, total e peso
export function resumoDaSacola(sacola, loja) {
  const linhas = loja.itens
    .filter((item) => (sacola[item.id] || 0) > 0)
    .map((item) => ({ ...item, quantidade: sacola[item.id], subtotal: item.centavos * sacola[item.id] }));
  return {
    linhas,
    quantidade: linhas.reduce((soma, linha) => soma + linha.quantidade, 0),
    centavos: linhas.reduce((soma, linha) => soma + linha.subtotal, 0),
    pesoKg: Math.round(linhas.reduce((soma, linha) => soma + linha.pesoKg * linha.quantidade, 0) * 100) / 100,
  };
}
