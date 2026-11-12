import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Polygon, Polyline, Rect, Text } from 'react-native-svg';
import { AREAS, CRATERA, LOCAIS, REPRESAS, TAMANHO_KM, VIAS } from '../dados/regiao';

// O desenho usa um "papel" de 100 x 100 unidades (o viewBox).
// Como o mapa tem 10 km, cada unidade vale 100 metros: multiplicamos km por 10.
const ESCALA = 100 / TAMANHO_KM;

// Cores de cada tipo de área e de via
const CORES = {
  terra: '#E3EFD3',
  agua: '#9CCBEA',
  aguaBorda: '#6FA9D4',
  mata: '#B5D8A6',
  urbano: '#E9DCC6',
  urbanoBorda: '#CDB894',
  cratera: '#D5E8C4',
  crateraBorda: '#9DBF86',
};

// Cada tipo de via é desenhado com duas linhas: uma larga (borda) e uma fina por cima (miolo)
const ESTILO_VIA = {
  estrada: { borda: '#B9B2A3', miolo: '#FFFFFF', largura: 1.2 },
  rodoanel: { borda: '#C9952A', miolo: '#F2C14E', largura: 1.6 },
};

// Aparência de cada tipo de local: cor do círculo e a letra dentro dele
const ESTILO_LOCAL = {
  hub: { cor: '#0B5CAD', letra: 'A' },
  hospital: { cor: '#D32F2F', letra: 'H' },
  ubs: { cor: '#2E7D32', letra: 'U' },
  comunidade: { cor: '#8E5AB5', letra: 'C' },
};

// Transforma [[x, y], [x, y], ...] em km no texto "x,y x,y ..." que o SVG entende
function paraPontosSvg(pontos) {
  return pontos.map(([x, y]) => `${x * ESCALA},${y * ESCALA}`).join(' ');
}

// Um local no mapa: círculo colorido com uma letra + o nome embaixo.
// É um componente pequeno que só existe dentro do desenho do mapa.
function Local({ local }) {
  const estilo = ESTILO_LOCAL[local.tipo];
  const x = local.x * ESCALA;
  const y = local.y * ESCALA;

  return (
    <G>
      <Circle cx={x} cy={y} r="2.2" fill={estilo.cor} stroke="#FFFFFF" strokeWidth="0.5" />
      <Text x={x} y={y + 1} fontSize="2.8" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        {estilo.letra}
      </Text>

      {/* Nome: primeiro um contorno branco grosso, depois o texto escuro por cima (mesmo truque das vias) */}
      <Text x={x} y={y + 5} fontSize="2.4" fontWeight="bold" textAnchor="middle" stroke="#FFFFFF" strokeWidth="0.8" fill="#FFFFFF">
        {local.rotulo}
      </Text>
      <Text x={x} y={y + 5} fontSize="2.4" fontWeight="bold" textAnchor="middle" fill="#2B3440">
        {local.rotulo}
      </Text>
    </G>
  );
}

export default function Mapa() {
  const matas = AREAS.filter((area) => area.tipo === 'mata');
  const urbanas = AREAS.filter((area) => area.tipo === 'urbano');

  return (
    <View style={styles.caixa}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* 1. Fundo: terra */}
        <Rect x="0" y="0" width="100" height="100" fill={CORES.terra} />

        {/* 2. Mata Atlântica */}
        {matas.map((area) => (
          <Polygon key={area.nome} points={paraPontosSvg(area.pontos)} fill={CORES.mata} />
        ))}

        {/* 3. Cratera de Colônia (borda tracejada) */}
        <Circle
          cx={CRATERA.x * ESCALA}
          cy={CRATERA.y * ESCALA}
          r={CRATERA.raio * ESCALA}
          fill={CORES.cratera}
          stroke={CORES.crateraBorda}
          strokeWidth="0.6"
          strokeDasharray="1.5 1"
        />

        {/* 4. Represas */}
        {REPRESAS.map((represa) => (
          <Polygon
            key={represa.nome}
            points={paraPontosSvg(represa.pontos)}
            fill={CORES.agua}
            stroke={CORES.aguaBorda}
            strokeWidth="0.4"
          />
        ))}

        {/* 5. Áreas urbanas */}
        {urbanas.map((area) => (
          <Polygon
            key={area.nome}
            points={paraPontosSvg(area.pontos)}
            fill={CORES.urbano}
            stroke={CORES.urbanoBorda}
            strokeWidth="0.4"
          />
        ))}

        {/* 6. Vias: primeiro todas as bordas, depois todos os miolos */}
        {VIAS.map((via) => (
          <Polyline
            key={`borda-${via.nome}`}
            points={paraPontosSvg(via.pontos)}
            fill="none"
            stroke={ESTILO_VIA[via.tipo].borda}
            strokeWidth={ESTILO_VIA[via.tipo].largura + 0.6}
          />
        ))}
        {VIAS.map((via) => (
          <Polyline
            key={`miolo-${via.nome}`}
            points={paraPontosSvg(via.pontos)}
            fill="none"
            stroke={ESTILO_VIA[via.tipo].miolo}
            strokeWidth={ESTILO_VIA[via.tipo].largura}
          />
        ))}

        {/* 7. Locais: por último, para ficarem por cima de tudo */}
        {LOCAIS.map((local) => (
          <Local key={local.id} local={local} />
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
