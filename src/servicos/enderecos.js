import { AREAS, TAMANHO_KM, VIAS } from '../dados/regiao.js';
import { grausParaKm, kmParaGraus } from '../regras/geo.js';
import { pontoDePouso } from '../regras/pedidos.js';
import { riscoNoPonto } from '../regras/risco.js';

// Busca de endereço (rua, avenida, número) no Nominatim, o buscador do OpenStreetMap, pela
// nossa rota /api/endereco (que identifica o app, como o Nominatim exige).
// Regras de uso do serviço gratuito (seguidas aqui):
//   - só busca quando a pessoa pede (no botão): autocompletar a cada letra é proibido;
//   - no máximo 1 pedido por segundo, e o resultado de cada busca fica guardado;
//   - crédito ao OpenStreetMap na tela (está embaixo dos resultados).
const ENDERECO_API = '/api/endereco';
const INTERVALO_MINIMO_MS = 1000;

// Só endereços: bairros, distritos e cidades ficam de fora
const NAO_E_ENDERECO = ['suburb', 'neighbourhood', 'quarter', 'city_district', 'borough', 'city', 'town', 'village', 'municipality', 'county', 'state', 'region', 'country', 'postcode'];

// A área do nosso mapa em graus (o "viewbox" da busca): só procura dentro dele
const NOROESTE = kmParaGraus(0, 0);
const SUDESTE = kmParaGraus(TAMANHO_KM, TAMANHO_KM);
const VIEWBOX = `${NOROESTE.lon},${NOROESTE.lat},${SUDESTE.lon},${SUDESTE.lat}`;

const memoria = new Map(); // texto da busca → resultados já encontrados
let ultimoPedido = 0;

// Nome curto para a lista e o mapa: "Avenida Paulista, 1000" (ou o nome do lugar)
function nomeCurto(resultado) {
  const endereco = resultado.address || {};
  const rua = endereco.road || resultado.name || resultado.display_name.split(',')[0];
  return endereco.house_number ? `${rua}, ${endereco.house_number}` : rua;
}

// Procura o endereço e devolve até 6 lugares: [{ id, nome, rotulo, detalhe, x, y }]
// (x e y em km, no sistema do nosso mapa). Lança um erro se o serviço não responder.
export async function buscarEnderecos(texto) {
  const chave = texto.trim().toLowerCase();
  if (memoria.has(chave)) return memoria.get(chave);

  // Respeita o intervalo mínimo entre pedidos
  const espera = ultimoPedido + INTERVALO_MINIMO_MS - Date.now();
  if (espera > 0) await new Promise((pronto) => setTimeout(pronto, espera));
  ultimoPedido = Date.now();

  const parametros = new URLSearchParams({ q: texto.trim(), viewbox: VIEWBOX });
  const resposta = await fetch(`${ENDERECO_API}?${parametros}`);
  if (!resposta.ok) throw new Error(`Busca de endereço indisponível (${resposta.status})`);
  const lista = await resposta.json();

  const encontrados = lista
    .filter((resultado) => !NAO_E_ENDERECO.includes(resultado.addresstype))
    .map((resultado) => {
      // O ponto da rua, ajustado para onde o drone pode pousar (fora de rodovia e trilho)
      const { x, y } = pontoDePouso(grausParaKm(Number(resultado.lat), Number(resultado.lon)), AREAS, VIAS, riscoNoPonto);
      const endereco = resultado.address || {};
      const nome = nomeCurto(resultado);
      return {
        id: `endereco-${resultado.place_id}`,
        nome,
        rotulo: nome,
        detalhe: [endereco.suburb || endereco.neighbourhood, endereco.city_district].filter(Boolean).join(' · '),
        x,
        y,
      };
    })
    .filter((lugar) => lugar.x >= 0 && lugar.y >= 0 && lugar.x <= TAMANHO_KM && lugar.y <= TAMANHO_KM)
    // Uma rua comprida vem em vários trechos: fica um por nome e bairro
    .filter((lugar, indice, todos) => todos.findIndex((outro) => outro.nome === lugar.nome && outro.detalhe === lugar.detalhe) === indice)
    .slice(0, 6);
  memoria.set(chave, encontrados);
  return encontrados;
}
