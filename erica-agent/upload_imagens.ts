import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const supabaseErica = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { db: { schema: 'erica' } }
);

async function uploadImagem(filePath: string, fileName: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const { error } = await supabase.storage
    .from('bilhetes')
    .upload(fileName, fileBuffer, { contentType, upsert: true });

  if (error) throw new Error(`Upload falhou: ${error.message}`);

  const { data } = supabase.storage.from('bilhetes').getPublicUrl(fileName);
  return data.publicUrl;
}

async function run() {
  console.log('Fazendo upload das imagens da Mega-Sena...\n');

  const img1 = await uploadImagem(
    'C:/Users/REMAKKER/Downloads/mega-senha2501-1.png',
    'MegaSena-010326-1001.png'
  );
  console.log(`✅ Imagem 1 (12 cotas): ${img1}`);

  const img2 = await uploadImagem(
    'C:/Users/REMAKKER/Downloads/mega-sena-2501-jogo2.jpeg',
    'MegaSena-010326-1002.jpeg'
  );
  console.log(`✅ Imagem 2 (8 cotas): ${img2}`);

  // Atualiza os bolões no banco
  const updates = [
    { codigo: 'MegaSena-010326-1001', url: img1 },
    { codigo: 'MegaSena-010326-1002', url: img2 }
  ];

  for (const u of updates) {
    const { error } = await supabaseErica
      .from('boloes')
      .update({ imagem_bilhete_url: u.url })
      .eq('codigo', u.codigo);

    if (error) console.error(`Erro ao atualizar ${u.codigo}:`, error.message);
    else console.log(`✅ Bolão atualizado: ${u.codigo}`);
  }

  console.log('\nPronto! Pode testar agora.');
}

run().catch(console.error);
