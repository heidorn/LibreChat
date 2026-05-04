import type { LphManusRouteDecision } from '../../../../data-provider/src/types/lphManusRouter';
import { prepareLphManusFileHandling } from '../lphManusFileHandlingAdapter';

const baseDecision: LphManusRouteDecision = {
  intent: 'file_analysis',
  primaryProvider: 'google',
  primaryModel: 'gemini-2.5-pro',
  fallbackProvider: 'anthropic',
  fallbackModel: 'claude-sonnet-4-5-20250929',
  costPolicy: 'balanced',
  artifactType: 'none',
  reason: 'arquivo anexado; usando análise de arquivo',
  matchedSignals: ['file_upload'],
};

const makeDecision = (metadata: Partial<LphManusRouteDecision>): LphManusRouteDecision => ({
  ...baseDecision,
  ...metadata,
});

const clientRouterContractCases = [
  {
    name: 'PDF curto',
    decision: makeDecision({
      fileKind: 'pdf',
      fileHandlingMode: 'document_parse',
      recommendedToolResource: 'document_parser',
      needsRag: false,
      recommendedModelReason: 'PDF curto; parser/contexto inline ou attachment nativo funciona bem',
      matchedSignals: ['file_upload', 'file_kind_pdf'],
    }),
    expected: {
      valid: true,
      mode: 'document_parser',
      toolResource: 'document_parser',
      needsVision: false,
      needsRag: false,
      fileKind: 'pdf',
      warnings: [],
      reason: 'PDF curto; parser/contexto inline ou attachment nativo funciona bem',
    },
  },
  {
    name: 'PDF longo',
    decision: makeDecision({
      fileKind: 'pdf',
      fileHandlingMode: 'rag_search',
      recommendedToolResource: 'file_search',
      needsRag: true,
      recommendedModelReason: 'PDF longo; preferir RAG/file_search ou attachment nativo no Gemini',
      matchedSignals: ['file_upload', 'file_kind_pdf'],
    }),
    expected: {
      valid: true,
      mode: 'file_search',
      toolResource: 'file_search',
      needsVision: false,
      needsRag: true,
      fileKind: 'pdf',
      warnings: [],
      reason: 'PDF longo; preferir RAG/file_search ou attachment nativo no Gemini',
    },
  },
  {
    name: 'DOCX',
    decision: makeDecision({
      fileKind: 'docx',
      fileHandlingMode: 'document_parse',
      recommendedToolResource: 'document_parser',
      needsRag: false,
      recommendedModelReason: 'Documento Word; extrair texto e analisar com Claude/Gemini',
      matchedSignals: ['file_upload', 'file_kind_docx'],
    }),
    expected: {
      valid: true,
      mode: 'document_parser',
      toolResource: 'document_parser',
      needsVision: false,
      needsRag: false,
      fileKind: 'docx',
      warnings: [],
      reason: 'Documento Word; extrair texto e analisar com Claude/Gemini',
    },
  },
  {
    name: 'XLSX',
    decision: makeDecision({
      fileKind: 'spreadsheet',
      fileHandlingMode: 'spreadsheet_parse',
      recommendedToolResource: 'document_parser',
      needsRag: false,
      recommendedModelReason: 'Planilha; Gemini é a rota primária para análise tabular',
      matchedSignals: ['file_upload', 'file_kind_spreadsheet'],
    }),
    expected: {
      valid: true,
      mode: 'spreadsheet_parse',
      toolResource: 'document_parser',
      needsVision: false,
      needsRag: false,
      fileKind: 'spreadsheet',
      warnings: [],
      reason: 'Planilha; Gemini é a rota primária para análise tabular',
    },
  },
  {
    name: 'CSV',
    decision: makeDecision({
      fileKind: 'csv',
      fileHandlingMode: 'spreadsheet_parse',
      recommendedToolResource: 'document_parser',
      needsRag: false,
      recommendedModelReason: 'CSV; tratar como tabela e manter Gemini como primário',
      matchedSignals: ['file_upload', 'file_kind_csv'],
    }),
    expected: {
      valid: true,
      mode: 'spreadsheet_parse',
      toolResource: 'document_parser',
      needsVision: false,
      needsRag: false,
      fileKind: 'csv',
      warnings: [],
      reason: 'CSV; tratar como tabela e manter Gemini como primário',
    },
  },
  {
    name: 'imagem',
    decision: makeDecision({
      fileKind: 'image',
      fileHandlingMode: 'vision',
      recommendedToolResource: 'vision',
      needsVision: true,
      needsRag: false,
      recommendedModelReason: 'Imagem; requer visão do provider, não parser textual',
      matchedSignals: ['file_upload', 'file_kind_image'],
    }),
    expected: {
      valid: true,
      mode: 'vision',
      toolResource: 'vision',
      needsVision: true,
      needsRag: false,
      fileKind: 'image',
      warnings: [],
      reason: 'Imagem; requer visão do provider, não parser textual',
    },
  },
  {
    name: 'PPTX longo',
    decision: makeDecision({
      fileKind: 'pptx',
      fileHandlingMode: 'rag_search',
      recommendedToolResource: 'file_search',
      needsRag: true,
      recommendedModelReason:
        'Apresentação; preferir attachment nativo quando curto, RAG quando longo',
      matchedSignals: ['file_upload', 'file_kind_pptx'],
    }),
    expected: {
      valid: true,
      mode: 'file_search',
      toolResource: 'file_search',
      needsVision: false,
      needsRag: true,
      fileKind: 'pptx',
      warnings: [],
      reason: 'Apresentação; preferir attachment nativo quando curto, RAG quando longo',
    },
  },
  {
    name: 'TXT/MD',
    decision: makeDecision({
      fileKind: 'text',
      fileHandlingMode: 'inline_context',
      recommendedToolResource: 'none',
      needsRag: false,
      recommendedModelReason: 'Texto simples/Markdown; contexto inline é suficiente quando curto',
      matchedSignals: ['file_upload', 'file_kind_text'],
    }),
    expected: {
      valid: true,
      mode: 'inline_context',
      toolResource: 'none',
      needsVision: false,
      needsRag: false,
      fileKind: 'text',
      warnings: [],
      reason: 'Texto simples/Markdown; contexto inline é suficiente quando curto',
    },
  },
  {
    name: 'HTML',
    decision: makeDecision({
      fileKind: 'html',
      fileHandlingMode: 'inline_context',
      recommendedToolResource: 'none',
      needsRag: false,
      recommendedModelReason: 'HTML; ler como texto/contexto inline quando o tamanho permitir',
      matchedSignals: ['file_upload', 'file_kind_html'],
    }),
    expected: {
      valid: true,
      mode: 'inline_context',
      toolResource: 'none',
      needsVision: false,
      needsRag: false,
      fileKind: 'html',
      warnings: [],
      reason: 'HTML; ler como texto/contexto inline quando o tamanho permitir',
    },
  },
  {
    name: 'JSON',
    decision: makeDecision({
      fileKind: 'json',
      fileHandlingMode: 'inline_context',
      recommendedToolResource: 'none',
      needsRag: false,
      recommendedModelReason: 'JSON; analisar como texto estruturado',
      matchedSignals: ['file_upload', 'file_kind_json'],
    }),
    expected: {
      valid: true,
      mode: 'inline_context',
      toolResource: 'none',
      needsVision: false,
      needsRag: false,
      fileKind: 'json',
      warnings: [],
      reason: 'JSON; analisar como texto estruturado',
    },
  },
  {
    name: 'unknown',
    decision: makeDecision({
      fileKind: 'unknown',
      fileHandlingMode: 'unsupported_or_unknown',
      recommendedToolResource: 'none',
      needsVision: false,
      needsRag: false,
      recommendedModelReason:
        'Tipo de arquivo desconhecido; manter análise genérica sem assumir parser',
      matchedSignals: ['file_upload', 'file_kind_unknown'],
    }),
    expected: {
      valid: false,
      mode: 'unsupported_or_unknown',
      toolResource: 'none',
      needsVision: false,
      needsRag: false,
      fileKind: 'unknown',
      warnings: ['unsupported_file_kind'],
      reason: 'Tipo de arquivo desconhecido; manter análise genérica sem assumir parser',
    },
  },
] as const;

describe('prepareLphManusFileHandling', () => {
  describe('client router file_analysis contract', () => {
    it.each(clientRouterContractCases)(
      'accepts client router metadata for $name',
      ({ decision, expected }) => {
        const result = prepareLphManusFileHandling(decision);

        expect(result).toMatchObject({
          version: 'v1',
          recommendedProvider: decision.primaryProvider,
          recommendedModel: decision.primaryModel,
          ...expected,
        });
      },
    );
  });

  it.each([
    {
      name: 'PDF curto',
      decision: makeDecision({
        fileKind: 'pdf',
        fileHandlingMode: 'document_parse',
        recommendedToolResource: 'document_parser',
        needsRag: false,
      }),
      expected: {
        mode: 'document_parser',
        toolResource: 'document_parser',
        needsVision: false,
        needsRag: false,
        fileKind: 'pdf',
      },
    },
    {
      name: 'PDF longo',
      decision: makeDecision({
        fileKind: 'pdf',
        fileHandlingMode: 'rag_search',
        recommendedToolResource: 'file_search',
        needsRag: true,
      }),
      expected: {
        mode: 'file_search',
        toolResource: 'file_search',
        needsVision: false,
        needsRag: true,
        fileKind: 'pdf',
      },
    },
    {
      name: 'DOCX',
      decision: makeDecision({
        fileKind: 'docx',
        fileHandlingMode: 'document_parse',
        recommendedToolResource: 'document_parser',
      }),
      expected: {
        mode: 'document_parser',
        toolResource: 'document_parser',
        needsVision: false,
        needsRag: false,
        fileKind: 'docx',
      },
    },
    {
      name: 'XLSX',
      decision: makeDecision({
        fileKind: 'spreadsheet',
        fileHandlingMode: 'spreadsheet_parse',
        recommendedToolResource: 'document_parser',
      }),
      expected: {
        mode: 'spreadsheet_parse',
        toolResource: 'document_parser',
        needsVision: false,
        needsRag: false,
        fileKind: 'spreadsheet',
      },
    },
    {
      name: 'CSV',
      decision: makeDecision({
        fileKind: 'csv',
        fileHandlingMode: 'spreadsheet_parse',
        recommendedToolResource: 'document_parser',
      }),
      expected: {
        mode: 'spreadsheet_parse',
        toolResource: 'document_parser',
        needsVision: false,
        needsRag: false,
        fileKind: 'csv',
      },
    },
    {
      name: 'image',
      decision: makeDecision({
        fileKind: 'image',
        fileHandlingMode: 'vision',
        recommendedToolResource: 'vision',
        needsVision: true,
      }),
      expected: {
        mode: 'vision',
        toolResource: 'vision',
        needsVision: true,
        needsRag: false,
        fileKind: 'image',
      },
    },
    {
      name: 'PPTX longo',
      decision: makeDecision({
        fileKind: 'pptx',
        fileHandlingMode: 'rag_search',
        recommendedToolResource: 'file_search',
        needsRag: true,
      }),
      expected: {
        mode: 'file_search',
        toolResource: 'file_search',
        needsVision: false,
        needsRag: true,
        fileKind: 'pptx',
      },
    },
    {
      name: 'TXT/MD',
      decision: makeDecision({
        fileKind: 'text',
        fileHandlingMode: 'inline_context',
        recommendedToolResource: 'none',
      }),
      expected: {
        mode: 'inline_context',
        toolResource: 'none',
        needsVision: false,
        needsRag: false,
        fileKind: 'text',
      },
    },
    {
      name: 'HTML',
      decision: makeDecision({
        fileKind: 'html',
        fileHandlingMode: 'inline_context',
        recommendedToolResource: 'none',
      }),
      expected: {
        mode: 'inline_context',
        toolResource: 'none',
        needsVision: false,
        needsRag: false,
        fileKind: 'html',
      },
    },
    {
      name: 'JSON',
      decision: makeDecision({
        fileKind: 'json',
        fileHandlingMode: 'inline_context',
        recommendedToolResource: 'none',
      }),
      expected: {
        mode: 'inline_context',
        toolResource: 'none',
        needsVision: false,
        needsRag: false,
        fileKind: 'json',
      },
    },
  ])('returns an operational recommendation for $name', ({ decision, expected }) => {
    const result = prepareLphManusFileHandling(decision);

    expect(result).toMatchObject({
      valid: true,
      version: 'v1',
      recommendedProvider: 'google',
      recommendedModel: 'gemini-2.5-pro',
      warnings: [],
      ...expected,
    });
  });

  it('returns invalid with warning for unknown files', () => {
    const result = prepareLphManusFileHandling(
      makeDecision({
        fileKind: 'unknown',
        fileHandlingMode: 'unsupported_or_unknown',
        recommendedToolResource: 'none',
      }),
    );

    expect(result).toMatchObject({
      valid: false,
      version: 'v1',
      mode: 'unsupported_or_unknown',
      toolResource: 'none',
      needsVision: false,
      needsRag: false,
      fileKind: 'unknown',
      warnings: ['unsupported_file_kind'],
    });
  });

  it('returns no operation when fileKind is missing', () => {
    const result = prepareLphManusFileHandling(baseDecision);

    expect(result).toEqual({
      valid: false,
      version: 'v1',
      mode: 'no_op',
      toolResource: 'none',
      needsVision: false,
      needsRag: false,
      recommendedProvider: 'google',
      recommendedModel: 'gemini-2.5-pro',
      reason: 'decisão sem metadata de arquivo; nenhuma operação de arquivo recomendada',
      warnings: ['missing_file_kind'],
    });
  });

  it('uses recommendedModelReason when it is available', () => {
    const result = prepareLphManusFileHandling(
      makeDecision({
        fileKind: 'pdf',
        fileHandlingMode: 'document_parse',
        recommendedToolResource: 'document_parser',
        recommendedModelReason: 'PDF curto pode usar parser antes de chamar modelo',
      }),
    );

    expect(result.reason).toBe('PDF curto pode usar parser antes de chamar modelo');
  });

  it('warns when the decision is missing primaryModel', () => {
    const result = prepareLphManusFileHandling(
      makeDecision({
        primaryModel: '',
        fileKind: 'pdf',
        fileHandlingMode: 'document_parse',
        recommendedToolResource: 'document_parser',
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.recommendedModel).toBe('');
    expect(result.recommendedProvider).toBe('google');
    expect(result.warnings).toContain('missing_recommended_model');
  });

  it('preserves needsVision even when explicitly set without vision mode', () => {
    const result = prepareLphManusFileHandling(
      makeDecision({
        fileKind: 'pdf',
        fileHandlingMode: 'document_parse',
        recommendedToolResource: 'document_parser',
        needsVision: true,
      }),
    );

    expect(result.needsVision).toBe(true);
    expect(result.mode).toBe('document_parser');
  });

  it('preserves needsRag flag with explicit true', () => {
    const result = prepareLphManusFileHandling(
      makeDecision({
        fileKind: 'pdf',
        fileHandlingMode: 'rag_search',
        recommendedToolResource: 'file_search',
        needsRag: true,
      }),
    );

    expect(result.needsRag).toBe(true);
    expect(result.mode).toBe('file_search');
  });
});
