-- Executar no Supabase SQL Editor
-- Schema: erica (já existe)

CREATE TABLE IF NOT EXISTS erica.erica_sessoes (
  session_id          TEXT PRIMARY KEY,
  fase                TEXT NOT NULL DEFAULT 'abertura',
  cota_selecionada    JSONB,
  boloes_confirmados  JSONB NOT NULL DEFAULT '[]',
  boloes_oferecidos   JSONB NOT NULL DEFAULT '[]',
  dados_cliente       JSONB,
  pedidos_ids         JSONB NOT NULL DEFAULT '[]',
  ultima_atividade    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_erica_sessoes_session_id ON erica.erica_sessoes(session_id);
CREATE INDEX IF NOT EXISTS idx_erica_sessoes_atividade ON erica.erica_sessoes(ultima_atividade);
