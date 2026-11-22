import { G, Image } from 'react-native-svg';
import { grausParaKm, kmParaGraus } from '../regras/geo';

// Mapa de ruas por baixo do desenho (ruas, avenidas com nome, quadras, estabelecimentos),
// como nos apps de mapa. São "tiles": imagens quadradas de 256 px, cada uma cobrindo um
// pedaço do mundo, do servidor oficial do OpenStreetMap. A política de uso do OSM permite
// uso leve (como esta demonstração acadêmica) desde que o crédito apareça no mapa.
const ENDERECO_TILE = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

// Faixa de zoom dos tiles: 10 mostra a cidade inteira; 17 mostra as ruas de perto
const ZOOM_MINIMO = 10;
const ZOOM_MAXIMO = 17;

// Largura de um tile em km, na latitude de São Paulo, no zoom 0 (a volta da Terra × cos(23,55°)).
// A cada zoom a mais, o tile cobre metade da largura.
const KM_DO_TILE_NO_ZOOM_0 = 36745;

// Graus → número do tile (projeção de Mercator, a mesma dos apps de mapa)
function tileDaLongitude(lon, z) {
  return ((lon + 180) / 360) * 2 ** z;
}
function tileDaLatitude(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
}
// Número do tile → graus do canto de cima, à esquerda
function longitudeDoTile(x, z) {
  return (x / 2 ** z) * 360 - 180;
}
function latitudeDoTile(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

// "x0", "y0" e "vista": a parte do papel (em unidades do desenho) que está na tela.
// "escala": unidades do desenho por km. "larguraTela": largura do mapa na tela, em px.
export default function CamadaRuas({ x0, y0, vista, escala, larguraTela = 380 }) {
  // Zoom: o tile deve aparecer com uns 256 px na tela (o texto das ruas fica no tamanho certo)
  const kmNaTela = vista / escala;
  const kmPorTileDesejado = (kmNaTela * 256) / larguraTela;
  const z = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, Math.round(Math.log2(KM_DO_TILE_NO_ZOOM_0 / kmPorTileDesejado))));

  // Cantos da vista em graus → quais tiles cobrem a vista
  const noroeste = kmParaGraus(x0 / escala, y0 / escala);
  const sudeste = kmParaGraus((x0 + vista) / escala, (y0 + vista) / escala);
  const xMin = Math.floor(tileDaLongitude(noroeste.lon, z));
  const xMax = Math.floor(tileDaLongitude(sudeste.lon, z));
  const yMin = Math.floor(tileDaLatitude(noroeste.lat, z));
  const yMax = Math.floor(tileDaLatitude(sudeste.lat, z));

  const tiles = [];
  for (let tx = xMin; tx <= xMax; tx++) {
    for (let ty = yMin; ty <= yMax; ty++) {
      // Canto de cima/esquerda e de baixo/direita do tile, no nosso mapa (em unidades do desenho)
      const a = grausParaKm(latitudeDoTile(ty, z), longitudeDoTile(tx, z));
      const b = grausParaKm(latitudeDoTile(ty + 1, z), longitudeDoTile(tx + 1, z));
      tiles.push({
        chave: `${z}-${tx}-${ty}`,
        url: ENDERECO_TILE(z, tx, ty),
        x: a.x * escala,
        y: a.y * escala,
        largura: (b.x - a.x) * escala,
        altura: (b.y - a.y) * escala,
      });
    }
  }

  return (
    <G>
      {tiles.map((tile) => (
        <Image
          key={tile.chave}
          href={{ uri: tile.url }}
          x={tile.x}
          y={tile.y}
          // um fio a mais em cada lado esconde as emendas entre os tiles
          width={tile.largura + vista * 0.002}
          height={tile.altura + vista * 0.002}
          preserveAspectRatio="none"
        />
      ))}
    </G>
  );
}
