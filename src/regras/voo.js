// Regras do voo do drone. Só contas, sem desenho.
import { distanciaKm, zonaMaisProxima } from './distancia.js';

export const ALTITUDE_CRUZEIRO = 120; // metros: teto comum para drones no Brasil
const RAMPA_KM = 0.4; // distância que o drone usa para subir (ou para descer)

// Altitude do drone, em metros, no ponto atual do trecho.
// Ele sobe no começo da rota, voa a 120 m e desce no fim do trecho.
export function altitudeDoVoo(voo) {
  const total = distanciaKm(voo.origem, voo.destino);

  // Só a rota original começa no chão (no hub); o desvio já começa no ar
  const comecouNoChao = voo.situacao === 'voando' || voo.situacao === 'entregue';

  // Fatores de 0 a 1: 0 = no chão, 1 = altitude de cruzeiro
  const fatorSubida = comecouNoChao ? Math.min(voo.km / RAMPA_KM, 1) : 1;
  const fatorDescida = Math.min((total - voo.km) / RAMPA_KM, 1);

  return Math.round(ALTITUDE_CRUZEIRO * Math.min(fatorSubida, fatorDescida));
}

// Onde o drone está depois de voar "kmVoados" na reta da origem até o destino.
// Usamos km (e não porcentagem) porque os eventos vão acontecer em km
// específicos, como "pane no km 1,5".
export function posicaoNaRota(origem, destino, kmVoados) {
  const total = distanciaKm(origem, destino);
  const progresso = Math.min(kmVoados / total, 1); // 0 = saindo, 1 = chegou

  return {
    x: origem.x + (destino.x - origem.x) * progresso,
    y: origem.y + (destino.y - origem.y) * progresso,
  };
}

// Avança o voo um pouquinho (passoKm) e verifica se aconteceu algum evento.
// "voo" guarda o trecho atual (origem → destino), quantos km já voou nele,
// a situação ('voando' | 'desviando' | 'entregue' | 'pouso-emergencia')
// e uma mensagem para mostrar na tela.
export function avancarVoo(voo, passoKm, eventos, zonas) {
  // Se o drone já pousou, nada muda
  if (voo.situacao !== 'voando' && voo.situacao !== 'desviando') return voo;

  const kmNovo = voo.km + passoKm;

  // Pane: só vale na rota original, no momento em que o drone passa pelo km do evento
  const pane = eventos.find(
    (evento) => evento.tipo === 'pane' && voo.situacao === 'voando' && voo.km < evento.km && kmNovo >= evento.km
  );
  if (pane) {
    const local = posicaoNaRota(voo.origem, voo.destino, pane.km);
    const { zona } = zonaMaisProxima(local, zonas);
    return {
      origem: local,
      destino: zona,
      km: 0,
      situacao: 'desviando',
      mensagem: `Pane no km ${pane.km}! Desviando para ${zona.id}`,
    };
  }

  // Chegou ao fim do trecho?
  const total = distanciaKm(voo.origem, voo.destino);
  if (kmNovo >= total) {
    if (voo.situacao === 'voando') {
      return { ...voo, km: total, situacao: 'entregue', mensagem: 'Entrega concluída!' };
    }
    return { ...voo, km: total, situacao: 'pouso-emergencia', mensagem: `Pouso seguro em ${voo.destino.id}` };
  }

  // Nada de especial: só anda
  return { ...voo, km: kmNovo };
}
