import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Gestos do usuário no mapa, por cima da câmera automática da simulação:
//   - arrastar com um dedo (ou com o mouse apertado): move a visão;
//   - pinça com dois dedos (ou roda do mouse): zoom.
// Devolve:
//   - "fator": multiplica a vista automática (1 = automático; 0,5 = duas vezes mais perto);
//   - "deslocamento": { x, y } em unidades do desenho, quanto a visão foi arrastada;
//   - "acabouDeArrastar()": true logo depois de um arrasto (para o toque não escolher destino);
//   - "voltarAoAutomatico()": zera o zoom e o arrasto.
// "elemento": a referência da caixa do mapa. "unidadesPorPx": referência com quantas
// unidades do desenho cabem em 1 px agora (muda com o zoom).
// Só na versão web (a da apresentação); no app nativo, a visão fica sempre automática.
// Usa "pointer events", que juntam dedo, mouse e caneta num tipo só de evento.

const FATOR_MINIMO = 0.15; // até ~7 vezes mais perto
const FATOR_MAXIMO = 4; // até 4 vezes mais longe (a vista nunca passa do mapa inteiro)
const DESLOCAMENTO_MAXIMO = 100; // o mapa inteiro: mais que isso não faz sentido
const PX_PARA_SER_ARRASTO = 6; // abaixo disso, foi só um toque

const limitarFator = (fator) => Math.min(FATOR_MAXIMO, Math.max(FATOR_MINIMO, fator));
const limitarDeslocamento = (valor) => Math.min(DESLOCAMENTO_MAXIMO, Math.max(-DESLOCAMENTO_MAXIMO, valor));

const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pontoMedio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export default function useGestosDoMapa(elemento, unidadesPorPx) {
  const [fator, setFator] = useState(1);
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 });
  const fatorRef = useRef(fator); // os eventos leem daqui (não veem o estado novo)
  fatorRef.current = fator;
  const fimDoArrasto = useRef(0); // quando o último arrasto terminou (Date.now)

  useEffect(() => {
    const no = elemento.current;
    if (Platform.OS !== 'web' || !no || !no.addEventListener) return undefined;

    // O navegador não rola a página nem dá zoom nela com o dedo em cima do mapa: os gestos
    // ficam com o mapa (para rolar a página, o dedo vai fora do mapa)
    no.style.touchAction = 'none';

    const dedos = new Map(); // dedos (ou o mouse) apertados agora: id → { x, y }
    let pinca = null; // { distancia, fator } no começo da pinça
    let anterior = null; // ponto (ou ponto médio dos dois dedos) no evento anterior
    let andou = 0; // quantos px andou desde que apertou

    // Arrasta a visão: o dedo vai para a direita, o mapa vai junto (a visão vai para a esquerda)
    const arrastar = (ponto) => {
      if (anterior) {
        const dx = ponto.x - anterior.x;
        const dy = ponto.y - anterior.y;
        andou += Math.hypot(dx, dy);
        const escala = unidadesPorPx.current;
        setDeslocamento((atual) => ({ x: limitarDeslocamento(atual.x + dx * escala), y: limitarDeslocamento(atual.y + dy * escala) }));
      }
      anterior = ponto;
    };

    const apertar = (evento) => {
      if (evento.pointerType === 'mouse' && evento.button !== 0) return;
      // Continua recebendo os eventos mesmo se o dedo sair do mapa (se o navegador deixar)
      try {
        no.setPointerCapture(evento.pointerId);
      } catch {
        // sem captura, o gesto funciona do mesmo jeito enquanto o dedo estiver no mapa
      }
      dedos.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
      const [a, b] = [...dedos.values()];
      if (dedos.size === 1) {
        andou = 0;
        anterior = a;
      } else if (dedos.size === 2) {
        pinca = { distancia: distancia(a, b), fator: fatorRef.current };
        anterior = pontoMedio(a, b);
      }
    };
    const mover = (evento) => {
      if (!dedos.has(evento.pointerId)) return;
      dedos.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
      const [a, b] = [...dedos.values()];
      if (dedos.size === 1) {
        arrastar(a);
      } else if (dedos.size === 2 && pinca) {
        // Dedos se afastando (distância maior) → fator menor → mais perto
        setFator(limitarFator(pinca.fator * (pinca.distancia / distancia(a, b))));
        arrastar(pontoMedio(a, b)); // os dois dedos juntos também arrastam
        andou = PX_PARA_SER_ARRASTO + 1; // uma pinça nunca é um toque
      }
    };
    const soltar = (evento) => {
      if (!dedos.has(evento.pointerId)) return;
      dedos.delete(evento.pointerId);
      if (andou > PX_PARA_SER_ARRASTO) fimDoArrasto.current = Date.now();
      pinca = null;
      // Sobrou um dedo depois da pinça: ele continua arrastando dali
      const [restante] = [...dedos.values()];
      anterior = restante || null;
    };
    // Roda do mouse: cada "clique" da roda aproxima ou afasta uns 10%
    const roda = (evento) => {
      evento.preventDefault();
      setFator((atual) => limitarFator(atual * 1.1 ** (evento.deltaY / 100)));
    };
    // Safari do iPhone: o gesto de pinça do sistema é desligado só em cima do mapa
    const bloquearGestoDoSafari = (evento) => evento.preventDefault();

    no.addEventListener('pointerdown', apertar);
    no.addEventListener('pointermove', mover);
    no.addEventListener('pointerup', soltar);
    no.addEventListener('pointercancel', soltar);
    no.addEventListener('wheel', roda, { passive: false });
    no.addEventListener('gesturestart', bloquearGestoDoSafari);
    no.addEventListener('gesturechange', bloquearGestoDoSafari);
    return () => {
      no.removeEventListener('pointerdown', apertar);
      no.removeEventListener('pointermove', mover);
      no.removeEventListener('pointerup', soltar);
      no.removeEventListener('pointercancel', soltar);
      no.removeEventListener('wheel', roda);
      no.removeEventListener('gesturestart', bloquearGestoDoSafari);
      no.removeEventListener('gesturechange', bloquearGestoDoSafari);
    };
  }, [elemento, unidadesPorPx]);

  const acabouDeArrastar = () => Date.now() - fimDoArrasto.current < 400;
  const voltarAoAutomatico = () => {
    setFator(1);
    setDeslocamento({ x: 0, y: 0 });
  };
  const automatico = fator === 1 && deslocamento.x === 0 && deslocamento.y === 0;

  return { fator, deslocamento, automatico, acabouDeArrastar, voltarAoAutomatico };
}
