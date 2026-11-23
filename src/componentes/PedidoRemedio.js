import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { CARGA_MAXIMA_KG, FARMACIAS, MEDICAMENTOS } from '../dados/comercio';
import { FILIAIS } from '../dados/regiao';
import { avaliarPedido } from '../regras/pedidos';
import AvaliacaoPedido from './AvaliacaoPedido';
import BotaoPrincipal from './BotaoPrincipal';
import BuscaDestino from './BuscaDestino';
import Opcoes from './Opcoes';
import Secao from './Secao';
import { TEMA } from './tema';

// Pedido de remédio (prioridade 3, Saúde), como o SADEC Saúde do site:
// o medicamento, a farmácia de onde o drone retira e o endereço da entrega.
export default function PedidoRemedio({ aoPedir }) {
  const [medicamento, setMedicamento] = useState(null);
  const [farmacia, setFarmacia] = useState(FARMACIAS[0].id);
  const [endereco, setEndereco] = useState(null);

  const daFarmacia = FARMACIAS.find((opcao) => opcao.id === farmacia);
  const remedio = MEDICAMENTOS.find((opcao) => opcao.id === medicamento);
  const avaliacao = endereco ? avaliarPedido({ coleta: daFarmacia, destino: endereco, pesoKg: 0.3 }, FILIAIS, CARGA_MAXIMA_KG) : null;

  const pedir = () =>
    aoPedir({
      prioridade: 'saude',
      titulo: remedio.nome,
      detalhe: `Retirada na ${daFarmacia.nome}`,
      coleta: daFarmacia,
      destino: endereco,
      bateria: avaliacao.bateria,
    });

  return (
    <Secao titulo="Pedir remédio" dica="Remédios de uso contínuo, retirados numa farmácia e entregues em casa">
      <Text style={styles.rotulo}>Medicamento</Text>
      <Opcoes
        opcoes={MEDICAMENTOS.map((opcao) => ({ valor: opcao.id, rotulo: opcao.nome, cor: TEMA.sucesso }))}
        valor={medicamento}
        aoEscolher={setMedicamento}
      />
      {remedio ? <Text style={styles.dica}>{remedio.desc}</Text> : null}

      <Text style={styles.rotulo}>Retirar na farmácia</Text>
      <Opcoes
        opcoes={FARMACIAS.map((opcao) => ({ valor: opcao.id, rotulo: opcao.nome, cor: TEMA.sucesso }))}
        valor={farmacia}
        aoEscolher={setFarmacia}
      />

      <Text style={styles.rotulo}>Endereço de entrega</Text>
      {endereco ? <Text style={styles.escolhido}>{endereco.nome}</Text> : null}
      <BuscaDestino locais={[]} aoEscolher={setEndereco} comEndereco placeholder="Endereço de entrega (ex.: Rua Domingos de Morais, 500)" />

      {avaliacao ? <AvaliacaoPedido avaliacao={avaliacao} /> : null}
      {!medicamento ? <Text style={styles.dica}>Escolha um medicamento para continuar.</Text> : null}
      <BotaoPrincipal texto="Pedir remédio" aoTocar={pedir} desligado={!medicamento || !avaliacao || !avaliacao.pode} />
    </Secao>
  );
}

const styles = StyleSheet.create({
  rotulo: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: TEMA.texto,
  },
  dica: {
    marginTop: 8,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  escolhido: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: TEMA.texto,
  },
});
