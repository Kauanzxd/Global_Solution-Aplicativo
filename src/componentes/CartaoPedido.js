import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MISSOES } from '../dados/missoes';
import { TEMA } from './tema';

// Um pedido na lista: código, prioridade (P1 a P4, com a cor), o que é, o caminho
// (coleta → entrega), o status e o botão para ver o voo dele na aba Simular.
// "mostrarQuem": na fila da Central, mostra também quem pediu
export default function CartaoPedido({ pedido, aoVerVoo, mostrarQuem = false }) {
  const missao = MISSOES.find((opcao) => opcao.valor === pedido.prioridade);
  const caminho = pedido.coleta ? `${pedido.coleta.nome} → ${pedido.destino.nome}` : `Filial → ${pedido.destino.nome}`;

  return (
    <View style={[styles.cartao, { borderLeftColor: missao.cor }]}>
      <View style={styles.topo}>
        <Text style={styles.codigo}>{pedido.codigo}</Text>
        <Text style={[styles.prioridade, { backgroundColor: missao.cor }]}>
          P{missao.nivel} · {missao.rotulo}
        </Text>
      </View>
      <Text style={styles.titulo}>{pedido.titulo}</Text>
      <Text style={styles.detalhe}>{pedido.detalhe}</Text>
      <Text style={styles.detalhe}>{caminho}</Text>
      {mostrarQuem ? <Text style={styles.detalhe}>Pedido por: {pedido.quem}</Text> : null}
      <Text style={styles.status}>Status: {pedido.status}</Text>
      <Pressable style={styles.botao} onPress={() => aoVerVoo(pedido)} accessibilityRole="button">
        <Text style={styles.textoBotao}>Ver o voo no simulador</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.fundo,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codigo: {
    fontSize: 15,
    fontWeight: '800',
    color: TEMA.texto,
  },
  prioridade: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  titulo: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: TEMA.texto,
  },
  detalhe: {
    marginTop: 2,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  status: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: TEMA.marca,
  },
  botao: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: TEMA.marca,
    alignItems: 'center',
  },
  textoBotao: {
    fontSize: 14,
    fontWeight: '700',
    color: TEMA.marca,
  },
});
