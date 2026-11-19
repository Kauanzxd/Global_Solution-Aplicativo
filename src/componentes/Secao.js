import { StyleSheet, Text, View } from 'react-native';
import { TEMA } from './tema';

// Um cartão branco com título e, opcionalmente, uma dica embaixo do título.
// "children" é o que vier entre <Secao> e </Secao>.
export default function Secao({ titulo, dica, children }) {
  return (
    <View style={styles.cartao}>
      <Text style={styles.titulo}>{titulo}</Text>
      {dica ? <Text style={styles.dica}>{dica}</Text> : null}
      <View style={styles.conteudo}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: TEMA.cartao,
    borderRadius: TEMA.raio,
    borderWidth: 1,
    borderColor: TEMA.borda,
    padding: 16,
    marginTop: 14,
  },
  titulo: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase', // TÍTULO EM MAIÚSCULAS, discreto
    color: TEMA.textoSuave,
  },
  dica: {
    marginTop: 4,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  conteudo: {
    marginTop: 12,
  },
});
