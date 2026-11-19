import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../componentes/Cabecalho';
import Mapa from '../../componentes/Mapa';
import { LOCAIS, ZONAS_POUSO } from '../../dados/regiao';
import { avancarVoo, posicaoNaRota } from '../../regras/voo';

const hub = LOCAIS.find((local) => local.id === 'hub');

// Por enquanto o cenário é fixo. No passo 4, quem monta é o usuário.
const destino = LOCAIS.find((local) => local.id === 'aldeia-jaragua');
const EVENTOS = [{ tipo: 'pane', km: 1.5 }];

const KM_POR_SEGUNDO = 1; // velocidade acelerada, para a demonstração não demorar
const PASSO_MS = 50; // a cada 50 milissegundos o drone anda um pouquinho
const PASSO_KM = KM_POR_SEGUNDO * (PASSO_MS / 1000);

// Aba "Simular" (rota "/"): aqui vai ficar o simulador de voo.
export default function Simular() {
  const [voo, setVoo] = useState({ origem: hub, destino, km: 0, situacao: 'voando', mensagem: 'Voando...' });
  const emVoo = voo.situacao === 'voando' || voo.situacao === 'desviando';

  // Enquanto o drone está no ar, um "relógio" avança o voo a cada PASSO_MS
  useEffect(() => {
    if (!emVoo) return; // pousou: não liga o relógio

    const relogio = setInterval(() => {
      setVoo((atual) => avancarVoo(atual, PASSO_KM, EVENTOS, ZONAS_POUSO));
    }, PASSO_MS);

    // Quando o drone pousa (ou a tela fecha), desliga o relógio
    return () => clearInterval(relogio);
  }, [emVoo]);

  const posicao = posicaoNaRota(voo.origem, voo.destino, voo.km);
  const desvio = voo.situacao === 'desviando' || voo.situacao === 'pouso-emergencia' ? voo : null;

  return (
    <View style={styles.container}>
      <Cabecalho titulo="Simular voo" subtitulo="Monte uma situação e veja o drone em ação" />
      <View style={styles.areaMapa}>
        <Mapa destino={destino} drone={posicao} desvio={desvio} />
      </View>
      <Text style={styles.status}>{voo.mensagem}</Text>
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
});
