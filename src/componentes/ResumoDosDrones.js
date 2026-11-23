import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ResumoVoo from './ResumoVoo';
import { TEMA } from './tema';

// Aba que sobe da parte de baixo da tela com o resumo de CADA drone de uma missão com
// vários drones (o principal e os outros), um embaixo do outro.
// "visivel": se a aba está aberta | "aoFechar": fecha a aba (botão, toque fora ou voltar)
// "resumos": [{ nome, cor, voo, bateriaInicial, etapas }]
export default function ResumoDosDrones({ visivel, aoFechar, resumos }) {
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <View style={styles.fundo}>
        {/* Tocar fora da aba (na parte escura) também fecha */}
        <Pressable style={styles.areaFora} onPress={aoFechar} accessibilityLabel="Fechar o resumo dos drones" />
        <View style={styles.aba} accessibilityViewIsModal>
          <View style={styles.topo}>
            <Text style={styles.titulo} accessibilityRole="header">
              Resumo de todos os drones ({resumos.length})
            </Text>
            <Pressable style={styles.botaoFechar} onPress={aoFechar} accessibilityRole="button" accessibilityLabel="Fechar">
              <Text style={styles.textoFechar}>Fechar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.lista}>
            {resumos.map((resumo) => (
              <View key={resumo.nome} style={[styles.cartao, { borderLeftColor: resumo.cor }]}>
                <ResumoVoo voo={resumo.voo} bateriaInicial={resumo.bateriaInicial} etapas={resumo.etapas} titulo={resumo.nome} />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  areaFora: {
    flex: 1,
  },
  aba: {
    maxHeight: '85%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: TEMA.fundo,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: TEMA.borda,
  },
  titulo: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: TEMA.texto,
  },
  botaoFechar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: TEMA.marca,
  },
  textoFechar: {
    fontSize: 13,
    fontWeight: '700',
    color: TEMA.marca,
  },
  lista: {
    padding: 12,
    gap: 12,
  },
  cartao: {
    borderLeftWidth: 5,
    borderRadius: 14,
  },
});
