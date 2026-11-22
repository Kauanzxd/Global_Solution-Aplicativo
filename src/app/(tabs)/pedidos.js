import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Cabecalho from '../../componentes/Cabecalho';
import Secao from '../../componentes/Secao';
import TelaLogin from '../../componentes/TelaLogin';
import { TEMA } from '../../componentes/tema';
import { PERFIS } from '../../dados/contas';
import { MISSOES } from '../../dados/missoes';

// Aba "Pedidos" (rota "/pedidos"): primeiro o login; depois, o que o perfil pode pedir.
// A conta fica guardada só enquanto o app está aberto (sem servidor, é uma demonstração).
export default function Pedidos() {
  const [conta, setConta] = useState(null); // null = ninguém entrou ainda
  const margens = useSafeAreaInsets();

  const perfil = conta ? PERFIS[conta.perfil] : null;

  return (
    <ScrollView style={styles.tela} contentContainerStyle={[styles.conteudo, { paddingTop: margens.top + 20 }]}>
      <Cabecalho titulo="Pedidos" subtitulo="Solicite e acompanhe entregas" />

      {conta === null ? (
        <TelaLogin aoEntrar={setConta} />
      ) : (
        <Secao titulo="Sua conta" dica={conta.email}>
          <Text style={styles.nome}>{conta.nome}</Text>
          <Text style={styles.perfil}>{perfil.nome}</Text>

          <Text style={styles.subtitulo}>Você pode solicitar</Text>
          <View style={styles.linhaMissoes}>
            {MISSOES.map((missao) => {
              const pode = perfil.pode.includes(missao.valor);
              return (
                <View
                  key={missao.valor}
                  style={[styles.missao, pode ? { backgroundColor: missao.cor, borderColor: missao.cor } : styles.missaoBloqueada]}
                  accessibilityLabel={`${missao.rotulo}: ${pode ? 'permitido' : 'não permitido para este perfil'}`}
                >
                  <Text style={[styles.textoMissao, pode ? styles.textoPermitido : styles.textoBloqueado]}>
                    {pode ? '' : '🔒 '}
                    {missao.rotulo}
                  </Text>
                </View>
              );
            })}
          </View>

          <Pressable style={styles.sair} onPress={() => setConta(null)} accessibilityRole="button">
            <Text style={styles.textoSair}>Sair da conta</Text>
          </Pressable>
        </Secao>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: TEMA.fundo,
  },
  conteudo: {
    paddingHorizontal: 16,
    // paddingTop vem da safe area (margens.top), no próprio componente
    paddingBottom: 32,
  },
  nome: {
    fontSize: 18,
    fontWeight: '700',
    color: TEMA.texto,
  },
  perfil: {
    marginTop: 2,
    fontSize: 14,
    color: TEMA.textoSuave,
  },
  subtitulo: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: TEMA.texto,
  },
  linhaMissoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  missao: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  missaoBloqueada: {
    backgroundColor: TEMA.fundo,
    borderColor: TEMA.borda,
  },
  textoMissao: {
    fontSize: 13,
    fontWeight: '700',
  },
  textoPermitido: {
    color: '#FFFFFF',
  },
  textoBloqueado: {
    color: TEMA.textoSuave,
  },
  sair: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: TEMA.marca,
    alignItems: 'center',
  },
  textoSair: {
    fontSize: 15,
    fontWeight: '700',
    color: TEMA.marca,
  },
});
