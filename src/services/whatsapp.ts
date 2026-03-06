import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.EVOLUTION_URL!;
const APIKEY = process.env.EVOLUTION_APIKEY!;
const INSTANCE = process.env.EVOLUTION_INSTANCE!;

const headers = { apikey: APIKEY };

export async function sendText(remoteJid: string, text: string): Promise<void> {
  try {
    await axios.post(
      `${BASE_URL}/message/sendText/${INSTANCE}`,
      { number: remoteJid, text },
      { headers }
    );
  } catch (err: any) {
    console.error('[WPP] sendText erro:', err.message);
  }
}

// Baixa mídia (áudio ou imagem) da Evolution API e retorna base64
export async function downloadMedia(messageData: any): Promise<{ base64: string; mimetype: string } | null> {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/message/getBase64FromMediaMessage/${INSTANCE}`,
      { message: messageData },
      { headers }
    );
    if (data?.base64) return { base64: data.base64, mimetype: data.mimetype || '' };
    return null;
  } catch (err: any) {
    console.error('[WPP] downloadMedia erro:', err.message);
    return null;
  }
}

export async function sendImage(remoteJid: string, base64: string, caption?: string): Promise<void> {
  try {
    await axios.post(
      `${BASE_URL}/message/sendMedia/${INSTANCE}`,
      {
        number: remoteJid,
        mediatype: 'image',
        media: base64,
        caption: caption || ''
      },
      { headers }
    );
  } catch (err: any) {
    console.error('[WPP] sendImage erro:', err.message);
  }
}
