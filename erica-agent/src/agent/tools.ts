export const TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'buscar_boloes',
      description: 'Busca todos os bolões disponíveis para o dia. Use no início da conversa e sempre que precisar listar opções.',
      parameters: {
        type: 'object',
        properties: {
          data_sorteio: { type: 'string', description: 'Data do sorteio em formato YYYY-MM-DD' }
        },
        required: ['data_sorteio']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mostrar_bilhete',
      description: 'Busca uma cota disponível e envia a imagem do bilhete ao cliente. Chame SEMPRE que o cliente quiser ver um bolão. O sistema gerencia a cota automaticamente.',
      parameters: {
        type: 'object',
        properties: {
          loteria: { type: 'string', description: 'Nome da loteria exatamente como retornado por buscar_boloes' },
          total_cotas: { type: 'number', description: 'Total de cotas do bolão retornado por buscar_boloes' },
          data_sorteio: { type: 'string', description: 'Data do sorteio YYYY-MM-DD' }
        },
        required: ['loteria', 'total_cotas', 'data_sorteio']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'confirmar_compra',
      description: 'Registra que o cliente confirmou a compra de um bolão. Chame IMEDIATAMENTE quando o cliente disser "sim", "quero", "pode ser" ou qualquer confirmação.',
      parameters: {
        type: 'object',
        properties: {
          loteria: { type: 'string', description: 'Nome da loteria confirmada' },
          total_cotas: { type: 'number', description: 'Total de cotas do bolão confirmado' },
          valor_cota: { type: 'number', description: 'Valor da cota em número (ex: 23.62)' },
          data_sorteio: { type: 'string', description: 'Data do sorteio YYYY-MM-DD' }
        },
        required: ['loteria', 'total_cotas', 'valor_cota', 'data_sorteio']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fazer_reserva',
      description: 'Finaliza as reservas de todos os bolões confirmados e retorna dados do PIX. Use SOMENTE após coletar nome, CPF e telefone do cliente e após encerrar todo upsell/downsell.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome completo do cliente' },
          cpf: { type: 'string', description: 'CPF do cliente' },
          telefone: { type: 'string', description: 'Telefone do cliente com DDD' }
        },
        required: ['nome', 'cpf', 'telefone']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'processar_comprovante',
      description: 'Processa o comprovante PIX enviado pelo cliente. Use quando o cliente enviar o comprovante de pagamento.',
      parameters: {
        type: 'object',
        properties: {
          texto: { type: 'string', description: 'Texto do comprovante enviado pelo cliente' }
        },
        required: ['texto']
      }
    }
  }
];
