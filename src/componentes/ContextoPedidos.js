import { createContext, useContext, useState } from 'react';

// Os pedidos feitos na aba Pedidos, compartilhados com a aba Simular (onde cada pedido
// pode virar um voo). Um "contexto" do React guarda dados que várias telas usam, sem
// precisar passar de tela em tela. Fica só na memória: fechou o app, os pedidos somem.
const ContextoPedidos = createContext(null);

// Número do próximo pedido (SD1001, SD1002...), como no Python e no site do projeto
let proximoNumero = 1001;

export function ProvedorPedidos({ children }) {
  const [pedidos, setPedidos] = useState([]);
  // O pedido que o usuário mandou "ver o voo" (a aba Simular carrega e depois limpa)
  const [pedidoParaVoar, setPedidoParaVoar] = useState(null);

  // Registra um pedido novo e devolve ele já com o código e o status inicial
  const registrarPedido = (dados) => {
    const pedido = { ...dados, codigo: `SD${proximoNumero++}`, status: 'Na fila', criadoEm: new Date() };
    setPedidos((atuais) => [pedido, ...atuais]);
    return pedido;
  };

  // Muda o status de um pedido (ex.: quando o voo dele termina na aba Simular)
  const atualizarStatus = (codigo, status) => {
    setPedidos((atuais) => atuais.map((pedido) => (pedido.codigo === codigo ? { ...pedido, status } : pedido)));
  };

  return (
    <ContextoPedidos.Provider value={{ pedidos, registrarPedido, atualizarStatus, pedidoParaVoar, setPedidoParaVoar }}>
      {children}
    </ContextoPedidos.Provider>
  );
}

// Atalho para as telas: const { pedidos, registrarPedido } = usePedidos();
export function usePedidos() {
  return useContext(ContextoPedidos);
}
