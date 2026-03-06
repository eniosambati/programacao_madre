import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const supabaseErica = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { db: { schema: 'erica' } });

async function run() {
  const fileBuffer = fs.readFileSync('C:/Users/REMAKKER/Downloads/dupla-sena.jpeg');

  const { error: upErr } = await supabase.storage
    .from('bilhetes')
    .upload('DuplaSena-010326-1004.jpeg', fileBuffer, { contentType: 'image/jpeg', upsert: true });

  if (upErr) { console.error('Upload falhou:', upErr.message); return; }

  const { data } = supabase.storage.from('bilhetes').getPublicUrl('DuplaSena-010326-1004.jpeg');
  console.log('✅ Upload:', data.publicUrl);

  const { error: updErr } = await supabaseErica
    .from('boloes')
    .update({ imagem_bilhete_url: data.publicUrl })
    .eq('codigo', 'DuplaSena-010326-1004');

  if (updErr) console.error('Erro ao atualizar:', updErr.message);
  else console.log('✅ Bolão Dupla Sena atualizado!');
}

run().catch(console.error);
