import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { db: { schema: 'erica' } }
);

const HOJE = '2026-03-01';
const CREATED_BY = '72aa7ede-5083-49cf-a322-534c95301287';

// IDs das loterias
const MEGA_ID = 'bf680679-212f-4e72-a030-4f1af5177bd6';
const LOTO_ID = '56c97e58-fbb5-4c44-a588-47e710513309';
const DUPLA_ID = '1b103675-917d-45c0-9b6b-8e23f21b97e3';

// Imagens de placeholder (bolões existentes)
const IMG_MEGA = 'https://ozfumjkluhyboxmtvjol.supabase.co/storage/v1/object/public/bilhetes/Quina-131225-6887-1765654367540.jpeg';

const boloes = [
  {
    codigo: 'MegaSena-010326-1001',
    loteria_id: MEGA_ID,
    data_sorteio: HOJE,
    total_cotas: 12,
    valor_cota: 23.62,
    jogos: [['05','12','18','22','35','41'],['03','09','14','27','38','54'],['07','15','21','33','44','58']],
    imagem_bilhete_url: IMG_MEGA,
    status: 'ativo',
    created_by: CREATED_BY
  },
  {
    codigo: 'MegaSena-010326-1002',
    loteria_id: MEGA_ID,
    data_sorteio: HOJE,
    total_cotas: 8,
    valor_cota: 15.00,
    jogos: [['01','08','16','24','39','50'],['04','11','19','28','41','55']],
    imagem_bilhete_url: IMG_MEGA,
    status: 'ativo',
    created_by: CREATED_BY
  },
  {
    codigo: 'Lotofacil-010326-1003',
    loteria_id: LOTO_ID,
    data_sorteio: HOJE,
    total_cotas: 10,
    valor_cota: 22.68,
    jogos: [['01','02','03','05','06','08','10','11','12','13','14','15','16','17','18'],['01','02','04','05','06','08','10','11','12','13','14','15','16','17','19']],
    imagem_bilhete_url: IMG_MEGA,
    status: 'ativo',
    created_by: CREATED_BY
  },
  {
    codigo: 'DuplaSena-010326-1004',
    loteria_id: DUPLA_ID,
    data_sorteio: HOJE,
    total_cotas: 8,
    valor_cota: 18.00,
    jogos: [['02','07','13','21','35','42'],['05','10','18','26','33','48']],
    imagem_bilhete_url: IMG_MEGA,
    status: 'ativo',
    created_by: CREATED_BY
  }
];

async function seed() {
  console.log('Inserindo bolões...');

  for (const bolao of boloes) {
    const { data, error } = await supabase
      .from('boloes')
      .insert(bolao)
      .select('id, codigo')
      .single();

    if (error) {
      console.error(`Erro ao inserir ${bolao.codigo}:`, error.message);
      continue;
    }

    console.log(`✅ Bolão criado: ${data.codigo} (${data.id})`);

    // Cria 3 cotas para a Érica
    const cotas = [1, 2, 3].map(n => ({
      bolao_id: data.id,
      numero: n,
      proprietario: 'erica',
      vendida: false,
      reservada: false
    }));

    const { error: cotaErr } = await supabase.from('cotas').insert(cotas);

    if (cotaErr) {
      console.error(`Erro ao inserir cotas de ${bolao.codigo}:`, cotaErr.message);
    } else {
      console.log(`   └─ 3 cotas criadas (1, 2, 3) para ${bolao.codigo}`);
    }
  }

  console.log('\nSeed concluído!');
}

seed().catch(console.error);
