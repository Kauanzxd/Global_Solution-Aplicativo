// Contas e perfis de DEMONSTRAÇÃO (as mesmas do site do SADEC).
// O app não tem servidor: as contas ficam aqui no código. Serve para mostrar a regra de
// QUEM pode pedir O QUÊ, não é segurança de verdade.

// O que cada perfil pode pedir (os tipos de missão, do mais ao menos importante).
// Regra do projeto: o cidadão não pode elevar a prioridade; órgão só sai de hospital;
// emergência é acionada pela Defesa Civil; o operador da Central pode tudo.
export const PERFIS = {
  cliente: { nome: 'Cidadão', pode: ['saude', 'comercial'] },
  hospital: { nome: 'Hospital (unidade de saúde)', pode: ['orgaos', 'saude'] },
  governo: { nome: 'Governo (Defesa Civil)', pode: ['emergencia'] },
  operador: { nome: 'Operador da Central', pode: ['orgaos', 'emergencia', 'saude', 'comercial'] },
};

export const CONTAS = [
  { email: 'cliente@sadec.demo', senha: 'sadec2026', perfil: 'cliente', nome: 'Cliente SADEC' },
  { email: 'hospital@sadec.demo', senha: 'sadec2026', perfil: 'hospital', nome: 'Hospital das Clínicas' },
  { email: 'governo@sadec.demo', senha: 'sadec2026', perfil: 'governo', nome: 'Defesa Civil de São Paulo' },
  { email: 'operador@sadec.demo', senha: 'sadec2026', perfil: 'operador', nome: 'Central de Operações' },
];

// Confere e-mail e senha. Devolve a conta encontrada, ou null se não bater.
// O e-mail não diferencia maiúsculas de minúsculas e ignora espaços nas pontas.
export function entrar(email, senha) {
  const procurado = email.trim().toLowerCase();
  return CONTAS.find((conta) => conta.email === procurado && conta.senha === senha) || null;
}
