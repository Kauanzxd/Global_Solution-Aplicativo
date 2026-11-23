// Rota de API (roda no servidor do EAS Hosting): busca um endereço no Nominatim, o buscador
// do OpenStreetMap, e devolve os lugares encontrados.
// Passa pelo servidor porque o Nominatim exige que cada aplicativo se identifique (o
// "User-Agent"), o que o navegador não deixa fazer. Não vai nenhum dado pessoal: só o texto
// buscado. Uso: GET /api/endereco?q=Avenida%20Paulista%201000&viewbox=lon1,lat1,lon2,lat2

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const IDENTIFICACAO = 'SADEC-simulador/1.0 (projeto academico; sadec.expo.app)';
const LIMITE_DE_LETRAS = 120;

// Memória deste servidor: a mesma busca não é pedida de novo ao Nominatim (regra de uso)
const memoria = new Map();

export async function GET(request) {
  const parametros = new URL(request.url).searchParams;
  const texto = String(parametros.get('q') || '').trim().slice(0, LIMITE_DE_LETRAS);
  const viewbox = String(parametros.get('viewbox') || '');
  if (texto.length < 3) return new Response('Texto curto demais', { status: 400 });
  if (!/^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/.test(viewbox)) return new Response('Área inválida', { status: 400 });

  const chave = `${texto.toLowerCase()}|${viewbox}`;
  if (!memoria.has(chave)) {
    const busca = new URLSearchParams({
      q: `${texto}, São Paulo`,
      format: 'jsonv2',
      addressdetails: '1',
      layer: 'address', // só endereços (sem lojas, estações etc.)
      countrycodes: 'br',
      viewbox,
      bounded: '1', // só dentro da área do mapa
      limit: '10',
      'accept-language': 'pt-BR',
    });
    const resposta = await fetch(`${NOMINATIM}?${busca}`, { headers: { 'User-Agent': IDENTIFICACAO } });
    if (!resposta.ok) return new Response('Busca de endereço indisponível', { status: 502 });
    memoria.set(chave, await resposta.json());
  }
  return Response.json(memoria.get(chave));
}
