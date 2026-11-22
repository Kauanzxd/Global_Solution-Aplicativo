import { StyleSheet, Text, View } from 'react-native';

// O "rádio" logo abaixo do mapa durante o voo: as últimas mensagens dos drones (conversas,
// desvios, entregas), cada uma com a cor do drone. Fica colado no mapa para dar para olhar
// os dois ao mesmo tempo, sem rolar a tela (e sem cobrir os drones).
// "mensagens": [{ id, nome, cor, texto }], da mais antiga para a mais nova
// "quantas": quantas mensagens mostrar (as últimas)
export default function LogDoRadio({ mensagens, quantas = 3 }) {
  if (mensagens.length === 0) return null;
  const ultimas = mensagens.slice(-quantas);

  return (
    <View style={styles.caixa} pointerEvents="none" accessibilityLiveRegion="polite">
      <Text style={styles.titulo}>Rádio da rede</Text>
      {ultimas.map((mensagem) => (
        <Text key={mensagem.id} style={styles.linha} numberOfLines={2}>
          <Text style={[styles.nome, { color: mensagem.cor }]}>{mensagem.nome}: </Text>
          {mensagem.texto}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D5DCE5',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // claro: as cores dos drones aparecem bem
  },
  titulo: {
    marginBottom: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#6B7685',
  },
  linha: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: '#1F2A37',
  },
  nome: {
    fontWeight: '800',
  },
});
