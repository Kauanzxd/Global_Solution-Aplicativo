import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TEMA } from './tema';

// Uma fileira de "pílulas" para escolher UMA opção (como botões de rádio, só que bonitos).
// opcoes: [{ valor, rotulo, cor? }] | valor: o escolhido agora | aoEscolher(valor)
export default function Opcoes({ opcoes, valor, aoEscolher }) {
  return (
    <View style={styles.linha}>
      {opcoes.map((opcao) => {
        const escolhida = opcao.valor === valor;
        const cor = opcao.cor || TEMA.marca;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => aoEscolher(opcao.valor)}
            style={[styles.pilula, escolhida && { backgroundColor: cor, borderColor: cor }]}
            accessibilityRole="radio"
            aria-checked={escolhida}
          >
            <Text style={[styles.texto, escolhida && styles.textoEscolhido]}>{opcao.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap', // se não couber numa linha, quebra para a próxima
    gap: 8,
  },
  pilula: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999, // bem arredondado: vira uma pílula
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.cartao,
  },
  texto: {
    fontSize: 14,
    color: TEMA.texto,
  },
  textoEscolhido: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
