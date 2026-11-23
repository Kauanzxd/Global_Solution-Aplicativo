import { Pressable, StyleSheet, Text } from 'react-native';
import { TEMA } from './tema';

// O botão azul de ação principal (desligado = cinza azulado e não responde ao toque)
export default function BotaoPrincipal({ texto, aoTocar, desligado = false }) {
  return (
    <Pressable
      style={[styles.botao, desligado && styles.desligado]}
      onPress={aoTocar}
      disabled={desligado}
      accessibilityRole="button"
      aria-disabled={desligado}
    >
      <Text style={styles.texto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: TEMA.marca,
    alignItems: 'center',
  },
  desligado: {
    backgroundColor: '#9FB4CC',
  },
  texto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
