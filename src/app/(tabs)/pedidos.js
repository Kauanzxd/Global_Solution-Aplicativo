import { StyleSheet, View } from 'react-native';
import Cabecalho from '../../componentes/Cabecalho';

// Aba "Pedidos" (rota "/pedidos"): aqui vão ficar os pedidos de entrega.
export default function Pedidos() {
  return (
    <View style={styles.container}>
      <Cabecalho titulo="Pedidos" subtitulo="Solicite e acompanhe entregas" />
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
