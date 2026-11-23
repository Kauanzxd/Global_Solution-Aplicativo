import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CARGA_MAXIMA_KG, LOJAS, TAXA_DRONE_CENTAVOS, emReais, resumoDaSacola } from '../dados/comercio';
import { FILIAIS } from '../dados/regiao';
import { avaliarPedido } from '../regras/pedidos';
import AvaliacaoPedido from './AvaliacaoPedido';
import BotaoPrincipal from './BotaoPrincipal';
import BuscaDestino from './BuscaDestino';
import Secao from './Secao';
import { TEMA } from './tema';

// Pedido comercial (prioridade 4), como o SADEC Delivery do site:
// escolhe o restaurante, monta a sacola, busca o endereço de entrega e pede. A loja é o ponto da coleta.
// "aoPedir(dados)": devolve o pedido montado para a aba registrar
export default function PedidoDelivery({ aoPedir }) {
  const [loja, setLoja] = useState(null);
  const [sacola, setSacola] = useState({}); // { idDoItem: quantidade }
  const [endereco, setEndereco] = useState(null);

  const mudarQuantidade = (item, mais) => {
    setSacola((atual) => ({ ...atual, [item.id]: Math.max(0, Math.min(10, (atual[item.id] || 0) + mais)) }));
  };

  // 1. Ainda sem loja: a lista de restaurantes
  if (!loja) {
    return (
      <Secao titulo="Restaurantes" dica="Toque num restaurante para ver o cardápio">
        {LOJAS.map((opcao) => (
          <Pressable key={opcao.id} style={styles.loja} onPress={() => setLoja(opcao)} accessibilityRole="button">
            <Image source={opcao.capa} style={styles.capa} accessibilityLabel={`Foto de ${opcao.nome}`} />
            <View style={styles.infoLoja}>
              <Text style={styles.nomeLoja}>{opcao.nome}</Text>
              <Text style={styles.detalheLoja}>
                {opcao.categoria} · {opcao.bairro}
              </Text>
              <Text style={styles.slogan}>{opcao.slogan}</Text>
            </View>
          </Pressable>
        ))}
      </Secao>
    );
  }

  // 2. Com loja: cardápio, sacola, endereço e o pedido
  const resumo = resumoDaSacola(sacola, loja);
  const avaliacao = endereco ? avaliarPedido({ coleta: loja, destino: endereco, pesoKg: resumo.pesoKg }, FILIAIS, CARGA_MAXIMA_KG) : null;
  const podePedir = resumo.quantidade > 0 && avaliacao && avaliacao.pode;

  const pedir = () =>
    aoPedir({
      prioridade: 'comercial',
      titulo: `${loja.nome}: ${resumo.linhas.map((linha) => `${linha.quantidade}× ${linha.nome}`).join(', ')}`,
      detalhe: `${emReais(resumo.centavos + TAXA_DRONE_CENTAVOS)} (com a taxa do drone) · ${String(resumo.pesoKg).replace('.', ',')} kg`,
      coleta: loja,
      destino: endereco,
      bateria: avaliacao.bateria,
    });

  return (
    <View>
      <Secao titulo={loja.nome} dica={`${loja.categoria} · ${loja.bairro} · o drone retira aqui`}>
        <Pressable onPress={() => { setLoja(null); setSacola({}); }} accessibilityRole="button">
          <Text style={styles.voltar}>← Trocar de restaurante</Text>
        </Pressable>
        {loja.itens.map((item) => (
          <View key={item.id} style={styles.item}>
            {item.img ? <Image source={item.img} style={styles.foto} accessibilityLabel={`Foto de ${item.nome}`} /> : <View style={[styles.foto, styles.semFoto]} />}
            <View style={styles.infoItem}>
              <Text style={styles.nomeItem}>{item.nome}</Text>
              <Text style={styles.descItem}>{item.desc}</Text>
              <Text style={styles.precoItem}>
                {emReais(item.centavos)} · {String(item.pesoKg).replace('.', ',')} kg
              </Text>
            </View>
            <View style={styles.quantidade}>
              <Pressable style={styles.botaoQtd} onPress={() => mudarQuantidade(item, -1)} accessibilityLabel={`Tirar um ${item.nome}`}>
                <Text style={styles.textoQtd}>−</Text>
              </Pressable>
              <Text style={styles.numeroQtd}>{sacola[item.id] || 0}</Text>
              <Pressable style={styles.botaoQtd} onPress={() => mudarQuantidade(item, 1)} accessibilityLabel={`Pôr mais um ${item.nome}`}>
                <Text style={styles.textoQtd}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Secao>

      <Secao titulo="Sacola e entrega" dica={`O drone leva até ${String(CARGA_MAXIMA_KG).replace('.', ',')} kg`}>
        {resumo.quantidade === 0 ? (
          <Text style={styles.vazio}>A sacola está vazia: escolha os itens acima.</Text>
        ) : (
          <Text style={styles.totais}>
            {resumo.quantidade} {resumo.quantidade === 1 ? 'item' : 'itens'} · {emReais(resumo.centavos)} + taxa do drone{' '}
            {emReais(TAXA_DRONE_CENTAVOS)} · {String(resumo.pesoKg).replace('.', ',')} kg
          </Text>
        )}
        <Text style={styles.rotulo}>Endereço de entrega</Text>
        {endereco ? <Text style={styles.escolhido}>{endereco.nome}</Text> : null}
        <BuscaDestino locais={[]} aoEscolher={setEndereco} comEndereco placeholder="Endereço de entrega (ex.: Avenida Ibirapuera, 2000)" />
        {avaliacao && resumo.quantidade > 0 ? <AvaliacaoPedido avaliacao={avaliacao} /> : null}
        <BotaoPrincipal texto="Pedir por drone" aoTocar={pedir} desligado={!podePedir} />
      </Secao>
    </View>
  );
}

const styles = StyleSheet.create({
  loja: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TEMA.borda,
    overflow: 'hidden',
    backgroundColor: TEMA.fundo,
  },
  capa: {
    width: '100%',
    height: 110,
  },
  infoLoja: {
    padding: 12,
  },
  nomeLoja: {
    fontSize: 16,
    fontWeight: '700',
    color: TEMA.texto,
  },
  detalheLoja: {
    marginTop: 2,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  slogan: {
    marginTop: 4,
    fontSize: 13,
    fontStyle: 'italic',
    color: TEMA.texto,
  },
  voltar: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
    color: TEMA.marca,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: TEMA.borda,
  },
  foto: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  semFoto: {
    backgroundColor: TEMA.borda,
  },
  infoItem: {
    flex: 1,
  },
  nomeItem: {
    fontSize: 14,
    fontWeight: '700',
    color: TEMA.texto,
  },
  descItem: {
    marginTop: 2,
    fontSize: 12,
    color: TEMA.textoSuave,
  },
  precoItem: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: TEMA.texto,
  },
  quantidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botaoQtd: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: TEMA.marca,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoQtd: {
    fontSize: 18,
    fontWeight: '700',
    color: TEMA.marca,
  },
  numeroQtd: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: TEMA.texto,
  },
  vazio: {
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  totais: {
    fontSize: 14,
    fontWeight: '600',
    color: TEMA.texto,
  },
  rotulo: {
    marginTop: 14,
    marginBottom: 6,
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
