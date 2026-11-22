import { useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text } from 'react-native-svg';
import { AREAS, CONTORNO, FILIAIS, LOCAIS, PICO, RIOS, TAMANHO_KM, VIAS, ZONAS_POUSO } from '../dados/regiao';
import { RAIO_FILIAL_KM } from '../regras/cobertura';
import CamadaRuas from './CamadaRuas';

// O desenho usa um "papel" de 100 x 100 unidades (o viewBox).
// Como o mapa tem 76 km, cada unidade vale 760 metros: multiplicamos km por 100 ÷ 76.
const ESCALA = 100 / TAMANHO_KM;

// Abaixo deste tamanho de vista (em km), o mapa mostra os detalhes: letras e nomes dos
// hospitais, nomes das zonas. Na cidade inteira, os hospitais viram pontinhos.
const VISTA_DETALHE_KM = 22;

// ZOOM: a "vista" é o pedaço do papel que aparece na tela. Vista de 100 = mapa inteiro;
// vista de 25 = só 1/4 do mapa em volta do drone (4 vezes mais perto; com 20 km, 5 km).
// Com zoom, o TERRENO aumenta, mas os SÍMBOLOS (drone, ícones, textos, linhas) devem
// continuar do mesmo tamanho na tela, como no Google Maps. Para isso, todo tamanho de
// símbolo é multiplicado por "s" = vista ÷ 100 (com vista 25, s = 0,25).

// Cores de cada tipo de área e de via
const CORES = {
  vizinhas: '#E4E1DA', // cidades vizinhas (fora do contorno)
  agua: '#6FA9D4',
  mata: '#B5D8A6',
  urbano: '#EFE6D6', // a cidade
  contorno: '#8C7B5E',
  pico: '#7A6A55',
  alcance: '#0B5CAD',
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
  hub: { cor: '#0B5CAD', letra: 'F' }, // filial da SADEC
  hospital: { cor: '#D32F2F', letra: 'H' },
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

// Quais locais ganham o nome escrito, sem um nome encostar no outro (como nos apps de mapa).
// Os locais chegam já em ordem de importância; cada nome é uma "caixa" (retângulo) e só
// entra se não cruzar nenhuma caixa que já entrou. Devolve um Set com os ids escolhidos.
const TAMANHO_ROTULO_LOCAL = 2.4;

function escolherRotulos(locais, s) {
  const caixas = [];
  const escolhidos = new Set();
  const altura = TAMANHO_ROTULO_LOCAL * s * 1.2;

  for (const local of locais) {
    const largura = local.rotulo.length * TAMANHO_ROTULO_LOCAL * s * 0.55; // ≈ largura das letras
    const caixa = { x: local.x * ESCALA - largura / 2, y: local.y * ESCALA + 5 * s - altura, largura, altura };
    // Dois retângulos se cruzam se um não está totalmente à esquerda/direita/acima/abaixo do outro
    const cruza = caixas.some(
      (c) => caixa.x < c.x + c.largura && c.x < caixa.x + caixa.largura && caixa.y < c.y + c.altura && c.y < caixa.y + caixa.altura
    );
    if (!cruza) {
      caixas.push(caixa);
      escolhidos.add(local.id);
    }
  }
  return escolhidos;
}

// Um local no mapa: círculo colorido com uma letra + o nome embaixo (se "comRotulo").
// Sem "detalhe" (cidade inteira na tela): hospital vira um pontinho; filial, só o círculo.
function Local({ local, s, detalhe, comRotulo = true }) {
  const estilo = ESTILO_LOCAL[local.tipo];
  const x = local.x * ESCALA;
  const y = local.y * ESCALA;

  if (!detalhe) {
    const raio = local.tipo === 'hub' ? 1.5 * s : 0.7 * s;
    return <Circle cx={x} cy={y} r={raio} fill={estilo.cor} stroke="#FFFFFF" strokeWidth={0.3 * s} />;
  }

  return (
    <G>
      <Circle cx={x} cy={y} r={2 * s} fill={estilo.cor} stroke="#FFFFFF" strokeWidth={0.5 * s} />
      <Text x={x} y={y + 0.9 * s} fontSize={2.5 * s} fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        {estilo.letra}
      </Text>
      {comRotulo && <Rotulo x={x} y={y + 5 * s} texto={local.rotulo} tamanho={TAMANHO_ROTULO_LOCAL} s={s} />}
    </G>
  );
}

// Uma zona de pouso: quadrado laranja com a letra "P" + o código embaixo (só com detalhe).
function ZonaPouso({ zona, s, detalhe }) {
  const x = zona.x * ESCALA;
  const y = zona.y * ESCALA;
  const lado = (detalhe ? 3.6 : 2.2) * s;

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
      {detalhe && (
        <Text x={x} y={y + 1 * s} fontSize={2.6 * s} fontWeight="bold" fill="#E08A00" textAnchor="middle">
          P
        </Text>
      )}
      {detalhe && <Rotulo x={x} y={y + 4.6 * s} texto={zona.id} tamanho={1.8} s={s} />}
    </G>
  );
}

// O drone visto de cima: dois braços em "X" com uma hélice em cada ponta.
// A altitude aparece de dois jeitos: o número em metros acima do drone e uma
// sombra no chão que se afasta dele quanto mais alto ele está.
// "cor" (opcional): cor do corpo; "nome" (opcional): nome de rádio, para os outros drones da rede
function Drone({ x, y, altitude, comParaquedas, incerteza, s, cor = '#0B1F33', nome }) {
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
      <Line x1={cx - braco} y1={cy - braco} x2={cx + braco} y2={cy + braco} stroke={cor} strokeWidth={0.6 * s} />
      <Line x1={cx - braco} y1={cy + braco} x2={cx + braco} y2={cy - braco} stroke={cor} strokeWidth={0.6 * s} />
      <Circle cx={cx - braco} cy={cy - braco} r={helice} fill="#FFFFFF" stroke={cor} strokeWidth={traco} />
      <Circle cx={cx + braco} cy={cy - braco} r={helice} fill="#FFFFFF" stroke={cor} strokeWidth={traco} />
      <Circle cx={cx - braco} cy={cy + braco} r={helice} fill="#FFFFFF" stroke={cor} strokeWidth={traco} />
      <Circle cx={cx + braco} cy={cy + braco} r={helice} fill="#FFFFFF" stroke={cor} strokeWidth={traco} />
      <Circle cx={cx} cy={cy} r={1.0 * s} fill={cor} />
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
      <Rotulo x={cx} y={alturaRotulo} texto={nome ? `${nome} · ${altitude} m` : `${altitude} m`} tamanho={2.4} s={s} />
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

// Selo "zoom" no canto, para quem assiste entender que o mapa aproximou.
// Mostra quanto a vista cobre (ex.: "Zoom: 1,2 km"), que diz mais que "63x".
function SeloZoom({ km }) {
  return (
    <G>
      <Rect x="70" y="2" width="28" height="7" rx="1.5" fill="#0B1F33" opacity="0.8" />
      <Text x="84" y="6.8" fontSize="3" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        {`Zoom: ${km.toFixed(1).replace('.', ',')} km`}
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
// "texto" e "cor" (opcionais): o nome embaixo do alfinete e a cor dele. A coleta de um pedido
// (loja ou farmácia, que não estão nos LOCAIS) usa o mesmo alfinete, em outra cor.
function MarcadorDestino({ destino, s, texto = 'Destino', cor = '#E0457B' }) {
  const x = destino.x * ESCALA;
  const y = destino.y * ESCALA;
  return (
    <G>
      {/* O alfinete: uma gota (curva) com a ponta no ponto exato */}
      <Path
        d={`M ${x} ${y} C ${x - 2.6 * s} ${y - 3.2 * s} ${x - 2.6 * s} ${y - 6 * s} ${x} ${y - 6 * s} C ${x + 2.6 * s} ${y - 6 * s} ${x + 2.6 * s} ${y - 3.2 * s} ${x} ${y} Z`}
        fill={cor}
        stroke="#FFFFFF"
        strokeWidth={0.4 * s}
      />
      <Circle cx={x} cy={y - 4.2 * s} r={0.9 * s} fill="#FFFFFF" />
      <Rotulo x={x} y={y + 3 * s} texto={texto} tamanho={2.2} s={s} />
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
// "origem" é a filial de onde o drone sai (a rota tracejada começa nela)
// "drone" é a posição atual do drone { x, y } em km; sem ela, ele fica na filial de origem
// "centro" (opcional): ponto { x, y } em km no meio da vista; sem ele, a vista segue o drone
// "mostrarAlcance" (opcional): desenha o círculo de 10 km de cada filial
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
// "coleta" (opcional): missão de órgãos, o hospital onde o órgão é retirado (a rota passa por ele)
// "outrosDrones" (opcional): drones da rede voando ao mesmo tempo
//   [{ id, x, y, altitude, cor, rota: { origem, destino }, comParaquedas }]
// "pontosEntrega" (opcional): outros pontos de entrega para marcar (os abrigos de uma operação)
// "mapaDeRuas" (opcional, ligado por padrão): mostra o mapa de ruas de verdade por baixo;
//   desligado, volta o desenho simples (áreas, rios e vias principais)
export default function Mapa({
  mapaDeRuas = true,
  marcadores = [],
  pontosEntrega = [],
  outrosDrones = [],
  coleta,
  destino,
  origem,
  centro,
  mostrarAlcance = false,
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
  // Largura do mapa na tela (px): define o zoom dos tiles do mapa de ruas
  const [larguraTela, setLarguraTela] = useState(380);
  const partida = origem || FILIAIS[0];
  const posicaoDrone = drone || partida;
  const matas = AREAS.filter((area) => area.tipo === 'mata');
  const represas = AREAS.filter((area) => area.tipo === 'agua');

  // Zoom: a vista fica centrada no "centro" (ou no drone), sem sair das bordas do mapa
  const s = vista / 100; // escala dos símbolos
  const meio = centro || posicaoDrone;
  const limitar = (valor) => Math.min(Math.max(valor, 0), 100 - vista);
  const x0 = limitar(meio.x * ESCALA - vista / 2);
  const y0 = limitar(meio.y * ESCALA - vista / 2);
  const detalhe = vista / ESCALA <= VISTA_DETALHE_KM; // a vista mostra 22 km ou menos

  // Só desenha os locais que aparecem na vista (com uma folguinha na borda): com 200 locais,
  // isso deixa o mapa leve durante o voo, que redesenha a tela 20 vezes por segundo
  const naVista = (ponto) => {
    const px = ponto.x * ESCALA;
    const py = ponto.y * ESCALA;
    const folga = vista * 0.1;
    return px >= x0 - folga && px <= x0 + vista + folga && py >= y0 - folga && py <= y0 + vista + folga;
  };

  // Locais na vista, do MENOS para o MAIS importante, porque no SVG o que vem por último fica
  // por cima: hospitais, depois filiais, e a origem e o destino da rota no topo.
  const daRota = (local) =>
    local.id === partida.id || (destino && local.id === destino.id) || (coleta && local.id === coleta.id);
  const importancia = (local) => {
    if (daRota(local)) return 2;
    return local.tipo === 'hub' ? 1 : 0;
  };
  const visiveis = LOCAIS.filter(naVista).sort((a, b) => importancia(a) - importancia(b));
  // Os nomes são escolhidos na ordem contrária (o mais importante primeiro). Sem detalhe,
  // só os locais da rota têm nome. Com o mapa de ruas (que já tem muitos nomes), os
  // hospitais fora da rota ficam só com a letra "H", para não esconder as ruas.
  const comNome = (local) => importancia(local) === 2 || (detalhe && (!mapaDeRuas || importancia(local) === 1));
  const candidatosRotulo = [...visiveis].reverse().filter(comNome);
  const rotulados = escolherRotulos(candidatosRotulo, s);

  // Cidades vizinhas: um retângulo do tamanho do mapa com um "furo" no formato da cidade.
  // fillRule "evenodd": a parte que fica dentro dos dois contornos (a cidade) fica sem tinta.
  const contornoSvg = CONTORNO.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x * ESCALA} ${y * ESCALA}`).join(' ');
  const vizinhasSvg = `M 0 0 L 100 0 L 100 100 L 0 100 Z ${contornoSvg} Z`;

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
      // (o limite é o tamanho do mapa: antes estava fixo em 10 km, sobra do primeiro mapa)
      const dentroDoMapa = (valor) => Math.min(Math.max(valor, 0), TAMANHO_KM);
      if (valido) aoTocar({ x: dentroDoMapa(ponto.x), y: dentroDoMapa(ponto.y) });
    });
  };

  // O destino é um ponto livre (não é um dos locais conhecidos)?
  const destinoLivre = destino && !LOCAIS.some((local) => local.id === destino.id);
  // A coleta também pode estar fora dos LOCAIS (a loja ou a farmácia de um pedido)
  const coletaLivre = coleta && !LOCAIS.some((local) => local.id === coleta.id);

  return (
    <Pressable
      ref={caixa}
      style={styles.caixa}
      onPress={tocar}
      disabled={!aoTocar}
      onLayout={(evento) => setLarguraTela(evento.nativeEvent.layout.width || 380)}
    >
      <Svg width="100%" height="100%" viewBox={`${x0} ${y0} ${vista} ${vista}`}>
        {/* 0. Mapa de ruas de verdade (no lugar das camadas 1 a 4, 6, 7 e 8) */}
        {mapaDeRuas ? (
          <CamadaRuas x0={x0} y0={y0} vista={vista} escala={ESCALA} larguraTela={larguraTela} />
        ) : (
        <G>
        {/* 1. Fundo: a cidade (área urbana) */}
        <Rect x="0" y="0" width="100" height="100" fill={CORES.urbano} />

        {/* 2. Parques e mata */}
        {matas.map((area) => (
          <Polygon key={area.nome} points={paraPontosSvg(area.pontos)} fill={CORES.mata} />
        ))}

        {/* 3. Represas */}
        {represas.map((area) => (
          <Polygon key={area.nome} points={paraPontosSvg(area.pontos)} fill={CORES.agua} />
        ))}

        {/* 4. Rios (linhas azuis) */}
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
        </G>
        )}

        {/* 5. Cidades vizinhas por cima de tudo isso (esmaecidas) e a linha do contorno */}
        {/* (com o mapa de ruas, as vizinhas ficam só sombreadas, para as ruas continuarem visíveis) */}
        <Path d={vizinhasSvg} fill={CORES.vizinhas} fillRule="evenodd" opacity={mapaDeRuas ? 0.45 : 0.95} />
        <Path d={`${contornoSvg} Z`} fill="none" stroke={CORES.contorno} strokeWidth={0.5 * s} strokeDasharray={tracejado([1.5, 1], s)} />

        {!mapaDeRuas && (
        <G>
        {/* 6. Pico do Jaraguá: um triângulo, o símbolo de montanha */}
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
        {detalhe && <Rotulo x={PICO.x * ESCALA} y={PICO.y * ESCALA - 1.4 * s} texto={PICO.nome} tamanho={2.0} s={s} />}

        {/* 7. Vias: primeiro todas as bordas, depois todos os miolos */}
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
        </G>
        )}

        {/* Alcance das filiais: um círculo de 10 km em volta de cada uma. Onde dois ou mais
            círculos se sobrepõem, a cor fica mais forte: é a cobertura dupla aparecendo */}
        {mostrarAlcance &&
          FILIAIS.map((filial) => (
            <Circle
              key={`alcance-${filial.id}`}
              cx={filial.x * ESCALA}
              cy={filial.y * ESCALA}
              r={RAIO_FILIAL_KM * ESCALA}
              fill={CORES.alcance}
              fillOpacity="0.06"
              stroke={CORES.alcance}
              strokeOpacity="0.35"
              strokeWidth={0.3 * s}
            />
          ))}

        {/* 8. Nomes das áreas (só as que têm "rotulo"; o mapa de ruas já tem os nomes) */}
        {!mapaDeRuas && AREAS.filter((area) => area.rotulo).map((area) => (
          <Rotulo
            key={`rotulo-${area.nome}`}
            x={area.rotulo.x * ESCALA}
            y={area.rotulo.y * ESCALA}
            texto={area.rotulo.texto}
            tamanho={2.0}
            s={s}
          />
        ))}

        {/* 9. Zonas de pouso */}
        {ZONAS_POUSO.filter(naVista).map((zona) => (
          <ZonaPouso key={zona.id} zona={zona} s={s} detalhe={detalhe} />
        ))}

        {/* 10. Rota: linha tracejada da filial até o destino (só se houver destino).
            Na missão de órgãos, passa antes pelo hospital da coleta. */}
        {destino &&
          (coleta ? [partida, coleta, destino] : [partida, destino]).slice(1).map((ponto, indice, trechos) => {
            const de = indice === 0 ? partida : trechos[indice - 1];
            return (
              <Line
                key={indice}
                x1={de.x * ESCALA}
                y1={de.y * ESCALA}
                x2={ponto.x * ESCALA}
                y2={ponto.y * ESCALA}
                stroke="#0B5CAD"
                strokeWidth={0.7 * s}
                strokeDasharray={tracejado([2, 1.5], s)}
              />
            );
          })}

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

        {/* 11. Locais: por cima do mapa e da rota. A origem e o destino sempre aparecem
            com detalhe (letra e nome), mesmo com a cidade inteira na tela */}
        {visiveis.map((local) => (
          <Local key={local.id} local={local} s={s} detalhe={detalhe || daRota(local)} comRotulo={rotulados.has(local.id)} />
        ))}

        {/* Destino livre (escolhido tocando no mapa) */}
        {destinoLivre && <MarcadorDestino destino={destino} s={s} texto={destino.rotulo || 'Destino'} />}
        {pontosEntrega
          .filter((ponto) => !destino || ponto.id !== destino.id)
          .map((ponto) => (
            <MarcadorDestino key={ponto.id} destino={ponto} s={s} texto={ponto.rotulo} />
          ))}
        {coletaLivre && <MarcadorDestino destino={coleta} s={s} texto={coleta.rotulo || 'Coleta'} cor="#00897B" />}

        {/* Eventos planejados: onde cada um vai acontecer na rota */}
        {marcadores.map((marcador) => (
          <MarcadorEvento key={marcador.numero} marcador={marcador} s={s} />
        ))}

        {/* Outros drones da rede: a rota de cada um (tracejado fino, na cor dele) e o drone */}
        {outrosDrones.map((outro) => (
          <G key={outro.id}>
            <Line
              x1={outro.rota.origem.x * ESCALA}
              y1={outro.rota.origem.y * ESCALA}
              x2={outro.rota.destino.x * ESCALA}
              y2={outro.rota.destino.y * ESCALA}
              stroke={outro.cor}
              strokeWidth={0.4 * s}
              strokeDasharray={tracejado([1.5, 1.5], s)}
              opacity="0.7"
            />
            <Drone
              x={outro.x}
              y={outro.y}
              altitude={outro.altitude}
              comParaquedas={outro.comParaquedas}
              incerteza={0}
              s={s}
              cor={outro.cor}
              nome={outro.id}
            />
          </G>
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
        {/* Créditos do mapa de ruas (exigidos pelo OpenStreetMap) */}
        {mapaDeRuas && (
          <G>
            <Rect x="61" y="96.2" width="38.5" height="3.6" rx="0.8" fill="#FFFFFF" opacity="0.85" />
            <Text x="98.8" y="98.8" fontSize="2.2" fill="#444444" textAnchor="end">
              © colaboradores do OpenStreetMap
            </Text>
          </G>
        )}
        {/* O selo só aparece no zoom forte (obstáculo perto), não na vista normal do voo */}
        {vista / ESCALA < 3 && <SeloZoom km={vista / ESCALA} />}
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
