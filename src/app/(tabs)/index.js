import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../componentes/Cabecalho';
import Mapa from '../../componentes/Mapa';
import { AREAS, LOCAIS, VIAS, ZONAS_POUSO } from '../../dados/regiao';
import { altitudeDoVoo, avancarVoo, estaNoAr, incertezaDoVoo, posicaoNaRota } from '../../regras/voo';

const hub = LOCAIS.find((local) => local.id === 'hub');
const REGIAO = { zonas: ZONAS_POUSO, areas: AREAS, vias: VIAS };

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
const destino = LOCAIS.find((local) => local.id === 'aldeia-jaragua');
const EVENTOS = [{ tipo: 'bateria', km: 1, perda: 40 }];
const BATERIA_INICIAL = 80; // % — no passo 4, quem escolhe é o usuário

const KM_POR_SEGUNDO = 1; // velocidade acelerada, para a demonstração não demorar
const PASSO_MS = 50; // a cada 50 milissegundos o drone anda um pouquinho
const PASSO_KM = KM_POR_SEGUNDO * (PASSO_MS / 1000);

// Aba "Simular" (rota "/"): aqui vai ficar o simulador de voo.
export default function Simular() {
  const [voo, setVoo] = useState({
    origem: hub,
    destino,
    km: 0,
    altitude: 0,
    bateria: BATERIA_INICIAL,
    situacao: 'decolando',
    mensagem: 'Decolando...',
  });
  const emVoo = estaNoAr(voo);

  // Enquanto o drone está no ar, um "relógio" avança o voo a cada PASSO_MS
  useEffect(() => {
    if (!emVoo) return; // pousou: não liga o relógio

    const relogio = setInterval(() => {
      setVoo((atual) => avancarVoo(atual, PASSO_KM, EVENTOS, REGIAO));
    }, PASSO_MS);

    // Quando o drone pousa (ou a tela fecha), desliga o relógio
    return () => clearInterval(relogio);
  }, [emVoo]);

  const posicao = posicaoNaRota(voo.origem, voo.destino, voo.km);
  const altitude = altitudeDoVoo(voo);
  // Depois de uma pane ou falha grave em voo, o trecho atual é o desvio
  const desvio = voo.emergencia ? voo : null;
  // Paraquedas aberto. Sobre o hub não há planeio: sem áreas de alcance, os círculos não aparecem.
  const paraquedas = voo.paraquedasAberto ? { alcance: voo.alcance, confortavel: voo.confortavel } : null;

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
          vento={voo.vento}
          incerteza={incertezaDoVoo(voo)}
        />
      </View>
      <Text style={styles.status}>{voo.mensagem}</Text>
      <Text style={styles.bateria}>Bateria: {Math.round(voo.bateria)}%</Text>
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
});
