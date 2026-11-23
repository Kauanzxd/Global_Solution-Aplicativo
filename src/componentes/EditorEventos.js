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
// distanciaVolta e kmColeta são opcionais (missão de órgãos): veja a LinhaDoTempo
// "drones" (opcional): com vários drones no ar, [{ nome, distanciaIda, distanciaVolta }], o
//   principal primeiro. Cada evento acontece no drone escolhido ("drone": o nome de rádio),
//   no km da rota DELE; eventos em drones diferentes acontecem ao mesmo tempo.
export default function EditorEventos({ eventos, distanciaIda, distanciaVolta = distanciaIda, kmColeta, drones = [], aoMudar }) {
  const [escolhendo, setEscolhendo] = useState(false); // aberta a grade de tipos?
  const principal = drones[0] ? drones[0].nome : undefined;

  // As distâncias da rota do drone de um evento (sem drone escolhido: o principal)
  const rotaDe = (nome) => {
    const drone = drones.find((opcao) => opcao.nome === nome);
    return drone && nome !== principal
      ? { distanciaIda: drone.distanciaIda, distanciaVolta: drone.distanciaVolta, kmColeta: undefined }
      : { distanciaIda, distanciaVolta, kmColeta };
  };

  // Adiciona um evento do tipo escolhido, no meio da ida, com os valores iniciais dele
  const adicionar = (tipo) => {
    const kmInicial = Number((distanciaIda / 2).toFixed(1));
    aoMudar([...eventos, { id: proximoId++, tipo: tipo.tipo, km: kmInicial, drone: principal, ...tipo.padrao }]);
    setEscolhendo(false);
  };

  // Muda um campo de UM evento (o de id igual) e deixa os outros como estão. Trocou o drone:
  // o km vai para o meio da ida do novo drone (a rota dele tem outro tamanho)
  const mudarEvento = (id, campo, valor) => {
    aoMudar(
      eventos.map((evento) => {
        if (evento.id !== id) return evento;
        if (campo !== 'drone') return { ...evento, [campo]: valor };
        return { ...evento, drone: valor, km: Number((rotaDe(valor).distanciaIda / 2).toFixed(1)) };
      })
    );
  };

  const remover = (id) => aoMudar(eventos.filter((evento) => evento.id !== id));

  return (
    <View>
      {/* A linha do tempo é a da rota do principal: mostra só os eventos dele */}
      <LinhaDoTempo
        eventos={eventos.filter((evento) => !evento.drone || evento.drone === principal)}
        distanciaIda={distanciaIda}
        distanciaVolta={distanciaVolta}
        kmColeta={kmColeta}
      />

      {eventos.length === 0 ? (
        <Text style={styles.vazio}>Nenhum evento: o drone faz a missão sem imprevistos.</Text>
      ) : null}

      {eventos.map((evento, indice) => (
        <CartaoEvento
          key={evento.id}
          evento={evento}
          numero={indice + 1}
          {...rotaDe(evento.drone)}
          drones={drones.map((drone) => drone.nome)}
          aoMudar={(campo, valor) => mudarEvento(evento.id, campo, valor)}
          aoRemover={() => remover(evento.id)}
        />
      ))}

      {escolhendo ? (
        // Grade com todos os tipos: toque em um para adicioná-lo
        <View style={styles.grade}>
          {TIPOS_EVENTO.map((tipo) => (
            <Pressable key={tipo.tipo} style={styles.tipo} onPress={() => adicionar(tipo)} accessibilityRole="button">
              <View style={[styles.bolinha, { backgroundColor: tipo.cor }]} />
              <Text style={styles.textoTipo}>{tipo.rotulo}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancelar} onPress={() => setEscolhendo(false)} accessibilityRole="button">
            <Text style={styles.textoCancelar}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.adicionar}
          onPress={() => setEscolhendo(true)}
          accessibilityRole="button"
          aria-expanded={false}
        >
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
