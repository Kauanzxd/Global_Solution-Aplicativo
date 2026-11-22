// Endereços de entrega dos pedidos: um ponto por bairro de São Paulo, sempre num lugar onde
// o drone pode pousar (veja enderecosDeEntrega em regras/pedidos.js).
import { riscoNoPonto } from '../regras/risco.js';
import { enderecosDeEntrega } from '../regras/pedidos.js';
import { AREAS, BAIRROS, VIAS } from './regiao.js';

export const ENDERECOS = enderecosDeEntrega(BAIRROS, AREAS, VIAS, riscoNoPonto);
