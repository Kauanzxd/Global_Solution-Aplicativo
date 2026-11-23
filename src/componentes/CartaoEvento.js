import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  OPCOES_COMPORTAMENTO,
  OPCOES_DIRECAO,
  OPCOES_GPS,
  OPCOES_OBSTACULO,
  OPCOES_PRIORIDADE_OUTRO,
  OPCOES_RADIO,
  OPCOES_TEMPERATURA,
  tipoDoEvento,
} from '../dados/tiposEventos';
import Contador from './Contador';
import Opcoes from './Opcoes';
import { TEMA } from './tema';

// Em que parte da missão o km cai: decolagem (km 0), ida, volta ou fora da rota.
// Na missão de órgãos, a ida tem duas partes: até a coleta e da coleta até a entrega.
function etapaDoKm(km, distanciaIda, distanciaVolta, kmColeta) {
  if (km === 0) return { texto: 'Na decolagem', cor: TEMA.textoSuave };
  if (kmColeta && km <= kmColeta) return { texto: 'Até a coleta', cor: TEMA.marca };
  if (km <= distanciaIda) return { texto: kmColeta ? 'Com o órgão' : 'Ida', cor: TEMA.marca };
  if (km <= distanciaIda + distanciaVolta) return { texto: 'Volta', cor: '#00897B' };
  return { texto: 'Fora da rota', cor: TEMA.perigo };
}

// Uma linha "nome da opção + pílulas"
function Linha({ rotulo, children }) {
  return (
    <View style={styles.linhaOpcao}>
      <Text style={styles.rotuloOpcao}>{rotulo}</Text>
      {children}
    </View>
  );
}

// O cartão de UM evento: cabeçalho (nome, etapa, remover), km e as opções do tipo.
// "aoMudar(campo, valor)" muda um campo do evento; "aoRemover()" tira o evento da lista.
// "numero": a posição do evento na lista (1, 2, 3...), o mesmo número que aparece no mapa
// "distanciaVolta" (opcional): tamanho da volta; sem ele, a volta é igual à ida
// "kmColeta" (opcional): missão de órgãos, km em que o drone pousa para coletar o órgão
// "drones" (opcional): com vários drones, os nomes de rádio para escolher em qual deles o
//   evento acontece (os km e as distâncias passam a ser os da rota desse drone)
export default function CartaoEvento({ evento, numero, distanciaIda, distanciaVolta = distanciaIda, kmColeta, drones = [], aoMudar, aoRemover }) {
  const tipo = tipoDoEvento(evento.tipo);
  const etapa = etapaDoKm(evento.km, distanciaIda, distanciaVolta, kmColeta);
  const kmMaximo = Number((distanciaIda + distanciaVolta).toFixed(1)); // ida + volta

  return (
    <View style={[styles.cartao, { borderLeftColor: tipo.cor }]}>
      <View style={styles.cabecalho}>
        <View style={[styles.numero, { backgroundColor: tipo.cor }]}>
          <Text style={styles.textoNumero}>{numero}</Text>
        </View>
        <Text style={styles.nome}>{tipo.rotulo}</Text>
        <Text style={[styles.etapa, { color: etapa.cor, borderColor: etapa.cor }]}>{etapa.texto}</Text>
        <Pressable onPress={aoRemover} hitSlop={10} style={styles.remover} accessibilityRole="button" accessibilityLabel={`Remover o evento ${numero}`}>
          <Text style={styles.textoRemover}>×</Text>
        </Pressable>
      </View>
      <Text style={styles.descricao}>{tipo.descricao}</Text>

      {/* Com vários drones: em qual deles o evento acontece */}
      {drones.length > 1 ? (
        <Linha rotulo="Em qual drone">
          <Opcoes opcoes={drones.map((nome) => ({ valor: nome, rotulo: nome }))} valor={evento.drone} aoEscolher={(nome) => aoMudar('drone', nome)} />
        </Linha>
      ) : null}

      <Linha rotulo="Acontece no km">
        <Contador
          valor={evento.km}
          passo={0.1}
          passoGrande={1}
          minimo={0}
          maximo={kmMaximo}
          casas={1}
          sufixo=" km"
          aoMudar={(km) => aoMudar('km', km)}
        />
      </Linha>

      {/* Opções de cada tipo (só aparecem as que fazem sentido para ele) */}
      {evento.tipo === 'gps' && (
        <Linha rotulo="O sinal">
          <Opcoes opcoes={OPCOES_GPS} valor={evento.duracao} aoEscolher={(valor) => aoMudar('duracao', valor)} />
        </Linha>
      )}

      {evento.tipo === 'vento' && (
        <>
          <Linha rotulo="Vem do">
            <Opcoes opcoes={OPCOES_DIRECAO} valor={evento.de} aoEscolher={(valor) => aoMudar('de', valor)} />
          </Linha>
          <Linha rotulo={`Velocidade (${Math.round(evento.velocidade * 3.6)} km/h)`}>
            <Contador valor={evento.velocidade} passo={1} minimo={1} maximo={15} sufixo=" m/s" aoMudar={(valor) => aoMudar('velocidade', valor)} />
          </Linha>
        </>
      )}

      {evento.tipo === 'bateria' && (
        <Linha rotulo="A bateria cai">
          <Contador valor={evento.perda} passo={5} minimo={5} maximo={80} sufixo="%" aoMudar={(valor) => aoMudar('perda', valor)} />
        </Linha>
      )}

      {evento.tipo === 'temperatura' && (
        <Linha rotulo="Nível">
          <Opcoes opcoes={OPCOES_TEMPERATURA} valor={evento.grau} aoEscolher={(valor) => aoMudar('grau', valor)} />
        </Linha>
      )}

      {evento.tipo === 'obstaculo' && (
        <Linha rotulo="O que é">
          <Opcoes opcoes={OPCOES_OBSTACULO} valor={evento.objeto} aoEscolher={(valor) => aoMudar('objeto', valor)} />
        </Linha>
      )}

      {evento.tipo === 'drone' && (
        <>
          <Linha rotulo="Comunicação">
            <Opcoes opcoes={OPCOES_RADIO} valor={evento.comunicacao} aoEscolher={(valor) => aoMudar('comunicacao', valor)} />
          </Linha>
          {evento.comunicacao ? (
            <Linha rotulo="Missão dele">
              <Opcoes opcoes={OPCOES_PRIORIDADE_OUTRO} valor={evento.prioridade} aoEscolher={(valor) => aoMudar('prioridade', valor)} />
            </Linha>
          ) : (
            <Linha rotulo="O que ele está fazendo">
              <Opcoes opcoes={OPCOES_COMPORTAMENTO} valor={evento.comportamento} aoEscolher={(valor) => aoMudar('comportamento', valor)} />
            </Linha>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TEMA.borda,
    borderLeftWidth: 5, // a faixa colorida do lado esquerdo identifica o tipo
    backgroundColor: TEMA.cartao,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nome: {
    fontSize: 16,
    fontWeight: '700',
    color: TEMA.texto,
  },
  etapa: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  remover: {
    marginLeft: 'auto', // empurra o "×" para a direita
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEMA.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoRemover: {
    fontSize: 18,
    color: TEMA.textoSuave,
    marginTop: -2,
  },
  descricao: {
    marginTop: 4,
    fontSize: 13,
    color: TEMA.textoSuave,
  },
  linhaOpcao: {
    marginTop: 12,
  },
  rotuloOpcao: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: TEMA.textoSuave,
  },
});
