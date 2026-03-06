-- Executar no Supabase SQL Editor
-- Adiciona coluna para armazenar bolões disponíveis na sessão (zero RAM)
ALTER TABLE erica.erica_sessoes
ADD COLUMN IF NOT EXISTS boloes_disponiveis JSONB NOT NULL DEFAULT '[]';
