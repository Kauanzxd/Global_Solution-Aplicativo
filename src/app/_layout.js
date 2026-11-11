import { Stack } from 'expo-router';

// Layout raiz: envolve TODAS as telas do app.
// O Stack empilha telas (como cartas): abrir uma tela coloca ela no topo,
// voltar tira ela da pilha.
export default function LayoutRaiz() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
