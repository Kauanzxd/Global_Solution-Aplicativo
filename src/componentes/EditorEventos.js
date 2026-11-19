import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TIPOS_EVENTO } from '../dados/tiposEventos';
import CartaoEvento from './CartaoEvento';
import LinhaDoTempo from './LinhaDoTempo';
import { TEMA } from './tema';

// Cada evento ganha um número único (id), para o React saber qual cartão é qual
let proximoId = 1;

// A lista de eventos da simulação: os cartões + o botão de adicionar.
// eventos: a lista atual | aoMudar(novaLista): devolve a lista nova para a tela
export default function EditorEventos({ eventos, distanciaIda, aoMudar }) {
  const [escolhendo, setEscolhendo] = useState(false); // aberta a grade de tipos?

  // Adiciona um evento do tipo escolhido, no meio da ida, com os valores iniciais dele
  const adicionar = (tipo) => {
    const kmInicial = Number((distanciaIda / 2).toFixed(1));
    aoMudar([...eventos, { id: proximoId++, tipo: tipo.tipo, km: kmInicial, ...tipo.padrao }]);
    setEscolhendo(false);
  };

  // Muda um campo de UM evento (o de id igual) e deixa os outros como estão
  const mudarEvento = (id, campo, valor) => {
    aoMudar(eventos.map((evento) => (evento.id === id ? { ...evento, [campo]: valor } : evento)));
  };

  const remover = (id) => aoMudar(eventos.filter((evento) => evento.id !== id));

  return (
    <View>
      <LinhaDoTempo eventos={eventos} distanciaIda={distanciaIda} />

      {eventos.length === 0 ? (
        <Text style={styles.vazio}>Nenhum evento: o drone faz a missão sem imprevistos.</Text>
      ) : null}

      {eventos.map((evento, indice) => (
        <CartaoEvento
          key={evento.id}
          evento={evento}
          numero={indice + 1}
          distanciaIda={distanciaIda}
          aoMudar={(campo, valor) => mudarEvento(evento.id, campo, valor)}
          aoRemover={() => remover(evento.id)}
        />
      ))}

      {escolhendo ? (
        // Grade com todos os tipos: toque em um para adicioná-lo
        <View style={styles.grade}>
          {TIPOS_EVENTO.map((tipo) => (
            <Pressable key={tipo.tipo} style={styles.tipo} onPress={() => adicionar(tipo)}>
              <View style={[styles.bolinha, { backgroundColor: tipo.cor }]} />
              <Text style={styles.textoTipo}>{tipo.rotulo}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancelar} onPress={() => setEscolhendo(false)}>
            <Text style={styles.textoCancelar}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.adicionar} onPress={() => setEscolhendo(true)}>
          <Text style={styles.textoAdicionar}>+ Adicionar evento</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  vazio: {
    fontSize: 14,
    color: TEMA.textoSuave,
  },
  adicionar: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed', // borda tracejada: "aqui cabe mais um"
    borderColor: TEMA.marca,
    alignItems: 'center',
  },
  textoAdicionar: {
    fontSize: 15,
    fontWeight: '700',
    color: TEMA.marca,
  },
  grade: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Cada tipo ocupa quase metade da largura: duas colunas
  tipo: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TEMA.borda,
    backgroundColor: TEMA.fundo,
  },
  bolinha: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  textoTipo: {
    fontSize: 14,
    fontWeight: '600',
    color: TEMA.texto,
  },
  cancelar: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoCancelar: {
    fontSize: 14,
    color: TEMA.textoSuave,
  },
});
