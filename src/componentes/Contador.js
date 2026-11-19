import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TEMA } from './tema';

// Botões − e + em volta de um número. Não deixa passar do mínimo nem do máximo.
// "casas": quantas casas decimais mostrar (ex.: 1 para km como 2,5)
// "passoGrande" (opcional): mostra também botões de pulo maior (ex.: ±1 km)
export default function Contador({ valor, passo, passoGrande, minimo, maximo, sufixo = '', casas = 0, aoMudar }) {
  // Arredonda para não acumular erros de decimal (0,1 + 0,2 = 0,30000000000000004)
  const arredondar = (numero) => Number(numero.toFixed(casas));
  const somar = (quanto) => aoMudar(arredondar(Math.min(maximo, Math.max(minimo, valor + quanto))));
  const diminuir = () => somar(-passo);
  const aumentar = () => somar(passo);

  return (
    <View style={styles.linha}>
      {passoGrande ? (
        <Pressable onPress={() => somar(-passoGrande)} disabled={valor <= minimo} style={[styles.pulo, valor <= minimo && styles.desligado]}>
          <Text style={styles.textoPulo}>−{String(passoGrande).replace('.', ',')}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={diminuir} disabled={valor <= minimo} style={[styles.botao, valor <= minimo && styles.desligado]}>
        <Text style={styles.sinal}>−</Text>
      </Pressable>
      <Text style={styles.valor}>
        {valor.toFixed(casas).replace('.', ',')}
        {sufixo}
      </Text>
      <Pressable onPress={aumentar} disabled={valor >= maximo} style={[styles.botao, valor >= maximo && styles.desligado]}>
        <Text style={styles.sinal}>+</Text>
      </Pressable>
      {passoGrande ? (
        <Pressable onPress={() => somar(passoGrande)} disabled={valor >= maximo} style={[styles.pulo, valor >= maximo && styles.desligado]}>
          <Text style={styles.textoPulo}>+{String(passoGrande).replace('.', ',')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEMA.marcaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desligado: {
    opacity: 0.35,
  },
  sinal: {
    fontSize: 22,
    fontWeight: '700',
    color: TEMA.marca,
  },
  // Botão de pulo grande: retangular e mais discreto que o − e o +
  pulo: {
    height: 32,
    paddingHorizontal: 10,
    marginHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TEMA.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPulo: {
    fontSize: 13,
    fontWeight: '700',
    color: TEMA.textoSuave,
  },
  valor: {
    minWidth: 76,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: TEMA.texto,
  },
});
