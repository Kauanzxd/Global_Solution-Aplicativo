import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Layout raiz: envolve TODAS as telas do app.
// O Stack empilha telas (como cartas): abrir uma tela coloca ela no topo,
// voltar tira ela da pilha. A primeira "carta" é o grupo de abas.
export default function LayoutRaiz() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
