import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const supabaseErica = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { db: { schema: 'erica' } });

async function run() {
  const fileBuffer = fs.readFileSync('C:/Users/REMAKKER/Downloads/lotofacil-2501.jpeg');
  
  const { error: upErr } = await supabase.storage
    .from('bilhetes')
    .upload('Lotofacil-010326-1003.jpeg', fileBuffer, { contentType: 'image/jpeg', upsert: true });

  if (upErr) { console.error('Upload falhou:', upErr.message); return; }

  const { data } = supabase.storage.from('bilhetes').getPublicUrl('Lotofacil-010326-1003.jpeg');
  console.log('✅ Upload:', data.publicUrl);

  const { error: updErr } = await supabaseErica
    .from('boloes')
    .update({ imagem_bilhete_url: data.publicUrl })
    .eq('codigo', 'Lotofacil-010326-1003');

  if (updErr) console.error('Erro ao atualizar:', updErr.message);
  else console.log('✅ Bolão Lotofácil atualizado!');
}

run().catch(console.error);
