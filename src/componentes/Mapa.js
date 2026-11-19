import { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text } from 'react-native-svg';
import { AREAS, LOCAIS, PICO, RIOS, TAMANHO_KM, VIAS, ZONAS_POUSO } from '../dados/regiao';

// O desenho usa um "papel" de 100 x 100 unidades (o viewBox).
// Como o mapa tem 10 km, cada unidade vale 100 metros: multiplicamos km por 10.
const ESCALA = 100 / TAMANHO_KM;

// ZOOM: a "vista" é o pedaço do papel que aparece na tela. Vista de 100 = mapa inteiro;
// vista de 25 = só 1/4 do mapa em volta do drone (4 vezes mais perto; com 20 km, 5 km).
// Com zoom, o TERRENO aumenta, mas os SÍMBOLOS (drone, ícones, textos, linhas) devem
// continuar do mesmo tamanho na tela, como no Google Maps. Para isso, todo tamanho de
// símbolo é multiplicado por "s" = vista ÷ 100 (com vista 25, s = 0,25).

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
  ferrovia: { borda: '#555555', miolo: '#FFFFFF', largura: 0.6, tracejado: [1.5, 1.5] },
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

// Tracejado na escala dos símbolos: [2, 1.5] com s = 0,25 vira "0.5 0.375"
function tracejado(partes, s) {
  return partes.map((parte) => parte * s).join(' ');
}

// Texto legível em cima de qualquer fundo: primeiro um contorno branco grosso,
// depois o texto escuro por cima (mesmo truque das vias).
function Rotulo({ x, y, texto, tamanho, s }) {
  return (
    <G>
      <Text x={x} y={y} fontSize={tamanho * s} fontWeight="bold" textAnchor="middle" stroke="#FFFFFF" strokeWidth={0.8 * s} fill="#FFFFFF">
        {texto}
      </Text>
      <Text x={x} y={y} fontSize={tamanho * s} fontWeight="bold" textAnchor="middle" fill="#2B3440">
        {texto}
      </Text>
    </G>
  );
}

// Um local no mapa: círculo colorido com uma letra + o nome embaixo.
function Local({ local, s }) {
  const estilo = ESTILO_LOCAL[local.tipo];
  const x = local.x * ESCALA;
  const y = local.y * ESCALA;

  return (
    <G>
      <Circle cx={x} cy={y} r={2.2 * s} fill={estilo.cor} stroke="#FFFFFF" strokeWidth={0.5 * s} />
      <Text x={x} y={y + 1 * s} fontSize={2.8 * s} fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        {estilo.letra}
      </Text>
      <Rotulo x={x} y={y + 5 * s} texto={local.rotulo} tamanho={2.4} s={s} />
    </G>
  );
}

// Uma zona de pouso: quadrado laranja com a letra "P" + o código embaixo.
function ZonaPouso({ zona, s }) {
  const x = zona.x * ESCALA;
  const y = zona.y * ESCALA;
  const lado = 3.6 * s;

  return (
    <G>
      <Rect
        x={x - lado / 2}
        y={y - lado / 2}
        width={lado}
        height={lado}
        rx={0.6 * s}
        fill="#FFFFFF"
        stroke="#E08A00"
        strokeWidth={0.6 * s}
      />
      <Text x={x} y={y + 1 * s} fontSize={2.6 * s} fontWeight="bold" fill="#E08A00" textAnchor="middle">
        P
      </Text>
      <Rotulo x={x} y={y + 4.6 * s} texto={zona.id} tamanho={1.8} s={s} />
    </G>
  );
}

// O drone visto de cima: dois braços em "X" com uma hélice em cada ponta.
// A altitude aparece de dois jeitos: o número em metros acima do drone e uma
// sombra no chão que se afasta dele quanto mais alto ele está.
function Drone({ x, y, altitude, comParaquedas, incerteza, s }) {
  const cx = x * ESCALA;
  const cy = y * ESCALA;
  const braco = 2.2 * s;
  const helice = 1.1 * s;
  const traco = 0.4 * s;
  const afastamentoSombra = (altitude / 120) * 2.5 * s; // 0 no chão, 2,5 a 120 m
  // Com paraquedas, o número da altitude sobe para não ficar em cima da cúpula
  const alturaRotulo = comParaquedas ? cy - 9 * s : cy - 4 * s;

  return (
    <G>
      <Circle cx={cx + afastamentoSombra} cy={cy + afastamentoSombra} r={2.4 * s} fill="#000000" opacity="0.2" />
      <Line x1={cx - braco} y1={cy - braco} x2={cx + braco} y2={cy + braco} stroke="#0B1F33" strokeWidth={0.6 * s} />
      <Line x1={cx - braco} y1={cy + braco} x2={cx + braco} y2={cy - braco} stroke="#0B1F33" strokeWidth={0.6 * s} />
      <Circle cx={cx - braco} cy={cy - braco} r={helice} fill="#FFFFFF" stroke="#0B1F33" strokeWidth={traco} />
      <Circle cx={cx + braco} cy={cy - braco} r={helice} fill="#FFFFFF" stroke="#0B1F33" strokeWidth={traco} />
      <Circle cx={cx - braco} cy={cy + braco} r={helice} fill="#FFFFFF" stroke="#0B1F33" strokeWidth={traco} />
      <Circle cx={cx + braco} cy={cy + braco} r={helice} fill="#FFFFFF" stroke="#0B1F33" strokeWidth={traco} />
      <Circle cx={cx} cy={cy} r={1.0 * s} fill="#0B1F33" />
      {comParaquedas && (
        <G>
          {/* Cordas: do drone até as pontas da cúpula */}
          <Line x1={cx} y1={cy} x2={cx - 3.5 * s} y2={cy - 4 * s} stroke="#555555" strokeWidth={0.3 * s} />
          <Line x1={cx} y1={cy} x2={cx + 3.5 * s} y2={cy - 4 * s} stroke="#555555" strokeWidth={0.3 * s} />
          {/* Cúpula: uma curva de uma ponta à outra, fechada embaixo */}
          <Path
            d={`M ${cx - 3.5 * s} ${cy - 4 * s} Q ${cx} ${cy - 9 * s} ${cx + 3.5 * s} ${cy - 4 * s} Z`}
            fill="#D32F2F"
            stroke="#FFFFFF"
            strokeWidth={0.4 * s}
          />
        </G>
      )}
      <Rotulo x={cx} y={alturaRotulo} texto={`${altitude} m`} tamanho={2.4} s={s} />
      {/* Sem GPS: o tamanho do erro da posição, embaixo do drone */}
      {incerteza > 0 && <Rotulo x={cx} y={cy + 6 * s} texto={`sem GPS ±${incerteza} m`} tamanho={2} s={s} />}
    </G>
  );
}

// Indicador de vento no canto do mapa: uma seta para onde o vento empurra,
// a velocidade em km/h e de onde ele vem. Fica numa camada própria, que não
// sofre zoom (é como um painel colado na tela).
function IndicadorVento({ vento }) {
  const tamanho = Math.sqrt(vento.x ** 2 + vento.y ** 2); // Pitágoras: o tamanho do vetor
  const ux = vento.x / tamanho; // direção do vento com tamanho 1 (vetor unitário)
  const uy = vento.y / tamanho;
  const px = -uy; // perpendicular: a mesma direção girada 90°, para abrir a ponta da seta
  const py = ux;

  const cx = 8; // centro da seta (no desenho, não em km)
  const cy = 92;
  const ponta = { x: cx + ux * 4, y: cy + uy * 4 };
  const cauda = { x: cx - ux * 4, y: cy - uy * 4 };
  const cabeca = [
    [ponta.x, ponta.y],
    [ponta.x - ux * 2 + px * 1.4, ponta.y - uy * 2 + py * 1.4],
    [ponta.x - ux * 2 - px * 1.4, ponta.y - uy * 2 - py * 1.4],
  ];

  return (
    <G>
      <Rect x="2" y="86" width="26" height="12" rx="1.5" fill="#FFFFFF" opacity="0.9" />
      <Line x1={cauda.x} y1={cauda.y} x2={ponta.x} y2={ponta.y} stroke="#0B5CAD" strokeWidth="0.8" />
      <Polygon points={cabeca.map(([x, y]) => `${x},${y}`).join(' ')} fill="#0B5CAD" />
      <Text x="15" y="91" fontSize="2.6" fontWeight="bold" fill="#2B3440">
        {`${Math.round(vento.velocidade * 3.6)} km/h`}
      </Text>
      <Text x="15" y="95.5" fontSize="2.2" fill="#2B3440">
        {`do ${vento.de}`}
      </Text>
    </G>
  );
}

// Selo "zoom" no canto, para quem assiste entender que o mapa aproximou
function SeloZoom({ vezes }) {
  return (
    <G>
      <Rect x="74" y="2" width="24" height="7" rx="1.5" fill="#0B1F33" opacity="0.8" />
      <Text x="86" y="6.8" fontSize="3" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        {`Zoom ${vezes.toFixed(1)}x`}
      </Text>
    </G>
  );
}

// Posições dos pássaros dentro do bando, em km a partir do centro (um bando espalhado)
const BANDO = [
  [0, 0], [-0.04, -0.02], [0.035, -0.03], [-0.02, 0.035], [0.05, 0.02],
  [-0.055, 0.015], [0.015, -0.055], [0.03, 0.05], [-0.035, -0.05],
];

// Um obstáculo em movimento: a bolha de segurança tracejada + o desenho do objeto.
// Objetos grandes são desenhados em escala de TERRENO (crescem com o zoom, como
// uma construção de verdade). Só os detalhes pequenos são símbolos (tamanho fixo na tela).
function Obstaculo({ obstaculo, s }) {
  const x = obstaculo.posicao.x * ESCALA;
  const y = obstaculo.posicao.y * ESCALA;

  // Outro drone: o mesmo desenho do nosso, em roxo (da rede) ou cinza (sem rádio)
  if (obstaculo.tipo === 'drone') {
    const braco = 1.8 * s;
    const cor = obstaculo.semComunicacao ? '#555555' : '#5E2B85';
    const clara = obstaculo.semComunicacao ? '#DDDDDD' : '#E9D8F5';
    const bolha = obstaculo.semComunicacao ? '#D32F2F' : '#8E5AB5';
    return (
      <G>
        <Circle cx={x} cy={y} r={obstaculo.bolhaKm * ESCALA} fill={bolha} fillOpacity="0.1" stroke={bolha} strokeWidth={0.3 * s} strokeDasharray={tracejado([0.8, 0.8], s)} />
        <Line x1={x - braco} y1={y - braco} x2={x + braco} y2={y + braco} stroke={cor} strokeWidth={0.5 * s} />
        <Line x1={x - braco} y1={y + braco} x2={x + braco} y2={y - braco} stroke={cor} strokeWidth={0.5 * s} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => (
          <Circle key={`${dx},${dy}`} cx={x + dx * braco} cy={y + dy * braco} r={0.9 * s} fill={clara} stroke={cor} strokeWidth={0.35 * s} />
        ))}
        <Rotulo x={x} y={y - 3.5 * s} texto={obstaculo.rotulo} tamanho={2} s={s} />
      </G>
    );
  }

  // No guindaste, a área de segurança é uma faixa em volta do braço inteiro
  if (obstaculo.tipo === 'guindaste') {
    return (
      <G>
        <Line
          x1={obstaculo.base.x * ESCALA}
          y1={obstaculo.base.y * ESCALA}
          x2={obstaculo.ponta.x * ESCALA}
          y2={obstaculo.ponta.y * ESCALA}
          stroke="#D32F2F"
          strokeOpacity="0.15"
          strokeWidth={obstaculo.bolhaKm * 2 * ESCALA}
          strokeLinecap="round"
        />
        <Guindaste base={obstaculo.base} ponta={obstaculo.ponta} s={s} />
      </G>
    );
  }

  return (
    <G>
      <Circle
        cx={x}
        cy={y}
        r={obstaculo.bolhaKm * ESCALA}
        fill="#D32F2F"
        fillOpacity="0.1"
        stroke="#D32F2F"
        strokeWidth={0.3 * s}
        strokeDasharray={tracejado([0.8, 0.8], s)}
      />


      {obstaculo.tipo === 'passaros' && (
        <G>
          {/* O bando ocupa uma área de verdade (terreno); cada pássaro é um "v" (símbolo) */}
          {BANDO.map(([dx, dy]) => {
            const px = x + dx * ESCALA;
            const py = y + dy * ESCALA;
            const asa = 0.7 * s;
            return (
              <Path
                key={`${dx},${dy}`}
                d={`M ${px - asa} ${py - asa / 2} L ${px} ${py} L ${px + asa} ${py - asa / 2}`}
                stroke="#2B3440"
                strokeWidth={0.3 * s}
                fill="none"
              />
            );
          })}
        </G>
      )}
    </G>
  );
}

// Guindaste visto de cima, em escala de terreno (medidas esquemáticas, em km):
// torre quadrada na base, braço comprido e grosso até a ponta, e do outro lado
// um braço curto com o contrapeso (o bloco que equilibra a carga).
function Guindaste({ base, ponta, s }) {
  const bx = base.x * ESCALA;
  const by = base.y * ESCALA;
  const px = ponta.x * ESCALA;
  const py = ponta.y * ESCALA;

  // Direção do braço (tamanho 1), para desenhar o contrapeso no lado oposto
  const comprimento = Math.sqrt((px - bx) ** 2 + (py - by) ** 2);
  const ux = (px - bx) / comprimento;
  const uy = (py - by) / comprimento;
  const contra = { x: bx - ux * 0.8, y: by - uy * 0.8 }; // contrapeso a 80 m da torre

  // Espessuras: o tamanho de terreno ou um mínimo visível no mapa inteiro (o que for maior)
  const grossura = (terrenoKm, minimo) => Math.max(terrenoKm * ESCALA, minimo * s);
  const torre = grossura(0.045, 1.6); // torre de 45 m de lado (esquemático, maior que o real)
  const braco = grossura(0.025, 0.7); // braço de 25 m de largura

  return (
    <G>
      {/* Braço principal e braço do contrapeso */}
      <Line x1={bx} y1={by} x2={px} y2={py} stroke="#E0A800" strokeWidth={braco} strokeLinecap="round" />
      <Line x1={bx} y1={by} x2={contra.x} y2={contra.y} stroke="#E0A800" strokeWidth={braco} />
      {/* Contrapeso: um bloco cinza no fim do braço curto */}
      <Circle cx={contra.x} cy={contra.y} r={braco * 1.3} fill="#666666" />
      {/* Torre */}
      <Rect x={bx - torre / 2} y={by - torre / 2} width={torre} height={torre} fill="#555555" stroke="#333333" strokeWidth={0.2 * s} />
      {/* Ponta: o cabo com o gancho */}
      <Circle cx={px} cy={py} r={braco * 0.8} fill="#333333" />
    </G>
  );
}

// Destino escolhido livremente no mapa (não é um dos locais conhecidos): um alfinete
function MarcadorDestino({ destino, s }) {
  const x = destino.x * ESCALA;
  const y = destino.y * ESCALA;
  return (
    <G>
      {/* O alfinete: uma gota (curva) com a ponta no ponto exato */}
      <Path
        d={`M ${x} ${y} C ${x - 2.6 * s} ${y - 3.2 * s} ${x - 2.6 * s} ${y - 6 * s} ${x} ${y - 6 * s} C ${x + 2.6 * s} ${y - 6 * s} ${x + 2.6 * s} ${y - 3.2 * s} ${x} ${y} Z`}
        fill="#E0457B"
        stroke="#FFFFFF"
        strokeWidth={0.4 * s}
      />
      <Circle cx={x} cy={y - 4.2 * s} r={0.9 * s} fill="#FFFFFF" />
      <Rotulo x={x} y={y + 3 * s} texto="Destino" tamanho={2.2} s={s} />
    </G>
  );
}

// Marcador de um evento planejado na rota: bolinha colorida com o número do evento
function MarcadorEvento({ marcador, s }) {
  const x = marcador.x * ESCALA;
  const y = marcador.y * ESCALA;
  return (
    <G>
      <Circle cx={x} cy={y} r={1.7 * s} fill={marcador.cor} stroke="#FFFFFF" strokeWidth={0.45 * s} />
      <Text x={x} y={y + 0.65 * s} fontSize={1.8 * s} fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        {marcador.numero}
      </Text>
    </G>
  );
}

// "destino" é o local para onde o drone vai (um item de LOCAIS ou um ponto livre)
// "drone" é a posição atual do drone { x, y } em km; sem ela, ele fica no hub
// "desvio" (opcional) é o trecho de emergência { origem, destino } depois de uma pane
// "altitude" é a altura do drone em metros (0 = no chão)
// "paraquedas" (opcional): paraquedas aberto. Na falha grave em voo, traz as áreas
// { alcance, confortavel }, cada uma um círculo { centro, raio } em km
// "vento" (opcional): { x, y, velocidade, de } — aparece como seta no canto
// "incerteza" (opcional): erro da posição em metros, quando o drone está sem GPS
// "obstaculos" (opcional): lista de obstáculos em movimento para desenhar
// "vista" (opcional): tamanho do pedaço do mapa na tela (100 = inteiro), centrado no drone
// "aoTocar" (opcional): função chamada com o ponto { x, y } em km onde o usuário tocou
// "marcadores" (opcional): eventos planejados [{ x, y, cor, numero }], desenhados na rota
export default function Mapa({
  marcadores = [],
  destino,
  drone,
  desvio,
  altitude = 0,
  paraquedas,
  vento,
  incerteza = 0,
  obstaculos = [],
  vista = 100,
  aoTocar,
}) {
  // Referência para a caixa do mapa: serve para medir onde ela está na tela na hora do toque
  const caixa = useRef(null);
  const hub = LOCAIS.find((local) => local.id === 'hub');
  const posicaoDrone = drone || hub;
  const matas = AREAS.filter((area) => area.tipo === 'mata');
  const urbanas = AREAS.filter((area) => area.tipo === 'urbano');

  // Zoom: a vista fica centrada no drone, sem sair das bordas do mapa
  const s = vista / 100; // escala dos símbolos
  const limitar = (valor) => Math.min(Math.max(valor, 0), 100 - vista);
  const x0 = limitar(posicaoDrone.x * ESCALA - vista / 2);
  const y0 = limitar(posicaoDrone.y * ESCALA - vista / 2);

  // Toque → km.
  // 1. O toque vem em pixels da TELA (pageX/pageY).
  // 2. Medimos onde a caixa do mapa está na tela (measureInWindow) e subtraímos:
  //    sobra a posição do toque DENTRO do mapa, em pixels.
  // 3. Pixels ÷ largura = fração do mapa (0 a 1); × vista + x0 = unidade do desenho; ÷ ESCALA = km.
  const tocar = (evento) => {
    if (!aoTocar || !caixa.current) return;
    const { pageX, pageY } = evento.nativeEvent;
    caixa.current.measureInWindow((esquerda, topo, largura) => {
      const ponto = {
        x: (x0 + ((pageX - esquerda) / largura) * vista) / ESCALA,
        y: (y0 + ((pageY - topo) / largura) * vista) / ESCALA,
      };
      // Só aceita números de verdade, dentro do mapa
      const valido = Number.isFinite(ponto.x) && Number.isFinite(ponto.y);
      if (valido) aoTocar({ x: Math.min(Math.max(ponto.x, 0), 10), y: Math.min(Math.max(ponto.y, 0), 10) });
    });
  };

  // O destino é um ponto livre (não é um dos locais conhecidos)?
  const destinoLivre = destino && !LOCAIS.some((local) => local.id === destino.id);

  return (
    <Pressable ref={caixa} style={styles.caixa} onPress={tocar} disabled={!aoTocar}>
      <Svg width="100%" height="100%" viewBox={`${x0} ${y0} ${vista} ${vista}`}>
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
            strokeLinecap="round"
            // Rio largo (Tietê): grossura de terreno, em km. Córrego: traço fino de tamanho fixo.
            strokeWidth={rio.largura ? Math.max(rio.largura * ESCALA, 0.8 * s) : 0.8 * s}
          />
        ))}

        {/* 4. Pico do Jaraguá: um triângulo, o símbolo de montanha */}
        <Polygon
          points={paraPontosSvg([
            [PICO.x, PICO.y - 0.35 * s],
            [PICO.x - 0.35 * s, PICO.y + 0.25 * s],
            [PICO.x + 0.35 * s, PICO.y + 0.25 * s],
          ])}
          fill={CORES.pico}
          stroke="#FFFFFF"
          strokeWidth={0.4 * s}
        />
        <Rotulo x={PICO.x * ESCALA} y={(PICO.y - 0.6 * s) * ESCALA} texto={PICO.nome} tamanho={2.0} s={s} />

        {/* 5. Áreas urbanas */}
        {urbanas.map((area) => (
          <Polygon
            key={area.nome}
            points={paraPontosSvg(area.pontos)}
            fill={CORES.urbano}
            stroke={CORES.urbanoBorda}
            strokeWidth={0.4 * s}
          />
        ))}

        {/* 6. Vias: primeiro todas as bordas, depois todos os miolos */}
        {VIAS.map((via) => (
          <Polyline
            key={`borda-${via.nome}`}
            points={paraPontosSvg(via.pontos)}
            fill="none"
            stroke={ESTILO_VIA[via.tipo].borda}
            strokeWidth={(ESTILO_VIA[via.tipo].largura + 0.6) * s}
          />
        ))}
        {VIAS.map((via) => (
          <Polyline
            key={`miolo-${via.nome}`}
            points={paraPontosSvg(via.pontos)}
            fill="none"
            stroke={ESTILO_VIA[via.tipo].miolo}
            strokeWidth={ESTILO_VIA[via.tipo].largura * s}
            strokeDasharray={ESTILO_VIA[via.tipo].tracejado && tracejado(ESTILO_VIA[via.tipo].tracejado, s)}
          />
        ))}

        {/* 7. Nomes das áreas (só as que têm "rotulo") */}
        {AREAS.filter((area) => area.rotulo).map((area) => (
          <Rotulo
            key={`rotulo-${area.nome}`}
            x={area.rotulo.x * ESCALA}
            y={area.rotulo.y * ESCALA}
            texto={area.rotulo.texto}
            tamanho={2.0}
            s={s}
          />
        ))}

        {/* 8. Zonas de pouso */}
        {ZONAS_POUSO.map((zona) => (
          <ZonaPouso key={zona.id} zona={zona} s={s} />
        ))}

        {/* 9. Rota: linha tracejada do hub até o destino (só se houver destino) */}
        {destino && (
          <Line
            x1={hub.x * ESCALA}
            y1={hub.y * ESCALA}
            x2={destino.x * ESCALA}
            y2={destino.y * ESCALA}
            stroke="#0B5CAD"
            strokeWidth={0.7 * s}
            strokeDasharray={tracejado([2, 1.5], s)}
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
              strokeWidth={0.4 * s}
              strokeDasharray={tracejado([1, 1], s)}
            />
            <Circle
              cx={paraquedas.confortavel.centro.x * ESCALA}
              cy={paraquedas.confortavel.centro.y * ESCALA}
              r={paraquedas.confortavel.raio * ESCALA}
              fill="#2E7D32"
              fillOpacity="0.12"
              stroke="#2E7D32"
              strokeWidth={0.3 * s}
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
            strokeWidth={0.9 * s}
            strokeDasharray={tracejado([2, 1], s)}
          />
        )}

        {/* Obstáculos em movimento (guindaste, pássaros) */}
        {obstaculos.map((obstaculo, indice) => (
          <Obstaculo key={indice} obstaculo={obstaculo} s={s} />
        ))}

        {/* 10. Locais: por cima do mapa e da rota */}
        {LOCAIS.map((local) => (
          <Local key={local.id} local={local} s={s} />
        ))}

        {/* Destino livre (escolhido tocando no mapa) */}
        {destinoLivre && <MarcadorDestino destino={destino} s={s} />}

        {/* Eventos planejados: onde cada um vai acontecer na rota */}
        {marcadores.map((marcador) => (
          <MarcadorEvento key={marcador.numero} marcador={marcador} s={s} />
        ))}

        {/* 11. Drone: por último de tudo, para ficar por cima */}
        <Drone
          x={posicaoDrone.x}
          y={posicaoDrone.y}
          altitude={altitude}
          comParaquedas={Boolean(paraquedas) && altitude > 0}
          incerteza={incerteza}
          s={s}
        />
      </Svg>

      {/* 12. Painel por cima do mapa, sem zoom: vento e selo de zoom */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" pointerEvents="none">
        {vento && <IndicadorVento vento={vento} />}
        {/* O selo só aparece no zoom forte (obstáculo perto), não na vista normal do voo */}
        {vista < 40 && <SeloZoom vezes={100 / vista} />}
      </Svg>
    </Pressable>
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
