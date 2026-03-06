# Contexto da Conversa — Érica Agent
**Data:** 2026-02-28
**Status:** Briefing completo — nenhum código alterado ainda

---

## Situação atual do projeto

### Problema principal
O agente (Livia/Érica) parou de funcionar corretamente após muitas alterações no prompt. Três falhas encadeadas:

1. **Imagem do bilhete não exibe** — a sequência obrigatória foi quebrada (ver abaixo)
2. **Sequência de venda corrompida** — o agente exibe a imagem fora de ordem
3. **Pixel/endosso não dispara** — o fluxo não chega no passo certo

**Raiz:** o prompt foi modificado tantas vezes que as instruções ficaram contraditórias.

---

## Decisões tomadas no briefing

### Tabela de sessão — `erica.erica_sessoes` (✅ DEFINIDO)
Nova tabela no schema `erica` (não altera leads_madre):
```
session_id         TEXT PRIMARY KEY  → remoteJid do cliente
fase               TEXT              → abertura | venda | upsell | downsell | fechamento | pagamento
cota_selecionada   JSONB             → { cota_id, numero, loteria, total_cotas, data_sorteio }
boloes_confirmados JSONB             → [{ loteria, total_cotas, valor_cota }]
dados_cliente      JSONB             → { nome, cpf, telefone }
pedidos_ids        JSONB             → [uuid, uuid]
ultima_atividade   TIMESTAMPTZ       → atualizado a cada mensagem
```

### DECISÃO ARQUITETURAL FUNDAMENTAL (✅ DEFINIDO)
**Zero memória RAM. Tudo persiste no Supabase.**
- Cota buscada → Supabase
- Fase da conversa → Supabase
- Dados do cliente → Supabase
- Bolões confirmados → Supabase
- Pedidos criados → Supabase
- Se servidor reiniciar → lê Supabase e continua de onde parou

**Consequência:** Reservas feitas direto no Supabase pelo servidor (não via webhook N8N).

---

### DECISÃO CRÍTICA — Gestão de cotas (✅ DEFINIDO)

**O problema raiz da imagem quebrada:**
O webhook `imagem_boloes` precisa do **número específico de uma cota** (ex: `cota: 3`), não do total de cotas (ex: `12`). Quando o LLM passava `total_cotas`, o webhook recebia uma string genérica e nunca encontrava a imagem certa.

**Decisão:** O LLM **nunca** gerencia cota_id ou numero de cota. Isso é responsabilidade exclusiva do servidor.

**Fluxo correto definido:**
```
1. LLM decide: "quero mostrar Mega-Sena, data X"
2. SERVIDOR chama webhook `cotas` → recebe [{ cota_id, numero }]
3. SERVIDOR pega primeira cota disponível → salva no Supabase (erica_sessoes)
4. SERVIDOR chama webhook `imagem_boloes` com loteria + cota: 3 (número específico) + data_sorteio + remoteJid
5. Imagem certa chega no WhatsApp
6. LLM nunca viu cota_id, nunca viu numero — só conversa
```

**Parâmetros obrigatórios do webhook `imagem_boloes`:**
```
loteria:      "Mega-Sena"         → identifica a loteria
total_cotas:  12                  → diferencia bolões da mesma loteria com totais diferentes
data_sorteio: "2026-02-28"        → vincula ao sorteio correto
cota:         3                   → número ESPECÍFICO da cota (não o total!)
remoteJid:    "5511999999999"     → envia para o número certo no WhatsApp
```

**O que o LLM passa para o servidor:**
```
loteria, total_cotas, data_sorteio, remoteJid
```
O servidor busca o `cota` (número específico) via webhook `cotas` e completa a chamada.

**Por que nunca mais quebra:**
- Lógica de cota no servidor (determinístico)
- Estado no Supabase (persistido, não em RAM)
- LLM só decide o que oferecer — não gerencia IDs
- Prompt pode mudar à vontade sem afetar o fluxo de cotas

---

### 1. Banco de dados
- **Supabase permanece intacto** — nenhuma tabela será apagada
- A tabela `n8n_chat_histories` (schema public) **já está sendo usada** para histórico de conversa ✅
- O problema é que o **estado da venda** vive em `src/cache.ts` em memória — se o servidor reinicia ou o cliente some, o estado é perdido ❌
- **Solução acordada:** criar tabela `erica_sessoes` no schema `erica` para persistir o estado estruturado

### 2. Arquitetura — Multi-agentes (aprovado)
- Reconstrução com **4 subagentes + 1 orquestrador**
- **Plano imediato:** reconstruir com base nos arquivos do N8N
- **Fonte da verdade:** arquivo `01 - SISTEMA CONVERSACIONAL ERICA (1).json`

---

## Fluxo definitivo do sistema Érica (✅ CONFIRMADO)

```
Lead chega
→ É cliente? (busca na tabela clientes)
   SIM → consulta última loteria jogada → oferece a mesma
   NÃO → apresenta os 3 bolões mais acumulados

→ Cliente escolhe bolão
   → SERVIDOR busca cota disponível (webhook cotas)
   → SERVIDOR salva cota_id + numero no Supabase
   → Pergunta "Quer ver o bilhete?"
   → SIM → SERVIDOR chama imagem_boloes com:
            loteria + total_cotas + data_sorteio + cota (número específico) + remoteJid

→ Aceita comprar?
   SIM → UPSELL: mesma loteria, bolão diferente
         (cliente recusa upsell?) → DOWNSELL: loteria diferente
   NÃO → DOWNSELL: loteria diferente

→ Somatória de todos os bolões escolhidos
→ "Posso fechar?" → cliente confirma

→ Pede dados: nome completo + CPF
→ Manda dados do PIX

→ Recebe comprovante
   → Backend lê APENAS: CNPJ + dados do PIX (NÃO valida valor)
   → Frontend recebe e faz o restante (endosso, confirmação)
```

### Regra de exibição de cotas ao cliente (✅ confirmada)
- LLM mostra ao cliente apenas a **quantidade** de cotas disponíveis ("Temos 3 cotas disponíveis!")
- Cliente **nunca escolhe** qual cota — servidor escolhe automaticamente
- Servidor pega a primeira cota disponível, reserva e salva no Supabase
- Essa cota é usada para imagem + confirmação de pagamento
- LLM nunca vê cota_id nem número específico da cota

### Regras do upsell/downsell (✅ confirmadas)
- **Upsell:** mesma loteria, bolão diferente
- **Downsell:** loteria diferente (acionado se cliente recusar o upsell)

### Regra do comprovante (✅ confirmada)
- Backend lê CNPJ + dados do PIX — **não valida valor**
- Frontend assume o controle após receber os dados

### Regra cliente recorrente (✅ confirmada)
- Busca última loteria jogada pelo cliente
- Oferece essa mesma loteria primeiro

---

## Mapeamento completo do N8N (fonte da verdade)

### Agente principal
- **Nome:** Érica Loterica Madre
- **Tipo:** `@n8n/n8n-nodes-langchain.agent` v1.9
- **Modelo:** `gpt-4.1-mini` (IMPORTANTE — não gpt-4o)
- **Memória:** Postgres Chat Memory — 500 mensagens de contexto
- **Session Key:** `{remoteJid}-enio`
- **Tool especial:** `Refletir` (toolThink) — reflexão interna, não altera banco

### As 9 Skills (tools) do agente

| # | Skill | Tipo | Quando usar |
|---|---|---|---|
| 1 | `busca_lead` | Supabase | Primeira interação — busca na tabela `leads_madre` |
| 2 | `clientes` | Supabase | Logo após busca_lead — verifica se é cliente recorrente |
| 3 | `busca_resultados` | Supabase | Antes de apresentar bolões — acumulados |
| 4 | `boloes` | HTTP Webhook | Para listar bolões do dia |
| 5 | `cotas` | HTTP Webhook | SEMPRE que cliente escolhe um bolão |
| 6 | `imagem_boloes` | HTTP Webhook | Quando cliente quer ver o bilhete |
| 7 | `dezenas` | HTTP Webhook | APENAS se cliente pedir explicitamente |
| 8 | `reservas` | HTTP Webhook | Após enviar dados PIX ao cliente |
| 9 | `endossar` | HTTP Webhook | Após confirmação de pagamento |

### Webhooks mapeados
| Skill | URL |
|---|---|
| `boloes` | `https://webhook.dev.lotericamadreia.com/webhook/53e26eee-3cd3-43b6-a1e4-0de04a4300d2` |
| `cotas` | `https://webhook.dev.lotericamadreia.com/webhook/292c91e3-3658-421b-9a0a-8b8d971f5b14` |
| `imagem_boloes` | `https://webhook.dev.lotericamadreia.com/webhook/cfe13957-b7dc-49c4-a6a1-f96aa3701df1` |
| `dezenas` | `https://webhook.dev.lotericamadreia.com/webhook/e9950072-820a-4c9f-9d69-ecd06a4669d4` |
| `reservas` | `https://webhook.dev.lotericamadreia.com/webhook/a1435db0-51f3-4e56-b72a-b93bb530e13e` |
| `endossar` | `https://webhook.dev.lotericamadreia.com/webhook/47480983-a69f-45bd-adb9-bd0134fba40a` |

---

## Fluxo de venda correto (N8N — versão que funcionava)

### SEQUÊNCIA OBRIGATÓRIA para exibir bilhete
```
1. Cliente escolhe bolão
2. → chamar `cotas` (guardar cota_id + numero nos bastidores — NUNCA mostrar ao cliente)
3. → perguntar "Quer ver o bilhete?"
4. → SE sim: chamar `imagem_boloes`
5. → SE cliente pedir dezenas: chamar `dezenas`
```
**CRÍTICO:** `cotas` SEMPRE antes de `imagem_boloes`. Nunca mostrar número de cota ao cliente.

### 9 Etapas do funil de vendas

**Etapa 1 — Acolhimento**
- Aciona: `busca_lead` → `clientes`
- Se cliente recorrente: usa nome e histórico
- Se lead novo: usa nome do disparo, explica se pedir

**Etapa 2 — Apresentação de acumulados**
- Aciona: `busca_resultados` → `boloes`
- Mostra TODAS as loterias e opções
- NUNCA menciona números de cotas
- Menciona quantidade de JOGOS (não cotas)

**Etapa 3 — Visualização do bilhete**
- Sequência obrigatória acima
- NÃO oferecer dezenas automaticamente

**Etapa 4 — Tratamento de objeções**
- Responder com empatia + alternativas

**Etapa 5/6 — Upsell triplo (cada um com fluxo completo)**
1. Mesmo valor, bolão diferente
2. Mesma loteria, valor diferente
3. Outra loteria acumulada

**Etapa 7 — Revisão OBRIGATÓRIA (nunca pular)**
```
✅ [Loteria] ([X] jogos) - R$ [Valor]
✅ [Loteria] ([X] jogos) - R$ [Valor]
TOTAL: R$ [Soma CORRETA]
Tá certo? Posso confirmar?
```

**Etapa 7.5 — Coleta de dados**
- Após cliente confirmar revisão
- Pedir nome completo + CPF (validar CPF)
- Enviar dados PIX

**Etapa 8 — Reserva (APÓS enviar PIX)**
- Chamar `reservas` — UMA chamada por LOTERIA
- Timer de 10 minutos ativado
- NUNCA mencionar números de cotas

**Etapa 9 — Pós-pagamento**
- NÃO responder imediatamente após comprovante
- AGUARDAR mensagem automática do sistema
- Chamar `endossar` após confirmação

### Estrutura da chamada `reservas`
```json
{
  "cliente": {
    "nome": "string",
    "cpf": "string",
    "telefone": "string",
    "remoteJid": "string"
  },
  "loteria": "string",
  "cotas": [
    {
      "cota_id": "uuid",
      "numero_cota": number,
      "data_sorteio": "yyyy-MM-dd"
    }
  ]
}
```

### Retorno de `boloes`
```json
{
  "boloes": [
    {
      "bolao_id": "uuid",
      "loteria": "Mega-Sena",
      "total_cotas": 12,
      "valor_cota": 23.62,
      "data_sorteio": "yyyy-MM-dd",
      "quantidade_jogos": 5
    }
  ]
}
```

### Retorno de `cotas`
```json
{
  "bolao_id": "uuid",
  "loteria": "Mega-Sena",
  "total_cotas": 12,
  "valor_cota": 23.62,
  "cotas_disponiveis": [
    { "cota_id": "uuid-abc", "numero": 3 }
  ],
  "quantidade_cotas_disponiveis": 3
}
```

---

## Regras críticas do prompt (proibições e obrigações)

### PROIBIDO
- Mencionar números de cotas ao cliente
- Dizer "Cota nº X" ou "cota disponível para você"
- Mostrar bilhete automaticamente sem perguntar
- Oferecer dezenas (só se cliente pedir)
- Pular revisão final
- Mencionar "assistente virtual", "IA", "robô", "Enio"
- Garantir premiação
- Pressionar agressivamente
- CAPS LOCK excessivo / múltiplos "!!!"

### OBRIGATÓRIO
- SEMPRE fazer revisão final antes de pedir CPF
- SEMPRE calcular soma CORRETA
- SEMPRE oferecer ver bilhete (não fazer automaticamente)
- SEMPRE chamar `cotas` quando cliente escolher bolão
- SEMPRE guardar `cota_id` nos bastidores (nunca mencionar)
- SEMPRE mencionar quantidade de JOGOS (não cotas)
- SEMPRE voltar aos bolões (mesmo em conversas off-topic)
- SEMPRE validar CPF antes de PIX
- SEMPRE apresentar TODAS as opções de bolões

---

## Arquitetura multi-agentes planejada (4 subagentes)

```
Orquestrador
├── Agente 1: Abertura
│   skills: busca_lead, clientes, busca_resultados, boloes
│
├── Agente 2: Venda (loop de upsell)
│   skills: cotas, imagem_boloes, dezenas
│
├── Agente 3: Fechamento
│   skills: (interno) revisão + validação CPF + PIX
│
└── Agente 4: Pagamento
    skills: reservas, endossar
```

---

## Bugs identificados no código atual vs N8N

| Problema | N8N (correto) | Código atual (errado) |
|---|---|---|
| Modelo LLM | `gpt-4.1-mini` | `gpt-4o` |
| Memória | Postgres 500 msgs | RAM (cache.ts) — perde ao reiniciar |
| Session Key | `{remoteJid}-enio` | Só remoteJid |
| Ordem da imagem | cotas → pergunta → imagem | Quebrada |
| Endosso | tool `endossar` | `confirmar_pagamento` (diferente) |
| Reflexão | toolThink (Refletir) | Não existe |

---

## Arquivos-chave do projeto atual

| Arquivo | Função |
|---|---|
| `src/agent/erica.ts` | Agente principal, system prompt da Livia, tool calling loop |
| `src/agent/tools/boloes.ts` | buscar_boloes, buscar_cotas |
| `src/agent/tools/imagens.ts` | enviar_imagem_bolao |
| `src/agent/tools/reservas.ts` | finalizar_compras, confirmar_pagamento |
| `src/agent/tools/resultados.ts` | buscar_resultados |
| `src/cache.ts` | Estado da sessão em memória (será substituído) |
| `src/services/supabase.ts` | Cliente Supabase + todas as queries |
| `src/server.ts` | Webhook Express |

---

## Infraestrutura

- **Supabase:** `https://ozfumjkluhyboxmtvjol.supabase.co`
  - Schema `public`: `n8n_chat_histories`, `leads_madre`, `resultados_loterias`
  - Schema `erica`: `boloes`, `cotas`, `clientes`, `pedidos`, `pedido_cotas`
- **Evolution API:** `https://wsapi.dev.lotericamadreia.com` — instance: `loterica-madre`
- **ngrok:** `https://willie-gogetting-nenita.ngrok-free.dev` (pode mudar ao reiniciar)
- **Para iniciar:** `cd C:/Users/REMAKKER/projetos/erica-agent && npm run dev`

---

## Próximos passos

1. [ ] Definir arquitetura final (agente único restaurado ou multi-agentes)
2. [ ] Criar tabela `erica_sessoes` no Supabase (schema erica)
3. [ ] Substituir `src/cache.ts` por persistência no Supabase
4. [ ] Reconstruir prompt/fluxo com base no mapeamento do N8N
5. [ ] Corrigir modelo para `gpt-4.1-mini`
6. [ ] Corrigir session key para `{remoteJid}-enio`
7. [ ] Adicionar toolThink (reflexão)
8. [ ] Testar fluxo completo

---

## Fonte dos dados
- Arquivo N8N analisado: `C:/Users/REMAKKER/Downloads/01 - SISTEMA CONVERSACIONAL ERICA (1).json`
- Data da análise: 2026-02-28
