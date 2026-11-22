import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { CARGA_MAXIMA_KG, SUPRIMENTOS } from '../dados/comercio';
import { ENDERECOS } from '../dados/enderecos';
import { FILIAIS } from '../dados/regiao';
import { avaliarPedido } from '../regras/pedidos';
import AvaliacaoPedido from './AvaliacaoPedido';
import BotaoPrincipal from './BotaoPrincipal';
import BuscaDestino from './BuscaDestino';
import Opcoes from './Opcoes';
import Secao from './Secao';
import { TEMA } from './tema';

// Pedido de socorro (prioridade 2, Emergência), como o SADEC Saúde do site: a Defesa Civil
// escolhe o suprimento e a área atingida. O drone já sai da filial com o suprimento (sem coleta).
export default function PedidoSocorro({ aoPedir }) {
  const [suprimento, setSuprimento] = useState(null);
  const [area, setArea] = useState(null);

  const escolhido = SUPRIMENTOS.find((opcao) => opcao.id === suprimento);
  const avaliacao = area && escolhido ? avaliarPedido({ coleta: null, destino: area, pesoKg: escolhido.pesoKg }, FILIAIS, CARGA_MAXIMA_KG) : null;

  const pedir = () =>
    aoPedir({
      prioridade: 'emergencia',
      titulo: escolhido.nome,
      detalhe: `Área atingida: ${area.nome}`,
      coleta: null,
      destino: area,
      bateria: avaliacao.bateria,
    });

  return (
    <Secao titulo="Enviar socorro" dica="Para áreas isoladas por enchente ou deslizamento: só a Defesa Civil e a Central pedem">
      <Text style={styles.rotulo}>Suprimento</Text>
      <Opcoes
        opcoes={SUPRIMENTOS.map((opcao) => ({ valor: opcao.id, rotulo: `${opcao.nome} · ${String(opcao.pesoKg).replace('.', ',')} kg`, cor: '#E65100' }))}
        valor={suprimento}
        aoEscolher={setSuprimento}
      />

      <Text style={styles.rotulo}>Área atingida (bairro)</Text>
      {area ? <Text style={styles.escolhido}>{area.nome}</Text> : null}
      <BuscaDestino locais={ENDERECOS} aoEscolher={setArea} placeholder="Buscar bairro (ex.: Jardim Ângela)" />

      {avaliacao ? <AvaliacaoPedido avaliacao={avaliacao} /> : null}
      <BotaoPrincipal texto="Enviar suprimento" aoTocar={pedir} desligado={!avaliacao || !avaliacao.pode} />
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
  escolhido: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: TEMA.texto,
  },
});
