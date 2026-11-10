import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>AeroCuidado</Text>
      <Text style={styles.subtitulo}>Drones que levam saúde a quem precisa</Text>
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
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0B5CAD',
  },
  subtitulo: {
    fontSize: 16,
    color: '#5B6878',
    marginTop: 8,
  },
});
