import { supabaseErica } from './supabase';
import type { SessaoErica, CotaSelecionada, BolaoConfirmado, DadosCliente, Bolao } from '../types';

const SESSAO_PADRAO: Omit<SessaoErica, 'session_id' | 'ultima_atividade'> = {
  fase: 'abertura',
  cota_selecionada: null,
  boloes_confirmados: [],
  boloes_oferecidos: [],
  boloes_disponiveis: [],
  dados_cliente: null,
  pedidos_ids: []
};

export async function getSessao(sessionId: string): Promise<SessaoErica> {
  const { data } = await supabaseErica
    .from('erica_sessoes')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!data) {
    return {
      session_id: sessionId,
      ...SESSAO_PADRAO,
      ultima_atividade: new Date().toISOString()
    };
  }

  return {
    session_id: data.session_id,
    fase: data.fase || 'abertura',
    cota_selecionada: data.cota_selecionada || null,
    boloes_confirmados: data.boloes_confirmados || [],
    boloes_oferecidos: data.boloes_oferecidos || [],
    boloes_disponiveis: data.boloes_disponiveis || [],
    dados_cliente: data.dados_cliente || null,
    pedidos_ids: data.pedidos_ids || [],
    ultima_atividade: data.ultima_atividade
  };
}

export async function saveSessao(sessao: SessaoErica): Promise<void> {
  await supabaseErica.from('erica_sessoes').upsert({
    session_id: sessao.session_id,
    fase: sessao.fase,
    cota_selecionada: sessao.cota_selecionada,
    boloes_confirmados: sessao.boloes_confirmados,
    boloes_oferecidos: sessao.boloes_oferecidos,
    boloes_disponiveis: sessao.boloes_disponiveis,
    dados_cliente: sessao.dados_cliente,
    pedidos_ids: sessao.pedidos_ids,
    ultima_atividade: new Date().toISOString()
  }, { onConflict: 'session_id' });
}

export async function salvarBoloesDisponiveis(sessionId: string, boloes: Bolao[]): Promise<void> {
  const sessao = await getSessao(sessionId);
  sessao.boloes_disponiveis = boloes;
  await saveSessao(sessao);
}

export async function atualizarFase(sessionId: string, fase: SessaoErica['fase']): Promise<void> {
  const sessao = await getSessao(sessionId);
  sessao.fase = fase;
  await saveSessao(sessao);
}

export async function salvarCotaSelecionada(sessionId: string, cota: CotaSelecionada): Promise<void> {
  const sessao = await getSessao(sessionId);
  sessao.cota_selecionada = cota;
  await saveSessao(sessao);
}

export async function confirmarBolao(sessionId: string, bolao: BolaoConfirmado): Promise<void> {
  const sessao = await getSessao(sessionId);
  sessao.boloes_confirmados.push(bolao);
  await saveSessao(sessao);
}

export async function marcarBolaoOferecido(sessionId: string, loteria: string): Promise<void> {
  const sessao = await getSessao(sessionId);
  if (!sessao.boloes_oferecidos.includes(loteria)) {
    sessao.boloes_oferecidos.push(loteria);
  }
  await saveSessao(sessao);
}

export async function salvarDadosCliente(sessionId: string, dados: DadosCliente): Promise<void> {
  const sessao = await getSessao(sessionId);
  sessao.dados_cliente = dados;
  await saveSessao(sessao);
}

export async function adicionarPedidoId(sessionId: string, pedidoId: string): Promise<void> {
  const sessao = await getSessao(sessionId);
  sessao.pedidos_ids.push(pedidoId);
  await saveSessao(sessao);
}

export async function resetarSessao(sessionId: string): Promise<void> {
  await supabaseErica.from('erica_sessoes').delete().eq('session_id', sessionId);
}
