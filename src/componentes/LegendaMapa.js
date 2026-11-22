import { StyleSheet, Text, View } from 'react-native';
import { TEMA } from './tema';

// O que cada símbolo do mapa significa. As cores são as mesmas do Mapa.js.
// "simbolo": como desenhar o exemplo (círculo com letra, área colorida ou linha)
const ITENS = [
  { simbolo: 'letra', cor: '#0B5CAD', letra: 'F', texto: 'Filial da SADEC (de onde os drones saem)' },
  { simbolo: 'letra', cor: '#D32F2F', letra: 'H', texto: 'Hospital' },
  { simbolo: 'zona', cor: '#E08A00', letra: 'ZP', texto: 'Zona de pouso seguro (nos parques)' },
  { simbolo: 'alfinete', cor: '#00897B', texto: 'Ponto de coleta de um pedido (loja ou farmácia)' },
  { simbolo: 'alfinete', cor: '#E0457B', texto: 'Destino escolhido (bairro ou ponto no mapa)' },
  { simbolo: 'linha', cor: '#0B5CAD', tracejado: true, texto: 'Rota do drone' },
  { simbolo: 'linha', cor: '#E08A00', tracejado: true, texto: 'Desvio de emergência' },
  { simbolo: 'ponto', cor: '#6A1B9A', texto: 'Evento planejado (número = ordem na lista)' },
  { simbolo: 'area', cor: '#B5D8A6', texto: 'Parque ou mata' },
  { simbolo: 'area', cor: '#6FA9D4', texto: 'Represa ou rio' },
  { simbolo: 'area', cor: '#EFE6D6', texto: 'Cidade de São Paulo' },
  { simbolo: 'area', cor: '#E4E1DA', texto: 'Cidades vizinhas' },
  { simbolo: 'linha', cor: '#F4A259', grossa: true, texto: 'Rodovia ou marginal (risco alto)' },
  { simbolo: 'linha', cor: '#555555', tracejado: true, texto: 'Trem (CPTM)' },
];

// O desenho de exemplo de um item da legenda
function Simbolo({ item }) {
  if (item.simbolo === 'letra' || item.simbolo === 'zona') {
    const zona = item.simbolo === 'zona';
    return (
      <View style={[styles.circulo, zona ? { borderColor: item.cor, backgroundColor: '#FFFFFF' } : { backgroundColor: item.cor }]}>
        <Text style={[styles.letra, { color: zona ? item.cor : '#FFFFFF' }]}>{item.letra}</Text>
      </View>
    );
  }
  // Alfinete: uma gota com a ponta para baixo (um quadrado girado com um canto reto)
  if (item.simbolo === 'alfinete') return <View style={[styles.alfinete, { backgroundColor: item.cor }]} />;
  if (item.simbolo === 'ponto') return <View style={[styles.ponto, { backgroundColor: item.cor }]} />;
  if (item.simbolo === 'area') return <View style={[styles.area, { backgroundColor: item.cor }]} />;
  // Linha: contínua, grossa ou tracejada (três pedacinhos)
  if (item.tracejado) {
    return (
      <View style={styles.linhaTracejada}>
        {[0, 1, 2].map((parte) => (
          <View key={parte} style={[styles.traco, { backgroundColor: item.cor }]} />
        ))}
      </View>
    );
  }
  return <View style={[styles.linha, { backgroundColor: item.cor, height: item.grossa ? 6 : 3 }]} />;
}

// A legenda do mapa: uma grade com o símbolo e o significado
export default function LegendaMapa() {
  return (
    <View style={styles.caixa}>
      {ITENS.map((item) => (
        <View key={item.texto} style={styles.item}>
          <View style={styles.espacoSimbolo}>
            <Simbolo item={item} />
          </View>
          <Text style={styles.texto}>{item.texto}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    marginTop: 10,
    padding: 12,
    borderRadius: TEMA.raio,
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.cartao,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  espacoSimbolo: {
    width: 28,
    alignItems: 'center',
  },
  texto: {
    flex: 1,
    fontSize: 13,
    color: TEMA.texto,
  },
  circulo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letra: {
    fontSize: 10,
    fontWeight: '800',
  },
  alfinete: {
    width: 14,
    height: 14,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 7,
    transform: [{ rotate: '45deg' }],
  },
  ponto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  area: {
    width: 24,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: TEMA.borda,
  },
  linha: {
    width: 26,
    borderRadius: 2,
  },
  linhaTracejada: {
    width: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  traco: {
    width: 7,
    height: 3,
    borderRadius: 1,
  },
});
