import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { TEMA } from './tema';

// Texto em minúsculas e sem acentos, para a busca não depender disso.
// Ex.: "São Luiz" → "sao luiz". É a mesma ideia do texto_para_busca do Python do grupo.
// normalize('NFD') separa a letra do acento ("ã" vira "a" + "~"); o replace apaga os acentos.
export function textoParaBusca(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const MAXIMO_RESULTADOS = 6;

// Busca de destino: digita parte do nome ou do bairro e escolhe o hospital na lista.
// "locais": onde procurar | "aoEscolher": recebe o local escolhido
export default function BuscaDestino({ locais, aoEscolher }) {
  const [texto, setTexto] = useState('');

  // Só procura com 2 letras ou mais (com 1 letra, quase tudo combina)
  const termo = textoParaBusca(texto.trim());
  const resultados =
    termo.length < 2
      ? []
      : locais
          .filter((local) => textoParaBusca(`${local.nome} ${local.bairro || ''}`).includes(termo))
          .slice(0, MAXIMO_RESULTADOS);

  const escolher = (local) => {
    aoEscolher(local);
    setTexto(''); // limpa a busca depois de escolher
  };

  return (
    <View>
      <TextInput
        style={styles.campo}
        value={texto}
        onChangeText={setTexto}
        placeholder="Buscar hospital por nome ou bairro"
        placeholderTextColor={TEMA.textoSuave}
        autoCorrect={false}
      />
      {resultados.map((local) => (
        <Pressable key={local.id} style={styles.resultado} onPress={() => escolher(local)}>
          <Text style={styles.nome} numberOfLines={1}>
            {local.nome}
          </Text>
          <Text style={styles.bairro} numberOfLines={1}>
            {local.bairro}
          </Text>
        </Pressable>
      ))}
      {termo.length >= 2 && resultados.length === 0 ? <Text style={styles.nada}>Nenhum hospital encontrado</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.fundo,
    fontSize: 15,
    color: TEMA.texto,
  },
  resultado: {
    marginTop: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: TEMA.fundo,
  },
  nome: {
    fontSize: 14,
    fontWeight: '600',
    color: TEMA.texto,
  },
  bairro: {
    marginTop: 2,
    fontSize: 12,
    color: TEMA.textoSuave,
  },
  nada: {
    marginTop: 8,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
});
