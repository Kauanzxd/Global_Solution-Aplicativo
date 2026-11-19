import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../componentes/Cabecalho';
import Mapa from '../../componentes/Mapa';
import { LOCAIS } from '../../dados/regiao';
import { distanciaKm } from '../../regras/distancia';
import { posicaoNaRota } from '../../regras/voo';

const hub = LOCAIS.find((local) => local.id === 'hub');

// Por enquanto o destino é fixo. No passo 4, quem escolhe é o usuário.
const destino = LOCAIS.find((local) => local.id === 'aldeia-jaragua');

const KM_POR_SEGUNDO = 1; // velocidade acelerada, para a demonstração não demorar
const PASSO_MS = 50; // a cada 50 milissegundos o drone anda um pouquinho

// Aba "Simular" (rota "/"): aqui vai ficar o simulador de voo.
export default function Simular() {
  const [kmVoados, setKmVoados] = useState(0);
  const distanciaTotal = distanciaKm(hub, destino);

  // Quando a tela abre, liga um "relógio" que avança o drone a cada PASSO_MS
  useEffect(() => {
    const relogio = setInterval(() => {
      setKmVoados((km) => Math.min(km + KM_POR_SEGUNDO * (PASSO_MS / 1000), distanciaTotal));
    }, PASSO_MS);

    // Quando a tela fecha, desliga o relógio
    return () => clearInterval(relogio);
  }, [distanciaTotal]);

  const posicao = posicaoNaRota(hub, destino, kmVoados);

  return (
    <View style={styles.container}>
      <Cabecalho titulo="Simular voo" subtitulo="Monte uma situação e veja o drone em ação" />
      <View style={styles.areaMapa}>
        <Mapa destino={destino} drone={posicao} />
      </View>
      <Text style={styles.status}>
        {kmVoados.toFixed(1)} km de {distanciaTotal.toFixed(1)} km
      </Text>
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
