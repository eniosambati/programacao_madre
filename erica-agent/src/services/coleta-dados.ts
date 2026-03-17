import { validarCPF } from '../tools/reservas';

// DDDs válidos do Brasil
const DDDS_VALIDOS = [11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99];

export interface DadosExtraidos {
  nome?: string;
  telefone?: string;
  cpf?: string;
}

// Retorna true se o número de 11 dígitos parece um telefone celular brasileiro (DDD válido)
function ehTelefone(num: string): boolean {
  if (num.length !== 11) return false;
  const ddd = parseInt(num.substring(0, 2), 10);
  return DDDS_VALIDOS.includes(ddd);
}

// Tenta normalizar um número para 11 dígitos (DDD + 9 dígitos)
// Lida com o caso de 12 dígitos com DDD válido (cliente digitou zero extra no meio)
// Ex: "439991415354" → "43" + "991415354" = "43991415354"
function normalizarTelefone(soNumeros: string): string | null {
  const len = soNumeros.length;

  // 11 dígitos com DDD válido → OK
  if (len === 11 && ehTelefone(soNumeros)) return soNumeros;

  // 10 dígitos com DDD válido → fixo, aceita como está
  if (len === 10) {
    const ddd = parseInt(soNumeros.substring(0, 2), 10);
    if (DDDS_VALIDOS.includes(ddd)) return soNumeros;
  }

  // 12 dígitos começando com DDD válido (não 55) → remove o 3º dígito (zero extra digitado)
  // Ex: "430991415354" → "43" + "991415354" = "43991415354"
  if (len === 12 && !soNumeros.startsWith('55')) {
    const ddd = parseInt(soNumeros.substring(0, 2), 10);
    if (DDDS_VALIDOS.includes(ddd)) {
      const normalizado = soNumeros.slice(0, 2) + soNumeros.slice(3);
      if (normalizado.length === 11) return normalizado;
    }
  }

  // 12 ou 13 dígitos começando com 55 (código do Brasil)
  if ((len === 12 || len === 13) && soNumeros.startsWith('55')) {
    return soNumeros.slice(-11);
  }

  return null;
}

// Extrai dados de uma única mensagem
// Suporta: tudo junto ("Nome / telefone / cpf"), separado por linha, ou um dado por mensagem
export function extrairDados(texto: string): DadosExtraidos {
  const resultado: DadosExtraidos = {};

  // Divide por separadores comuns: nova linha, vírgula, barra, pipe
  const tokens = texto
    .split(/[\n\r,\/|]+/)
    .map(t => t.trim())
    .filter(t => t.length > 1);

  for (const token of tokens) {
    // Remove formatação de número (pontos, traços, parênteses, espaços)
    const soNumeros = token.replace(/[\s.\-()]/g, '');

    if (/^\d+$/.test(soNumeros)) {
      const len = soNumeros.length;

      // CPF formatado com pontos e traço: 000.000.000-00 — sem ambiguidade
      if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(token)) {
        resultado.cpf = resultado.cpf || soNumeros;
        continue;
      }

      // Tenta normalizar como telefone (lida com 10, 11, 12 com DDD, 12-13 com 55)
      const telNorm = normalizarTelefone(soNumeros);
      if (telNorm) {
        resultado.telefone = resultado.telefone || telNorm;
        continue;
      }

      // 11 dígitos sem DDD válido → CPF
      if (len === 11) {
        resultado.cpf = resultado.cpf || soNumeros;
        continue;
      }

      // Outros tamanhos → ignora (9 dígitos, 8 dígitos sem DDD, etc.)
    } else {
      // Token com letras — verifica se é nome (2+ palavras com letras/acentos)
      const palavras = token.split(/\s+/).filter(p => /^[a-zA-ZÀ-ÿ'-]+$/.test(p) && p.length >= 2);
      if (palavras.length >= 2 && !resultado.nome) {
        const tokenLower = token.toLowerCase();
        const primeiraP = tokenLower.split(/\s+/)[0];
        // Palavras que indicam que não é um nome próprio
        const verbosInicioNaoNome = [
          'vc', 'voce', 'você', 'tem', 'preciso', 'quero', 'qual', 'quando', 'onde', 'como',
          'pode', 'nao', 'sim', 'ok', 'meu', 'minha', 'tá', 'ta', 'de', 'do', 'da', 'e', 'é',
          'inclua', 'inclui', 'incluir', 'adiciona', 'adicione', 'adicionar', 'faltou', 'falta',
          'coloca', 'coloque', 'colocar', 'queria', 'gostaria', 'precisa', 'finaliza', 'finalizar',
          'cancela', 'cancelar', 'remove', 'remover', 'limpa', 'limpar', 'este', 'essa', 'esse',
          'nao', 'não', 'nunca', 'sempre', 'pelo', 'pela', 'para', 'por', 'com', 'sem', 'mas',
        ];
        const ehPergunta = token.includes('?');
        const ehVerboPrimeiro = verbosInicioNaoNome.includes(primeiraP);
        const contemVerbo = /\b(tem|tenho|quero|pode|ter|preciso|consegue|sabe|existe|ta|tá|inclua|incluir|adicionar|faltou|colocar|finalizar|cancelar)\b/.test(tokenLower);
        // Rejeita: perguntas, frases iniciadas com verbo/preposição, ou frases longas com verbos de ação
        if (!ehPergunta && !ehVerboPrimeiro && !(palavras.length > 3 && contemVerbo)) {
          resultado.nome = token.replace(/\s+/g, ' ').trim();
        }
      }
    }
  }

  return resultado;
}

// Mescla dados novos com dados já salvos na sessão
// Regra: não sobrescreve dados já válidos, EXCETO o CPF (cliente pode estar corrigindo)
// Verifica se um nome salvo parece válido (2+ palavras com letras)
function nomeParecido(nome: string): boolean {
  if (!nome) return false;
  const palavras = nome.split(/\s+/).filter(p => /^[a-zA-ZÀ-ÿ'-]+$/.test(p) && p.length >= 2);
  return palavras.length >= 2;
}

export function mesclarDados(
  atual: { nome: string; cpf: string; telefone: string } | null,
  novos: DadosExtraidos
): { nome: string; cpf: string; telefone: string } {
  // Preserva nome anterior só se ele parece válido (não sobrescreve com lixo)
  const nomeAtualValido = nomeParecido(atual?.nome || '');
  const nome = (nomeAtualValido ? atual!.nome : null) || novos.nome || atual?.nome || '';
  const telefone = atual?.telefone || novos.telefone || '';

  // CPF: usa o novo se veio explícito
  // Se já temos telefone salvo e chegou um número no slot de telefone que é DIFERENTE do salvo
  // → esse número novo é na verdade o CPF (cliente mandou só o CPF)
  let cpf = '';
  if (novos.cpf) {
    cpf = novos.cpf;
  } else if (atual?.telefone && novos.telefone && novos.telefone !== atual.telefone) {
    // Ex: sessão tem tel=43991415354, cliente manda "01574858971" (sem DDD válido → foi para tel no parser)
    // → o parser colocou em telefone mas já temos telefone → é o CPF
    cpf = novos.telefone;
  } else {
    cpf = atual?.cpf || '';
  }

  return { nome, telefone, cpf };
}

// Status da coleta — usado pelo prompt para saber o que pedir
export function statusColeta(dados: { nome: string; cpf: string; telefone: string } | null): {
  completo: boolean;
  cpfValido: boolean;
  faltando: string[];
} {
  if (!dados) return { completo: false, cpfValido: false, faltando: ['nome', 'telefone', 'CPF'] };

  const faltando: string[] = [];
  if (!dados.nome) faltando.push('nome completo');
  if (!dados.telefone) faltando.push('WhatsApp');
  if (!dados.cpf) faltando.push('CPF');

  const cpfValido = dados.cpf ? validarCPF(dados.cpf) : false;
  if (dados.cpf && !cpfValido) faltando.push('CPF válido (o informado está incorreto)');

  const completo = faltando.length === 0 && cpfValido;
  return { completo, cpfValido, faltando };
}
