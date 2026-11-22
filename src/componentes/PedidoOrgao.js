import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { CARGA_MAXIMA_KG, ORGAOS } from '../dados/comercio';
import { FILIAIS, LOCAIS } from '../dados/regiao';
import { avaliarPedido } from '../regras/pedidos';
import AvaliacaoPedido from './AvaliacaoPedido';
import BotaoPrincipal from './BotaoPrincipal';
import BuscaDestino from './BuscaDestino';
import Opcoes from './Opcoes';
import Secao from './Secao';
import { TEMA } from './tema';

const HOSPITAIS = LOCAIS.filter((local) => local.tipo === 'hospital');

// Pedido de transporte de órgão (prioridade 1), como o SADEC Saúde do site:
// o órgão, o hospital da coleta, o hospital da entrega e o código de autorização da Central
// de Transplantes (um código de uso único por transporte; na demonstração, qualquer código
// com pelo menos 6 caracteres).
export default function PedidoOrgao({ aoPedir }) {
  const [orgao, setOrgao] = useState(null);
  const [coleta, setColeta] = useState(null);
  const [entrega, setEntrega] = useState(null);
  const [codigo, setCodigo] = useState('');

  let problema = null;
  if (coleta && entrega && coleta.id === entrega.id) problema = 'A coleta e a entrega estão no mesmo hospital: escolha hospitais diferentes.';
  const avaliacao = coleta && entrega && !problema ? avaliarPedido({ coleta, destino: entrega, pesoKg: 2 }, FILIAIS, CARGA_MAXIMA_KG) : null;
  const codigoOk = codigo.trim().length >= 6;
  const podePedir = orgao && avaliacao && avaliacao.pode && codigoOk;

  const pedir = () =>
    aoPedir({
      prioridade: 'orgaos',
      titulo: `Transporte de ${orgao.toLowerCase()}`,
      detalhe: `Código da Central: ${codigo.trim().toUpperCase()}`,
      coleta,
      destino: entrega,
      bateria: avaliacao.bateria,
    });

  return (
    <Secao titulo="Transportar órgão" dica="Exclusivo de hospitais e da Central: prioridade máxima na fila">
      <Text style={styles.rotulo}>Órgão ou tecido</Text>
      <Opcoes opcoes={ORGAOS.map((nome) => ({ valor: nome, rotulo: nome, cor: '#C62828' }))} valor={orgao} aoEscolher={setOrgao} />

      <Text style={styles.rotulo}>Hospital da coleta (onde o órgão é retirado)</Text>
      {coleta ? <Text style={styles.escolhido}>{coleta.nome}</Text> : null}
      <BuscaDestino locais={HOSPITAIS} aoEscolher={setColeta} />

      <Text style={styles.rotulo}>Hospital da entrega</Text>
      {entrega ? <Text style={styles.escolhido}>{entrega.nome}</Text> : null}
      <BuscaDestino locais={HOSPITAIS} aoEscolher={setEntrega} />

      <Text style={styles.rotulo}>Código de autorização da Central</Text>
      <TextInput
        style={styles.campo}
        value={codigo}
        onChangeText={setCodigo}
        placeholder="Ex.: TX-2026-01"
        placeholderTextColor={TEMA.textoSuave}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="Código de autorização da Central"
      />
      <Text style={styles.dica}>A Central de Transplantes emite um código de uso único para cada transporte (mínimo de 6 caracteres).</Text>

      {problema ? <Text style={styles.alerta}>{problema}</Text> : null}
      {avaliacao ? <AvaliacaoPedido avaliacao={avaliacao} /> : null}
      <BotaoPrincipal texto="Solicitar transporte" aoTocar={pedir} desligado={!podePedir} />
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
    fontSize: 15,
    fontWeight: '700',
    color: TEMA.texto,
  },
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
  dica: {
    marginTop: 6,
    fontSize: 12,
    color: TEMA.textoSuave,
  },
  alerta: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: TEMA.perigoClaro,
    color: TEMA.perigo,
    fontSize: 13,
  },
});
