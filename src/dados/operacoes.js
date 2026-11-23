// Operações de emergência prontas: uma ocorrência grande, com vários drones de várias
// filiais saindo ao mesmo tempo. Situação FICTÍCIA, num lugar real de São Paulo.
import { grausParaKm } from '../regras/geo.js';
import { FILIAIS } from './regiao.js';

// Cores dos drones da operação no mapa (uma para cada um, para dar para acompanhar)
const CORES = ['#E65100', '#C62828', '#6A1B9A', '#00838F', '#2E7D32', '#0B5CAD'];

export const OPERACAO_ENCHENTE = {
  id: 'enchente-jardim-pantanal',
  titulo: 'Enchente no Jardim Pantanal (Zona Leste)',
  ocorrencia:
    'Chuva de 120 mm em 3 horas: o Rio Tietê transbordou e a água isolou o Jardim Pantanal, o Jardim Helena e a ' +
    'Vila Itaim, na periferia leste. As ruas estão alagadas a quase 1 m, e os barcos dos bombeiros não chegam a todos ' +
    'os pontos. A Defesa Civil abriu 6 abrigos e pediu água potável, kits de primeiros socorros e remédios.',
  // A Central organiza a resposta (é o que aparece no painel antes e durante o voo)
  plano: [
    '6 drones, 2 de cada filial (Itaquera, José Bonifácio e Cidade Líder): só elas alcançam a área com margem de bateria.',
    'Cada drone vai para um abrigo diferente (nenhum disputa o mesmo ponto de pouso) e volta para a própria filial.',
    'Um drone decola por vez, na ordem dos nomes (SADEC-11 primeiro, SADEC-16 por último), para o rádio não congestionar.',
    'Todos são prioridade 2 (emergência). Quando duas rotas se cruzam, eles conversam pelo rádio: desvia quem tem mais bateria.',
    'O SADEC-14 estava reservado para um pedido comercial que ainda não tinha decolado: o pedido comercial foi reagendado e o drone foi para a operação.',
  ],
  abrigos: [
    { id: 'abrigo-helena', nome: 'Escola Estadual (Jardim Helena)', rotulo: 'Abrigo Jd. Helena', em: [-23.484, -46.414] },
    { id: 'abrigo-itaim', nome: 'Ginásio do CEU (Vila Itaim)', rotulo: 'Abrigo Vila Itaim', em: [-23.492, -46.409] },
    { id: 'abrigo-romano', nome: 'Paróquia (Jardim Romano)', rotulo: 'Abrigo Jd. Romano', em: [-23.494, -46.434] },
    { id: 'abrigo-meninas', nome: 'UBS (Chácara Três Meninas)', rotulo: 'Abrigo Três Meninas', em: [-23.483, -46.439] },
    { id: 'abrigo-curuca', nome: 'Centro comunitário (Vila Curuçá)', rotulo: 'Abrigo Vila Curuçá', em: [-23.505, -46.418] },
    { id: 'abrigo-martinho', nome: 'Quadra da escola (Jardim São Martinho)', rotulo: 'Abrigo S. Martinho', em: [-23.498, -46.401] },
  ],
  // Cada drone: de qual filial sai, para qual abrigo, o que leva, a bateria e quantos
  // segundos espera na filial. Os nomes seguem a ordem de saída, e o primeiro (o drone
  // "principal" da tela) sai na hora.
  // Disposição escolhida simulando a tela inteira (relógio, voz do rádio com a duração real
  // das falas, câmera lenta e a escala do tráfego da operação) em milhares de combinações de
  // abrigos, esperas e velocidades: com esta, cada drone volta para a própria filial e há 2
  // cruzamentos de verdade, quase de frente, com desvio visível no mapa (SADEC-11 × 16, com
  // o 11 desviando uns 700 m, e SADEC-14 × 16, com o 14 desviando uns 450 m).
  drones: [
    { idDrone: 'SADEC-11', filial: 'F-03', abrigo: 'abrigo-martinho', suprimento: 'Água potável (5 L)', bateria: 90, esperaS: 0 },
    { idDrone: 'SADEC-12', filial: 'F-07', abrigo: 'abrigo-romano', suprimento: 'Kit de primeiros socorros', bateria: 90, esperaS: 50 },
    { idDrone: 'SADEC-13', filial: 'F-15', abrigo: 'abrigo-itaim', suprimento: 'Medicamentos básicos para abrigo', bateria: 90, esperaS: 100 },
    { idDrone: 'SADEC-14', filial: 'F-15', abrigo: 'abrigo-helena', suprimento: 'Água potável (5 L)', bateria: 90, esperaS: 300 },
    { idDrone: 'SADEC-15', filial: 'F-03', abrigo: 'abrigo-meninas', suprimento: 'Kit de primeiros socorros', bateria: 90, esperaS: 400 },
    { idDrone: 'SADEC-16', filial: 'F-07', abrigo: 'abrigo-curuca', suprimento: 'Medicamentos básicos para abrigo', bateria: 90, esperaS: 700 },
  ],
};

// Velocidade do drone, para converter a espera em segundos na mesma unidade do relógio da
// tela (o relógio anda em km de voo): 15 m/s = 0,015 km por segundo
const KM_POR_SEGUNDO = 0.015;

// A operação pronta para o simulador: os abrigos em km e cada drone com a filial, o
// destino, a cor e a espera (em km de voo, a unidade de regras/rede.js)
export function montarOperacao(operacao) {
  const abrigos = operacao.abrigos.map((abrigo) => ({ id: abrigo.id, nome: abrigo.nome, rotulo: abrigo.rotulo, tipo: 'abrigo', ...grausParaKm(...abrigo.em) }));
  const drones = operacao.drones.map((drone, indice) => ({
    idDrone: drone.idDrone,
    prioridade: 'emergencia',
    cor: CORES[indice % CORES.length],
    origem: FILIAIS.find((filial) => filial.id === drone.filial),
    destino: abrigos.find((abrigo) => abrigo.id === drone.abrigo),
    suprimento: drone.suprimento,
    bateria: drone.bateria,
    espera: drone.esperaS * KM_POR_SEGUNDO,
    adiantadoKm: 0,
  }));
  return { ...operacao, abrigos, drones };
}
