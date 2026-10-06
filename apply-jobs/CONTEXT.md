# Apply Jobs

Bot que automatiza candidaturas Easy Apply no LinkedIn para uso real do dono da conta, mantendo um registro auditável de cada vaga e de cada resposta dada.

## Language

**Vaga**:
Uma publicação de emprego no LinkedIn, identificada de forma única pelo seu job id.
_Avoid_: Job, oportunidade, anúncio

**Job id**:
O identificador numérico que o LinkedIn atribui a uma Vaga; é a única chave de identidade, nunca título + empresa.
_Avoid_: ID da vaga, chave

**Candidatura**:
A tentativa de se candidatar a uma Vaga, que só é considerada **Enviada** quando o LinkedIn confirma o envio.
_Avoid_: Aplicação, application

**Status**:
O estado de uma Candidatura: vista, filtrada, formulário aberto, enviada, falhou, precisa de revisão manual.
_Avoid_: Situação, etapa

**Enviada**:
Status de uma Candidatura confirmada visivelmente pelo LinkedIn; clicar em Easy Apply não basta.
_Avoid_: Aplicada, applied

**Revisão manual**:
Status de uma Candidatura que o bot não conseguiu concluir sozinho e que fica para o dono decidir: uma pergunta sem Resposta conhecida, ou um Currículo adaptado que o dono ainda não revisou.
_Avoid_: Pendente, erro

**Currículo**:
O PDF anexado a uma Candidatura, obtido pela porta Curriculos antes de abrir o formulário. Pode ser sempre o mesmo ou adaptado à Vaga; sem Currículo pronto, o formulário nem é aberto.
_Avoid_: CV, resume

## Respostas

**Pergunta**:
Um campo ou questão exigido pelo formulário de uma Candidatura, reconhecida pelo texto normalizado (minúsculas, sem acentos nem pontuação) mais o tipo do campo.
_Avoid_: Campo, input

**Resposta**:
O texto dado pelo dono a uma Pergunta, sempre registrado e reutilizado quando a mesma Pergunta voltar a aparecer. O bot nunca inventa uma Resposta.
_Avoid_: Valor, preenchimento

**Pergunta pendente**:
Uma Pergunta ainda sem Resposta; a Candidatura vai para Revisão manual até o dono responder.
_Avoid_: Pergunta nova, campo vazio

## Limites

**Teto diário**:
O número máximo de Candidaturas permitidas por dia, persistido entre execuções.
_Avoid_: Limite por execução, quota

**Modo de envio**:
Como o bot conclui uma Candidatura: `confirmar` (mostra o formulário preenchido e espera o dono) ou `auto` (envia sozinho); `confirmar` é o padrão.
_Avoid_: Modo manual, modo automático

**Checkpoint**:
Qualquer verificação de segurança do LinkedIn (captcha, desafio); o bot para e nunca tenta contorná-lo.
_Avoid_: Captcha, bloqueio
