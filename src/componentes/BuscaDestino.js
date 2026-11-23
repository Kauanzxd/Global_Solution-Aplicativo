import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { buscarEnderecos } from '../servicos/enderecos';
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
// Com "comEndereco", também busca endereços (rua, avenida, número) no mapa de verdade: só
// no toque do botão, como pedem as regras do buscador do OpenStreetMap.
// "locais": onde procurar | "aoEscolher": recebe o local escolhido
// "placeholder" (opcional): o texto de ajuda do campo (por padrão, a busca de hospital)
export default function BuscaDestino({ locais, aoEscolher, comEndereco = false, placeholder }) {
  const [texto, setTexto] = useState('');
  const [enderecos, setEnderecos] = useState(null); // null = ainda não buscou
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState(null);
  const ajuda = placeholder || (comEndereco ? 'Buscar hospital ou endereço (rua, avenida)' : 'Buscar hospital por nome ou bairro');

  // Hospitais: só procura com 2 letras ou mais (com 1 letra, quase tudo combina)
  const termo = textoParaBusca(texto.trim());
  const resultados =
    termo.length < 2
      ? []
      : locais
          .filter((local) => textoParaBusca(`${local.nome} ${local.bairro || ''}`).includes(termo))
          .slice(0, MAXIMO_RESULTADOS);

  const mudarTexto = (novo) => {
    setTexto(novo);
    setEnderecos(null); // o texto mudou: a busca de endereço anterior não vale mais
    setErro(null);
  };

  const escolher = (local) => {
    aoEscolher(local);
    mudarTexto(''); // limpa a busca depois de escolher
  };

  const procurarEndereco = async () => {
    setBuscando(true);
    setErro(null);
    try {
      setEnderecos(await buscarEnderecos(texto));
    } catch {
      setErro('A busca de endereço não respondeu. Tente de novo em alguns segundos.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <View>
      <TextInput
        style={styles.campo}
        value={texto}
        onChangeText={mudarTexto}
        onSubmitEditing={comEndereco && texto.trim().length >= 3 ? procurarEndereco : undefined}
        returnKeyType={comEndereco ? 'search' : 'done'}
        placeholder={ajuda}
        placeholderTextColor={TEMA.textoSuave}
        autoCorrect={false}
        accessibilityLabel={ajuda}
      />
      {resultados.map((local) => (
        <Pressable key={local.id} style={styles.resultado} onPress={() => escolher(local)} accessibilityRole="button">
          <Text style={styles.nome} numberOfLines={1}>
            {local.nome}
          </Text>
          <Text style={styles.bairro} numberOfLines={1}>
            {local.bairro}
          </Text>
        </Pressable>
      ))}
      {termo.length >= 2 && resultados.length === 0 && !comEndereco ? <Text style={styles.nada}>Nenhum hospital encontrado</Text> : null}

      {/* Endereço: busca na rede só quando a pessoa toca no botão (ou no "buscar" do teclado) */}
      {comEndereco && texto.trim().length >= 3 && enderecos === null ? (
        <Pressable style={styles.botaoEndereco} onPress={procurarEndereco} disabled={buscando} accessibilityRole="button">
          {buscando ? <ActivityIndicator color={TEMA.marca} /> : <Text style={styles.textoBotaoEndereco}>Buscar endereço “{texto.trim()}”</Text>}
        </Pressable>
      ) : null}
      {enderecos && enderecos.length === 0 ? <Text style={styles.nada}>Nenhuma rua ou avenida encontrada no mapa</Text> : null}
      {enderecos
        ? enderecos.map((lugar) => (
            <Pressable key={lugar.id} style={styles.resultado} onPress={() => escolher(lugar)} accessibilityRole="button">
              <Text style={styles.nome} numberOfLines={1}>
                {lugar.nome}
              </Text>
              {lugar.detalhe ? (
                <Text style={styles.bairro} numberOfLines={1}>
                  {lugar.detalhe}
                </Text>
              ) : null}
            </Pressable>
          ))
        : null}
      {enderecos && enderecos.length > 0 ? <Text style={styles.creditos}>Endereços: © colaboradores do OpenStreetMap</Text> : null}
      {erro ? <Text style={styles.nada}>{erro}</Text> : null}
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
  botaoEndereco: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: TEMA.marca,
    alignItems: 'center',
  },
  textoBotaoEndereco: {
    fontSize: 14,
    fontWeight: '700',
    color: TEMA.marca,
  },
  creditos: {
    marginTop: 6,
    fontSize: 11,
    color: TEMA.textoSuave,
  },
});
