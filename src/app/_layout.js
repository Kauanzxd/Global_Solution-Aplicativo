import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

// Largura máxima do app: ele foi desenhado para celular. Numa tela larga (computador ou
// tablet), fica centralizado com essa largura, em vez de esticar o mapa pela tela toda.
const LARGURA_MAXIMA = 520;

// Layout raiz: envolve TODAS as telas do app.
// O Stack empilha telas (como cartas): abrir uma tela coloca ela no topo,
// voltar tira ela da pilha. A primeira "carta" é o grupo de abas.
export default function LayoutRaiz() {
  return (
    <View style={styles.fundo}>
      <View style={styles.coluna}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  // O que sobra dos lados numa tela larga
  fundo: { flex: 1, backgroundColor: '#DCE3EA' },
  // A coluna do app, no meio
  coluna: { flex: 1, width: '100%', maxWidth: LARGURA_MAXIMA, alignSelf: 'center', overflow: 'hidden' },
});
