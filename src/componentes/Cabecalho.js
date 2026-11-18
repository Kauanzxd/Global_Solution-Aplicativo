import { StyleSheet, Text, View } from 'react-native';

// Cabeçalho reutilizável: mostra um título e, se for passado, um subtítulo.
// Uso: <Cabecalho titulo="SADEC" subtitulo="Texto menor" />
export default function Cabecalho({ titulo, subtitulo }) {
  return (
    <View style={styles.caixa}>
      <Text style={styles.titulo}>{titulo}</Text>
      {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    alignItems: 'center',
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
