import type { FastifyReply } from 'fastify';

export interface ApiErrorBody {
  mensagem: string;
}

export interface ApiSuccessBody<T> {
  dados: T;
  mensagem?: string;
}

export const MENSAGENS = {
  ERRO_INTERNO: 'Erro interno do servidor',
  ROTA_NAO_ENCONTRADA: 'Rota não encontrada',
  NAO_AUTORIZADO: 'Não autorizado',
  PROIBIDO: 'Acesso negado',
  NAO_ENCONTRADO: 'Recurso não encontrado',
  REQUISICAO_INVALIDA: 'Requisição inválida',
  CREDENCIAIS_INVALIDAS: 'Número do cartão ou senha inválidos',
  LOGIN_SUCESSO: 'Login realizado com sucesso',
  LOGOUT_SUCESSO: 'Logout realizado com sucesso',
  PRIMEIRO_LOGIN: 'Defina uma nova senha para continuar',
  SENHA_ALTERADA_SUCESSO: 'Senha alterada com sucesso',
  SENHA_IGUAL_PADRAO: 'A nova senha não pode ser igual à senha padrão',
  SENHAS_NAO_COINCIDEM: 'As senhas não coincidem',
  EQUIPE_CRIADA_SUCESSO: 'Equipe criada com sucesso',
  MEMBRO_REMOVIDO_SUCESSO: 'Membro removido com sucesso',
  ULTIMO_ADMIN_NAO_PODE_SER_REMOVIDO:
    'Não é possível remover o único administrador da equipe',
  MEMBRO_ADICIONADO_SUCESSO: 'Membro adicionado com sucesso',
  USUARIO_JA_E_MEMBRO: 'Este usuário já faz parte da equipe',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
  ATIVIDADE_CRIADA_SUCESSO: 'Atividade criada com sucesso',
  ATIVIDADE_ATUALIZADA_SUCESSO: 'Atividade atualizada com sucesso',
  PROJETO_CRIADO_SUCESSO: 'Projeto criado com sucesso',
  PROJETO_ATUALIZADO_SUCESSO: 'Projeto atualizado com sucesso',
  TAREFA_CRIADA_SUCESSO: 'Tarefa criada com sucesso',
  TIMER_INICIADO_SUCESSO: 'Timer iniciado com sucesso',
  TIMER_JA_ATIVO: 'Já existe um timer ativo para esta atividade',
  TIMER_PAUSADO_SUCESSO: 'Timer pausado com sucesso',
  APONTAMENTO_ATUALIZADO_SUCESSO: 'Apontamento atualizado com sucesso',
  USUARIO_ROLE_ATUALIZADO_SUCESSO: 'Função do usuário atualizada com sucesso',
  USUARIO_SENHA_REPOSTA_SUCESSO: 'Senha reposta com sucesso',
  USUARIO_DESATIVADO_SUCESSO: 'Usuário removido da aplicação com sucesso',
  USUARIO_REATIVADO_SUCESSO: 'Usuário reativado com sucesso',
  ULTIMO_ADMIN_NAO_PODE_SER_ALTERADO:
    'Não é possível alterar o único administrador ativo',
  NAO_PODE_ALTERAR_PROPRIO_ACESSO:
    'Você não pode remover ou desativar sua própria conta',
  USUARIO_CRIADO_SUCESSO: 'Usuário criado com sucesso',
  USUARIO_JA_CADASTRADO: 'Este usuário já está cadastrado na aplicação',
  FUNCIONARIO_NAO_ENCONTRADO: 'Funcionário não encontrado na API externa',
  ERRO_API_EXTERNA: 'Não foi possível consultar a API externa',
} as const;

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  mensagem: string,
): FastifyReply {
  return reply.status(statusCode).send({ mensagem } satisfies ApiErrorBody);
}

export function sendSuccess<T>(
  reply: FastifyReply,
  dados: T,
  statusCode = 200,
  mensagem?: string,
): FastifyReply {
  const body: ApiSuccessBody<T> = mensagem ? { dados, mensagem } : { dados };
  return reply.status(statusCode).send(body);
}
