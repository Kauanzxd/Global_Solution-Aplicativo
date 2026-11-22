import { StyleSheet, Text } from 'react-native';
import { TEMA } from './tema';

// O resultado da avaliação de um pedido (regras/pedidos.js → avaliarPedido):
// verde = o drone atende (de qual filial, distância e bateria); vermelho = o motivo de não atender.
export default function AvaliacaoPedido({ avaliacao }) {
  if (!avaliacao.pode) {
    return (
      <Text style={[styles.caixa, styles.nao]} accessibilityRole="alert">
        {avaliacao.motivo}
      </Text>
    );
  }
  const filial = avaliacao.paradas[0];
  return (
    <Text style={[styles.caixa, styles.sim]}>
      Atende por drone: sai da {filial.nome}, percurso de {avaliacao.distanciaKm.toFixed(1).replace('.', ',')} km, decola
      com {avaliacao.bateria}% de bateria.
    </Text>
  );
}

const styles = StyleSheet.create({
  caixa: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    overflow: 'hidden',
  },
  sim: {
    backgroundColor: TEMA.sucessoClaro,
    color: TEMA.sucesso,
  },
  nao: {
    backgroundColor: TEMA.perigoClaro,
    color: TEMA.perigo,
  },
});
