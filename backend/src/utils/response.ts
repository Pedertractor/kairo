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
  REFRESH_TOKEN_INVALIDO: 'Sessão expirada. Faça login novamente',
  PRIMEIRO_LOGIN: 'Defina uma nova senha para continuar',
  SENHA_ALTERADA_SUCESSO: 'Senha alterada com sucesso',
  SENHA_IGUAL_PADRAO: 'A nova senha não pode ser igual à senha padrão',
  SENHAS_NAO_COINCIDEM: 'As senhas não coincidem',
  EQUIPE_CRIADA_SUCESSO: 'Equipe criada com sucesso',
  EQUIPE_ATUALIZADA_SUCESSO: 'Equipe atualizada com sucesso',
  EQUIPE_INATIVADA_SUCESSO: 'Equipe inativada com sucesso',
  EQUIPE_REATIVADA_SUCESSO: 'Equipe reativada com sucesso',
  EQUIPE_INATIVA: 'Esta equipe está inativa',
  CENTROS_CUSTO_SINCRONIZADOS_SUCESSO:
    'Centros de custo sincronizados com sucesso',
  CENTROS_CUSTO_ATUALIZADOS_SUCESSO:
    'Centros de custo da equipe atualizados com sucesso',
  CENTRO_CUSTO_NAO_ENCONTRADO: 'Centro de custo não encontrado',
  MEMBRO_REMOVIDO_SUCESSO: 'Membro removido com sucesso',
  ULTIMO_ADMIN_NAO_PODE_SER_REMOVIDO:
    'Não é possível remover o único administrador da equipe',
  MEMBRO_ADICIONADO_SUCESSO: 'Membro adicionado com sucesso',
  ADMIN_PROMOVIDO_SUCESSO:
    'Membro promovido a administrador com sucesso',
  ADMIN_REBAIXADO_SUCESSO:
    'Administrador rebaixado a membro com sucesso',
  NAO_PODE_PROMOVER_SI_MESMO:
    'Você já é administrador desta equipe',
  MEMBRO_JA_E_ADMIN: 'Este membro já é administrador da equipe',
  MEMBRO_NAO_E_ADMIN: 'Este membro não é administrador da equipe',
  ULTIMO_ADMIN_NAO_PODE_SER_REBAIXADO:
    'Não é possível rebaixar o único administrador da equipe',
  USUARIO_JA_E_MEMBRO: 'Este usuário já faz parte da equipe',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
  ATIVIDADE_CRIADA_SUCESSO: 'Atividade criada com sucesso',
  ATIVIDADE_ATUALIZADA_SUCESSO: 'Atividade atualizada com sucesso',
  ATIVIDADE_REMOVIDA_SUCESSO: 'Atividade excluída com sucesso',
  TAG_CRIADA_SUCESSO: 'Etiqueta criada com sucesso',
  TAG_ATUALIZADA_SUCESSO: 'Etiqueta atualizada com sucesso',
  TAG_REMOVIDA_SUCESSO: 'Etiqueta excluída com sucesso',
  TAG_JA_EXISTE: 'Já existe uma etiqueta com este nome nesta equipe',
  TAG_NAO_ENCONTRADA: 'Etiqueta não encontrada',
  CLIENTE_NAO_ENCONTRADO: 'Cliente não encontrado',
  MAQUINA_NAO_ENCONTRADA: 'Máquina não encontrada',
  PROJETO_CRIADO_SUCESSO: 'Projeto criado com sucesso',
  PROJETO_ATUALIZADO_SUCESSO: 'Projeto atualizado com sucesso',
  HORAS_ESTIMADAS_SEM_PERMISSAO:
    'Apenas o criador do projeto ou um administrador podem alterar as horas estimadas',
  PROJETO_REMOVIDO_SUCESSO: 'Projeto excluído com sucesso',
  TAREFA_CRIADA_SUCESSO: 'Tarefa criada com sucesso',
  TAREFA_ATUALIZADA_SUCESSO: 'Tarefa atualizada com sucesso',
  TAREFA_REMOVIDA_SUCESSO: 'Tarefa excluída com sucesso',
  TAREFA_TIMER_STATUS_INVALIDO:
    'Não é possível iniciar o timer de uma tarefa concluída ou cancelada',
  ATIVIDADE_TIMER_STATUS_INVALIDO:
    'Não é possível iniciar o timer de uma atividade concluída ou cancelada',
  TIMER_INICIADO_SUCESSO: 'Timer iniciado com sucesso',
  TIMER_JA_ATIVO: 'Você já tem um timer ativo para este item',
  TIMER_PAUSADO_SUCESSO: 'Timer pausado com sucesso',
  USUARIO_AUSENTE:
    'Não é possível iniciar um apontamento enquanto você estiver ausente',
  AUSENCIA_ATUALIZADA_SUCESSO: 'Status de ausência atualizado com sucesso',
  AUSENCIA_JA_ATIVA: 'Este usuário já possui um período de ausência em aberto',
  AUSENCIA_NAO_ATIVA: 'Não há período de ausência em aberto para encerrar',
  AUSENCIA_SOBREPOSTA:
    'O período informado se sobrepõe a outra ausência deste usuário',
  AUSENCIA_INICIO_FUTURO:
    'A data de início da ausência não pode ser no futuro',
  AUSENCIA_FIM_ANTES_INICIO:
    'A data de fim deve ser igual ou posterior à data de início',
  APONTAMENTO_ATUALIZADO_SUCESSO: 'Apontamento atualizado com sucesso',
  USUARIO_ROLE_ATUALIZADO_SUCESSO: 'Função do usuário atualizada com sucesso',
  USUARIO_SENHA_REPOSTA_SUCESSO: 'Senha resetada com sucesso',
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
  DOCUMENTO_TIPO_INVALIDO:
    'Apenas ficheiros PDF ou imagens (JPEG, PNG, WebP, GIF) são permitidos',
  DOCUMENTO_TAMANHO_INVALIDO: 'O ficheiro não pode ultrapassar 10 MB',
  DOCUMENTO_ENVIADO_SUCESSO: 'Documento enviado com sucesso',
  DOCUMENTO_REMOVIDO_SUCESSO: 'Documento excluído com sucesso',
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
