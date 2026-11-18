import { StyleSheet, View } from 'react-native';
import Cabecalho from '../../componentes/Cabecalho';
import Mapa from '../../componentes/Mapa';
import { LOCAIS } from '../../dados/regiao';

// Por enquanto o destino é fixo. No passo 4, quem escolhe é o usuário.
const destino = LOCAIS.find((local) => local.id === 'aldeia-jaragua');

// Aba "Simular" (rota "/"): aqui vai ficar o simulador de voo.
export default function Simular() {
  return (
    <View style={styles.container}>
      <Cabecalho titulo="Simular voo" subtitulo="Monte uma situação e veja o drone em ação" />
      <View style={styles.areaMapa}>
        <Mapa destino={destino} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  areaMapa: {
    marginTop: 24,
  },
});
