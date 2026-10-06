# Postgres como armazenamento de Candidaturas, Respostas e Teto diário

Os dados persistidos (Candidaturas com Status por job id, Respostas e contagem do Teto diário) ficam em Postgres, e não em CSV/YAML nem SQLite. O motivo é o acesso mobile planejado: um banco de servidor pode ser lido e editado fora da máquina onde o bot roda, o que um arquivo local não permite.

## Considered Options

- **CSVs/YAMLs**: simples, mas sem consulta por job id nem contagem diária confiável.
- **SQLite**: sem servidor e na biblioteca padrão, mas preso à máquina local; migrar depois para o acesso mobile custaria mais.

## Consequences

O bot passa a depender de um Postgres acessível (conexão configurada via `.env`). `pandas` e o CSV deixam de ser necessários.
