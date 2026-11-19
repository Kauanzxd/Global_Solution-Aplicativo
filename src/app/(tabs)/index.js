import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../componentes/Cabecalho';
import CenariosProntos from '../../componentes/CenariosProntos';
import Contador from '../../componentes/Contador';
import EditorEventos from '../../componentes/EditorEventos';
import Mapa from '../../componentes/Mapa';
import Opcoes from '../../componentes/Opcoes';
import Secao from '../../componentes/Secao';
import { TEMA } from '../../componentes/tema';
import { AREAS, LOCAIS, VIAS, ZONAS_POUSO } from '../../dados/regiao';
import { verificarDecolagem } from '../../regras/bateria';
import { distanciaKm } from '../../regras/distancia';
import { algumObstaculoPerto, desenhoObstaculo } from '../../regras/obstaculos';
import { tipoDoEvento } from '../../dados/tiposEventos';
import { riscoNoPonto } from '../../regras/risco';
import { altitudeDoVoo, avancarVoo, estaNoAr, incertezaDoVoo, posicaoNaRota } from '../../regras/voo';

const hub = LOCAIS.find((local) => local.id === 'hub');
const LOCAIS_DE_ENTREGA = LOCAIS.filter((local) => local.id !== 'hub');

// Tipos de missão (a prioridade do drone), com uma cor para cada
const MISSOES = [
  { valor: 'orgaos', rotulo: 'Órgãos', cor: '#C62828' },
  { valor: 'emergencia', rotulo: 'Emergência', cor: '#E65100' },
  { valor: 'saude', rotulo: 'Saúde', cor: '#2E7D32' },
  { valor: 'comercial', rotulo: 'Comercial', cor: '#0B5CAD' },
];

// Como a simulação começa, antes de o usuário mexer em nada
const CONFIGURACAO_INICIAL = {
  destino: LOCAIS.find((local) => local.id === 'aldeia-jaragua'),
  prioridade: 'saude',
  bateria: 60,
  eventos: [],
};

// Um cenário pronto → a configuração da tela (destino, missão, bateria e eventos).
// Cada evento ganha um id próprio, igual aos adicionados à mão.
function configuracaoDoCenario(cenario) {
  return {
    destino: LOCAIS.find((local) => local.id === cenario.destino),
    prioridade: cenario.prioridade,
    bateria: cenario.bateria,
    eventos: cenario.eventos.map((evento, indice) => ({ id: `${cenario.id}-${indice}`, ...evento })),
  };
}

// Os eventos montados na tela → o formato que o voo (voo.js) entende.
// Eventos depois do fim da rota (ida + volta) ficam de fora.
function eventosParaOVoo(eventos, distanciaIda) {
  return eventos
    .filter((evento) => evento.km <= distanciaIda * 2 + 0.001)
    .map((evento) => {
      const pronto = { ...evento };
      // GPS "não volta" = sem duração (é assim que o voo entende)
      if (pronto.tipo === 'gps' && pronto.duracao === 0) delete pronto.duracao;
      return pronto;
    });
}

// Zoom: com um obstáculo a até 1 km, o mapa aproxima para mostrar só 1,2 km em volta do drone (8x)
const VISTA_NORMAL = 100;
const VISTA_APROXIMADA = 12;
const RAIO_ZOOM_KM = 1;

const KM_POR_SEGUNDO = 1; // velocidade acelerada, para a demonstração não demorar
const PASSO_MS = 50; // a cada 50 milissegundos o drone anda um pouquinho
const PASSO_KM = KM_POR_SEGUNDO * (PASSO_MS / 1000);
const DECISOES_POR_TIQUE = 4; // 4 decisões por atualização da tela: reage mais rápido

// O destino escolhido é válido? Devolve o problema em texto, ou null se estiver tudo certo.
function problemaDoDestino(destino) {
  if (distanciaKm(hub, destino) < 0.3) return 'O destino está colado no hub: escolha um ponto mais longe.';
  if (riscoNoPonto(destino, AREAS, VIAS) === 'proibido') {
    return 'O destino fica sobre uma rodovia ou trilho: não dá para pousar ali. Escolha outro ponto.';
  }
  return null;
}

// Onde cada evento planejado fica no mapa. Na ida, o km conta a partir do hub;
// na volta, a partir do destino, no caminho de volta ao hub.
// Ida e volta usam a mesma linha, então cada marcador é empurrado um pouco para a
// DIREITA do sentido do voo: ficam duas "faixas", como uma estrada de mão dupla.
const AFASTAMENTO_FAIXA_KM = 0.25;

function marcadoresDosEventos(eventos, destino, distanciaIda) {
  if (distanciaIda === 0) return [];
  // Direção da ida (tamanho 1) e a direita dela (girada 90°)
  const ida = { x: (destino.x - hub.x) / distanciaIda, y: (destino.y - hub.y) / distanciaIda };
  const direitaDaIda = { x: -ida.y, y: ida.x };

  return eventos
    .map((evento, indice) => {
      if (evento.km > distanciaIda * 2) return null; // fora da rota
      const naIda = evento.km <= distanciaIda;
      const ponto = naIda
        ? posicaoNaRota(hub, destino, evento.km)
        : posicaoNaRota(destino, hub, evento.km - distanciaIda);
      const lado = naIda ? 1 : -1; // na volta, a direita do drone é o outro lado da linha
      return {
        x: ponto.x + direitaDaIda.x * AFASTAMENTO_FAIXA_KM * lado,
        y: ponto.y + direitaDaIda.y * AFASTAMENTO_FAIXA_KM * lado,
        cor: tipoDoEvento(evento.tipo).cor,
        numero: indice + 1,
      };
    })
    .filter((marcador) => marcador !== null);
}

// Um voo novo, parado no hub, pronto para decolar, com as escolhas do usuário
function criarVoo(configuracao) {
  return {
    origem: hub,
    destino: configuracao.destino,
    km: 0,
    altitude: 0,
    bateria: configuracao.bateria,
    prioridade: configuracao.prioridade,
    situacao: 'decolando',
    mensagem: 'Decolando...',
  };
}

// Aba "Simular" (rota "/"): monta a simulação e mostra o drone voando.
export default function Simular() {
  const [configuracao, setConfiguracao] = useState(CONFIGURACAO_INICIAL);
  // null = montando a simulação; um objeto = o voo acontecendo (ou terminado)
  const [voo, setVoo] = useState(null);
  const emVoo = voo !== null && estaNoAr(voo);

  // Qual cenário pronto está carregado (null = o usuário montou ou mexeu em algo)
  const [cenario, setCenario] = useState(null);

  // Muda só um campo da configuração, mantendo os outros (o "..." copia o resto).
  // Mexeu em algo? Deixa de ser exatamente o cenário pronto.
  const mudar = (campo, valor) => {
    setConfiguracao((atual) => ({ ...atual, [campo]: valor }));
    setCenario(null);
  };

  const carregarCenario = (escolhido) => {
    setConfiguracao(configuracaoDoCenario(escolhido));
    setCenario(escolhido.id);
  };

  // Os pontos de entrega têm gente: numa emergência, o drone evita descer perto deles.
  // Se o destino for um ponto livre do mapa, ele também entra nessa lista.
  const destinoLivre = !LOCAIS.some((local) => local.id === configuracao.destino.id);
  const regiao = {
    zonas: ZONAS_POUSO,
    areas: AREAS,
    vias: VIAS,
    locais: destinoLivre ? [...LOCAIS_DE_ENTREGA, configuracao.destino] : LOCAIS_DE_ENTREGA,
  };
  const distanciaIda = distanciaKm(hub, configuracao.destino);
  const eventos = eventosParaOVoo(configuracao.eventos, distanciaIda);

  // Enquanto o drone está no ar, um "relógio" avança o voo a cada PASSO_MS
  useEffect(() => {
    if (!emVoo) return; // pousou (ou ainda não saiu): não liga o relógio

    const relogio = setInterval(() => {
      setVoo((atual) => {
        let proximo = atual;
        for (let i = 0; i < DECISOES_POR_TIQUE; i++) {
          proximo = avancarVoo(proximo, PASSO_KM / DECISOES_POR_TIQUE, eventos, regiao);
        }
        return proximo;
      });
    }, PASSO_MS);

    // Quando o drone pousa (ou a tela fecha), desliga o relógio
    return () => clearInterval(relogio);
  }, [emVoo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Antes de simular, o drone está parado no hub
  const posicao = voo ? posicaoNaRota(voo.origem, voo.destino, voo.km) : hub;
  const altitude = voo ? altitudeDoVoo(voo) : 0;

  // Zoom suave: a cada atualização do voo, a vista anda 30% do caminho até o alvo
  const [vista, setVista] = useState(VISTA_NORMAL);
  const obstaculoPerto = voo !== null && algumObstaculoPerto(voo.obstaculos, voo.tempo, posicao, RAIO_ZOOM_KM);
  const vistaAlvo = obstaculoPerto && emVoo ? VISTA_APROXIMADA : VISTA_NORMAL;
  useEffect(() => {
    setVista((atual) => {
      const proxima = atual + (vistaAlvo - atual) * 0.3;
      return Math.abs(vistaAlvo - proxima) < 0.5 ? vistaAlvo : proxima; // pertinho: encaixa no alvo
    });
  }, [voo, vistaAlvo]);

  const desvio = voo && voo.emergencia ? voo : null;
  const paraquedas = voo && voo.paraquedasAberto ? { alcance: voo.alcance, confortavel: voo.confortavel } : null;

  // Verificações antes de decolar
  const problemaDestino = problemaDoDestino(configuracao.destino);
  const decolagem = verificarDecolagem(hub, configuracao.destino, configuracao.bateria);
  const precisa = Math.ceil(decolagem.necessariaComMargem);
  const podeIniciar = !problemaDestino && decolagem.pode;

  // Atalhos de destino: os locais conhecidos + "Ponto no mapa" quando o usuário tocou no mapa
  const opcoesDestino = LOCAIS_DE_ENTREGA.map((local) => ({ valor: local.id, rotulo: local.rotulo }));
  if (destinoLivre) opcoesDestino.push({ valor: configuracao.destino.id, rotulo: 'Ponto no mapa' });

  const missao = MISSOES.find((m) => m.valor === (voo ? configuracao.prioridade : configuracao.prioridade));

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Cabecalho titulo="Simular voo" subtitulo="Monte uma situação e veja o drone em ação" />

      <View style={styles.areaMapa}>
        <Mapa
          destino={configuracao.destino}
          drone={posicao}
          desvio={desvio}
          altitude={altitude}
          paraquedas={paraquedas}
          vento={voo ? voo.vento : null}
          incerteza={voo ? incertezaDoVoo(voo) : 0}
          obstaculos={voo ? (voo.obstaculos || []).map((obstaculo) => desenhoObstaculo(obstaculo, voo.tempo)) : []}
          vista={vista}
          marcadores={voo === null ? marcadoresDosEventos(configuracao.eventos, configuracao.destino, distanciaIda) : []}
          aoTocar={voo === null ? (ponto) => mudar('destino', { id: 'ponto-livre', rotulo: 'Ponto no mapa', ...ponto }) : undefined}
        />
      </View>

      {voo === null ? (
        // ---------- MONTANDO A SIMULAÇÃO ----------
        <View>
          <Text style={styles.dicaMapa}>Toque em qualquer ponto do mapa para escolher o destino</Text>

          <Secao titulo="Cenários prontos" dica="Comece por um deles e ajuste o que quiser, ou monte do zero abaixo">
            <CenariosProntos escolhido={cenario} aoEscolher={carregarCenario} />
          </Secao>

          <Secao titulo="Destino" dica={`${distanciaKm(hub, configuracao.destino).toFixed(1).replace('.', ',')} km do hub (ida)`}>
            <Opcoes
              opcoes={opcoesDestino}
              valor={configuracao.destino.id}
              aoEscolher={(id) => mudar('destino', LOCAIS.find((local) => local.id === id) || configuracao.destino)}
            />
            {problemaDestino ? <Text style={styles.alerta}>{problemaDestino}</Text> : null}
          </Secao>

          <Secao titulo="Tipo de entrega" dica="Define a prioridade do drone no tráfego aéreo">
            <Opcoes opcoes={MISSOES} valor={configuracao.prioridade} aoEscolher={(valor) => mudar('prioridade', valor)} />
          </Secao>

          <Secao titulo="Bateria na decolagem" dica={`Esta rota precisa de ${precisa}% (ida + volta + 30% de margem)`}>
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
            dica={`Ida: km 0 a ${distanciaIda.toFixed(1).replace('.', ',')} · Volta: até o km ${(distanciaIda * 2).toFixed(1).replace('.', ',')}`}
          >
            <EditorEventos
              eventos={configuracao.eventos}
              distanciaIda={distanciaIda}
              aoMudar={(lista) => mudar('eventos', lista)}
            />
          </Secao>

          <Pressable
            style={[styles.botao, !podeIniciar && styles.botaoDesligado]}
            onPress={() => setVoo(criarVoo(configuracao))}
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
          <Text style={[styles.missao, { color: missao.cor }]}>
            {missao.rotulo} · Hub → {configuracao.destino.rotulo}
          </Text>
          <Text style={styles.status}>{voo.mensagem}</Text>
          <Text style={styles.bateria}>Bateria: {Math.round(voo.bateria)}%</Text>
          <Pressable style={[styles.botao, styles.botaoSecundario]} onPress={() => setVoo(null)}>
            <Text style={[styles.textoBotao, styles.textoSecundario]}>{emVoo ? 'Interromper e reiniciar' : 'Nova simulação'}</Text>
          </Pressable>
        </View>
      )}
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
    paddingTop: 48,
    paddingBottom: 32,
  },
  areaMapa: {
    marginTop: 20,
  },
  dicaMapa: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
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
  motivo: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    color: TEMA.perigo,
  },
});
