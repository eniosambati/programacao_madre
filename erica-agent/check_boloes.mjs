import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ozfumjkluhyboxmtvjol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZnVtamtsdWh5Ym94bXR2am9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk0MDI2MSwiZXhwIjoyMDcwNTE2MjYxfQ.8NtA7SV5sSJcfIsaaTGkPulgtkdNASaI5YnMVnDROSs',
  { db: { schema: 'erica' } }
);

const { data: boloes } = await supabase
  .from('boloes')
  .select('codigo, total_cotas, valor_cota, data_sorteio, cotas(id, vendida, reservada, proprietario)')
  .eq('status', 'ativo')
  .order('codigo');

console.log('\n=== BOLÕES ATIVOS ===\n');
for (const b of boloes) {
  const ericaCotas = (b.cotas || []).filter(c => c.proprietario === 'erica');
  const disponiveis = ericaCotas.filter(c => !c.vendida && !c.reservada);
  console.log(`${b.codigo}`);
  console.log(`  Sorteio: ${b.data_sorteio} | Valor: R$ ${b.valor_cota} | Cotas Érica: ${ericaCotas.length} | Disponíveis: ${disponiveis.length}`);
}
