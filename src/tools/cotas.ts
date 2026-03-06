import { supabaseErica } from '../services/supabase';
import { salvarCotaSelecionada } from '../services/session';
import type { CotaSelecionada } from '../types';

// Busca e seleciona cota direto no Supabase — sem depender do N8N
export async function toolBuscarEscolherCota(
  sessionId: string,
  loteria: string,
  total_cotas: number,
  data_sorteio: string,
  valor_cota: number
): Promise<{ sucesso: boolean; cotas_disponiveis: number; cota?: CotaSelecionada }> {
  try {
    // Encontra o bolão pelo nome da loteria (via join), total_cotas e data_sorteio
    const { data: boloes, error: errBolao } = await supabaseErica
      .from('boloes')
      .select('id, loterias(nome)')
      .eq('total_cotas', total_cotas)
      .eq('data_sorteio', data_sorteio)
      .eq('status', 'ativo');

    if (errBolao || !boloes?.length) {
      console.error('[COTAS] Bolão não encontrado:', errBolao?.message);
      return { sucesso: false, cotas_disponiveis: 0 };
    }

    // Filtra pelo nome exato da loteria (o LLM usa o nome retornado por buscar_boloes)
    const bolao = boloes.find((b: any) =>
      b.loterias?.nome?.toLowerCase() === loteria.toLowerCase()
    ) || boloes[0];

    // Busca cotas disponíveis para este bolão
    const { data: cotas, error: errCotas } = await supabaseErica
      .from('cotas')
      .select('*')
      .eq('bolao_id', bolao.id)
      .eq('proprietario', 'erica')
      .eq('vendida', false)
      .eq('reservada', false);

    if (errCotas || !cotas?.length) {
      console.log(`[COTAS] Nenhuma cota disponível para ${loteria}`);
      return { sucesso: false, cotas_disponiveis: 0 };
    }

    const primeira = cotas[0];
    const cotaSelecionada: CotaSelecionada = {
      cota_id: primeira.id,
      bolao_id: bolao.id,
      numero: primeira.numero,
      loteria,
      total_cotas,
      data_sorteio,
      valor_cota
    };

    // Salva na sessão — zero RAM
    await salvarCotaSelecionada(sessionId, cotaSelecionada);
    console.log(`[COTAS] Cota ${primeira.numero} selecionada para ${loteria} — ${cotas.length} disponíveis`);
    return { sucesso: true, cotas_disponiveis: cotas.length, cota: cotaSelecionada };
  } catch (err: any) {
    console.error('[COTAS] Erro:', err.message);
    return { sucesso: false, cotas_disponiveis: 0 };
  }
}
