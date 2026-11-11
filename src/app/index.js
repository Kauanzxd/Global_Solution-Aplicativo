import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Cabecalho from '../componentes/Cabecalho';

// Tela inicial. O nome "index" faz dela a primeira tela que abre (rota "/").
export default function Inicio() {
  return (
    <View style={styles.container}>
      <Cabecalho titulo="AeroCuidado" subtitulo="Drones que levam saúde a quem precisa" />
      <StatusBar style="auto" />
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
