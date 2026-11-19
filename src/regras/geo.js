// Conversão de posições reais (latitude e longitude, em graus) para o nosso mapa (x e y, em km).
// Só contas, sem desenho.

// Quantos km vale 1 grau, na cidade de São Paulo. São os MESMOS valores do sistema em
// Python do grupo (sadec.py), para que as distâncias do app e do Python batam.
// A longitude vale menos que a latitude porque os meridianos se aproximam longe do equador.
export const KM_POR_GRAU_LATITUDE = 110.8; // norte/sul
export const KM_POR_GRAU_LONGITUDE = 102.0; // leste/oeste

// Canto noroeste (em cima, à esquerda) do mapa: é o ponto x = 0, y = 0.
// O mapa é um quadrado de 76 km. A cidade tem 47 km de largura e 72 km de altura:
// a origem fica 2 km ao norte da cidade e longe o bastante a oeste para ela ficar
// centralizada na horizontal (sobram uns 14 km de cada lado, com as cidades vizinhas).
export const ORIGEM = { lat: -23.34, lon: -46.968 };

// Graus → km. Lembrete: no mapa, x cresce para o leste e y cresce para o SUL.
// No Brasil a latitude é negativa e fica MAIS negativa indo para o sul,
// por isso y = (latitude da origem - latitude do ponto): ir para o sul dá y positivo.
// Ex.: um ponto 0,1° ao sul e 0,1° a leste da origem → x = 10,2 km e y = 11,08 km.
export function grausParaKm(lat, lon) {
  return {
    x: (lon - ORIGEM.lon) * KM_POR_GRAU_LONGITUDE,
    y: (ORIGEM.lat - lat) * KM_POR_GRAU_LATITUDE,
  };
}

// Converte uma lista de pontos [latitude, longitude] na lista [x, y] em km que o mapa
// e as regras de risco usam (o mesmo formato de antes, em dados/regiao.js).
export function listaParaKm(pontos) {
  return pontos.map(([lat, lon]) => {
    const { x, y } = grausParaKm(lat, lon);
    return [x, y];
  });
}
