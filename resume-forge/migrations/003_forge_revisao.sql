-- Ajustes manuais da Revisão, numa camada à parte: `selecao` (a da IA) nunca é alterada.
-- NULL = a pessoa ainda não ajustou nada; o resultado final é a seleção da IA.
ALTER TABLE forge_geracoes ADD COLUMN revisao JSONB;
