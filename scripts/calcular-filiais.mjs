// Calcula onde ficam as filiais da SADEC para que a cidade inteira tenha COBERTURA DUPLA:
// todo ponto (e todo hospital) a até 10 km de pelo menos duas filiais.
// Roda no Node, uma vez, e imprime a lista para colar em src/dados/regiao.js:
//   node scripts/calcular-filiais.mjs
//
// Algoritmo guloso ("ganancioso"): a cada rodada, escolhe a posição candidata que resolve
// MAIS falta de cobertura de uma vez. Não garante o mínimo absoluto de filiais, mas chega
// perto e é fácil de explicar e de conferir.
import { AREAS, BAIRROS, CONTORNO, LOCAIS, VIAS } from '../src/dados/regiao.js';
import { RAIO_FILIAL_KM, verificarCobertura } from '../src/regras/cobertura.js';
import { distanciaKm } from '../src/regras/distancia.js';
import { ORIGEM, KM_POR_GRAU_LATITUDE, KM_POR_GRAU_LONGITUDE } from '../src/regras/geo.js';
import { pontoNoPoligono, riscoNoPonto } from '../src/regras/risco.js';

const MINIMO = 2; // cobertura dupla
const PASSO_GRADE_KM = 1;
const DISTANCIA_MINIMA_KM = 3; // entre duas filiais

// 1. Pontos que precisam de cobertura: uma grade a cada 1 km dentro da cidade + os hospitais
const pontos = [];
for (let x = 0; x <= 76; x += PASSO_GRADE_KM) {
  for (let y = 0; y <= 76; y += PASSO_GRADE_KM) {
    if (pontoNoPoligono({ x, y }, CONTORNO)) pontos.push({ x, y });
  }
}
const hospitais = LOCAIS.filter((local) => local.tipo === 'hospital');
pontos.push(...hospitais);

// 2. Onde uma filial pode ficar: dentro da cidade, fora das represas e longe de vias movimentadas
const naAgua = (p) => AREAS.some((a) => a.tipo === 'agua' && pontoNoPoligono(p, a.pontos));
const candidatos = pontos
  .slice(0, pontos.length - hospitais.length) // só a grade
  .filter((p) => !naAgua(p) && riscoNoPonto(p, AREAS, VIAS) !== 'proibido');

// 3. Começa com as filiais que o grupo já usa no Java e no chatbot
const maisPerto = (alvo) => candidatos.reduce((a, b) => (distanciaKm(b, alvo) < distanciaKm(a, alvo) ? b : a));
const filiais = ['Centro', 'Santo Amaro', 'Itaquera'].map((nome) => maisPerto(BAIRROS.find((b) => b.nome === nome)));

// Quantas filiais cada ponto exige: 2 na área urbana e nos hospitais; 1 na zona rural do
// extremo sul (Mata Atlântica, quase sem moradores e sem hospital). Assim, nenhum ponto da
// cidade fica sem alcance, e a redundância fica onde mora gente.
const rural = AREAS.find((a) => a.nome === 'Zona rural do extremo sul');
const exigido = pontos.map((p, i) => (i < pontos.length - hospitais.length && pontoNoPoligono(p, rural.pontos) ? 1 : MINIMO));

// Quanto falta para cada ponto ter as filiais que exige
const falta = pontos.map((p, i) => Math.max(exigido[i] - filiais.filter((f) => distanciaKm(p, f) <= RAIO_FILIAL_KM).length, 0));

// 4. Rodadas gulosas: escolhe o candidato que mais reduz a falta total
while (falta.some((f) => f > 0)) {
  let melhor = null;
  let ganhoMelhor = 0;
  for (const c of candidatos) {
    // Duas filiais no mesmo lugar não são redundância de verdade (um problema ali derruba
    // as duas): cada filial nova fica a pelo menos 3 km das que já existem
    if (filiais.some((f) => distanciaKm(f, c) < DISTANCIA_MINIMA_KM)) continue;
    let ganho = 0;
    for (let i = 0; i < pontos.length; i++) {
      if (falta[i] > 0 && distanciaKm(pontos[i], c) <= RAIO_FILIAL_KM) ganho++;
    }
    if (ganho > ganhoMelhor) {
      ganhoMelhor = ganho;
      melhor = c;
    }
  }
  filiais.push(melhor);
  for (let i = 0; i < pontos.length; i++) {
    if (falta[i] > 0 && distanciaKm(pontos[i], melhor) <= RAIO_FILIAL_KM) falta[i]--;
  }
}

// 4b. Poda: o guloso às vezes deixa filiais que, no fim, ficaram sobrando (as que vieram
//     depois já cobrem a área delas). Testa cada uma, da última para a primeira (as 3 do
//     grupo ficam sempre): se a cobertura continua completa sem ela, ela sai.
const cobreTudo = (lista) =>
  pontos.every((p, i) => lista.filter((f) => distanciaKm(p, f) <= RAIO_FILIAL_KM).length >= exigido[i]);
for (let i = filiais.length - 1; i >= 3; i--) {
  const semEla = filiais.filter((_, j) => j !== i);
  if (cobreTudo(semEla)) filiais.splice(i, 1);
}

// 5. Nome de cada filial: o bairro de referência mais perto. Se o nome já foi usado,
//    ganha um "II" (ex.: "Filial Grajaú II"), em vez de pegar o nome de um bairro longe.
const usados = new Map(); // nome do bairro → quantas filiais já usam
const resultado = filiais.map((f, i) => {
  const bairro = BAIRROS.reduce((a, b) => (distanciaKm(f, b) < distanciaKm(f, a) ? b : a));
  const vezes = (usados.get(bairro.nome) || 0) + 1;
  usados.set(bairro.nome, vezes);
  const sufixo = ['', '', ' II', ' III', ' IV'][vezes] ?? ` ${vezes}`;
  // km → graus (a conta inversa de grausParaKm), para guardar como lat/lon
  const lat = ORIGEM.lat - f.y / KM_POR_GRAU_LATITUDE;
  const lon = ORIGEM.lon + f.x / KM_POR_GRAU_LONGITUDE;
  return { id: `F-${String(i + 1).padStart(2, '0')}`, nome: `Filial ${bairro.nome}${sufixo}`, lat, lon, x: f.x, y: f.y };
});

// 6. Prova: confere a cobertura de novo, do zero, com a regra do app
const daGrade = pontos.slice(0, pontos.length - hospitais.length);
const urbanos = daGrade.filter((p) => !pontoNoPoligono(p, rural.pontos));
const rurais = daGrade.filter((p) => pontoNoPoligono(p, rural.pontos));
const urbana = verificarCobertura(urbanos, resultado, MINIMO);
const ruralOk = verificarCobertura(rurais, resultado, 1);
const doHospital = verificarCobertura(hospitais, resultado, MINIMO);
console.log(`${resultado.length} filiais | raio ${RAIO_FILIAL_KM} km | mínimo ${DISTANCIA_MINIMA_KM} km entre filiais`);
console.log(`área urbana: ${urbana.cobertos}/${urbana.total} pontos com 2+ filiais (pior: ${urbana.pior.filiais})`);
console.log(`zona rural:  ${ruralOk.cobertos}/${ruralOk.total} pontos com 1+ filial (pior: ${ruralOk.pior.filiais})`);
console.log(`hospitais:   ${doHospital.cobertos}/${doHospital.total} com 2+ filiais (pior: ${doHospital.pior.filiais})`);
const dupla = verificarCobertura(daGrade, resultado, MINIMO);
console.log(`(a cidade inteira com 2+ filiais: ${dupla.cobertos}/${dupla.total})`);
console.log('\nexport const FILIAIS_EM_GRAUS = [');
for (const r of resultado) console.log(`  { id: '${r.id}', nome: '${r.nome}', em: [${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}] },`);
console.log('];');
