import axios from 'axios';
import { supabaseErica } from '../services/supabase';
import { getSessao } from '../services/session';
import { sendImage } from '../services/whatsapp';

// Envia imagem do bilhete direto do Supabase Storage — sem depender do N8N
export async function toolEnviarImagem(
  sessionId: string,
  remoteJid: string,
  loteria: string,
  total_cotas: number,
  data_sorteio: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    const sessao = await getSessao(sessionId);

    if (!sessao.cota_selecionada) {
      console.error('[IMAGEM] Cota não encontrada na sessão');
      return { sucesso: false, mensagem: 'Cota não disponível no momento.' };
    }

    // Busca a URL da imagem usando bolao_id da cota selecionada
    const { data: bolao, error } = await supabaseErica
      .from('boloes')
      .select('imagem_bilhete_url')
      .eq('id', sessao.cota_selecionada.bolao_id)
      .maybeSingle();

    if (error || !bolao?.imagem_bilhete_url) {
      console.error('[IMAGEM] URL não encontrada:', error?.message);
      return { sucesso: false, mensagem: 'Imagem do bilhete não disponível.' };
    }

    // Baixa a imagem e converte para base64
    const imgResponse = await axios.get(bolao.imagem_bilhete_url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(imgResponse.data).toString('base64');

    // Envia via Evolution API
    await sendImage(remoteJid, base64);
    console.log(`[IMAGEM] Enviada — ${loteria} cota ${sessao.cota_selecionada.numero} para ${remoteJid}`);
    return { sucesso: true, mensagem: 'Imagem enviada com sucesso.' };
  } catch (err: any) {
    console.error('[IMAGEM] Erro:', err.message);
    return { sucesso: false, mensagem: 'Não consegui enviar o bilhete agora.' };
  }
}
