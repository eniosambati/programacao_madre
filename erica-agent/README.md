# Érica Agent — Agente de Vendas de Bolões via WhatsApp

Agente de inteligência artificial para venda de bolões de loteria via WhatsApp, desenvolvido para a **Lotérica da Madre**. A Érica é uma vendedora virtual que atende clientes, apresenta bolões disponíveis, conduz o fluxo de venda com upsell/downsell, coleta dados do comprador, gera chave PIX e valida o comprovante de pagamento — tudo de forma automatizada via WhatsApp.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Fluxo de Venda](#fluxo-de-venda)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Banco de Dados (Supabase)](#banco-de-dados-supabase)
- [API — Endpoints](#api--endpoints)
- [Tools da IA](#tools-da-ia)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Instalação e Execução](#instalação-e-execução)
- [Deploy em Produção (VPS)](#deploy-em-produção-vps)
- [Comandos de Administração](#comandos-de-administração)
- [Histórico de Fixes](#histórico-de-fixes)

---

## Visão Geral

A Érica é uma IA que funciona como vendedora de bolões de loteria. Quando um cliente envia mensagem no WhatsApp da Lotérica da Madre, a Evolution API encaminha para o webhook da Érica, que processa a mensagem, consulta o banco de dados de bolões disponíveis e conduz a conversa de venda com personalidade humana e fluxo comercial estruturado.

**Capacidades principais:**
- Apresentar bolões disponíveis com acumulados em tempo real
- Enviar imagem do bilhete (jogos completos)
- Conduzir upsell (mesma loteria, mais cotas) e downsell (outra loteria)
- Coletar nome, WhatsApp e CPF do comprador com validação
- Gerar instrução de pagamento via PIX (CNPJ)
- Validar comprovante de pagamento por OCR (GPT-4o Vision)
- Processar áudio (transcrição automática via Whisper)
- Solicitar atendimento humano quando necessário
- Detectar cliente retornante e retomar a sessão

---

## Stack Tecnológica

| Tecnologia | Uso |
|---|---|
| **Node.js + TypeScript** | Runtime e linguagem principal |
| **Express** | Servidor HTTP e webhook |
| **OpenAI GPT-4o** | Agente de IA (tool calling), OCR de comprovante e bilhete, transcrição de áudio |
| **Supabase** | Banco de dados principal (PostgreSQL) |
| **Evolution API** | Integração com WhatsApp |
| **Docker Swarm** | Orquestração em produção |
| **Easypanel + Traefik** | Painel de deploy e proxy reverso na VPS |

---

## Arquitetura

```
WhatsApp (cliente)
       │
       ▼
Evolution API  ──►  POST /webhook  (Express)
                          │
                          ▼
                    server.ts
                    ├─ Filtra mensagens (fromMe, grupos, eventos)
                    ├─ Detecta tipo de mídia (texto, imagem, áudio, PDF)
                    ├─ Transcreve áudio (Whisper)
                    ├─ OCR de imagem/PDF (GPT-4o Vision)
                    └─ Chama runErica()
                          │
                          ▼
                    agent/erica.ts  (loop principal)
                    ├─ Carrega sessão do Supabase
                    ├─ Carrega histórico de chat (últimas 30 msgs)
                    ├─ Detecta fase da sessão
                    ├─ Guards server-side (fechamento, upsell, etc.)
                    ├─ Chama OpenAI com tool calling
                    └─ Executa tools conforme necessário
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
        boloes.ts     cotas.ts    reservas.ts
        (Supabase)  (Supabase)  (Supabase + PIX)
                          │
                          ▼
                    sendText() / sendImage()
                    (Evolution API → WhatsApp)
```

---

## Fluxo de Venda

O agente opera em **6 fases** controladas pela sessão no Supabase:

```
abertura
   │  Cliente envia primeira mensagem
   │  Érica se apresenta e mostra acumulados
   ▼
venda
   │  Érica lista bolões disponíveis
   │  Cliente escolhe loteria
   │  Érica envia imagem do bilhete
   │  Cliente confirma ("quero", "pode", "fico", etc.)
   ▼
upsell
   │  Érica oferece mais cotas da mesma loteria
   │  SE aceitar → mostrar_bilhete → confirmar_compra
   │  SE recusar → downsell
   ▼
downsell
   │  Érica oferece bolão de outra loteria
   │  SE aceitar → mostrar_bilhete → confirmar_compra
   │  SE recusar → ir_para_fechamento
   ▼
fechamento
   │  Servidor exibe revisão do carrinho
   │  Coleta nome completo, WhatsApp com DDD, CPF
   │  Valida CPF com algoritmo oficial
   │  Gera instrução PIX com chave CNPJ
   ▼
aguardando_pagamento
   │  Cliente envia comprovante (imagem ou texto)
   │  OCR extrai dados do recebedor e CNPJ
   │  Valida CNPJ da Lotérica da Madre
   │  SE aprovado → reserva confirmada → reset de sessão
   │  SE expirado (sorteio passado) → reset silencioso
```

---

## Estrutura de Arquivos

```
erica-agent/
├── src/
│   ├── agent/
│   │   ├── erica.ts          # Agente principal — loop de tool calling
│   │   ├── prompts.ts        # buildSystemPrompt + contexto por fase
│   │   └── tools.ts          # Definição das tools para OpenAI
│   │
│   ├── tools/
│   │   ├── boloes.ts         # toolBuscarBoloes — busca bolões ativos no Supabase
│   │   ├── cotas.ts          # toolBuscarEscolherCota — seleciona cota disponível
│   │   ├── imagens.ts        # toolEnviarImagem — envia bilhete via Evolution API
│   │   ├── reservas.ts       # toolFazerReservas + toolProcessarComprovante
│   │   └── humano.ts         # toolSolicitarHumano — transfere para atendente
│   │
│   ├── services/
│   │   ├── supabase.ts       # Clientes Supabase (schema public + erica)
│   │   ├── session.ts        # Gestão de sessão (getSessao, saveSessao, etc.)
│   │   ├── openai.ts         # Cliente OpenAI — OCR, Whisper, extractBilheteNumbers
│   │   ├── coleta-dados.ts   # Parser de nome, telefone e CPF das mensagens
│   │   └── whatsapp.ts       # sendText, sendImage, downloadMedia (Evolution API)
│   │
│   ├── scripts/
│   │   └── atualizar-resultados.ts  # Cron que atualiza acumulados das loterias (6h)
│   │
│   ├── server.ts             # Servidor Express + webhook + endpoint /api/extrair-bilhete
│   └── types.ts              # Interfaces TypeScript (MessageContext, Bolao, SessaoErica, etc.)
│
├── docs/
│   └── sessao-11-03-2026.md  # Documentação de sessão de desenvolvimento
│
├── check_boloes.mjs          # Script para verificar bolões e cotas disponíveis
├── test-bilhete.mjs          # Script para testar o endpoint /api/extrair-bilhete
├── CHANGELOG.md              # Histórico de versões e fixes
├── package.json
├── tsconfig.json
└── .env                      # Variáveis de ambiente (não commitado)
```

---

## Banco de Dados (Supabase)

O projeto usa dois schemas no mesmo projeto Supabase:

### Schema `public`

| Tabela | Descrição |
|---|---|
| `n8n_chat_histories` | Histórico de mensagens (`session_id`, `message` JSONB com `type` e `content`) |
| `leads_madre` | Leads cadastrados (`whatsapp`, `nome`, `is_cliente`) |
| `resultados_loterias` | Acumulados atualizados pelo cron (`loteria`, `acumulado`, `created_at`) |

### Schema `erica`

| Tabela | Descrição |
|---|---|
| `erica_sessoes` | Estado completo da sessão por cliente (fase, bolões confirmados, dados, etc.) |
| `boloes` | Bolões cadastrados (`codigo`, `loteria_id`, `total_cotas`, `valor_cota`, `data_sorteio`, `status`, `jogos`) |
| `cotas` | Cotas individuais de cada bolão (`proprietario='erica'`, `vendida`, `reservada`) |
| `clientes` | Clientes com CPF validado (`nome`, `cpf`, `telefone`) |
| `pedidos` | Pedidos de compra (`cliente_id`, `status`, `total`) |
| `pedidos_cotas` | Relação pedido ↔ cota comprada |

### Interface `SessaoErica`

```typescript
interface SessaoErica {
  session_id: string;
  fase: 'abertura' | 'venda' | 'upsell' | 'downsell' | 'fechamento' | 'aguardando_pagamento';
  cota_selecionada: CotaSelecionada | null;
  cotas_pre_selecionadas: Record<string, CotaSelecionada>;
  boloes_confirmados: BolaoConfirmado[];
  boloes_oferecidos: string[];           // códigos dos bolões já exibidos
  boloes_disponiveis: Bolao[];
  loterias_listadas: string[];
  ultimo_bilhete_mostrado: string | null;
  dados_cliente: DadosCliente | null;    // { nome, cpf, telefone }
  pedidos_ids: string[];
  ultima_atividade: string;
}
```

---

## API — Endpoints

### `POST /webhook`
Recebe mensagens do WhatsApp via Evolution API.

**Suporte a tipos de mídia:**
- `text` — mensagem de texto normal
- `image` — imagem (comprovante PIX ou bilhete)
- `audio` — áudio (transcrição via Whisper)
- `document` — PDF (extração de texto)

**Comandos especiais:**
- `#reset` ou `!resetar` — limpa a sessão e o histórico do cliente

**Fluxo interno:**
1. Filtra mensagens enviadas pelo bot (`fromMe`) e eventos que não são mensagens
2. Suporte a LID (novo modo de endereçamento WhatsApp)
3. Detecta e baixa mídia se necessário
4. Transcreve áudio ou extrai texto de imagem/PDF
5. Registra lead no banco se novo cliente
6. Chama `runErica()` com o contexto completo

---

### `POST /api/extrair-bilhete`
Endpoint para o Painel Admin (Lovable) extrair dados de um bilhete por OCR.

**Body:**
```json
{
  "imageBase64": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "sucesso": true,
  "loteria": "Mega-Sena",
  "concurso": "2850",
  "total_cotas": 10,
  "valor_cota": 23.62,
  "jogos": [
    ["01", "09", "23", "36", "44", "55"],
    ["02", "10", "28", "37", "45", "56"]
  ]
}
```

---

### `GET /`
Health check — retorna `"Érica Agent online 🍀"`.

---

## Tools da IA

A IA usa **tool calling** do OpenAI para executar ações estruturadas. Cada tool tem validações server-side que impedem uso indevido.

| Tool | Descrição |
|---|---|
| `buscar_boloes` | Busca todos os bolões ativos com acumulados |
| `listar_jogos_loteria` | Envia lista formatada de bolões de uma loteria específica |
| `mostrar_bilhete` | Seleciona cota e envia imagem do bilhete |
| `confirmar_compra` | Registra confirmação do cliente — valida frase e bilhete exibido |
| `ir_para_fechamento` | Encerra vendas e inicia coleta de dados do comprador |
| `limpar_carrinho` | Remove todos os bolões confirmados da sessão |
| `processar_comprovante` | OCR do comprovante PIX e validação do CNPJ |
| `solicitar_humano` | Pausa a IA e transfere para atendente humano |

### Regras de segurança das tools

- `confirmar_compra` só executa se o cliente usou palavra de confirmação explícita E o bilhete do bolão foi exibido antes (`ultimo_bilhete_mostrado`)
- `ir_para_fechamento` só executa se há bolões confirmados no carrinho
- Durante `fase=fechamento`, o servidor responde diretamente sem passar para a IA (100% server-side)
- `processar_comprovante` valida o CNPJ `10.519.294/0001-16` da Lotérica da Madre

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Evolution API (WhatsApp)
EVOLUTION_URL=https://sua-instancia.evolution.com
EVOLUTION_INSTANCE=nome-da-instancia
EVOLUTION_API_KEY=sua-api-key

# Servidor
PORT=3000
```

---

## Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Supabase com schemas `public` e `erica` configurados
- Instância Evolution API ativa
- Chave de API OpenAI

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/eniosambati/programacao_madre.git
cd programacao_madre/erica-agent

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais
```

### Execução em desenvolvimento

```bash
npm run dev
```

O servidor inicia na porta `3000` (ou a definida em `PORT`).

### Build e execução em produção

```bash
npm run build
npm start
```

---

## Deploy em Produção (VPS)

O projeto roda em uma VPS Hostinger com Docker Swarm + Easypanel.

**Informações da VPS:**
- IP: `147.79.106.232`
- Infra: Docker Swarm + Easypanel + Traefik
- Arquivo `.env` na VPS: `/opt/erica-agent/.env`

### Fluxo de deploy

1. Fazer alterações localmente
2. Commit e push para o GitHub:
```bash
git add erica-agent/
git commit -m "fix: descrição do fix"
git push origin main
```
3. Na VPS, atualizar o serviço:
```bash
docker service update --force erica-agent
```

> **Importante:** Use sempre `docker service update --force` — nunca `docker restart`. O Swarm gerencia o rolling update sem downtime.

### Ver logs em tempo real

```bash
docker service logs erica-agent --tail 50 -f
```

### Verificar status do serviço

```bash
docker service ls
docker service ps erica-agent
```

---

## Comandos de Administração

### Via WhatsApp (cliente)

| Comando | Ação |
|---|---|
| `#reset` | Limpa sessão e histórico do cliente |
| `!resetar` | Mesmo efeito que `#reset` |

### Scripts locais

```bash
# Verificar bolões e cotas disponíveis no Supabase
node check_boloes.mjs

# Testar endpoint de OCR do bilhete
node test-bilhete.mjs

# Atualizar acumulados das loterias manualmente
npx ts-node src/scripts/atualizar-resultados.ts
```

### Cron de acumulados

O script `atualizar-resultados.ts` roda automaticamente a cada 6 horas via cron configurado no servidor. Ele busca os resultados atuais das loterias na API da Caixa Econômica (via mirror Heroku) e atualiza a tabela `resultados_loterias` no Supabase.

---

## Painel Administrativo

O projeto possui um painel web desenvolvido em **Lovable** para cadastro e gestão de bolões.

- **Repositório:** `https://github.com/cognusdigitalbr/painel-adm-erica`
- **Funcionalidade principal:** Cadastro de bolão em 3 etapas:
  1. **Dados Básicos** — loteria, data do sorteio, número de cotas, valor
  2. **Jogos (OCR IA)** — escaneia o bilhete físico com IA e extrai as dezenas automaticamente
  3. **Distribuição** — distribui as cotas entre os vendedores

O painel se comunica com o backend via:
- `POST /api/extrair-bilhete` — OCR do bilhete
- Supabase diretamente (schema `erica`)

---

## Histórico de Fixes

| Fix | Descrição |
|---|---|
| fix-bug54 | Trava do carrinho durante fase de fechamento |
| fix-bug55 | Mensagem PIX sem prefixo técnico de cota |
| fix-bug56 | OCR comprovante não extrai valor (evita rejeição incorreta) |
| fix-bug57 | Parser de telefone com 12 dígitos e DDD válido |
| fix-bug58 | Feedback server-side para dados inválidos (CPF, nome, tel) |
| fix-bug59 | Confirmação progressiva ao salvar nome/telefone |
| fix-bug60 | Fechamento 100% server-side com catch-all |
| fix-bug61 | Cliente retornante + lembrete PIX + reset após comprovante aprovado |
| fix-bug62 | Remove loterias sem bolão ativo da lista inicial |
| fix-bug63-65 | Correção de SyntaxErrors (newlines corrompidas em strings) |
| fix-bug66 | Guard `lista_enviada` no loop de tools (evita resposta duplicada) |
| fix-bug67-68 | Remove guard que causava loop ao reiniciar container |
| fix-bug69 | `detectarPedidoMultiplasCotas` não interpreta números soltos como cotas |

Detalhes completos: ver `CHANGELOG.md`

---

## Empresa

**Lotérica da Madre Ltda**
CNPJ: 10.519.294/0001-16

**Desenvolvido por:** MMX Empreendimentos Digitais
