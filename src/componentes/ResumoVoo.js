import { StyleSheet, Text, View } from 'react-native';
import Secao from './Secao';
import { TEMA } from './tema';

// Como cada final de voo aparece no resumo: um título curto e a cor (verde = deu certo,
// laranja = terminou em segurança fora da filial, vermelho = não deu)
const FINAIS = {
  'missao-concluida': { titulo: 'Missão concluída', cor: TEMA.sucesso },
  'pousou-hub': { titulo: 'Voltou à filial na decolagem', cor: '#E08A00' },
  'pouso-emergencia': { titulo: 'Pouso de emergência seguro', cor: '#E08A00' },
  'pouso-paraquedas': { titulo: 'Pouso de paraquedas', cor: '#E08A00' },
  'aguardando-resgate': { titulo: 'Aguardando resgate', cor: '#E08A00' },
  queda: { titulo: 'Queda dentro da filial', cor: TEMA.perigo },
  'decolagem-negada': { titulo: 'Decolagem negada', cor: TEMA.perigo },
};

// Segundos → "12:05" (minutos:segundos), curto para caber no cartão do celular
function duracao(segundos) {
  const total = Math.round(segundos);
  const minutos = Math.floor(total / 60);
  const resto = String(total % 60).padStart(2, '0');
  return `${minutos}:${resto}`;
}

// Número com vírgula e 1 casa (ex.: 6.25 → "6,3")
function km1(numero) {
  return numero.toFixed(1).replace('.', ',');
}

// Um número grande com a legenda embaixo (distância, tempo, bateria)
function Numero({ valor, legenda }) {
  return (
    <View style={styles.numero}>
      <Text style={styles.valor}>{valor}</Text>
      <Text style={styles.legenda}>{legenda}</Text>
    </View>
  );
}

// O resumo que aparece quando o voo termina.
// "voo": o voo no estado final | "bateriaInicial": a bateria na decolagem (%)
// "etapas": os momentos marcantes do voo [{ km, mensagem }] (cada mudança de fase)
// "titulo" (opcional): com vários drones, o título leva o nome do drone
export default function ResumoVoo({ voo, bateriaInicial, etapas, titulo = 'Resumo do voo' }) {
  const final = FINAIS[voo.situacao] || { titulo: 'Fim do voo', cor: TEMA.texto };
  const distancia = voo.hodometro || 0; // o hodômetro soma todos os trechos voados
  const gasto = Math.max(bateriaInicial - (voo.bateria ?? bateriaInicial), 0);

  return (
    <Secao titulo={titulo}>
      <Text style={[styles.resultado, { color: final.cor }]}>{final.titulo}</Text>
      <Text style={styles.mensagem}>{voo.mensagem}</Text>

      <View style={styles.linhaNumeros}>
        <Numero valor={`${km1(distancia)} km`} legenda="distância voada" />
        <Numero valor={duracao(voo.tempo || 0)} legenda="tempo de voo (min:s)" />
        <Numero valor={`${Math.round(voo.bateria ?? bateriaInicial)}%`} legenda={`bateria no fim (gastou ${Math.round(gasto)}%)`} />
      </View>

      {etapas.length > 0 ? (
        <View style={styles.etapas}>
          <Text style={styles.tituloEtapas}>Como foi o voo</Text>
          {etapas.map((etapa, indice) => (
            <View key={indice} style={styles.etapa}>
              <Text style={styles.kmEtapa}>km {km1(etapa.km)}</Text>
              <Text style={styles.textoEtapa}>{etapa.mensagem}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Secao>
  );
}

const styles = StyleSheet.create({
  resultado: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  mensagem: {
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
    color: TEMA.textoSuave,
  },
  linhaNumeros: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  numero: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: TEMA.marcaClara,
    alignItems: 'center',
  },
  valor: {
    fontSize: 16,
    fontWeight: '800',
    color: TEMA.marca,
  },
  legenda: {
    marginTop: 2,
    fontSize: 11,
    textAlign: 'center',
    color: TEMA.textoSuave,
  },
  etapas: {
    marginTop: 16,
  },
  tituloEtapas: {
    fontSize: 13,
    fontWeight: '700',
    color: TEMA.texto,
    marginBottom: 6,
  },
  etapa: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: TEMA.borda,
  },
  kmEtapa: {
    width: 56,
    fontSize: 12,
    fontWeight: '700',
    color: TEMA.marca,
  },
  textoEtapa: {
    flex: 1,
    fontSize: 13,
    color: TEMA.texto,
  },
});
