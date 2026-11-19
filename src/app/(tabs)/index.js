import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../componentes/Cabecalho';
import Mapa from '../../componentes/Mapa';
import { AREAS, LOCAIS, VIAS, ZONAS_POUSO } from '../../dados/regiao';
import { algumObstaculoPerto, desenhoObstaculo } from '../../regras/obstaculos';
import { altitudeDoVoo, avancarVoo, estaNoAr, incertezaDoVoo, posicaoNaRota } from '../../regras/voo';

const hub = LOCAIS.find((local) => local.id === 'hub');
// "locais": os pontos de entrega (têm gente em volta): numa emergência, o drone evita descer perto deles
const REGIAO = { zonas: ZONAS_POUSO, areas: AREAS, vias: VIAS, locais: LOCAIS.filter((local) => local.id !== 'hub') };

// Por enquanto o cenário é fixo. No passo 4, quem monta é o usuário.
// Outros testes: [{ tipo: 'pane', km: 1.5 }], [{ tipo: 'falha-grave', km: 0 }] ou
// [{ tipo: 'falha-grave', km: 0, altitude: 20 }]. km 0 = durante a decolagem.
// Vento: velocidade em m/s e "de" = de onde vem (norte, sul, leste, oeste, nordeste...)
// Ex.: [{ tipo: 'vento', km: 0.5, velocidade: 8, de: 'sul' }, { tipo: 'falha-grave', km: 1.7 }]
// Motor: { tipo: 'motor', km: 3.5 } chega à ZP com folga;
// { tipo: 'motor', km: 1.5 } não chegaria com folga, então abre o paraquedas na hora
// GPS: { tipo: 'gps', km: 1.7, duracao: 60 } o sinal volta depois de 60 s; sem "duracao", não volta.
// O km é o da viagem inteira (hodômetro): eventos também acontecem no meio de um desvio.
// { durante: 'gps' } no lugar do km = acontece 10 s depois da perda do sinal.
// Temperatura: { tipo: 'temperatura', km: 1 } = alta; { ..., grau: 'critica' } = crítica.
// Uma segunda temperatura alta, com o drone já quente, vira crítica.
// Bateria: { tipo: 'bateria', km: 1, perda: 40 } = uma célula falha e a bateria cai 40 pontos
// (sem "perda", cai 20). Teste com perda 20 (segue), 40 (zona) e 62 (paraquedas).
// Obstáculo em movimento: { tipo: 'obstaculo', km: 2, objeto: 'passaros' } ou objeto: 'guindaste'
// Outro drone da rede vindo de frente: { tipo: 'drone', km: 2.5, prioridade: 'comercial' }
// (prioridade: orgaos, emergencia, saude ou comercial; opcionais: bateria, id)
const destino = LOCAIS.find((local) => local.id === 'aldeia-jaragua');
// Drone SEM rádio: { tipo: 'drone', km: 2.5, comunicacao: false, comportamento: 'errante' }
// (comportamento: 'reto', 'pairando' ou 'errante'; opcionais: semGps: true, ambosSemRadio: true)
// A missão tem ida e volta: a ida tem 4,2 km; km acima disso acontece na VOLTA ao hub.
// Ex.: { tipo: 'drone', km: 6, prioridade: 'comercial' } = na volta, vazio, o nosso drone cede a vez
const EVENTOS = [{ tipo: 'drone', km: 6, prioridade: 'comercial' }];
const PRIORIDADE = 'saude'; // tipo da nossa missão — no passo 4, quem escolhe é o usuário
const BATERIA_INICIAL = 80; // % — no passo 4, quem escolhe é o usuário

// Zoom: com um obstáculo a até 1 km, o mapa aproxima para mostrar só 1,2 km em volta do drone (8x).
// Começa cedo porque dois drones se aproximam rápido (30 m/s somando os dois).
const VISTA_NORMAL = 100;
const VISTA_APROXIMADA = 12;
const RAIO_ZOOM_KM = 1;

const KM_POR_SEGUNDO = 1; // velocidade acelerada, para a demonstração não demorar
const PASSO_MS = 50; // a cada 50 milissegundos o drone anda um pouquinho
const PASSO_KM = KM_POR_SEGUNDO * (PASSO_MS / 1000);
// A cada atualização da tela, o drone toma 4 decisões (passos 4 vezes menores).
// Ele reage mais rápido, o que faz diferença contra obstáculos imprevisíveis.
const DECISOES_POR_TIQUE = 4;

// Um voo novo, parado no hub, pronto para decolar
function criarVoo() {
  return {
    origem: hub,
    destino,
    km: 0,
    altitude: 0,
    bateria: BATERIA_INICIAL,
    prioridade: PRIORIDADE,
    situacao: 'decolando',
    mensagem: 'Decolando...',
  };
}

// Aba "Simular" (rota "/"): aqui vai ficar o simulador de voo.
export default function Simular() {
  // null = montando a simulação (o drone ainda não saiu); um objeto = o voo acontecendo
  const [voo, setVoo] = useState(null);
  const emVoo = voo !== null && estaNoAr(voo);

  // Enquanto o drone está no ar, um "relógio" avança o voo a cada PASSO_MS
  useEffect(() => {
    if (!emVoo) return; // pousou: não liga o relógio

    const relogio = setInterval(() => {
      setVoo((atual) => {
        let proximo = atual;
        for (let i = 0; i < DECISOES_POR_TIQUE; i++) {
          proximo = avancarVoo(proximo, PASSO_KM / DECISOES_POR_TIQUE, EVENTOS, REGIAO);
        }
        return proximo;
      });
    }, PASSO_MS);

    // Quando o drone pousa (ou a tela fecha), desliga o relógio
    return () => clearInterval(relogio);
  }, [emVoo]);

  // Antes de simular, o drone está parado no hub
  const posicao = voo ? posicaoNaRota(voo.origem, voo.destino, voo.km) : hub;
  const altitude = voo ? altitudeDoVoo(voo) : 0;

  // Zoom suave: a cada atualização do voo, a vista anda 30% do caminho até o alvo
  // (perto de um obstáculo: aproximada; senão: o mapa inteiro)
  const [vista, setVista] = useState(VISTA_NORMAL);
  const obstaculoPerto = voo !== null && algumObstaculoPerto(voo.obstaculos, voo.tempo, posicao, RAIO_ZOOM_KM);
  const vistaAlvo = obstaculoPerto && emVoo ? VISTA_APROXIMADA : VISTA_NORMAL;
  useEffect(() => {
    setVista((atual) => {
      const proxima = atual + (vistaAlvo - atual) * 0.3;
      return Math.abs(vistaAlvo - proxima) < 0.5 ? vistaAlvo : proxima; // pertinho: encaixa no alvo
    });
  }, [voo, vistaAlvo]);
  // Depois de uma pane ou falha grave em voo, o trecho atual é o desvio
  const desvio = voo && voo.emergencia ? voo : null;
  // Paraquedas aberto. Sobre o hub não há planeio: sem áreas de alcance, os círculos não aparecem.
  const paraquedas = voo && voo.paraquedasAberto ? { alcance: voo.alcance, confortavel: voo.confortavel } : null;

  return (
    <View style={styles.container}>
      <Cabecalho titulo="Simular voo" subtitulo="Monte uma situação e veja o drone em ação" />
      <View style={styles.areaMapa}>
        <Mapa
          destino={destino}
          drone={posicao}
          desvio={desvio}
          altitude={altitude}
          paraquedas={paraquedas}
          vento={voo ? voo.vento : null}
          incerteza={voo ? incertezaDoVoo(voo) : 0}
          obstaculos={voo ? (voo.obstaculos || []).map((obstaculo) => desenhoObstaculo(obstaculo, voo.tempo)) : []}
          vista={vista}
        />
      </View>

      {/* Montando: só o botão de começar. Voando ou terminado: a situação e o botão de reiniciar. */}
      {voo === null ? (
        <Pressable style={styles.botao} onPress={() => setVoo(criarVoo())}>
          <Text style={styles.textoBotao}>Simular</Text>
        </Pressable>
      ) : (
        <View>
          <Text style={styles.status}>{voo.mensagem}</Text>
          <Text style={styles.bateria}>Bateria: {Math.round(voo.bateria)}%</Text>
          <Pressable style={[styles.botao, styles.botaoSecundario]} onPress={() => setVoo(null)}>
            <Text style={[styles.textoBotao, styles.textoSecundario]}>Reiniciar</Text>
          </Pressable>
        </View>
      )}
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
  status: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    color: '#2B3440',
  },
  bateria: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    color: '#5A6573',
  },
  botao: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#0B5CAD',
    alignItems: 'center',
  },
  textoBotao: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Botão secundário: fundo branco com borda (menos chamativo que o principal)
  botaoSecundario: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0B5CAD',
  },
  textoSecundario: {
    color: '#0B5CAD',
  },
});
