import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseErica = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { db: { schema: 'erica' } }
);

async function check() {
  const { data } = await supabaseErica
    .from('boloes')
    .select('codigo, imagem_bilhete_url')
    .eq('data_sorteio', '2026-03-01');

  data?.forEach(b => console.log(`${b.codigo}:\n  ${b.imagem_bilhete_url}\n`));
}

check().catch(console.error);
