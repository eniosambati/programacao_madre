import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(URL, KEY);
const supabaseErica = createClient(URL, KEY, { db: { schema: 'erica' } });

const SESSION_ID = '5512991434039@s.whatsapp.net';

async function reset() {
  console.log(`Limpando sessão de ${SESSION_ID}...`);

  const { error: e1 } = await supabase
    .from('n8n_chat_histories')
    .delete()
    .eq('session_id', SESSION_ID);

  if (e1) console.error('Erro n8n_chat_histories:', e1.message);
  else console.log('✅ n8n_chat_histories limpo');

  const { error: e2 } = await supabaseErica
    .from('erica_sessoes')
    .delete()
    .eq('session_id', SESSION_ID);

  if (e2) console.error('Erro erica_sessoes:', e2.message);
  else console.log('✅ erica_sessoes limpo');

  console.log('\nReset concluído. Pode testar novamente!');
}

reset().catch(console.error);
