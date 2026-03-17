# Érica Agent — Histórico de Alterações

## fix-bug28
**Data:** 08/03/2026
**Arquivo:** `src/agent/erica.ts`
**Problema:** Upsell e downsell não funcionavam corretamente após confirmação de compra.
**Solução:** Injeção de fase upsell/downsell no loop do agente com o código exato do próximo bolão.

---

## fix-bug29
**Data:** 08/03/2026
**Arquivo:** `src/agent/prompts.ts`
**Problema:** Com 5 bolões de Mega-Sena disponíveis, a Érica mostrava apenas 3 (agrupava pelo preço).
**Solução:** Regra explícita no prompt: cada bolão é um bilhete diferente mesmo com preço igual — listar TODOS individualmente com numeração sequencial.

---

## fix-bug30
**Data:** 08/03/2026
**Arquivo:** `src/agent/prompts.ts`
**Problema:** Após listar bolões e cliente digitar "2", a Érica perguntava de novo "Posso te mostrar o bilhete?".
**Solução:** Regra: escolha de número da lista já é confirmação — chamar `mostrar_bilhete` diretamente.

---

## fix-bug31
**Data:** 08/03/2026
**Arquivos:** `src/agent/prompts.ts`, `src/agent/erica.ts`
**Problema:** "(10 cotas)" aparecia na revisão de compras durante o fechamento.
**Solução:** Removido `(X cotas)` do carrinho exibido durante revisão.

---

## fix-bug32
**Data:** 08/03/2026
**Arquivo:** `src/agent/prompts.ts`
**Problema:** GPT-4o mascarava o CPF como "[CPF RECEBIDO]" ao chamar tools, causando loop de CPF inválido.
**Solução:** Regra crítica: NUNCA censurar, mascarar ou substituir CPF/dados do cliente ao chamar tools.

---

## fix-bug33
**Data:** 08/03/2026
**Arquivo:** `src/agent/prompts.ts`
**Problema:** Érica comparava o valor do comprovante com o total do carrinho e rejeitava comprovantes válidos.
**Solução:** Regra ABSOLUTAMENTE PROIBIDO comparar valores — a tool `processar_comprovante` é quem decide.

---

## fix-bug34
**Data:** 08/03/2026
**Arquivos:** `src/agent/prompts.ts`, `src/server.ts`
**Problema:** Documentos enviados (Word, Excel, etc.) eram ignorados silenciosamente.
**Solução:** Server repassa nome do arquivo; Érica instrui cliente a reenviar como imagem ou foto.

---

## fix-bug35
**Data:** 08/03/2026
**Arquivo:** `src/server.ts`, `package.json`
**Problema:** Comprovantes em PDF eram ignorados (sistema só processava imagens).
**Solução:** Adicionado `pdf-parse`; extrai texto do PDF diretamente. Tenta base64 do payload primeiro (webhookBase64), fallback em `downloadMedia`.

---

## fix-bug36
**Data:** 10/03/2026
**Arquivo:** `src/tools/reservas.ts`
**Problema:** OCR do GPT Vision mascarava dígitos do CNPJ: `**.**9.294/0001-**` — sistema não reconhecia o comprovante.
**Solução:** Fallback de validação por fragmento: se texto contém `9.294/0001` (ou variações) + "madre" → comprovante aceito.

---

## fix-bug37
**Data:** 10/03/2026
**Arquivo:** `src/agent/prompts.ts`
**Problema:** Quando comprovante era rejeitado, Érica pedia nome/CPF/WhatsApp novamente.
**Solução:** Regra: ao falhar comprovante, pedir APENAS reenvio da imagem — nunca pedir dados do cliente.

---

## fix-bug38
**Data:** 10/03/2026
**Arquivos:** `src/tools/humano.ts` (novo), `src/agent/tools.ts`, `src/agent/erica.ts`, `src/agent/prompts.ts`
**Problema:** Sem mecanismo de intervenção humana — Érica ficava em loop sem saída.
**Solução:** Nova tool `solicitar_humano`:
- Pausa a IA no Supabase (`atendimento_ia = 'pause'`)
- Envia notificação WhatsApp para o atendente (5543991415354)
- Gatilhos: cliente pede atendente, loop 3x sem resolução, frustração extrema
- Para reativar: alterar campo `atendimento_ia` para `null` no Supabase (tabela `leads_madre`)

---

## fix-bug39
**Data:** 10/03/2026
**Arquivos:** `src/services/coleta-dados.ts` (novo), `src/agent/erica.ts`, `src/agent/prompts.ts`
**Problema:** Coleta de nome/CPF/telefone dependia da IA — causava loops, dados perdidos e alucinações.
**Solução:** Servidor assume a coleta de dados (arquivo `coleta-dados.ts`):
- Detecta nome (2+ palavras com letras)
- Detecta telefone por DDD válido (distingue de CPF automaticamente)
- Detecta CPF (11 dígitos sem DDD válido, ou formatado com pontos/traço)
- Acumula na sessão progressivamente
- Quando os 3 estão prontos e CPF é válido → `fazer_reserva` disparada pelo servidor
- Se CPF inválido → limpa CPF da sessão, IA pede só o CPF

---

## fix-bug40
**Data:** 10/03/2026
**Arquivo:** `src/agent/erica.ts`
**Problema:** Érica gerava a revisão do carrinho e podia omitir itens (alucinação).
**Solução:** Servidor envia a mensagem de revisão diretamente ao cliente quando fase muda para `fechamento`, usando os dados exatos do banco. IA só aguarda confirmação — nunca escreve o carrinho.

---

## fix-bug41
**Data:** 10/03/2026
**Arquivos:** `src/agent/erica.ts`, `src/agent/tools.ts`
**Problema:** Três falhas críticas simultâneas:
1. IA ainda chamava `fazer_reserva` diretamente (ignorando instrução do prompt) usando dados inventados ("seu CPF")
2. `boloes_confirmados` acumulava entre transações sem ser limpo após reserva
3. `dados_cliente` da transação anterior era reutilizado na nova transação

**Solução:**
1. `fazer_reserva` removida do array `TOOLS` — IA fisicamente não consegue mais chamar
2. Após reserva bem-sucedida no servidor → `boloes_confirmados` e `dados_cliente` zerados
3. Ao entrar na fase `fechamento` → `dados_cliente` zerado para coleta sempre fresca

---

## fix-bug42
**Data:** 10/03/2026
**Arquivo:** `src/agent/prompts.ts`
**Problema:** Mensagem de confirmação de pagamento era definitiva ("Sua cota está garantida").
**Solução:** Mensagem alterada para: *"Pagamento em análise. Por favor aguarde a confirmação! 🙏"*

---

## fix-bug43 (pendente deploy)
**Data:** 10/03/2026
**Arquivo:** `src/tools/boloes.ts`
**Problema:** Bolões do dia do sorteio ainda apareciam após o sorteio ter ocorrido.
**Solução:** Corte horário no servidor (não no prompt):
- **Antes das 17h** → filtro `>= hoje` (inclui bolões do dia — vendemos até 17h)
- **A partir das 17h** → filtro `> hoje` (remove bolões do dia)
- Sorteios ocorrem às 21h — corte às 17h garante margem segura
- **Status: aguardando aprovação para deploy**

---

## Arquitetura do Fluxo (estado atual)

```
CLIENTE CONFIRMA COMPRA
        ↓
[SERVIDOR] Envia revisão do carrinho (dados do banco — nunca da IA)
        ↓
Cliente diz "sim"
        ↓
[SERVIDOR] Pede nome, WhatsApp e CPF (IA conduz a conversa)
        ↓
[SERVIDOR] Detecta e salva dados progressivamente (coleta-dados.ts)
  - Nome: 2+ palavras com letras
  - Telefone: DDD válido (distingue de CPF)
  - CPF: 11 dígitos sem DDD / formatado com pontos e traço
        ↓
CPF válido? SIM → [SERVIDOR] Dispara fazer_reserva → envia PIX
           NÃO → Pede só o CPF novamente
        ↓
[SERVIDOR] Limpa boloes_confirmados + dados_cliente após reserva
        ↓
Cliente envia comprovante (imagem ou PDF)
        ↓
[IA] Detecta comprovante → chama processar_comprovante
        ↓
[SERVIDOR] Valida CNPJ (10519294000116 | Lotérica da Madre)
  - CNPJ completo: validação direta
  - CNPJ mascarado pelo OCR: validação por fragmento + razão social
        ↓
Sucesso → "Pagamento em análise. Por favor aguarde a confirmação! 🙏"
Falha   → Informa motivo, pede reenvio (nunca pede dados do cliente)
```

---

## Regras de Negócio Fixas no Servidor

| Regra | Implementação | Arquivo |
|---|---|---|
| Venda encerra às 17h no dia do sorteio | Filtro dinâmico `gte`/`gt` por hora | `src/tools/boloes.ts` |
| Coleta de dados progressiva | Parser com heurística de DDD | `src/services/coleta-dados.ts` |
| Revisão do carrinho | Enviada pelo servidor, não pela IA | `src/agent/erica.ts` |
| fazer_reserva | Servidor dispara — IA não tem acesso | `src/agent/tools.ts` |
| CNPJ mascarado pelo OCR | Fallback por fragmento | `src/tools/reservas.ts` |
| Intervenção humana | Tool solicitar_humano | `src/tools/humano.ts` |

---

## Tags Docker em Produção

| Tag | Fix | Status |
|---|---|---|
| `fix-bug15` | cotas_pre_selecionadas em memória | substituída |
| `fix-bug28` | injeção upsell/downsell | substituída |
| `fix-bug36` | CNPJ mascarado OCR | substituída |
| `fix-bug38` | intervenção humana | substituída |
| `fix-bug39` | coleta de dados no servidor | substituída |
| `fix-bug40` | revisão do carrinho no servidor | substituída |
| `fix-bug41` | fazer_reserva removida do TOOLS | substituída |
| `fix-bug42` | mensagem pagamento em análise | **✅ atual** |
| `fix-bug43` | corte 17h bolões do dia | ⏳ aguardando deploy |

---

## Informações da Infraestrutura

- **VPS:** Hostinger — IP `147.79.106.232`
- **SSH:** `root` / `BR9XM6AfviigeKy#`
- **Deploy:** `docker service update --force erica-agent` (não usar docker restart)
- **Logs:** `docker service logs erica-agent --tail 20`
- **Infra:** Docker Swarm + Easypanel + Traefik
- **Evolution API:** `https://wsapi.dev.lotericamadreia.com` — instance: `loterica-madre`
- **Supabase:** `https://ozfumjkluhyboxmtvjol.supabase.co` (schema: erica)
- **CNPJ Lotérica da Madre:** 10.519.294/0001-16
- **PIX:** lotericamadre@gmail.com
- **Atendente humano:** 5543991415354
