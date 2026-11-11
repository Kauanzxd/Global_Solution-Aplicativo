import { StyleSheet, View } from 'react-native';
import Cabecalho from '../../componentes/Cabecalho';

// Aba "Simular" (rota "/"): aqui vai ficar o simulador de voo.
export default function Simular() {
  return (
    <View style={styles.container}>
      <Cabecalho titulo="Simular voo" subtitulo="Monte uma situação e veja o drone em ação" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
