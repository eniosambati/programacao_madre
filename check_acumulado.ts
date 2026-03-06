import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const supabaseErica = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { db: { schema: 'erica' } });

async function check() {
  // Verifica tabela resultados_loterias
  const { data: resultados, error: e1 } = await supabase
    .from('resultados_loterias')
    .select('*')
    .order('valor_acumulado', { ascending: false });

  console.log('=== resultados_loterias ===');
  if (e1) console.error(e1.message);
  else if (!resultados?.length) console.log('(tabela vazia)');
  else resultados.forEach(r => console.log(JSON.stringify(r)));

  // Verifica colunas da tabela boloes
  const { data: boloes } = await supabaseErica
    .from('boloes')
    .select('*')
    .eq('data_sorteio', '2026-03-01')
    .limit(1);

  console.log('\n=== Colunas do bolão ===');
  if (boloes?.[0]) console.log(Object.keys(boloes[0]).join(', '));
}

check().catch(console.error);
