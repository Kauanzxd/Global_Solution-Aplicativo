// Regras de risco do solo: onde o drone pode (ou não pode) pousar ou cair.
// Só contas, sem desenho. Pontos são { x, y } em km; polígonos e vias são
// listas de [x, y], do mesmo jeito que estão em dados/regiao.js.
import { distanciaKm } from './distancia.js';

// Faixa de segurança de cada lado de rodovias, Rodoanel e trilhos
export const DISTANCIA_SEGURA_VIA_KM = 0.15; // 150 m

// Pontos de entrega (hospitais, UBSs, comunidades) têm gente em volta: numa emergência,
// o drone evita descer a menos de 150 m deles (só se não houver outra opção)
export const DISTANCIA_SEGURA_LOCAL_KM = 0.15;

// O ponto está dentro do polígono? Técnica do "raio":
// imagine uma linha saindo do ponto para a direita, até o infinito.
// Contamos quantas bordas do polígono ela cruza: ímpar = dentro, par = fora.
export function pontoNoPoligono(ponto, pontos) {
  let dentro = false;

  for (let i = 0; i < pontos.length; i++) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[(i + 1) % pontos.length]; // o último ponto liga no primeiro

    // A borda passa pela altura (y) do ponto? Uma ponta acima e a outra abaixo.
    const passaPelaAltura = y1 > ponto.y !== y2 > ponto.y;
    if (passaPelaAltura) {
      // Em que x a borda cruza essa altura?
      const xDoCruzamento = x1 + ((ponto.y - y1) / (y2 - y1)) * (x2 - x1);
      // Se o cruzamento fica à direita do ponto, o "raio" cruzou esta borda
      if (ponto.x < xDoCruzamento) dentro = !dentro;
    }
  }

  return dentro;
}

// Distância do ponto até um segmento de reta que vai de "a" até "b".
// Achamos o ponto do segmento mais perto e medimos com Pitágoras.
export function distanciaAteSegmento(ponto, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // "t" diz onde fica o ponto mais perto: 0 = em "a", 1 = em "b", 0,5 = no meio
  let t = ((ponto.x - a.x) * dx + (ponto.y - a.y) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t)); // não pode sair do segmento

  const maisPerto = { x: a.x + dx * t, y: a.y + dy * t };
  return distanciaKm(ponto, maisPerto);
}

// Distância do ponto até uma via inteira: a menor entre todos os seus segmentos
export function distanciaAteVia(ponto, via) {
  let menor = Infinity;

  for (let i = 0; i < via.pontos.length - 1; i++) {
    const [ax, ay] = via.pontos[i];
    const [bx, by] = via.pontos[i + 1];
    const distancia = distanciaAteSegmento(ponto, { x: ax, y: ay }, { x: bx, y: by });
    menor = Math.min(menor, distancia);
  }

  return menor;
}

// Distância do ponto até a borda de um polígono: é a distância até uma "via"
// que dá a volta no polígono e termina onde começou
export function distanciaAtePoligono(ponto, pontos) {
  return distanciaAteVia(ponto, { pontos: [...pontos, pontos[0]] });
}

// Qual o risco de o drone descer neste ponto?
// 'proibido': perto de rodovia, Rodoanel ou trilho (risco de acidente em cadeia)
// 'alto':     bairro urbano ou perto de estrada local
// 'medio':    terreno aberto
// 'baixo':    mata ou parque (o melhor lugar)
//
// "incertezaKm" (opcional): o quanto o drone pode estar errado sobre onde está
// (sem GPS). Na dúvida, ele se protege: as faixas de segurança aumentam nesse tanto.
// "evitar" (opcional): pontos com gente (os locais de entrega), risco alto por perto.
export function riscoNoPonto(ponto, areas, vias, incertezaKm = 0, evitar = []) {
  const faixa = DISTANCIA_SEGURA_VIA_KM + incertezaKm;
  const viasPerto = vias.filter((via) => distanciaAteVia(ponto, via) <= faixa);

  // As vias vêm primeiro: perto de uma via movimentada, nada mais importa
  if (viasPerto.some((via) => via.tipo !== 'estrada')) return 'proibido';
  if (viasPerto.length > 0) return 'alto';

  // Perto de um ponto de entrega (hospital, UBS, comunidade): tem gente, risco alto
  const pertoDeLocal = evitar.some((local) => distanciaKm(ponto, local) <= DISTANCIA_SEGURA_LOCAL_KM + incertezaKm);
  if (pertoDeLocal) return 'alto';

  const area = areas.find((a) => pontoNoPoligono(ponto, a.pontos));
  if (area && area.tipo === 'urbano') return 'alto';

  // Perto da borda de um bairro: com a incerteza, pode ser que esteja dentro dele
  const pertoDeBairro =
    incertezaKm > 0 &&
    areas.some((a) => a.tipo === 'urbano' && distanciaAtePoligono(ponto, a.pontos) <= incertezaKm);
  if (pertoDeBairro) return 'alto';

  if (!area) return 'medio'; // fora de qualquer área: terreno aberto
  return 'baixo'; // mata ou parque
}
