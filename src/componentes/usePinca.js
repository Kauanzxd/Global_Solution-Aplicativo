import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Zoom do usuário no mapa: pinça com dois dedos (celular) ou roda do mouse (computador).
// Devolve um "fator" que multiplica a vista automática da simulação:
//   1 = zoom automático; 0,5 = duas vezes mais perto; 2 = duas vezes mais longe.
// Só na versão web (a da apresentação): no app nativo, o fator fica sempre 1.
// "elemento": a referência (useRef) da caixa do mapa.

const FATOR_MINIMO = 0.15; // até ~7 vezes mais perto
const FATOR_MAXIMO = 4; // até 4 vezes mais longe (a vista nunca passa do mapa inteiro)

const limitar = (fator) => Math.min(FATOR_MAXIMO, Math.max(FATOR_MINIMO, fator));

// Distância entre os dois dedos, em px
function distanciaDosDedos(toques) {
  const [a, b] = toques;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function usePinca(elemento) {
  const [fator, setFator] = useState(1);
  const fatorRef = useRef(fator); // o fator atual, para os eventos (que não veem o estado novo)
  fatorRef.current = fator;
  const inicio = useRef(null); // { distancia, fator } quando os dois dedos encostam

  useEffect(() => {
    const no = elemento.current;
    if (Platform.OS !== 'web' || !no || !no.addEventListener) return undefined;

    // Um dedo continua rolando a página; o gesto de pinça fica com o mapa (e não com o zoom
    // da página inteira do navegador)
    no.style.touchAction = 'pan-y';

    const comecar = (evento) => {
      if (evento.touches.length !== 2) return;
      inicio.current = { distancia: distanciaDosDedos(evento.touches), fator: fatorRef.current };
    };
    const mover = (evento) => {
      if (evento.touches.length !== 2 || !inicio.current) return;
      evento.preventDefault();
      // Dedos se afastando (distância maior) → fator menor → mais perto
      const razao = inicio.current.distancia / distanciaDosDedos(evento.touches);
      setFator(limitar(inicio.current.fator * razao));
    };
    const terminar = (evento) => {
      if (evento.touches.length < 2) inicio.current = null;
    };
    // Roda do mouse: cada "clique" da roda aproxima ou afasta uns 10%
    const roda = (evento) => {
      evento.preventDefault();
      setFator((atual) => limitar(atual * 1.1 ** (evento.deltaY / 100)));
    };
    // Safari do iPhone: o gesto de pinça do sistema é desligado só em cima do mapa
    const bloquearGestoDoSafari = (evento) => evento.preventDefault();

    no.addEventListener('touchstart', comecar, { passive: true });
    no.addEventListener('touchmove', mover, { passive: false });
    no.addEventListener('touchend', terminar);
    no.addEventListener('touchcancel', terminar);
    no.addEventListener('wheel', roda, { passive: false });
    no.addEventListener('gesturestart', bloquearGestoDoSafari);
    no.addEventListener('gesturechange', bloquearGestoDoSafari);
    return () => {
      no.removeEventListener('touchstart', comecar);
      no.removeEventListener('touchmove', mover);
      no.removeEventListener('touchend', terminar);
      no.removeEventListener('touchcancel', terminar);
      no.removeEventListener('wheel', roda);
      no.removeEventListener('gesturestart', bloquearGestoDoSafari);
      no.removeEventListener('gesturechange', bloquearGestoDoSafari);
    };
  }, [elemento]);

  return [fator, setFator];
}
