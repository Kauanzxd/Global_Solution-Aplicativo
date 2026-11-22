// Regras dos pedidos (aba Pedidos). Só contas, sem desenho.
// Um pedido vira um voo: filial → ponto da coleta (loja, farmácia ou hospital) → entrega → filial.
// O socorro da Defesa Civil não tem coleta: o drone já sai da filial com o suprimento.
import { verificarPercurso } from './bateria.js';
import { distanciaKm } from './distancia.js';

// A filial mais perto de um ponto
export function filialMaisPerto(ponto, filiais) {
  return filiais.reduce((melhor, filial) => (distanciaKm(ponto, filial) < distanciaKm(ponto, melhor) ? filial : melhor));
}

// As paradas do voo de um pedido. Com coleta, sai da filial mais perto da coleta; sem
// coleta, da filial mais perto da entrega. Sempre volta à filial mais perto da entrega.
export function paradasDoPedido(coleta, destino, filiais) {
  const volta = filialMaisPerto(destino, filiais);
  if (!coleta) return [volta, destino, volta];
  return [filialMaisPerto(coleta, filiais), coleta, destino, volta];
}

// Dá para atender por drone? Confere o peso e o alcance (com a bateria cheia).
// Devolve { pode, motivo, paradas, bateria, distanciaKm }:
//   bateria: a carga sugerida para a decolagem (a necessária + 15%, no máximo 100%)
export function avaliarPedido({ coleta, destino, pesoKg = 0 }, filiais, cargaMaximaKg) {
  const paradas = paradasDoPedido(coleta, destino, filiais);
  const percurso = verificarPercurso(paradas, 100);
  const bateria = Math.min(100, Math.ceil(percurso.necessariaComMargem) + 15);

  if (pesoKg > cargaMaximaKg) {
    return {
      pode: false,
      motivo: `O pedido pesa ${String(pesoKg).replace('.', ',')} kg e passa do limite de ${String(cargaMaximaKg).replace('.', ',')} kg do drone: vai pela entrega convencional.`,
      paradas,
      bateria,
      distanciaKm: percurso.distanciaTotal,
    };
  }
  if (!percurso.pode) {
    return {
      pode: false,
      motivo: `O percurso tem ${percurso.distanciaTotal.toFixed(1).replace('.', ',')} km e passa do alcance do drone, mesmo com a bateria cheia: vai por outro meio de transporte.`,
      paradas,
      bateria,
      distanciaKm: percurso.distanciaTotal,
    };
  }
  return { pode: true, motivo: null, paradas, bateria, distanciaKm: percurso.distanciaTotal };
}

// Endereços de entrega: um por bairro. Se o centro do bairro cair em cima de rodovia ou
// trilho (onde o drone não pode pousar), o ponto vai para o lugar permitido mais perto,
// procurando de 50 em 50 m, em 8 direções, até 500 m.
export function enderecosDeEntrega(bairros, areas, vias, riscoNoPonto) {
  const direcoes = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  return bairros.map((bairro) => {
    let ponto = { x: bairro.x, y: bairro.y };
    if (riscoNoPonto(ponto, areas, vias) === 'proibido') {
      busca: for (let raio = 0.05; raio <= 0.5; raio += 0.05) {
        for (const [dx, dy] of direcoes) {
          const candidato = { x: bairro.x + dx * raio, y: bairro.y + dy * raio };
          if (riscoNoPonto(candidato, areas, vias) !== 'proibido') {
            ponto = candidato;
            break busca;
          }
        }
      }
    }
    const id = `bairro-${bairro.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-')}`;
    return { id, tipo: 'bairro', nome: bairro.nome, rotulo: bairro.nome, ...ponto };
  });
}
