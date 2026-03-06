import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseErica = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { db: { schema: 'erica' } }
);

async function fixImagens() {
  // Busca todos os bolões do dia de hoje com a imagem errada da Quina
  const { data: boloes, error } = await supabaseErica
    .from('boloes')
    .select('id, codigo, imagem_bilhete_url')
    .eq('data_sorteio', '2026-03-01');

  if (error) { console.error(error.message); return; }
  console.log(`${boloes?.length} bolões encontrados:`);
  boloes?.forEach(b => console.log(` - ${b.codigo}: ${b.imagem_bilhete_url?.slice(0, 60)}`));
}

fixImagens().catch(console.error);
