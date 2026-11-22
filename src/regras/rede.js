// Vários drones da rede no ar ao mesmo tempo. Só contas, sem desenho.
// Cada drone extra é um voo de verdade (as mesmas regras do voo.js), com uma rota
// escolhida para CRUZAR a do drone principal, na hora certa de os dois se encontrarem.
// Quando dois drones ficam perto, um "enxerga" o outro (avistarDrone) e eles conversam
// pelo rádio: a regra decide quem desvia.
import { verificarDecolagem } from './bateria.js';
import { distanciaKm } from './distancia.js';
import { ANTECEDENCIA_KM } from './obstaculos.js';
import { altitudeDoVoo, avancarVoo, avistarDrone, estaNoAr, posicaoNaRota } from './voo.js';

// Bolha de altura: com mais de 30 m de diferença na vertical, dois drones não se cruzam
// (um descendo para entregar e outro a 120 m, por exemplo). Ninguém precisa desviar.
const BOLHA_VERTICAL_M = 30;

// As missões dos drones extras, na ordem em que entram (cada um com uma cor no mapa)
export const DRONES_DA_REDE = [
  { idDrone: 'SADEC-02', prioridade: 'comercial', cor: '#0B5CAD' },
  { idDrone: 'SADEC-03', prioridade: 'saude', cor: '#2E7D32' },
  { idDrone: 'SADEC-04', prioridade: 'emergencia', cor: '#E65100' },
];

// Em que ponto da ida do drone principal cada extra cruza (40%, 60% e 80% do caminho)
const PONTOS_DE_CRUZAMENTO = [0.4, 0.6, 0.8];

// Uma decolagem (subir 120 m) leva o mesmo tempo que voar uns 2 km: é o que o drone
// principal "gasta" antes de começar a andar. Serve para acertar a hora do encontro.
const DECOLAGEM_EM_KM = 2;

// Distância entre um ponto e um segmento (o trecho de uma rota), em km
function distanciaAoTrecho(ponto, a, b) {
  const total = distanciaKm(a, b);
  if (total === 0) return distanciaKm(ponto, a);
  // Projeção do ponto na reta, limitada ao trecho (0 = em a, 1 = em b)
  const t = Math.max(0, Math.min(1, ((ponto.x - a.x) * (b.x - a.x) + (ponto.y - a.y) * (b.y - a.y)) / total ** 2));
  return distanciaKm(ponto, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
}

// As duas filiais mais perto de um ponto. A rede tem cobertura dupla (todo hospital tem
// 2 filiais a até 10 km): se a mais próxima estiver ocupada, a segunda atende.
function duasFiliaisMaisPerto(ponto, filiais) {
  return [...filiais].sort((x, y) => distanciaKm(ponto, x) - distanciaKm(ponto, y)).slice(0, 2);
}

// Monta os drones extras. "paradas": o percurso do principal (o 1º trecho é a ida até o
// primeiro alvo). "evitar": locais que não podem ser o destino de um extra.
// Para cada extra, procura um hospital cuja rota (saindo de uma das 2 filiais mais próximas
// dele) passe a menos de 500 m do ponto de cruzamento, sem ser paralela à nossa.
export function montarRede(paradas, quantidade, filiais, hospitais, evitar = []) {
  const [a, b] = paradas;
  const idaKm = distanciaKm(a, b);
  const usados = new Set(evitar.map((local) => local.id));
  const extras = [];

  for (let i = 0; i < Math.min(quantidade, DRONES_DA_REDE.length); i++) {
    const modelo = DRONES_DA_REDE[i];
    const ponto = posicaoNaRota(a, b, idaKm * PONTOS_DE_CRUZAMENTO[i]);

    let melhor = null;
    for (const hospital of hospitais) {
      if (usados.has(hospital.id)) continue;
      for (const filial of duasFiliaisMaisPerto(hospital, filiais)) {
        const rotaKm = distanciaKm(filial, hospital);
        if (rotaKm < 2 || rotaKm > 9) continue;
        const desvioDoPonto = distanciaAoTrecho(ponto, filial, hospital);
        if (desvioDoPonto > 0.5) continue;
        // Direções das duas rotas: se forem quase paralelas (|cos| > 0,9), não é um cruzamento
        const cos =
          ((b.x - a.x) * (hospital.x - filial.x) + (b.y - a.y) * (hospital.y - filial.y)) / (idaKm * rotaKm);
        if (Math.abs(cos) > 0.9) continue;
        // O ponto de encontro tem de estar na ida do extra, longe da decolagem dele
        const ateOEncontro = distanciaKm(filial, ponto);
        if (ateOEncontro < 1) continue;
        if (!melhor || desvioDoPonto < melhor.desvioDoPonto) melhor = { hospital, filial, desvioDoPonto, ateOEncontro };
      }
    }
    if (!melhor) continue;
    usados.add(melhor.hospital.id);

    // Hora do encontro: o principal chega ao ponto depois de decolar e voar até ele.
    // Diferença positiva: o extra espera esse tanto antes de decolar.
    // Negativa: o extra já começa no ar, adiantado na rota.
    const diferenca = DECOLAGEM_EM_KM + idaKm * PONTOS_DE_CRUZAMENTO[i] - (DECOLAGEM_EM_KM + melhor.ateOEncontro);
    const bateria = Math.min(100, Math.ceil(verificarDecolagem(melhor.filial, melhor.hospital, 100).necessariaComMargem) + 20);

    extras.push({
      ...modelo,
      origem: melhor.filial,
      destino: melhor.hospital,
      bateria,
      espera: Math.max(diferenca, 0), // em "km de voo" do principal
      adiantadoKm: Math.max(-diferenca - DECOLAGEM_EM_KM, 0),
    });
  }
  return extras;
}

// O voo inicial de um extra: parado na filial (esperando), ou já no ar, adiantado na rota
export function criarVooDaRede(extra) {
  const base = {
    idDrone: extra.idDrone,
    origem: extra.origem,
    destino: extra.destino,
    bateria: extra.bateria,
    prioridade: extra.prioridade,
    espera: extra.espera,
  };
  if (extra.adiantadoKm > 0) {
    const km = Math.min(extra.adiantadoKm, distanciaKm(extra.origem, extra.destino) - 1);
    return { ...base, km, hodometro: km, altitude: 120, situacao: 'voando', mensagem: 'Voando...' };
  }
  const mensagem = extra.espera > 0 ? `Na ${extra.origem.nome || 'filial'}, aguardando a vez de decolar` : 'Decolando...';
  return { ...base, km: 0, altitude: 0, situacao: 'decolando', mensagem };
}

// Avança os extras um tique. Quem ainda espera na filial só desconta a espera; quando a
// espera acaba, é a vez dele: avisa no rádio que está decolando.
export function avancarRede(voos, passoKm, regiao) {
  return voos.map((voo) => {
    if (voo.espera > 0) {
      const espera = voo.espera - passoKm;
      return espera > 0 ? { ...voo, espera } : { ...voo, espera, mensagem: 'Decolando, é a minha vez' };
    }
    return avancarVoo(voo, passoKm, [], regiao);
  });
}

// Onde um voo está agora
function posicao(voo) {
  return posicaoNaRota(voo.origem, voo.destino, voo.km);
}

// Saiu da bolha de altura: o outro drone deixa de ser obstáculo para este voo (se estava
// desviando dele, o desvio termina no próximo passo). Sai também da lista de "vistos":
// se os dois voltarem à mesma altura, eles se enxergam de novo.
function esquecerDrone(voo, idOutro, altitudeOutro) {
  const tinha = (voo.obstaculos || []).some((o) => o.tipo === 'drone' && o.id === idOutro);
  if (!tinha) return voo;
  const minha = altitudeDoVoo(voo);
  const situacaoOutro = altitudeOutro < minha ? 'abaixo' : 'acima';
  return {
    ...voo,
    obstaculos: voo.obstaculos.filter((o) => !(o.tipo === 'drone' && o.id === idOutro)),
    dronesVistos: (voo.dronesVistos || []).filter((id) => id !== idOutro),
    mensagem: `${idOutro} está ${situacaoOutro}, a ${altitudeOutro} m (nós a ${minha} m): fora da bolha de altura, sem risco de colisão`,
  };
}

// Drones perto um do outro (até 800 m, quando o obstáculo "entra em cena") se enxergam,
// desde que estejam quase na mesma altura (bolha de altura).
// "todos": o principal e os extras. Cada par entra uma vez em cada um (avistarDrone cuida disso).
export function aproximarDrones(todos) {
  const prontos = todos.map((voo) => voo);
  const nome = (voo) => voo.idDrone ?? 'SADEC-01';
  for (let i = 0; i < prontos.length; i++) {
    for (let j = i + 1; j < prontos.length; j++) {
      const a = prontos[i];
      const b = prontos[j];
      const noAr = estaNoAr(a) && estaNoAr(b) && !(a.espera > 0) && !(b.espera > 0);
      if (!noAr || distanciaKm(posicao(a), posicao(b)) > ANTECEDENCIA_KM) continue;

      // Muito acima ou abaixo: não é ameaça (e um desvio que já tinha começado é cancelado)
      const altitudeA = altitudeDoVoo(a);
      const altitudeB = altitudeDoVoo(b);
      if (Math.abs(altitudeA - altitudeB) > BOLHA_VERTICAL_M) {
        prontos[i] = esquecerDrone(a, nome(b), altitudeB);
        prontos[j] = esquecerDrone(b, nome(a), altitudeA);
        continue;
      }
      const comoOutro = (voo) => ({ id: nome(voo), prioridade: voo.prioridade ?? 'saude', bateria: voo.bateria });
      prontos[i] = avistarDrone(a, comoOutro(b));
      prontos[j] = avistarDrone(b, comoOutro(a));
    }
  }
  return prontos;
}
