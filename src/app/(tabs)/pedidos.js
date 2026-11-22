import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Cabecalho from '../../componentes/Cabecalho';
import CartaoPedido from '../../componentes/CartaoPedido';
import { usePedidos } from '../../componentes/ContextoPedidos';
import Opcoes from '../../componentes/Opcoes';
import PedidoDelivery from '../../componentes/PedidoDelivery';
import PedidoOrgao from '../../componentes/PedidoOrgao';
import PedidoRemedio from '../../componentes/PedidoRemedio';
import PedidoSocorro from '../../componentes/PedidoSocorro';
import PedidosProntos from '../../componentes/PedidosProntos';
import Secao from '../../componentes/Secao';
import TelaLogin from '../../componentes/TelaLogin';
import { TEMA } from '../../componentes/tema';
import { PERFIS } from '../../dados/contas';
import { MISSOES } from '../../dados/missoes';

// Os formulários de pedido, um por tipo de missão (o perfil só vê os tipos que pode pedir)
const FORMULARIOS = {
  orgaos: { rotulo: 'Órgão', Componente: PedidoOrgao },
  emergencia: { rotulo: 'Socorro', Componente: PedidoSocorro },
  saude: { rotulo: 'Remédios', Componente: PedidoRemedio },
  comercial: { rotulo: 'Delivery', Componente: PedidoDelivery },
};

// Nível de prioridade de cada tipo (1 = órgãos ... 4 = comercial), para ordenar a fila
const NIVEL = Object.fromEntries(MISSOES.map((missao) => [missao.valor, missao.nivel]));

// Aba "Pedidos" (rota "/pedidos"): login → novo pedido (só os tipos do perfil) → lista.
// O operador da Central vê a fila inteira, na ordem em que seria atendida (P1 → P4).
export default function Pedidos() {
  const [conta, setConta] = useState(null); // null = ninguém entrou ainda
  const [tipo, setTipo] = useState(null); // o formulário aberto
  const [confirmacao, setConfirmacao] = useState(null); // o último pedido registrado
  const [versaoFormulario, setVersaoFormulario] = useState(0); // muda para limpar o formulário
  const { pedidos, registrarPedido, setPedidoParaVoar } = usePedidos();
  const roteador = useRouter();
  const margens = useSafeAreaInsets();

  const perfil = conta ? PERFIS[conta.perfil] : null;
  const ehOperador = conta && conta.perfil === 'operador';

  const entrar = (novaConta) => {
    setConta(novaConta);
    setTipo(PERFIS[novaConta.perfil].pode[0]); // já abre o primeiro tipo que o perfil pode pedir
    setConfirmacao(null);
  };

  const pedir = (dados) => {
    const pedido = registrarPedido({ ...dados, conta: conta.email, quem: conta.nome });
    setConfirmacao(pedido);
    setVersaoFormulario((versao) => versao + 1);
  };

  // Leva o pedido para a aba Simular, onde ele vira o cenário do voo
  const verVoo = (pedido) => {
    setPedidoParaVoar(pedido);
    roteador.navigate('/');
  };

  // A lista: o operador vê todos os pedidos, na ordem da fila; os outros, só os seus
  const lista = ehOperador
    ? [...pedidos].sort((a, b) => NIVEL[a.prioridade] - NIVEL[b.prioridade] || a.criadoEm - b.criadoEm)
    : pedidos.filter((pedido) => conta && pedido.conta === conta.email);

  const Formulario = tipo ? FORMULARIOS[tipo].Componente : null;

  return (
    <ScrollView style={styles.tela} contentContainerStyle={[styles.conteudo, { paddingTop: margens.top + 20 }]}>
      <Cabecalho titulo="Pedidos" subtitulo="Solicite e acompanhe entregas" />

      {conta === null ? (
        <TelaLogin aoEntrar={entrar} />
      ) : (
        <View>
          <Secao titulo="Sua conta" dica={conta.email}>
            <View style={styles.linhaConta}>
              <View style={styles.dadosConta}>
                <Text style={styles.nome}>{conta.nome}</Text>
                <Text style={styles.perfil}>{perfil.nome}</Text>
              </View>
              <Pressable style={styles.sair} onPress={() => setConta(null)} accessibilityRole="button">
                <Text style={styles.textoSair}>Sair</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitulo}>Novo pedido</Text>
            <Opcoes
              opcoes={perfil.pode.map((valor) => ({
                valor,
                rotulo: FORMULARIOS[valor].rotulo,
                cor: MISSOES.find((missao) => missao.valor === valor).cor,
              }))}
              valor={tipo}
              aoEscolher={(valor) => {
                setTipo(valor);
                setConfirmacao(null);
              }}
            />
          </Secao>

          {confirmacao ? (
            <Text style={styles.confirmacao} accessibilityRole="alert">
              Pedido {confirmacao.codigo} registrado na fila da Central. Veja abaixo e toque em "Ver o voo no simulador" para
              acompanhar o drone.
            </Text>
          ) : null}

          <PedidosProntos pode={perfil.pode} aoPedir={pedir} />

          {Formulario ? <Formulario key={`${tipo}-${versaoFormulario}`} aoPedir={pedir} /> : null}

          <Secao
            titulo={ehOperador ? `Fila da Central (${lista.length})` : `Meus pedidos (${lista.length})`}
            dica={ehOperador ? 'Todos os pedidos, na ordem de atendimento: P1 → P4, e por ordem de chegada' : 'Os pedidos feitos com esta conta'}
          >
            {lista.length === 0 ? <Text style={styles.vazio}>Nenhum pedido ainda.</Text> : null}
            {lista.map((pedido) => (
              <CartaoPedido key={pedido.codigo} pedido={pedido} aoVerVoo={verVoo} mostrarQuem={ehOperador} />
            ))}
          </Secao>
        </View>
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
  linhaConta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dadosConta: {
    flex: 1,
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
  sair: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: TEMA.marca,
  },
  textoSair: {
    fontSize: 14,
    fontWeight: '700',
    color: TEMA.marca,
  },
  subtitulo: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: TEMA.texto,
  },
  confirmacao: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: TEMA.sucessoClaro,
    color: TEMA.sucesso,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  vazio: {
    fontSize: 13,
    color: TEMA.textoSuave,
  },
});
