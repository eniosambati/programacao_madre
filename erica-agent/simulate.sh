#!/bin/bash

WEBHOOK="http://localhost:3000/webhook"
EVO="https://wsapi.dev.lotericamadreia.com"
APIKEY="D9E7F72DC2E7-4CC0-9D36-4C14E2CFD8EA"
INSTANCE="loterica-madre"
PHONE="5512991434039"
JID="${PHONE}@s.whatsapp.net"
MSG_ID=0

send_client() {
  local text="$1"
  local delay="${2:-7}"
  MSG_ID=$((MSG_ID + 1))
  echo "⏳ [Marcus digitando... ${delay}s]"
  curl -s -X POST "${EVO}/chat/presence/${INSTANCE}" \
    -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
    -d "{\"number\":\"${JID}\",\"delay\":1000,\"presence\":\"composing\"}" > /dev/null
  sleep $delay
  curl -s -X POST "$WEBHOOK" -H "Content-Type: application/json" \
    -d "{\"instance\":\"loterica-madre\",\"data\":{\"key\":{\"remoteJid\":\"${JID}\",\"fromMe\":false,\"id\":\"SIM${MSG_ID}\"},\"pushName\":\"Marcus Mismotto\",\"message\":{\"conversation\":\"${text}\"},\"messageType\":\"conversation\"}}" > /dev/null
  curl -s -X POST "${EVO}/chat/presence/${INSTANCE}" \
    -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
    -d "{\"number\":\"${JID}\",\"delay\":1000,\"presence\":\"paused\"}" > /dev/null
  echo "💬 [Marcus]: ${text}"
}

wait_erica() {
  local secs="${1:-22}"
  echo "⏳ [Érica processando... ${secs}s]"
  sleep $secs
  echo "✅ [Érica respondeu]"
  echo "---"
}

echo "🎬 Simulação — Compra Mega + upsell 2ª Mega recusado + Lotofácil aceito"
echo "======================================================================="

# Limpa histórico
curl -s -X DELETE "https://ozfumjkluhyboxmtvjol.supabase.co/rest/v1/n8n_chat_histories?session_id=eq.${JID}-loterica-madre" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZnVtamtsdWh5Ym94bXR2am9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk0MDI2MSwiZXhwIjoyMDcwNTE2MjYxfQ.8NtA7SV5sSJcfIsaaTGkPulgtkdNASaI5YnMVnDROSs" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZnVtamtsdWh5Ym94bXR2am9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk0MDI2MSwiZXhwIjoyMDcwNTE2MjYxfQ.8NtA7SV5sSJcfIsaaTGkPulgtkdNASaI5YnMVnDROSs" > /dev/null
echo "🗑️  Histórico limpo"
echo "---"
sleep 2

# PASSO 1 — Abertura
echo ""
echo "=== PASSO 1: ABERTURA ==="
send_client "Oi" 3
wait_erica 28

# PASSO 2 — Marcus compra a Mega-Sena principal
echo ""
echo "=== PASSO 2: COMPRA A MEGA-SENA ==="
send_client "Quero sim! Me garante uma cota na Mega!" 7
wait_erica 25

# PASSO 3 — Érica fez upsell da 2ª Mega → Marcus recusa
echo ""
echo "=== PASSO 3: RECUSA O UPSELL DA 2ª MEGA ==="
send_client "Não, segunda Mega não preciso não, obrigado" 6
wait_erica 22

# PASSO 4 — Érica oferece Lotofácil → Marcus aceita
echo ""
echo "=== PASSO 4: ACEITA A LOTOFÁCIL ==="
send_client "Lotofácil eu topo! Quero uma cota sim" 6
wait_erica 22

# PASSO 5 — Marcus encerra upsell
echo ""
echo "=== PASSO 5: ENCERRA UPSELL ==="
send_client "Não, só esses dois mesmo, pode fechar" 5
wait_erica 18

# PASSO 6 — Marcus fornece os dados
echo ""
echo "=== PASSO 6: DADOS DO CLIENTE ==="
send_client "Marcus Mismotto, CPF 325.584.718-48, telefone 12991434039" 8
wait_erica 25

# PASSO 7 — Marcus confirma pagamento
echo ""
echo "=== PASSO 7: CONFIRMAÇÃO DE PAGAMENTO ==="
send_client "Paguei! Acabei de fazer o PIX agora" 6
wait_erica 22

echo ""
echo "======================================================================="
echo "✅ Simulação completa!"
