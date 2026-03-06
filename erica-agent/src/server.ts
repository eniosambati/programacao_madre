import express from 'express';
import * as dotenv from 'dotenv';
dotenv.config();

import { runErica } from './agent/erica';
import { getLead_IA, upsertLead } from './services/supabase';
import { resetarSessao } from './services/session';
import { clearChatHistory } from './services/supabase';
import { downloadMedia } from './services/whatsapp';
import { transcribeAudio, extractImageText } from './services/openai';
import type { MessageContext } from './types';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ─── WEBHOOK PRINCIPAL ────────────────────────────────────────────────────────

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // responde imediatamente para Evolution API

  try {
    const body = req.body;

    // Log completo para debug
    console.log('[WEBHOOK] Recebido:', JSON.stringify(body).slice(0, 500));

    // Filtra apenas mensagens recebidas (não enviadas pelo bot)
    if (body?.data?.key?.fromMe) return;
    if (body?.event !== 'messages.upsert') {
      console.log('[WEBHOOK] Evento ignorado:', body?.event);
      return;
    }

    const data = body.data;
    const key = data?.key;
    const message = data?.message;

    if (!key || !message) return;

    // Suporte a LID (novo modo de endereçamento do WhatsApp)
    let remoteJid: string = key.remoteJid;
    if (remoteJid?.includes('@lid') && key.remoteJidAlt) {
      remoteJid = key.remoteJidAlt;
    }
    if (!remoteJid || remoteJid.includes('@lid')) return;

    // Extrai telefone
    const phone = remoteJid.split('@')[0];
    const name: string = data?.pushName || phone;

    // Extrai texto da mensagem
    let text = '';
    let mediaType: MessageContext['mediaType'] = 'text';

    if (message.conversation) {
      text = message.conversation;
    } else if (message.extendedTextMessage?.text) {
      text = message.extendedTextMessage.text;
    } else if (message.audioMessage) {
      mediaType = 'audio';
      console.log(`[SERVER] Áudio recebido — transcrevendo...`);
      const media = await downloadMedia(data);
      if (media) {
        text = await transcribeAudio(media.base64, media.mimetype);
        if (!text) text = '[áudio não transcrito]';
        console.log(`[SERVER] Transcrição: "${text}"`);
      } else {
        text = '[áudio]';
      }
    } else if (message.imageMessage) {
      mediaType = 'image';
      const caption = message.imageMessage.caption || '';
      console.log(`[SERVER] Imagem recebida — extraindo texto...`);

      // webhookBase64: true — Evolution API já envia base64 direto no payload
      const base64Direto: string | undefined = data.message?.base64 || data.base64;
      const mimetypeDireto: string = data.message?.mimetype || message.imageMessage?.mimetype || 'image/jpeg';

      let mediaBase64: string | null = null;
      let mediaMimetype: string = mimetypeDireto;

      if (base64Direto) {
        console.log(`[SERVER] Base64 recebido direto no payload (webhookBase64)`);
        mediaBase64 = base64Direto;
      } else {
        // Fallback: tenta download via API
        const dataParaDownload = { ...data, key: { ...data.key, remoteJid } };
        const media = await downloadMedia(dataParaDownload);
        if (media) {
          mediaBase64 = media.base64;
          mediaMimetype = media.mimetype;
        }
      }

      if (mediaBase64) {
        const extraido = await extractImageText(mediaBase64, mediaMimetype);
        text = extraido || caption || '[imagem sem texto legível]';
      } else {
        text = caption || '[imagem não processada — cliente deve reenviar o comprovante como texto ou nova imagem]';
        console.log(`[SERVER] Imagem não processada — sem base64 disponível`);
      }
    } else if (message.documentMessage) {
      text = message.documentMessage.caption || '[documento]';
      mediaType = 'document';
    }

    if (!text) return;

    const sessionId = remoteJid;

    // Verifica se IA está pausada
    const statusIA = await getLead_IA(phone);
    if (statusIA === 'pause') {
      console.log(`[SERVER] IA pausada para ${phone}`);
      return;
    }

    // Upsert lead
    await upsertLead(phone, name);

    // Comando para resetar conversa (limpa sessão + histórico)
    if (text.toLowerCase().includes('!resetar') || text.toLowerCase().includes('#reset')) {
      await Promise.all([
        resetarSessao(sessionId),
        clearChatHistory(sessionId)
      ]);
      console.log(`[SERVER] Sessão e histórico resetados para ${phone}`);
      return;
    }

    const ctx: MessageContext = {
      phone,
      remoteJid,
      name,
      text,
      sessionId,
      mediaType
    };

    await runErica(ctx);

  } catch (err: any) {
    console.error('[SERVER] Erro no webhook:', err.message);
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ status: 'ok', agent: 'Érica — Lotérica da Madre', model: 'gpt-4o' });
});

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[SERVER] Érica rodando na porta ${PORT}`);
  console.log(`[SERVER] Modelo: gpt-4o`);
  console.log(`[SERVER] Webhook: POST /webhook`);
});
