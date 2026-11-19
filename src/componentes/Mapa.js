import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text } from 'react-native-svg';
import { AREAS, LOCAIS, PICO, RIOS, TAMANHO_KM, VIAS, ZONAS_POUSO } from '../dados/regiao';

// O desenho usa um "papel" de 100 x 100 unidades (o viewBox).
// Como o mapa tem 10 km, cada unidade vale 100 metros: multiplicamos km por 10.
const ESCALA = 100 / TAMANHO_KM;

// Cores de cada tipo de área e de via
const CORES = {
  terra: '#E3EFD3',
  agua: '#6FA9D4',
  mata: '#B5D8A6',
  urbano: '#E9DCC6',
  urbanoBorda: '#CDB894',
  pico: '#7A6A55',
};

// Cada tipo de via é desenhado com duas linhas: uma larga (borda) e uma fina por cima (miolo).
// "tracejado" (opcional) deixa o miolo em pedaços, como os dormentes de um trilho.
const ESTILO_VIA = {
  estrada: { borda: '#B9B2A3', miolo: '#FFFFFF', largura: 1.0 },
  rodovia: { borda: '#C0632B', miolo: '#F4A259', largura: 1.6 },
  rodoanel: { borda: '#C9952A', miolo: '#F2C14E', largura: 1.6 },
  ferrovia: { borda: '#555555', miolo: '#FFFFFF', largura: 0.6, tracejado: '1.5 1.5' },
};

// Aparência de cada tipo de local: cor do círculo e a letra dentro dele
const ESTILO_LOCAL = {
  hub: { cor: '#0B5CAD', letra: 'S' },
  hospital: { cor: '#D32F2F', letra: 'H' },
  ubs: { cor: '#2E7D32', letra: 'U' },
  comunidade: { cor: '#8E5AB5', letra: 'C' },
};

// Transforma [[x, y], [x, y], ...] em km no texto "x,y x,y ..." que o SVG entende
function paraPontosSvg(pontos) {
  return pontos.map(([x, y]) => `${x * ESCALA},${y * ESCALA}`).join(' ');
}

// Texto legível em cima de qualquer fundo: primeiro um contorno branco grosso,
// depois o texto escuro por cima (mesmo truque das vias).
// Usado pelos locais e pelas zonas de pouso.
function Rotulo({ x, y, texto, tamanho }) {
  return (
    <G>
      <Text x={x} y={y} fontSize={tamanho} fontWeight="bold" textAnchor="middle" stroke="#FFFFFF" strokeWidth="0.8" fill="#FFFFFF">
        {texto}
      </Text>
      <Text x={x} y={y} fontSize={tamanho} fontWeight="bold" textAnchor="middle" fill="#2B3440">
        {texto}
      </Text>
    </G>
  );
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
      <Rotulo x={x} y={y + 5} texto={local.rotulo} tamanho="2.4" />
    </G>
  );
}

// Uma zona de pouso: quadrado laranja com a letra "P" + o código embaixo.
// O quadrado diferencia das bolinhas dos locais.
function ZonaPouso({ zona }) {
  const x = zona.x * ESCALA;
  const y = zona.y * ESCALA;
  const lado = 3.6;

  return (
    <G>
      <Rect
        x={x - lado / 2}
        y={y - lado / 2}
        width={lado}
        height={lado}
        rx="0.6"
        fill="#FFFFFF"
        stroke="#E08A00"
        strokeWidth="0.6"
      />
      <Text x={x} y={y + 1} fontSize="2.6" fontWeight="bold" fill="#E08A00" textAnchor="middle">
        P
      </Text>
      <Rotulo x={x} y={y + 4.6} texto={zona.id} tamanho="1.8" />
    </G>
  );
}

// O drone visto de cima: dois braços em "X" com uma hélice em cada ponta.
// A altitude aparece de dois jeitos: o número em metros acima do drone e uma
// sombra no chão que se afasta dele quanto mais alto ele está.
function Drone({ x, y, altitude, comParaquedas }) {
  const cx = x * ESCALA;
  const cy = y * ESCALA;
  const braco = 2.2;
  const afastamentoSombra = (altitude / 120) * 2.5; // 0 no chão, 2,5 a 120 m
  // Com paraquedas, o número da altitude sobe para não ficar em cima da cúpula
  const alturaRotulo = comParaquedas ? cy - 9 : cy - 4;

  return (
    <G>
      <Circle cx={cx + afastamentoSombra} cy={cy + afastamentoSombra} r="2.4" fill="#000000" opacity="0.2" />
      <Line x1={cx - braco} y1={cy - braco} x2={cx + braco} y2={cy + braco} stroke="#0B1F33" strokeWidth="0.6" />
      <Line x1={cx - braco} y1={cy + braco} x2={cx + braco} y2={cy - braco} stroke="#0B1F33" strokeWidth="0.6" />
      <Circle cx={cx - braco} cy={cy - braco} r="1.1" fill="#FFFFFF" stroke="#0B1F33" strokeWidth="0.4" />
      <Circle cx={cx + braco} cy={cy - braco} r="1.1" fill="#FFFFFF" stroke="#0B1F33" strokeWidth="0.4" />
      <Circle cx={cx - braco} cy={cy + braco} r="1.1" fill="#FFFFFF" stroke="#0B1F33" strokeWidth="0.4" />
      <Circle cx={cx + braco} cy={cy + braco} r="1.1" fill="#FFFFFF" stroke="#0B1F33" strokeWidth="0.4" />
      <Circle cx={cx} cy={cy} r="1.0" fill="#0B1F33" />
      {comParaquedas && (
        <G>
          {/* Cordas: do drone até as pontas da cúpula */}
          <Line x1={cx} y1={cy} x2={cx - 3.5} y2={cy - 4} stroke="#555555" strokeWidth="0.3" />
          <Line x1={cx} y1={cy} x2={cx + 3.5} y2={cy - 4} stroke="#555555" strokeWidth="0.3" />
          {/* Cúpula: uma curva de uma ponta à outra, fechada embaixo */}
          <Path
            d={`M ${cx - 3.5} ${cy - 4} Q ${cx} ${cy - 9} ${cx + 3.5} ${cy - 4} Z`}
            fill="#D32F2F"
            stroke="#FFFFFF"
            strokeWidth="0.4"
          />
        </G>
      )}
      <Rotulo x={cx} y={alturaRotulo} texto={`${altitude} m`} tamanho="2.4" />
    </G>
  );
}

// "destino" é o local para onde o drone vai (um item de LOCAIS)
// "drone" é a posição atual do drone { x, y } em km; sem ela, ele fica no hub
// "desvio" (opcional) é o trecho de emergência { origem, destino } depois de uma pane
// "altitude" é a altura do drone em metros (0 = no chão)
// "paraquedas" (opcional): paraquedas aberto. Na falha grave em voo, traz as áreas
// { alcance, confortavel }, cada uma um círculo { centro, raio } em km
export default function Mapa({ destino, drone, desvio, altitude = 0, paraquedas }) {
  const hub = LOCAIS.find((local) => local.id === 'hub');
  const posicaoDrone = drone || hub;
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

        {/* 3. Rios e córregos (linhas azuis finas) */}
        {RIOS.map((rio) => (
          <Polyline
            key={rio.nome}
            points={paraPontosSvg(rio.pontos)}
            fill="none"
            stroke={CORES.agua}
            strokeWidth="0.8"
          />
        ))}

        {/* 4. Pico do Jaraguá: um triângulo, o símbolo de montanha */}
        <Polygon
          points={paraPontosSvg([
            [PICO.x, PICO.y - 0.35],
            [PICO.x - 0.35, PICO.y + 0.25],
            [PICO.x + 0.35, PICO.y + 0.25],
          ])}
          fill={CORES.pico}
          stroke="#FFFFFF"
          strokeWidth="0.4"
        />
        <Rotulo x={PICO.x * ESCALA} y={(PICO.y - 0.6) * ESCALA} texto={PICO.nome} tamanho="2.0" />

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
            strokeDasharray={ESTILO_VIA[via.tipo].tracejado}
          />
        ))}

        {/* 7. Nomes das áreas (só as que têm "rotulo") */}
        {AREAS.filter((area) => area.rotulo).map((area) => (
          <Rotulo
            key={`rotulo-${area.nome}`}
            x={area.rotulo.x * ESCALA}
            y={area.rotulo.y * ESCALA}
            texto={area.rotulo.texto}
            tamanho="2.0"
          />
        ))}

        {/* 8. Zonas de pouso */}
        {ZONAS_POUSO.map((zona) => (
          <ZonaPouso key={zona.id} zona={zona} />
        ))}

        {/* 9. Rota: linha tracejada do hub até o destino (só se houver destino) */}
        {destino && (
          <Line
            x1={hub.x * ESCALA}
            y1={hub.y * ESCALA}
            x2={destino.x * ESCALA}
            y2={destino.y * ESCALA}
            stroke="#0B5CAD"
            strokeWidth="0.7"
            strokeDasharray="2 1.5"
          />
        )}

        {/* Alcance do paraquedas: círculo de fora = até onde ele consegue planar;
            círculo de dentro = até onde ele chega com margem para um pouso suave */}
        {paraquedas && paraquedas.alcance && (
          <G>
            <Circle
              cx={paraquedas.alcance.centro.x * ESCALA}
              cy={paraquedas.alcance.centro.y * ESCALA}
              r={paraquedas.alcance.raio * ESCALA}
              fill="#D32F2F"
              fillOpacity="0.08"
              stroke="#D32F2F"
              strokeWidth="0.4"
              strokeDasharray="1 1"
            />
            <Circle
              cx={paraquedas.confortavel.centro.x * ESCALA}
              cy={paraquedas.confortavel.centro.y * ESCALA}
              r={paraquedas.confortavel.raio * ESCALA}
              fill="#2E7D32"
              fillOpacity="0.12"
              stroke="#2E7D32"
              strokeWidth="0.3"
            />
          </G>
        )}

        {/* Desvio de emergência: linha laranja do ponto da pane até a zona de pouso */}
        {desvio && (
          <Line
            x1={desvio.origem.x * ESCALA}
            y1={desvio.origem.y * ESCALA}
            x2={desvio.destino.x * ESCALA}
            y2={desvio.destino.y * ESCALA}
            stroke="#E08A00"
            strokeWidth="0.9"
            strokeDasharray="2 1"
          />
        )}

        {/* 10. Locais: por cima do mapa e da rota */}
        {LOCAIS.map((local) => (
          <Local key={local.id} local={local} />
        ))}

        {/* 11. Drone: por último de tudo, para ficar por cima */}
        <Drone
          x={posicaoDrone.x}
          y={posicaoDrone.y}
          altitude={altitude}
          comParaquedas={Boolean(paraquedas) && altitude > 0}
        />
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
