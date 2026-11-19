// Regras do voo do drone. Só contas, sem desenho.
import { distanciaKm, zonaMaisProxima } from './distancia.js';

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
