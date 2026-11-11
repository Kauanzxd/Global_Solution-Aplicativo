import { StyleSheet, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';
import { REPRESAS, TAMANHO_KM } from '../dados/regiao';

// O desenho usa um "papel" de 100 x 100 unidades (o viewBox).
// Como o mapa tem 10 km, cada unidade vale 100 metros: multiplicamos km por 10.
const ESCALA = 100 / TAMANHO_KM;

// Transforma [[x, y], [x, y], ...] em km no texto "x,y x,y ..." que o SVG entende
function paraPontosSvg(pontos) {
  return pontos.map(([x, y]) => `${x * ESCALA},${y * ESCALA}`).join(' ');
}

export default function Mapa() {
  return (
    <View style={styles.caixa}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* Fundo: terra */}
        <Rect x="0" y="0" width="100" height="100" fill="#E3EFD3" />

        {/* Represas */}
        {REPRESAS.map((represa) => (
          <Polygon
            key={represa.nome}
            points={paraPontosSvg(represa.pontos)}
            fill="#9CCBEA"
            stroke="#6FA9D4"
            strokeWidth="0.4"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
