import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BuscaDestino from '../../componentes/BuscaDestino';
import Cabecalho from '../../componentes/Cabecalho';
import CenariosProntos from '../../componentes/CenariosProntos';
import Contador from '../../componentes/Contador';
import EditorEventos from '../../componentes/EditorEventos';
import LegendaMapa from '../../componentes/LegendaMapa';
import Mapa from '../../componentes/Mapa';
import Opcoes from '../../componentes/Opcoes';
import ResumoVoo from '../../componentes/ResumoVoo';
import Secao from '../../componentes/Secao';
import { TEMA } from '../../componentes/tema';
import { CENARIOS } from '../../dados/cenarios';
import { AREAS, LOCAIS, TAMANHO_KM, VIAS, ZONAS_POUSO } from '../../dados/regiao';
import { verificarPercurso } from '../../regras/bateria';
import { distanciaKm } from '../../regras/distancia';
import { algumObstaculoPerto, desenhoObstaculo } from '../../regras/obstaculos';
import { tipoDoEvento } from '../../dados/tiposEventos';
import { riscoNoPonto } from '../../regras/risco';
import { DRONES_DA_REDE, aproximarDrones, avancarRede, criarVooDaRede, montarRede } from '../../regras/rede';
import { altitudeDoVoo, avancarVoo, estaNoAr, incertezaDoVoo, posicaoNaRota } from '../../regras/voo';

// As filiais (de onde os drones saem) e os hospitais (para onde levam as entregas)
const FILIAIS_DO_MAPA = LOCAIS.filter((local) => local.tipo === 'hub');
const HOSPITAIS_DO_MAPA = LOCAIS.filter((local) => local.tipo === 'hospital');

// Zonas controladas para emergências: as zonas de pouso + todas as filiais.
// Cada filial entra com ehHub: true e o nome dela (é o nome que aparece nas mensagens).
const ZONAS_E_FILIAIS = [
  ...ZONAS_POUSO,
  ...FILIAIS_DO_MAPA.map((filial) => ({ id: filial.nome, x: filial.x, y: filial.y, ehHub: true })),
];

// A filial mais perto de um ponto (é a que gasta menos bateria)
function filialDaMissao(destino) {
  return FILIAIS_DO_MAPA.reduce((melhor, filial) =>
    distanciaKm(destino, filial) < distanciaKm(destino, melhor) ? filial : melhor
  );
}

// Missão de órgãos? Só quando o tipo é órgãos E há um hospital de coleta escolhido
function ehMissaoOrgao(configuracao) {
  return configuracao.prioridade === 'orgaos' && Boolean(configuracao.coleta);
}

// As paradas da missão, da filial de saída até a filial de chegada:
//   entrega normal: [filial, destino, filial] (sai da filial mais perto do destino e volta a ela);
//   órgãos: [filial, coleta, entrega, filial] (sai da filial mais perto da coleta e
//   volta à filial mais perto do hospital da entrega).
function percursoDa(configuracao) {
  if (ehMissaoOrgao(configuracao)) {
    const { coleta, destino } = configuracao;
    return [filialDaMissao(coleta), coleta, destino, filialDaMissao(destino)];
  }
  const filial = filialDaMissao(configuracao.destino);
  return [filial, configuracao.destino, filial];
}

// Tamanho de um percurso (soma dos trechos), em km
function tamanhoDe(paradas) {
  let total = 0;
  for (let i = 1; i < paradas.length; i++) total += distanciaKm(paradas[i - 1], paradas[i]);
  return total;
}

// Hospital de coleta sugerido ao escolher "Órgãos": o hospital mais perto do destino que
// fique a pelo menos 2 km dele (para a coleta e a entrega não serem quase o mesmo lugar)
function coletaSugerida(destino) {
  const candidatos = HOSPITAIS_DO_MAPA.filter((hospital) => distanciaKm(hospital, destino) >= 2);
  return candidatos.reduce((melhor, hospital) =>
    distanciaKm(hospital, destino) < distanciaKm(melhor, destino) ? hospital : melhor
  );
}

// Tipos de missão (a prioridade do drone), com uma cor para cada
const MISSOES = [
  { valor: 'orgaos', rotulo: 'Órgãos', cor: '#C62828' },
  { valor: 'emergencia', rotulo: 'Emergência', cor: '#E65100' },
  { valor: 'saude', rotulo: 'Saúde', cor: '#2E7D32' },
  { valor: 'comercial', rotulo: 'Comercial', cor: '#0B5CAD' },
];

// Um cenário pronto → a configuração da tela (destino, missão, bateria e eventos).
// Cada evento ganha um id próprio, igual aos adicionados à mão.
function configuracaoDoCenario(cenario) {
  return {
    destino: LOCAIS.find((local) => local.id === cenario.destino),
    coleta: cenario.coleta ? LOCAIS.find((local) => local.id === cenario.coleta) : null,
    prioridade: cenario.prioridade,
    bateria: cenario.bateria,
    trafego: 0,
    eventos: cenario.eventos.map((evento, indice) => ({ id: `${cenario.id}-${indice}`, ...evento })),
  };
}

// Como a simulação começa: o primeiro cenário pronto (a entrega tranquila), sem eventos
// e sem outros drones no ar
const CONFIGURACAO_INICIAL = { ...configuracaoDoCenario(CENARIOS[0]), eventos: [], trafego: 0 };

// Nomes das missões, para o painel dos outros drones
const NOME_MISSAO = { orgaos: 'órgãos', emergencia: 'emergência', saude: 'saúde', comercial: 'comercial', retorno: 'voltando vazio' };

// Os eventos montados na tela → o formato que o voo (voo.js) entende.
// Eventos depois do fim do percurso ficam de fora.
function eventosParaOVoo(eventos, distanciaTotal) {
  return eventos
    .filter((evento) => evento.km <= distanciaTotal + 0.001)
    .map((evento) => {
      const pronto = { ...evento };
      // GPS "não volta" = sem duração (é assim que o voo entende)
      if (pronto.tipo === 'gps' && pronto.duracao === 0) delete pronto.duracao;
      return pronto;
    });
}

// Zoom: a "vista" é medida em unidades do desenho (o mapa inteiro tem 100).
// Para pensar em km, convertemos: 1 km = 100 ÷ TAMANHO_KM unidades (com 76 km, ≈ 1,3 unidade).
const UNIDADES_POR_KM = 100 / TAMANHO_KM;
const VISTA_CIDADE = 100; // montando: a cidade inteira
const KM_REGIAO = 12; // tocou numa região: aproxima para 12 km
const VISTA_VOO = 10 * UNIDADES_POR_KM; // voando: 10 km em volta do drone, seguindo ele
const VISTA_APROXIMADA = 1.2 * UNIDADES_POR_KM; // obstáculo a até 1 km: só 1,2 km em volta
const RAIO_ZOOM_KM = 1;

const KM_POR_SEGUNDO = 1; // velocidade acelerada, para a demonstração não demorar
const PASSO_MS = 50; // a cada 50 milissegundos o drone anda um pouquinho
const PASSO_KM = KM_POR_SEGUNDO * (PASSO_MS / 1000);
const DECISOES_POR_TIQUE = 4; // 4 decisões por atualização da tela: reage mais rápido

// Enquadramento de uma rota: o meio de todas as paradas, com folga em volta
// (no mínimo 8 km, para não ficar perto demais em rotas curtas)
function focoDaRota(configuracao) {
  const paradas = percursoDa(configuracao);
  const xs = paradas.map((p) => p.x);
  const ys = paradas.map((p) => p.y);
  const centro = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const lado = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return { centro, km: Math.max(lado * 1.6, 8) };
}

// O destino escolhido é válido? Devolve o problema em texto, ou null se estiver tudo certo.
function problemaDoDestino(configuracao, origem) {
  const { destino } = configuracao;
  if (ehMissaoOrgao(configuracao)) {
    if (destino.tipo !== 'hospital') return 'O órgão precisa ser entregue num hospital: escolha um hospital como destino.';
    if (destino.id === configuracao.coleta.id) return 'A coleta e a entrega estão no mesmo hospital: escolha hospitais diferentes.';
    return null;
  }
  if (distanciaKm(origem, destino) < 0.3) return 'O destino está colado na filial: escolha um ponto mais longe.';
  // Hospitais sempre podem receber (são pontos reais de entrega). Um ponto livre em cima
  // de rodovia ou trilho, não.
  if (destino.tipo !== 'hospital' && riscoNoPonto(destino, AREAS, VIAS) === 'proibido') {
    return 'O destino fica sobre uma rodovia ou trilho: não dá para pousar ali. Escolha outro ponto.';
  }
  return null;
}

// Onde cada evento planejado fica no mapa: o km é contado ao longo do percurso inteiro
// (filial → ... → filial), trecho por trecho.
// Ida e volta podem usar a mesma linha, então cada marcador é empurrado um pouco para a
// DIREITA do sentido do voo: ficam duas "faixas", como uma estrada de mão dupla.
const AFASTAMENTO_FAIXA_KM = 0.35;

function marcadoresDosEventos(eventos, paradas) {
  return eventos
    .map((evento, indice) => {
      // Procura em qual trecho o km cai
      let resto = evento.km;
      for (let i = 1; i < paradas.length; i++) {
        const de = paradas[i - 1];
        const para = paradas[i];
        const tamanho = distanciaKm(de, para);
        if (resto <= tamanho + 0.001 && tamanho > 0) {
          const ponto = posicaoNaRota(de, para, resto);
          // A direita do sentido do voo neste trecho (a direção girada 90°)
          const direita = { x: -(para.y - de.y) / tamanho, y: (para.x - de.x) / tamanho };
          return {
            x: ponto.x + direita.x * AFASTAMENTO_FAIXA_KM,
            y: ponto.y + direita.y * AFASTAMENTO_FAIXA_KM,
            cor: tipoDoEvento(evento.tipo).cor,
            numero: indice + 1,
          };
        }
        resto -= tamanho;
      }
      return null; // fora da rota
    })
    .filter((marcador) => marcador !== null);
}

// Um voo novo, parado na filial, pronto para decolar, com as escolhas do usuário
function criarVoo(configuracao) {
  const [filial] = percursoDa(configuracao);
  return {
    origem: filial,
    destino: configuracao.destino,
    // Missão de órgãos: o voo passa antes pelo hospital da coleta (veja voo.js)
    coleta: ehMissaoOrgao(configuracao) ? configuracao.coleta : undefined,
    km: 0,
    altitude: 0,
    bateria: configuracao.bateria,
    prioridade: configuracao.prioridade,
    situacao: 'decolando',
    mensagem: 'Decolando...',
  };
}

// Número com vírgula e 1 casa (ex.: 6.25 → "6,3")
function km1(numero) {
  return numero.toFixed(1).replace('.', ',');
}

// Aba "Simular" (rota "/"): monta a simulação e mostra o drone voando.
export default function Simular() {
  const [configuracao, setConfiguracao] = useState(CONFIGURACAO_INICIAL);
  // null = montando a simulação; um objeto = o voo acontecendo (ou terminado)
  const [voo, setVoo] = useState(null);
  const emVoo = voo !== null && estaNoAr(voo);

  // Momentos marcantes do voo, para o resumo do fim: cada mensagem nova, com o km do
  // hodômetro. Mensagens que só mudam os números ("Drone a 225 m" → "Drone a 213 m")
  // contam como a mesma, para o resumo não repetir a aproximação metro a metro.
  const [etapasDoVoo, setEtapasDoVoo] = useState([]);
  useEffect(() => {
    if (voo === null || !voo.mensagem) return;
    const semNumeros = (texto) => texto.replace(/[\d.,]+/g, '#');
    setEtapasDoVoo((atuais) => {
      const ultima = atuais[atuais.length - 1];
      if (ultima && semNumeros(ultima.mensagem) === semNumeros(voo.mensagem)) return atuais;
      return [...atuais, { km: voo.hodometro || 0, mensagem: voo.mensagem }];
    });
  }, [voo?.mensagem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outros drones da rede voando ao mesmo tempo (cada um é um voo de verdade)
  const [outros, setOutros] = useState([]);

  // Começa um voo novo (e esvazia os momentos do voo anterior)
  const iniciar = () => {
    setEtapasDoVoo([]);
    setOutros(extrasPlanejados.map(criarVooDaRede));
    setVoo(criarVoo(configuracao));
  };

  // Volta para a montagem (interrompe o voo e tira os outros drones do mapa)
  const reiniciar = () => {
    setVoo(null);
    setOutros([]);
  };

  // Qual cenário pronto está carregado (null = o usuário montou ou mexeu em algo)
  const [cenario, setCenario] = useState(null);

  // Onde o mapa está olhando na montagem: null = a cidade inteira;
  // { centro, km } = aproximado numa região (centro em km, tamanho da vista em km)
  const [foco, setFoco] = useState(() => focoDaRota(CONFIGURACAO_INICIAL));
  const [mostrarAlcance, setMostrarAlcance] = useState(false);
  const [mostrarLegenda, setMostrarLegenda] = useState(false);

  // Áreas da tela ocupadas pelo sistema (entalhe, barra de status): o conteúdo começa abaixo delas
  const margens = useSafeAreaInsets();

  // Muda só um campo da configuração, mantendo os outros (o "..." copia o resto).
  // Mexeu em algo? Deixa de ser exatamente o cenário pronto.
  const mudar = (campo, valor) => {
    setConfiguracao((atual) => ({ ...atual, [campo]: valor }));
    setCenario(null);
  };

  // Escolheu um destino ou um hospital de coleta (pela busca): o mapa enquadra a rota nova
  const escolherDestino = (destino) => {
    mudar('destino', destino);
    setFoco(focoDaRota({ ...configuracao, destino }));
  };
  const escolherColeta = (coleta) => {
    mudar('coleta', coleta);
    setFoco(focoDaRota({ ...configuracao, coleta }));
  };

  // Trocou o tipo de entrega. Ao escolher "Órgãos" pela primeira vez, já sugere um
  // hospital de coleta (dá para trocar logo abaixo).
  const escolherTipo = (prioridade) => {
    const coleta =
      prioridade === 'orgaos' ? configuracao.coleta || coletaSugerida(configuracao.destino) : configuracao.coleta;
    setConfiguracao((atual) => ({ ...atual, prioridade, coleta }));
    setCenario(null);
    setFoco(focoDaRota({ ...configuracao, prioridade, coleta }));
  };

  const carregarCenario = (escolhido) => {
    const nova = configuracaoDoCenario(escolhido);
    setConfiguracao(nova);
    setCenario(escolhido.id);
    setFoco(focoDaRota(nova));
  };

  // Toque no mapa, em dois passos:
  //   cidade inteira na tela → aproxima a região tocada;
  //   já aproximado → escolhe o destino: o hospital mais perto do dedo ou o ponto livre.
  const tocarNoMapa = (ponto) => {
    if (foco === null) {
      setFoco({ centro: ponto, km: KM_REGIAO });
      return;
    }
    // Tolerância do dedo: 6% da vista (≈ 0,7 km com a vista de 12 km, uns 20 px na tela).
    // Entre os hospitais dentro dela, fica o mais perto do toque.
    const tolerancia = foco.km * 0.06;
    const maisPerto = HOSPITAIS_DO_MAPA.reduce((a, b) => (distanciaKm(b, ponto) < distanciaKm(a, ponto) ? b : a));
    const escolhido = distanciaKm(maisPerto, ponto) <= tolerancia ? maisPerto : null;
    mudar('destino', escolhido || { id: 'ponto-livre', nome: 'Ponto no mapa', rotulo: 'Ponto no mapa', ...ponto });
  };

  const orgao = ehMissaoOrgao(configuracao);
  const paradas = percursoDa(configuracao);
  const origem = paradas[0];

  // Os pontos de entrega têm gente: numa emergência, o drone evita descer perto deles.
  // Se o destino for um ponto livre do mapa, ele também entra nessa lista.
  const destinoLivre = configuracao.destino.tipo !== 'hospital';
  const regiao = {
    zonas: ZONAS_E_FILIAIS,
    areas: AREAS,
    vias: VIAS,
    locais: destinoLivre ? [...HOSPITAIS_DO_MAPA, configuracao.destino] : HOSPITAIS_DO_MAPA,
  };
  // Ida = da filial até a entrega (passando pela coleta, nos órgãos); volta = o último trecho
  const distanciaIda = tamanhoDe(paradas.slice(0, -1));
  const distanciaVolta = distanciaKm(paradas[paradas.length - 2], paradas[paradas.length - 1]);
  const kmColeta = orgao ? distanciaKm(origem, configuracao.coleta) : undefined;
  const eventos = eventosParaOVoo(configuracao.eventos, distanciaIda + distanciaVolta);

  // Os outros drones que vão voar junto: rotas que cruzam a ida do principal
  const extrasPlanejados = montarRede(
    paradas,
    configuracao.trafego,
    FILIAIS_DO_MAPA,
    HOSPITAIS_DO_MAPA,
    orgao ? [configuracao.destino, configuracao.coleta] : [configuracao.destino]
  );

  // O relógio lê o estado mais recente por estas "referências" (o setInterval guardaria
  // uma cópia velha do voo e dos outros drones se lesse direto das variáveis)
  const vooRef = useRef(voo);
  const outrosRef = useRef(outros);
  vooRef.current = voo;
  outrosRef.current = outros;

  // Algum drone ainda voando? (o principal ou um dos outros da rede)
  const algumNoAr = emVoo || outros.some((outro) => estaNoAr(outro));

  // Enquanto houver drone no ar, um "relógio" avança todos os voos a cada PASSO_MS.
  // Depois de cada passo, quem ficou perto de outro drone passa a enxergá-lo (e conversam).
  useEffect(() => {
    if (!algumNoAr) return; // todos no chão (ou ainda não saíram): não liga o relógio

    const relogio = setInterval(() => {
      let principal = vooRef.current;
      let rede = outrosRef.current;
      for (let i = 0; i < DECISOES_POR_TIQUE; i++) {
        const passo = PASSO_KM / DECISOES_POR_TIQUE;
        [principal, ...rede] = aproximarDrones([avancarVoo(principal, passo, eventos, regiao), ...avancarRede(rede, passo, regiao)]);
      }
      vooRef.current = principal;
      outrosRef.current = rede;
      setVoo(principal);
      setOutros(rede);
    }, PASSO_MS);

    // Quando todos pousam (ou a tela fecha), desliga o relógio
    return () => clearInterval(relogio);
  }, [algumNoAr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Antes de simular, o drone está parado na filial de origem
  const posicao = voo ? posicaoNaRota(voo.origem, voo.destino, voo.km) : origem;
  const altitude = voo ? altitudeDoVoo(voo) : 0;

  // Tamanho da vista que o mapa deve ter agora (em unidades do desenho)
  const obstaculoPerto = voo !== null && algumObstaculoPerto(voo.obstaculos, voo.tempo, posicao, RAIO_ZOOM_KM);
  let vistaAlvo;
  if (voo !== null) vistaAlvo = obstaculoPerto && emVoo ? VISTA_APROXIMADA : VISTA_VOO;
  else vistaAlvo = foco ? foco.km * UNIDADES_POR_KM : VISTA_CIDADE;

  // Zoom suave: a cada atualização, a vista anda 30% do caminho até o alvo
  const [vista, setVista] = useState(vistaAlvo);
  useEffect(() => {
    setVista((atual) => {
      const proxima = atual + (vistaAlvo - atual) * 0.3;
      return Math.abs(vistaAlvo - proxima) < 0.2 ? vistaAlvo : proxima; // pertinho: encaixa no alvo
    });
  }, [voo, vistaAlvo, vista]);

  const desvio = voo && voo.emergencia ? voo : null;
  const paraquedas = voo && voo.paraquedasAberto ? { alcance: voo.alcance, confortavel: voo.confortavel } : null;

  // Verificações antes de decolar
  const problemaDestino = problemaDoDestino(configuracao, origem);
  const decolagem = verificarPercurso(paradas, configuracao.bateria);
  const precisa = Math.ceil(decolagem.necessariaComMargem);
  const podeIniciar = !problemaDestino && decolagem.pode;

  const missao = MISSOES.find((m) => m.valor === configuracao.prioridade);

  return (
    <ScrollView style={styles.tela} contentContainerStyle={[styles.conteudo, { paddingTop: margens.top + 20 }]}>
      <Cabecalho titulo="Simular voo" subtitulo="Monte uma situação e veja o drone em ação" />

      <View style={styles.areaMapa}>
        <Mapa
          coleta={orgao ? configuracao.coleta : undefined}
          destino={configuracao.destino}
          origem={voo ? voo.hub || voo.origem : origem}
          centro={voo === null && foco ? foco.centro : undefined}
          mostrarAlcance={mostrarAlcance}
          drone={posicao}
          desvio={desvio}
          altitude={altitude}
          paraquedas={paraquedas}
          vento={voo ? voo.vento : null}
          incerteza={voo ? incertezaDoVoo(voo) : 0}
          // Os drones da rede já aparecem de verdade no mapa (outrosDrones): o "obstáculo" que o
          // nosso drone usa para calcular o desvio deles não é desenhado, para não ficar duplicado
          obstaculos={
            voo
              ? (voo.obstaculos || [])
                  .filter((obstaculo) => !outros.some((outro) => outro.idDrone === obstaculo.id))
                  .map((obstaculo) => desenhoObstaculo(obstaculo, voo.tempo))
              : []
          }
          vista={vista}
          marcadores={voo === null ? marcadoresDosEventos(configuracao.eventos, paradas) : []}
          outrosDrones={outros.map((outro, indice) => ({
            id: outro.idDrone,
            x: posicaoNaRota(outro.origem, outro.destino, outro.km).x,
            y: posicaoNaRota(outro.origem, outro.destino, outro.km).y,
            altitude: outro.espera > 0 ? 0 : altitudeDoVoo(outro),
            cor: DRONES_DA_REDE[indice].cor,
            rota: { origem: outro.hub || outro.origem, destino: outro.destinoFinal || outro.destino },
            comParaquedas: Boolean(outro.paraquedasAberto) && altitudeDoVoo(outro) > 0,
          }))}
          aoTocar={voo === null ? tocarNoMapa : undefined}
        />
      </View>

      {/* Legenda do mapa: aparece e some com um toque (na montagem e durante o voo) */}
      <View style={styles.linhaMapa}>
        <Pressable style={[styles.chip, mostrarLegenda && styles.chipLigado]} onPress={() => setMostrarLegenda(!mostrarLegenda)}>
          <Text style={[styles.textoChip, mostrarLegenda && styles.textoChipLigado]}>
            {mostrarLegenda ? 'Esconder legenda' : 'Legenda do mapa'}
          </Text>
        </Pressable>
      </View>
      {mostrarLegenda ? <LegendaMapa /> : null}

      {voo === null ? (
        // ---------- MONTANDO A SIMULAÇÃO ----------
        <View>
          <View style={styles.linhaMapa}>
            <Text style={styles.dicaMapa}>
              {foco === null
                ? 'Toque numa região para aproximar'
                : 'Toque num hospital (ou em qualquer ponto) para escolher o destino'}
            </Text>
          </View>
          <View style={styles.linhaMapa}>
            {foco !== null ? (
              <Pressable style={styles.chip} onPress={() => setFoco(null)}>
                <Text style={styles.textoChip}>Ver a cidade inteira</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.chip, mostrarAlcance && styles.chipLigado]}
              onPress={() => setMostrarAlcance(!mostrarAlcance)}
            >
              <Text style={[styles.textoChip, mostrarAlcance && styles.textoChipLigado]}>Alcance das filiais</Text>
            </Pressable>
          </View>

          <Secao titulo="Cenários prontos" dica="Comece por um deles e ajuste o que quiser, ou monte do zero abaixo">
            <CenariosProntos escolhido={cenario} aoEscolher={carregarCenario} />
          </Secao>

          <Secao
            titulo={orgao ? 'Hospital da entrega' : 'Destino'}
            dica={
              orgao
                ? `Sai da ${origem.nome}, a filial mais próxima da coleta · ${km1(distanciaIda)} km até a entrega`
                : `Sai da ${origem.nome}, a filial mais próxima · ${km1(distanciaIda)} km (ida)`
            }
          >
            <View style={styles.destinoAtual}>
              <Text style={styles.destinoNome}>{configuracao.destino.nome}</Text>
              {configuracao.destino.bairro ? <Text style={styles.destinoBairro}>{configuracao.destino.bairro}</Text> : null}
            </View>
            <BuscaDestino locais={HOSPITAIS_DO_MAPA} aoEscolher={escolherDestino} />
            {problemaDestino ? <Text style={styles.alerta}>{problemaDestino}</Text> : null}
          </Secao>

          <Secao titulo="Tipo de entrega" dica="Define a prioridade do drone no tráfego aéreo">
            <Opcoes opcoes={MISSOES} valor={configuracao.prioridade} aoEscolher={escolherTipo} />
          </Secao>

          {orgao ? (
            <Secao titulo="Hospital da coleta" dica="Onde o órgão é retirado: o drone pousa ali antes de seguir para a entrega">
              <View style={styles.destinoAtual}>
                <Text style={styles.destinoNome}>{configuracao.coleta.nome}</Text>
                {configuracao.coleta.bairro ? <Text style={styles.destinoBairro}>{configuracao.coleta.bairro}</Text> : null}
              </View>
              <BuscaDestino locais={HOSPITAIS_DO_MAPA} aoEscolher={escolherColeta} />
            </Secao>
          ) : null}

          <Secao
            titulo="Bateria na decolagem"
            dica={`Esta rota precisa de ${precisa}% (${orgao ? 'coleta + entrega + volta' : 'ida + volta'} + 30% de margem)`}
          >
            <View style={styles.linhaBateria}>
              <Contador valor={configuracao.bateria} passo={5} minimo={10} maximo={100} sufixo="%" aoMudar={(valor) => mudar('bateria', valor)} />
              <Text style={[styles.selo, decolagem.pode ? styles.seloOk : styles.seloNao]}>
                {decolagem.pode ? 'Pode decolar' : 'Insuficiente'}
              </Text>
            </View>
            {/* Barra: o quanto a bateria tem, com uma marca no quanto a rota exige */}
            <View style={styles.barra}>
              <View
                style={[
                  styles.barraCheia,
                  { width: `${configuracao.bateria}%`, backgroundColor: decolagem.pode ? TEMA.sucesso : TEMA.perigo },
                ]}
              />
              <View style={[styles.marcaPrecisa, { left: `${Math.min(precisa, 100)}%` }]} />
            </View>
          </Secao>

          <Secao
            titulo={`Eventos (${configuracao.eventos.length})`}
            dica={
              orgao
                ? `Coleta no km ${km1(kmColeta)} · Entrega no km ${km1(distanciaIda)} · Volta: até o km ${km1(distanciaIda + distanciaVolta)}`
                : `Ida: km 0 a ${km1(distanciaIda)} · Volta: até o km ${km1(distanciaIda + distanciaVolta)}`
            }
          >
            <EditorEventos
              eventos={configuracao.eventos}
              distanciaIda={distanciaIda}
              distanciaVolta={distanciaVolta}
              kmColeta={kmColeta}
              aoMudar={(lista) => mudar('eventos', lista)}
            />
          </Secao>

          <Secao
            titulo="Outros drones no ar"
            dica="Drones da rede voando ao mesmo tempo, com rotas que cruzam a sua: eles se enxergam e combinam pelo rádio quem desvia"
          >
            <Contador valor={configuracao.trafego} passo={1} minimo={0} maximo={3} sufixo="" aoMudar={(valor) => mudar('trafego', valor)} />
            {extrasPlanejados.map((extra) => (
              <Text key={extra.idDrone} style={styles.itemRede}>
                {extra.idDrone} · {NOME_MISSAO[extra.prioridade]}: {extra.origem.nome} → {extra.destino.rotulo}
              </Text>
            ))}
            {extrasPlanejados.length < configuracao.trafego ? (
              <Text style={styles.dicaRede}>
                Só {extrasPlanejados.length === 1 ? 'uma rota cruza' : `${extrasPlanejados.length} rotas cruzam`} esta ida no momento certo: os outros ficam na filial.
              </Text>
            ) : null}
          </Secao>

          <Pressable
            style={[styles.botao, !podeIniciar && styles.botaoDesligado]}
            onPress={iniciar}
            disabled={!podeIniciar}
          >
            <Text style={styles.textoBotao}>Iniciar simulação</Text>
          </Pressable>
          {!podeIniciar ? (
            <Text style={styles.motivo}>
              {problemaDestino || `A decolagem seria negada: a bateria precisa de pelo menos ${precisa}% para esta rota.`}
            </Text>
          ) : null}
        </View>
      ) : (
        // ---------- VOO ACONTECENDO ----------
        <View style={styles.painel}>
          <Text style={[styles.missao, { color: missao.cor }]}>{missao.rotulo}</Text>
          {/* voo.hub guarda a filial de saída (voo.origem muda a cada trecho do voo) */}
          <Text style={styles.trajeto}>
            {(voo.hub || voo.origem).nome} → {orgao ? `${configuracao.coleta.rotulo} → ` : ''}
            {configuracao.destino.rotulo}
          </Text>
          <Text style={styles.status}>{voo.mensagem}</Text>
          <Text style={styles.bateria}>Bateria: {Math.round(voo.bateria)}%</Text>
          {outros.map((outro) => (
            <Text key={outro.idDrone} style={styles.itemRede}>
              {outro.idDrone} ({NOME_MISSAO[outro.prioridade] || outro.prioridade}): {outro.espera > 0 ? 'aguardando a vez na filial' : outro.mensagem}
            </Text>
          ))}
          <Pressable style={[styles.botao, styles.botaoSecundario]} onPress={reiniciar}>
            <Text style={[styles.textoBotao, styles.textoSecundario]}>{emVoo ? 'Interromper e reiniciar' : 'Nova simulação'}</Text>
          </Pressable>
        </View>
      )}

      {/* Voo terminado: o resumo (resultado, distância, tempo, bateria e como foi o voo) */}
      {voo !== null && !emVoo ? (
        <ResumoVoo voo={voo} bateriaInicial={configuracao.bateria} etapas={etapasDoVoo} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: TEMA.fundo,
  },
  conteudo: {
    paddingHorizontal: 16,
    // paddingTop vem da safe area (margens.top), no próprio componente
    paddingBottom: 32,
  },
  areaMapa: {
    marginTop: 20,
  },
  linhaMapa: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  dicaMapa: {
    fontSize: 13,
    textAlign: 'center',
    color: TEMA.textoSuave,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.cartao,
  },
  chipLigado: {
    borderColor: TEMA.marca,
    backgroundColor: TEMA.marca,
  },
  textoChip: {
    fontSize: 13,
    fontWeight: '600',
    color: TEMA.texto,
  },
  textoChipLigado: {
    color: '#FFFFFF',
  },
  destinoAtual: {
    marginBottom: 10,
  },
  destinoNome: {
    fontSize: 16,
    fontWeight: '700',
    color: TEMA.texto,
  },
  destinoBairro: {
    marginTop: 2,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  alerta: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: TEMA.perigoClaro,
    color: TEMA.perigo,
    fontSize: 13,
  },
  linhaBateria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selo: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
  },
  seloOk: {
    backgroundColor: TEMA.sucessoClaro,
    color: TEMA.sucesso,
  },
  seloNao: {
    backgroundColor: TEMA.perigoClaro,
    color: TEMA.perigo,
  },
  barra: {
    marginTop: 14,
    height: 10,
    borderRadius: 5,
    backgroundColor: TEMA.borda,
    overflow: 'visible',
  },
  barraCheia: {
    height: 10,
    borderRadius: 5,
  },
  // A marca do "quanto a rota exige": um tracinho escuro em cima da barra
  marcaPrecisa: {
    position: 'absolute',
    top: -4,
    width: 3,
    height: 18,
    marginLeft: -1.5,
    borderRadius: 2,
    backgroundColor: TEMA.texto,
  },
  painel: {
    marginTop: 14,
    padding: 16,
    borderRadius: TEMA.raio,
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.cartao,
  },
  missao: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trajeto: {
    marginTop: 4,
    fontSize: 13,
    textAlign: 'center',
    color: TEMA.textoSuave,
  },
  status: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    color: TEMA.texto,
  },
  bateria: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    color: TEMA.textoSuave,
  },
  botao: {
    marginTop: 18,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: TEMA.marca,
    alignItems: 'center',
  },
  botaoDesligado: {
    backgroundColor: '#9FB4CC',
  },
  textoBotao: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  botaoSecundario: {
    backgroundColor: TEMA.cartao,
    borderWidth: 1.5,
    borderColor: TEMA.marca,
  },
  textoSecundario: {
    color: TEMA.marca,
  },
  itemRede: {
    marginTop: 8,
    fontSize: 13,
    color: TEMA.texto,
  },
  dicaRede: {
    marginTop: 8,
    fontSize: 12,
    color: TEMA.textoSuave,
  },
  motivo: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    color: TEMA.perigo,
  },
});
