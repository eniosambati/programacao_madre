import { supabase } from '../services/supabase';
import { sendText } from '../services/whatsapp';

// WhatsApp do atendente humano que receberá os alertas
const ATENDENTE_JID = '5543991415354@s.whatsapp.net';

export async function toolSolicitarHumano(
  sessionId: string,
  phone: string,
  nome: string,
  motivo: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    console.log(`[HUMANO] Acionando intervenção humana para ${phone} — motivo: ${motivo}`);

    // 1. Pausa a IA para este cliente no Supabase
    const { error } = await supabase
      .from('leads_madre')
      .update({ atendimento_ia: 'pause' })
      .eq('whatsapp', phone);

    if (error) {
      console.error('[HUMANO] Erro ao pausar IA no Supabase:', error.message);
    } else {
      console.log(`[HUMANO] IA pausada para ${phone}`);
    }

    // 2. Notifica o atendente humano via WhatsApp
    const msgAtendente =
      `🔔 *Intervenção Humana Solicitada*\n\n` +
      `👤 *Cliente:* ${nome}\n` +
      `📱 *WhatsApp:* +${phone}\n` +
      `📋 *Motivo:* ${motivo}\n\n` +
      `A IA foi pausada. Atenda diretamente pelo WhatsApp acima.\n` +
      `Para reativar a IA, altere o campo \`atendimento_ia\` para \`null\` no Supabase.`;

    await sendText(ATENDENTE_JID, msgAtendente);
    console.log(`[HUMANO] Notificação enviada para o atendente`);

    return {
      sucesso: true,
      mensagem: 'Um atendente humano irá te ajudar agora. Um momento! 😊'
    };
  } catch (err: any) {
    console.error('[HUMANO] Erro:', err.message);
    return {
      sucesso: false,
      mensagem: 'Vou te conectar com um atendente agora.'
    };
  }
}
