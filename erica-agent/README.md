# Érica Agent — Chatbot de Vendas de Bolões

Agente de atendimento via WhatsApp para a **Lotérica da Madre**, especializado em vendas de cotas de bolões de loteria com fluxo completo de upsell, reserva e pagamento via PIX.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Fluxo de Venda](#fluxo-de-venda)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Banco de Dados (Supabase)](#banco-de-dados-supabase)
- [Tools (Ferramentas do Agente)](#tools-ferramentas-do-agente)
- [Serviços Externos](#serviços-externos)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Deploy no VPS](#deploy-no-vps)
- [Comandos Especiais](#comandos-especiais)
- [Painel Administrativo](#painel-administrativo)
- [Observações Técnicas](#observações-técnicas)

---

## Visão Geral

A Érica é um agente de IA que atende clientes no WhatsApp e conduz o fluxo completo de venda de cotas de bolões:

1. Se apresenta e pergunta se o cliente quer ver os acumulados do dia
2. Busca bolões disponíveis no banco de dados
3. Apresenta opções com acumulados
4. Mostra a imagem do bilhete quando o cliente pedir
5. Confirma a compra e conduz upsell/downsell
6. Coleta dados pessoais e envia PIX
7. Processa o comprovante de pagamento
8. Atualiza o status do pedido para endosso manual

**Stack:** Node.js + TypeScript + Express + OpenAI GPT-4o + Supabase + Evolution API (WhatsApp)

---

## Arquitetura

```
WhatsApp
   |
   | (webhook)
   v
Evolution API
   |
   | POST /webhook
   v
Express (src/server.ts)
   |
   | texto / imagem / áudio transcrito
   v
runErica (src/agent/erica.ts)
   |
   |-- buildSystemPrompt (src/agent/prompts.ts)
   |-- getChatHistory (Supabase)
   |-- getSessao (Supabase)
   |-- OpenAI GPT-4o (tool_choice: auto)
   |
   |-- Tool Calling Loop
   |   |-- buscar_boloes   -> src/tools/boloes.ts   -> Supabase (erica.boloes)
   |   |-- mostrar_bilhete -> src/tools/cotas.ts    -> Supabase (erica.cotas)
   |   |                   -> src/tools/imagens.ts  -> Supabase Storage + Evolution API
   |   |-- confirmar_compra -> src/agent/erica.ts (lógica interna)
   |   |-- fazer_reserva   -> src/tools/reservas.ts -> Supabase (pedidos + pedido_cotas)
   |   |-- processar_comprovante -> src/tools/reservas.ts -> validação CNPJ + Supabase
   |
   v
sendText / sendImage (src/services/whatsapp.ts)
   |
   v
Evolution API -> WhatsApp (cliente)
```

### Princípio Zero RAM

Todo o estado da conversa é persistido no **Supabase** — nunca em variáveis em memória. Isso permite reiniciar o servidor sem perder nenhuma sessão ativa.

---

## Fluxo de Venda

```
[ABERTURA]
  Apresentação + pergunta sobre acumulados
        |
        | cliente confirma
        v
[buscar_boloes] -> apresenta bolões disponíveis hoje
        |
        | cliente escolhe uma loteria
        v
[VENDA]
  "Posso te mostrar o bilhete?"
        |
        | cliente confirma
        v
[mostrar_bilhete]
  - Busca cota disponível no banco
  - Envia imagem do bilhete via WhatsApp
  "Quer garantir a sua cota?"
        |
        | cliente confirma
        v
[confirmar_compra]
  Sistema verifica automaticamente:
    -> Existe outro bolão da mesma loteria? -> [UPSELL]
    -> Existe bolão de outra loteria?       -> [DOWNSELL]
    -> Não há mais opções?                  -> [FECHAMENTO]
        |
        v
[FECHAMENTO]
  Revisão com total
  Coleta: nome completo + CPF + telefone
        |
        v
[fazer_reserva]
  - Valida CPF
  - Cria/atualiza cliente
  - Cria pedido (status: aguardando_pagamento)
  - Cria pedido_cota
  - Marca cota como vendida
  - Envia dados do PIX
        |
        | cliente envia comprovante (imagem ou texto)
        v
[processar_comprovante]
  - GPT-4o extrai texto da imagem (Vision)
  - Valida CNPJ: 10.519.294/0001-16
  - Valida razão social: "madre"
  - Atualiza pedidos para status: a_endossar
        |
        v
[FIM] Endosso manual no painel administrativo
```

---

## Estrutura de Pastas

```
erica-agent/
├── src/
│   ├── server.ts              # Servidor Express — webhook principal
│   ├── types.ts               # Interfaces TypeScript
│   ├── agent/
│   │   ├── erica.ts           # Loop principal do agente (tool calling)
│   │   ├── prompts.ts         # System prompt dinâmico + lógica de retomada
│   │   └── tools.ts           # Definição das tools para a OpenAI
│   ├── services/
│   │   ├── openai.ts          # Cliente OpenAI (gpt-4o) + transcrição + visão
│   │   ├── supabase.ts        # Queries ao banco (chat, leads, clientes, pedidos)
│   │   ├── session.ts         # Estado da sessão (getSessao, saveSessao, etc.)
│   │   └── whatsapp.ts        # sendText, sendImage, downloadMedia (Evolution API)
│   └── tools/
│       ├── boloes.ts          # Busca bolões disponíveis hoje (Supabase direto)
│       ├── cotas.ts           # Busca e seleciona cota disponível
│       ├── imagens.ts         # Busca imagem no Supabase Storage e envia via WhatsApp
│       └── reservas.ts        # Criar pedidos, processar comprovante PIX
├── .env                       # Variáveis de ambiente (não commitado)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://wsapi.dev.lotericamadreia.com
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_INSTANCE=loterica-madre

# Servidor
PORT=3000
```

---

## Banco de Dados (Supabase)

### Schema `public`

| Tabela | Descrição |
|---|---|
| `n8n_chat_histories` | Histórico de mensagens (session_id, message JSONB) |
| `leads_madre` | Leads do WhatsApp (whatsapp, nomewpp, atendimento_ia) |
| `resultados_loterias` | Acumulados das loterias (loteria, valor_acumulado, data_sorteio) |

### Schema `erica`

| Tabela | Descrição |
|---|---|
| `loterias` | Cadastro de loterias (id, nome, slug) |
| `boloes` | Bolões disponíveis (codigo, loteria_id, total_cotas, valor_cota, data_sorteio, status, jogos[], imagem_bilhete_url) |
| `cotas` | Cotas de cada bolão (bolao_id, numero, proprietario, vendida, reservada) |
| `clientes` | Clientes cadastrados (nome, cpf, telefone) |
| `pedidos` | Pedidos de compra (bolao_id, cliente_id, codigo, status) |
| `pedido_cotas` | Relação pedido x cota (pedido_id, cota_id, numero_cota) |
| `erica_sessoes` | Estado da conversa por cliente (session_id, fase, cota_selecionada, boloes_confirmados, etc.) |

### Status de Pedidos

| Status | Descrição |
|---|---|
| `aguardando_pagamento` | Reserva criada, aguardando PIX |
| `a_endossar` | Comprovante validado, aguardando endosso manual |
| `finalizado` | Endossado e concluído pelo painel |

### Campo `atendimento_ia` (leads_madre)

| Valor | Comportamento |
|---|---|
| `ativa` (padrão) | Érica responde normalmente |
| `pause` | Érica ignora mensagens do cliente (atendimento humano) |
| `reativada` | Érica volta a responder |

---

## Tools (Ferramentas do Agente)

### `buscar_boloes`
Busca todos os bolões com `status = 'ativo'` e `data_sorteio = hoje` diretamente no Supabase.
Salva a lista na sessão (`boloes_disponiveis`) para uso em toda a conversa.

**Parâmetros:** `data_sorteio` (YYYY-MM-DD)

---

### `mostrar_bilhete`
Fluxo combinado em 3 etapas:
1. Busca uma cota disponível (`proprietario = 'erica'`, `vendida = false`, `reservada = false`)
2. Salva a cota na sessão (`cota_selecionada`)
3. Baixa `imagem_bilhete_url` do bolão no Supabase Storage e envia via Evolution API

**Parâmetros:** `loteria`, `total_cotas`, `data_sorteio`

---

### `confirmar_compra`
Registra o bolão como confirmado na sessão e detecta automaticamente a próxima fase:
- Outro bolão da mesma loteria disponível → fase `upsell`
- Bolão de outra loteria disponível → fase `downsell`
- Nenhuma opção restante → fase `fechamento`

**Parâmetros:** `loteria`, `total_cotas`, `valor_cota`, `data_sorteio`

---

### `fazer_reserva`
1. Valida CPF (algoritmo completo)
2. Cria ou recupera cliente pelo CPF
3. Para cada bolão confirmado: cria `pedido` + `pedido_cota`, marca cota como vendida
4. Retorna dados do PIX para pagamento

**Parâmetros:** `nome`, `cpf`, `telefone`

**Chave PIX:** `lotericamadre@gmail.com` — **Lotérica da Madre**

---

### `processar_comprovante`
1. Extrai CNPJ do texto (com ou sem formatação)
2. Valida contra CNPJ da Lotérica da Madre: `10.519.294/0001-16`
3. Valida presença de "madre" no texto
4. Atualiza todos os pedidos da sessão para `status = 'a_endossar'`

**Parâmetros:** `texto` (extraído pelo GPT-4o Vision da imagem enviada pelo cliente)

---

## Serviços Externos

### OpenAI
- **Modelo:** `gpt-4o`
- **Uso:** chat (tool calling), transcrição de áudio (Whisper), extração de texto de imagens (Vision)
- **Arquivo:** `src/services/openai.ts`

### Supabase
- **URL:** `https://ozfumjkluhyboxmtvjol.supabase.co`
- **Schemas:** `public` (histórico, leads) e `erica` (bolões, cotas, pedidos)
- **Arquivo:** `src/services/supabase.ts`

### Evolution API
- **URL:** `https://wsapi.dev.lotericamadreia.com`
- **Instância:** `loterica-madre`
- **Configuração importante:** `webhookBase64: true` — imagens chegam com base64 direto no payload, sem necessidade de download separado
- **Arquivo:** `src/services/whatsapp.ts`

---

## Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- npm
- Conta Supabase configurada
- Acesso à Evolution API
- Chave da OpenAI

### Instalação

```bash
# Clone o repositório
git clone https://github.com/cognusdigitalbr/programacao_madre.git
cd programacao_madre/erica-agent

# Instale as dependências
npm install

# Crie o arquivo .env com as variáveis (veja seção acima)
cp .env.example .env
# edite o .env com seus dados

# Inicie em modo desenvolvimento
npm run dev
```

O servidor sobe na porta `3000` por padrão.

### Expor para a Internet (desenvolvimento)

Use ngrok para receber webhooks da Evolution API localmente:

```bash
# Instale o ngrok
# https://ngrok.com/download

# Inicie o túnel (domínio estático recomendado)
ngrok http 3000 --domain=seu-dominio-estatico.ngrok-free.dev
```

Configure o webhook na Evolution API apontando para:
```
https://seu-dominio.ngrok-free.dev/webhook
```

### Scripts disponíveis

```bash
npm run dev      # Desenvolvimento com nodemon + ts-node (hot reload)
npm run build    # Compila TypeScript para dist/
npm run start    # Produção (requer npm run build antes)
```

---

## Deploy no VPS

### Pré-requisitos no servidor
- Ubuntu 20.04+ ou Debian 11+
- Node.js 18+ instalado
- PM2 instalado globalmente: `npm install -g pm2`
- Git instalado

### Passo a passo

```bash
# 1. Clonar o repositório
git clone https://github.com/cognusdigitalbr/programacao_madre.git /opt/erica-agent
cd /opt/erica-agent/erica-agent

# 2. Instalar dependências
npm install

# 3. Criar arquivo .env
nano .env
# preencha todas as variáveis

# 4. Build de produção
npm run build

# 5. Iniciar com PM2
pm2 start dist/server.js --name erica-agent

# 6. Configurar para reiniciar no boot
pm2 startup
pm2 save

# 7. Monitorar logs
pm2 logs erica-agent
```

### Atualizar após mudanças no código

```bash
cd /opt/erica-agent/erica-agent
git pull origin main
npm install
npm run build
pm2 restart erica-agent
```

### Configurar domínio (opcional)

Use Nginx como proxy reverso:

```nginx
server {
    listen 80;
    server_name erica.seudominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Após configurar o Nginx, atualize o webhook na Evolution API para:
```
https://erica.seudominio.com.br/webhook
```

---

## Comandos Especiais

Enviados via WhatsApp pelo cliente ou pelo operador:

| Comando | Ação |
|---|---|
| `#reset` | Apaga a sessão e o histórico de chat do cliente |
| `!resetar` | Mesmo que `#reset` |

Esses comandos são úteis para forçar um recomeço de conversa durante testes ou quando o atendimento travar.

---

## Painel Administrativo

O painel frontend está no repositório:
```
https://github.com/cognusdigitalbr/painel-adm-erica
```

Funcionalidades do painel:
- Visualizar pedidos por status (`aguardando_pagamento`, `a_endossar`, `finalizado`)
- Endossar pedidos manualmente
- Visualizar leads e clientes
- Pausar/reativar a IA para um número específico (campo `atendimento_ia`)

### Pausar IA para atendimento humano

Para pausar a Érica para um cliente específico, atualize diretamente no Supabase:

```sql
UPDATE public.leads_madre
SET atendimento_ia = 'pause'
WHERE whatsapp = '5543991415354';
```

Para reativar:

```sql
UPDATE public.leads_madre
SET atendimento_ia = 'ativa'
WHERE whatsapp = '5543991415354';
```

---

## Observações Técnicas

### Sessão Zero RAM
Todo o estado é armazenado na tabela `erica.erica_sessoes`. Campos principais:

```typescript
{
  session_id: string;           // remoteJid do WhatsApp
  fase: string;                 // abertura | venda | upsell | downsell | fechamento | aguardando_pagamento
  boloes_disponiveis: Bolao[];  // lista retornada por buscar_boloes
  boloes_oferecidos: string[];  // chaves "loteria:cotas" já mostradas
  boloes_confirmados: BolaoConfirmado[]; // bolões que o cliente confirmou
  cota_selecionada: CotaSelecionada;     // cota reservada para o cliente atual
  dados_cliente: DadosCliente;           // nome, cpf, telefone
  pedidos_ids: string[];                 // IDs dos pedidos criados
}
```

### Endereçamento LID (WhatsApp)
Alguns números chegam com `@lid` no `remoteJid` (novo formato de endereçamento do WhatsApp). O servidor tenta usar `remoteJidAlt` como fallback. Mensagens com `@lid` sem alternativa são descartadas.

### webhookBase64
A Evolution API está configurada com `webhookBase64: true`. Isso significa que imagens chegam com o campo `data.message.base64` preenchido diretamente no payload do webhook, sem necessidade de chamar a API para download. O servidor verifica esse campo primeiro antes de tentar o download manual.

### Histórico de Chat
O histórico de conversas é salvo na tabela `public.n8n_chat_histories` no formato compatível com o LangChain (campo `message` como JSONB com `type` e `content`). Os últimos 30 mensagens são carregados a cada requisição.

### Imagens dos Bolões
As imagens dos bilhetes são salvas no **Supabase Storage** e o link é armazenado no campo `imagem_bilhete_url` da tabela `erica.boloes`. A tool `mostrar_bilhete` baixa a imagem, converte para base64 e envia via Evolution API.

### CNPJ da Lotérica da Madre
```
10.519.294/0001-16
Razão Social: Loterica da Madre Ltda
```
O comprovante é validado pelo CNPJ + presença da palavra "madre" no texto extraído.

---

## Informações do Projeto

- **Empresa:** MMX Empreendimentos Digitais
- **Cliente:** Lotérica da Madre
- **Repositório:** `https://github.com/cognusdigitalbr/programacao_madre`
- **Pasta no repo:** `erica-agent/`
