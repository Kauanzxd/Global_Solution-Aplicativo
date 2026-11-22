import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CONTAS, PERFIS, entrar } from '../dados/contas';
import Secao from './Secao';
import { TEMA } from './tema';

// Tela de login da aba Pedidos. "aoEntrar(conta)" é chamada quando o e-mail e a senha batem.
// Embaixo, as contas de demonstração: um toque preenche e entra (para os professores
// testarem cada perfil pelo QR code sem digitar).
export default function TelaLogin({ aoEntrar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const tentarEntrar = (emailDigitado, senhaDigitada) => {
    if (!emailDigitado.trim() || !senhaDigitada) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }
    const conta = entrar(emailDigitado, senhaDigitada);
    if (!conta) {
      setErro('E-mail ou senha incorretos. Confira os dados ou use uma conta de demonstração abaixo.');
      return;
    }
    setErro('');
    aoEntrar(conta);
  };

  return (
    <View>
      <Secao titulo="Entrar" dica="Cada perfil pode pedir tipos diferentes de entrega">
        <Text style={styles.rotulo}>E-mail</Text>
        <TextInput
          style={[styles.campo, erro ? styles.campoErro : null]}
          value={email}
          onChangeText={(texto) => {
            setEmail(texto);
            setErro('');
          }}
          placeholder="nome@sadec.demo"
          placeholderTextColor={TEMA.textoSuave}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="E-mail"
          returnKeyType="next"
        />
        <Text style={styles.rotulo}>Senha</Text>
        <TextInput
          style={[styles.campo, erro ? styles.campoErro : null]}
          value={senha}
          onChangeText={(texto) => {
            setSenha(texto);
            setErro('');
          }}
          placeholder="Sua senha"
          placeholderTextColor={TEMA.textoSuave}
          secureTextEntry
          accessibilityLabel="Senha"
          returnKeyType="go"
          onSubmitEditing={() => tentarEntrar(email, senha)}
        />
        {erro ? (
          <Text style={styles.erro} accessibilityRole="alert">
            {erro}
          </Text>
        ) : null}
        <Pressable style={styles.botao} onPress={() => tentarEntrar(email, senha)} accessibilityRole="button">
          <Text style={styles.textoBotao}>Entrar</Text>
        </Pressable>
      </Secao>

      <Secao titulo="Contas de demonstração" dica="Toque numa conta para entrar com ela (senha: sadec2026)">
        {CONTAS.map((conta) => (
          <Pressable
            key={conta.email}
            style={styles.conta}
            onPress={() => tentarEntrar(conta.email, conta.senha)}
            accessibilityRole="button"
            accessibilityLabel={`Entrar como ${PERFIS[conta.perfil].nome}`}
          >
            <Text style={styles.perfilConta}>{PERFIS[conta.perfil].nome}</Text>
            <Text style={styles.emailConta}>{conta.email}</Text>
          </Pressable>
        ))}
        <Text style={styles.aviso}>
          Demonstração acadêmica: as contas ficam no próprio app, sem servidor. Serve para mostrar quem pode pedir o
          quê, não é um login seguro.
        </Text>
      </Secao>
    </View>
  );
}

const styles = StyleSheet.create({
  rotulo: {
    marginTop: 4,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: TEMA.texto,
  },
  campo: {
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.fundo,
    fontSize: 15,
    color: TEMA.texto,
  },
  campoErro: {
    borderColor: TEMA.perigo,
  },
  erro: {
    marginBottom: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: TEMA.perigoClaro,
    color: TEMA.perigo,
    fontSize: 13,
  },
  botao: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: TEMA.marca,
    alignItems: 'center',
  },
  textoBotao: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  conta: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.fundo,
  },
  perfilConta: {
    fontSize: 14,
    fontWeight: '700',
    color: TEMA.texto,
  },
  emailConta: {
    marginTop: 2,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  aviso: {
    marginTop: 4,
    fontSize: 12,
    color: TEMA.textoSuave,
  },
});
