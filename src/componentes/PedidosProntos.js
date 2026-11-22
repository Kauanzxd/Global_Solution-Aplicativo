import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CARGA_MAXIMA_KG, FARMACIAS, LOJAS, TAXA_DRONE_CENTAVOS, emReais } from '../dados/comercio';
import { ENDERECOS } from '../dados/enderecos';
import { MISSOES } from '../dados/missoes';
import { OPERACAO_ENCHENTE, montarOperacao } from '../dados/operacoes';
import { FILIAIS, LOCAIS } from '../dados/regiao';
import { avaliarPedido } from '../regras/pedidos';
import Secao from './Secao';
import { TEMA } from './tema';

const endereco = (nome) => ENDERECOS.find((opcao) => opcao.nome === nome);
const hospital = (id) => LOCAIS.find((local) => local.id === id);

// Um pedido comum pronto: a bateria sugerida vem da avaliação (regras/pedidos.js)
function montar(dados, pesoKg) {
  const avaliacao = avaliarPedido({ coleta: dados.coleta, destino: dados.destino, pesoKg }, FILIAIS, CARGA_MAXIMA_KG);
  return { ...dados, bateria: avaliacao.bateria };
}

// Os pedidos prontos, um (ou mais) por tipo de missão, para a demonstração ser rápida
const PRONTOS = [
  {
    id: 'pronto-enchente',
    prioridade: 'emergencia',
    titulo: 'Operação: enchente no Jardim Pantanal',
    resumo: 'Desastre na periferia leste: 6 drones de 3 filiais levam água, kits e remédios a 6 abrigos, conversando pelo rádio.',
    criar: () => {
      const operacao = montarOperacao(OPERACAO_ENCHENTE);
      const principal = operacao.drones[0];
      return {
        prioridade: 'emergencia',
        titulo: operacao.titulo,
        detalhe: `${operacao.drones.length} drones de 3 filiais · ${operacao.abrigos.length} abrigos`,
        coleta: null,
        destino: principal.destino,
        bateria: principal.bateria,
        operacao,
      };
    },
  },
  {
    id: 'pronto-orgao',
    prioridade: 'orgaos',
    titulo: 'Coração: São Camilo Pompeia → Hospital das Clínicas',
    resumo: 'Transporte de órgão com o código da Central (TX-2026-01): prioridade máxima na fila.',
    criar: () =>
      montar(
        {
          prioridade: 'orgaos',
          titulo: 'Transporte de coração',
          detalhe: 'Código da Central: TX-2026-01',
          coleta: hospital('h146'),
          destino: hospital('h065'),
        },
        2
      ),
  },
  {
    id: 'pronto-remedio',
    prioridade: 'saude',
    titulo: 'Insulina refrigerada → Moema',
    resumo: 'Retirada na Drogaria Vila Mariana, na caixa térmica (2 a 8 °C).',
    criar: () =>
      montar(
        {
          prioridade: 'saude',
          titulo: 'Insulina NPH (refrigerada)',
          detalhe: 'Retirada na Drogaria Vila Mariana',
          coleta: FARMACIAS.find((farmacia) => farmacia.id === 'farmacia-vila-mariana'),
          destino: endereco('Moema'),
        },
        0.3
      ),
  },
  {
    id: 'pronto-delivery',
    prioridade: 'comercial',
    titulo: 'Burger House → Itaim Bibi',
    resumo: '1 Double Cheese e 2 batatas fritas: o pedido que ajuda a pagar a operação.',
    criar: () =>
      montar(
        {
          prioridade: 'comercial',
          titulo: 'Burger House: 1× Double Cheese, 2× Batata frita',
          detalhe: `${emReais(3990 + 2 * 1690 + TAXA_DRONE_CENTAVOS)} (com a taxa do drone) · 0,82 kg`,
          coleta: LOJAS.find((loja) => loja.id === 'loja-burger'),
          destino: endereco('Itaim Bibi'),
        },
        0.82
      ),
  },
];

// Pedidos prontos para a demonstração: só os tipos que o perfil pode pedir.
// "pode": os tipos do perfil | "aoPedir(dados)": registra o pedido
export default function PedidosProntos({ pode, aoPedir }) {
  const disponiveis = PRONTOS.filter((pronto) => pode.includes(pronto.prioridade));
  if (disponiveis.length === 0) return null;

  return (
    <Secao titulo="Pedidos prontos" dica="Um toque registra o pedido; depois, é só ver o voo no simulador">
      {disponiveis.map((pronto) => {
        const missao = MISSOES.find((opcao) => opcao.valor === pronto.prioridade);
        return (
          <Pressable
            key={pronto.id}
            style={[styles.cartao, { borderLeftColor: missao.cor }]}
            onPress={() => aoPedir(pronto.criar())}
            accessibilityRole="button"
            accessibilityLabel={`Pedir agora: ${pronto.titulo}`}
          >
            <View style={styles.topo}>
              <Text style={styles.titulo}>{pronto.titulo}</Text>
              <Text style={[styles.selo, { backgroundColor: missao.cor }]}>P{missao.nivel}</Text>
            </View>
            <Text style={styles.resumo}>{pronto.resumo}</Text>
            <Text style={[styles.acao, { color: missao.cor }]}>Pedir agora →</Text>
          </Pressable>
        );
      })}
    </Secao>
  );
}

const styles = StyleSheet.create({
  cartao: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.fundo,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  titulo: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: TEMA.texto,
  },
  selo: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resumo: {
    marginTop: 4,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  acao: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
  },
});
