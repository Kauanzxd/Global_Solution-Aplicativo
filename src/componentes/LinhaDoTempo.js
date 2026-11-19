import { StyleSheet, Text, View } from 'react-native';
import { tipoDoEvento } from '../dados/tiposEventos';
import { TEMA } from './tema';

// A missão inteira numa barra: metade esquerda = ida (filial → destino),
// metade direita = volta (destino → filial). Cada evento vira uma bolinha numerada
// no ponto da barra em que acontece.
export default function LinhaDoTempo({ eventos, distanciaIda }) {
  const total = distanciaIda * 2; // ida + volta

  return (
    <View style={styles.caixa}>
      <View style={styles.barra}>
        <View style={[styles.metade, { backgroundColor: TEMA.marcaClara }]} />
        <View style={[styles.metade, { backgroundColor: '#E0F2F1' }]} />

        {/* Bolinhas dos eventos: a posição é a fração do caminho (km ÷ total) */}
        {eventos.map((evento, indice) => {
          if (evento.km > total) return null; // fora da rota: não aparece
          const tipo = tipoDoEvento(evento.tipo);
          return (
            <View
              key={evento.id}
              style={[styles.bolinha, { left: `${(evento.km / total) * 100}%`, backgroundColor: tipo.cor }]}
            >
              <Text style={styles.numero}>{indice + 1}</Text>
            </View>
          );
        })}
      </View>

      {/* Legenda embaixo da barra: onde a missão começa, onde entrega e onde termina */}
      <View style={styles.legenda}>
        <Text style={styles.ponto}>Filial</Text>
        <Text style={styles.ponto}>Entrega · km {distanciaIda.toFixed(1).replace('.', ',')}</Text>
        <Text style={styles.ponto}>Filial</Text>
      </View>
      <View style={styles.legenda}>
        <Text style={[styles.etapa, { color: TEMA.marca }]}>Ida</Text>
        <Text style={[styles.etapa, { color: '#00897B' }]}>Volta</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    marginBottom: 6,
    paddingTop: 8,
  },
  barra: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'visible',
  },
  metade: {
    flex: 1, // cada metade ocupa a mesma largura
    height: 10,
  },
  bolinha: {
    position: 'absolute',
    top: -7,
    width: 24,
    height: 24,
    marginLeft: -12, // centraliza a bolinha no ponto exato
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  legenda: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ponto: {
    fontSize: 12,
    color: TEMA.textoSuave,
  },
  etapa: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
});
