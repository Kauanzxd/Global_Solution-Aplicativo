import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CENARIOS } from '../dados/cenarios';
import { TEMA } from './tema';

// Cartões dos cenários prontos, em duas colunas.
// escolhido: id do cenário carregado agora (ou null) | aoEscolher(cenario)
export default function CenariosProntos({ escolhido, aoEscolher }) {
  return (
    <View style={styles.grade}>
      {CENARIOS.map((cenario) => {
        const ativo = cenario.id === escolhido;
        return (
          <Pressable
            key={cenario.id}
            onPress={() => aoEscolher(cenario)}
            style={[styles.cartao, ativo && styles.ativo]}
            accessibilityRole="button"
            aria-selected={ativo}
          >
            <Text style={[styles.titulo, ativo && styles.tituloAtivo]}>{cenario.titulo}</Text>
            <Text style={styles.descricao} numberOfLines={5}>
              {cenario.descricao}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  cartao: {
    width: '48.5%',
    minHeight: 92,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.fundo,
  },
  ativo: {
    borderColor: TEMA.marca,
    borderWidth: 2,
    backgroundColor: TEMA.marcaClara,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '700',
    color: TEMA.texto,
  },
  tituloAtivo: {
    color: TEMA.marca,
  },
  descricao: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: TEMA.textoSuave,
  },
});
