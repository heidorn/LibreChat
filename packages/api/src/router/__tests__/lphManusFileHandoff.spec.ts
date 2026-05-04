import type { LphManusRouteDecision } from '../../../../data-provider/src/types/lphManusRouter';
import { prepareLphManusFileHandoff } from '../lphManusFileHandoff';

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

const makeDecision = (
  metadata: Partial<LphManusRouteDecision> = {},
): LphManusRouteDecision => ({
  ...baseDecision,
  ...metadata,
});

describe('prepareLphManusFileHandoff', () => {
  it.each([
    {
      name: 'PDF curto',
      decision: makeDecision({
        fileKind: 'pdf',
        fileHandlingMode: 'document_parse',
        recommendedToolResource: 'document_parser',
      }),
      expected: {
        operationalMode: 'document_parser',
        toolResource: 'document_parser',
        needsVision: false,
        needsRag: false,
        shouldAttachNative: false,
        shouldUseRag: false,
        shouldInlineContext: false,
        shouldRunVision: false,
        shouldParseDocument: true,
        shouldParseSpreadsheet: false,
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
        operationalMode: 'file_search',
        toolResource: 'file_search',
        needsVision: false,
        needsRag: true,
        shouldAttachNative: false,
        shouldUseRag: true,
        shouldInlineContext: false,
        shouldRunVision: false,
        shouldParseDocument: false,
        shouldParseSpreadsheet: false,
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
        operationalMode: 'document_parser',
        toolResource: 'document_parser',
        needsVision: false,
        needsRag: false,
        shouldAttachNative: false,
        shouldUseRag: false,
        shouldInlineContext: false,
        shouldRunVision: false,
        shouldParseDocument: true,
        shouldParseSpreadsheet: false,
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
        operationalMode: 'spreadsheet_parse',
        toolResource: 'document_parser',
        needsVision: false,
        needsRag: false,
        shouldAttachNative: false,
        shouldUseRag: false,
        shouldInlineContext: false,
        shouldRunVision: false,
        shouldParseDocument: false,
        shouldParseSpreadsheet: true,
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
        operationalMode: 'spreadsheet_parse',
        toolResource: 'document_parser',
        needsVision: false,
        needsRag: false,
        shouldAttachNative: false,
        shouldUseRag: false,
        shouldInlineContext: false,
        shouldRunVision: false,
        shouldParseDocument: false,
        shouldParseSpreadsheet: true,
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
        operationalMode: 'vision',
        toolResource: 'vision',
        needsVision: true,
        needsRag: false,
        shouldAttachNative: false,
        shouldUseRag: false,
        shouldInlineContext: false,
        shouldRunVision: true,
        shouldParseDocument: false,
        shouldParseSpreadsheet: false,
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
        operationalMode: 'file_search',
        toolResource: 'file_search',
        needsVision: false,
        needsRag: true,
        shouldAttachNative: false,
        shouldUseRag: true,
        shouldInlineContext: false,
        shouldRunVision: false,
        shouldParseDocument: false,
        shouldParseSpreadsheet: false,
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
        operationalMode: 'inline_context',
        toolResource: 'none',
        needsVision: false,
        needsRag: false,
        shouldAttachNative: false,
        shouldUseRag: false,
        shouldInlineContext: true,
        shouldRunVision: false,
        shouldParseDocument: false,
        shouldParseSpreadsheet: false,
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
        operationalMode: 'inline_context',
        toolResource: 'none',
        needsVision: false,
        needsRag: false,
        shouldAttachNative: false,
        shouldUseRag: false,
        shouldInlineContext: true,
        shouldRunVision: false,
        shouldParseDocument: false,
        shouldParseSpreadsheet: false,
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
        operationalMode: 'inline_context',
        toolResource: 'none',
        needsVision: false,
        needsRag: false,
        shouldAttachNative: false,
        shouldUseRag: false,
        shouldInlineContext: true,
        shouldRunVision: false,
        shouldParseDocument: false,
        shouldParseSpreadsheet: false,
      },
    },
    {
      name: 'native attachment passthrough',
      decision: makeDecision({
        fileKind: 'pdf',
        fileHandlingMode: 'native_attachment',
        recommendedToolResource: 'none',
      }),
      expected: {
        operationalMode: 'native_attachment',
        toolResource: 'none',
        needsVision: false,
        needsRag: false,
        shouldAttachNative: true,
        shouldUseRag: false,
        shouldInlineContext: false,
        shouldRunVision: false,
        shouldParseDocument: false,
        shouldParseSpreadsheet: false,
      },
    },
  ])('emits a v1 handoff for $name', ({ decision, expected }) => {
    const handoff = prepareLphManusFileHandoff(decision);

    expect(handoff).toMatchObject({
      version: 'v1',
      routeIntent: 'file_analysis',
      fileKind: expected.operationalMode === 'unsupported_or_unknown' ? 'unknown' : decision.fileKind,
      handlingMode: decision.fileHandlingMode,
      provider: 'google',
      model: 'gemini-2.5-pro',
      warnings: [],
      ...expected,
    });
  });

  it('marks unknown file kinds as unsupported with a warning', () => {
    const handoff = prepareLphManusFileHandoff(
      makeDecision({
        fileKind: 'unknown',
        fileHandlingMode: 'unsupported_or_unknown',
        recommendedToolResource: 'none',
      }),
    );

    expect(handoff).toMatchObject({
      version: 'v1',
      operationalMode: 'unsupported_or_unknown',
      toolResource: 'none',
      fileKind: 'unknown',
      shouldAttachNative: false,
      shouldUseRag: false,
      shouldInlineContext: false,
      shouldRunVision: false,
      shouldParseDocument: false,
      shouldParseSpreadsheet: false,
      warnings: ['unsupported_file_kind'],
    });
  });

  it('returns a no-op handoff when the decision has no fileKind', () => {
    const handoff = prepareLphManusFileHandoff(baseDecision);

    expect(handoff).toMatchObject({
      version: 'v1',
      operationalMode: 'no_op',
      toolResource: 'none',
      fileKind: undefined,
      handlingMode: undefined,
      shouldAttachNative: false,
      shouldUseRag: false,
      shouldInlineContext: false,
      shouldRunVision: false,
      shouldParseDocument: false,
      shouldParseSpreadsheet: false,
      warnings: ['missing_file_kind'],
    });
  });

  it('warns when the decision is missing primaryModel', () => {
    const handoff = prepareLphManusFileHandoff(
      makeDecision({
        primaryModel: '',
        fileKind: 'pdf',
        fileHandlingMode: 'document_parse',
        recommendedToolResource: 'document_parser',
      }),
    );

    expect(handoff.warnings).toContain('missing_recommended_model');
    expect(handoff.model).toBe('');
    expect(handoff.provider).toBe('google');
  });

  it('flags vision needs even if mode is not strictly vision', () => {
    const handoff = prepareLphManusFileHandoff(
      makeDecision({
        fileKind: 'image',
        fileHandlingMode: 'native_attachment',
        recommendedToolResource: 'vision',
        needsVision: true,
      }),
    );

    expect(handoff.needsVision).toBe(true);
    expect(handoff.shouldRunVision).toBe(true);
    expect(handoff.shouldAttachNative).toBe(true);
  });

  it('flags rag needs even when handling mode is rag_search without explicit flag', () => {
    const handoff = prepareLphManusFileHandoff(
      makeDecision({
        fileKind: 'pdf',
        fileHandlingMode: 'rag_search',
        recommendedToolResource: 'file_search',
      }),
    );

    expect(handoff.needsRag).toBe(true);
    expect(handoff.shouldUseRag).toBe(true);
    expect(handoff.operationalMode).toBe('file_search');
  });

  it('handles null/undefined decisions gracefully', () => {
    const fromNull = prepareLphManusFileHandoff(null);
    const fromUndefined = prepareLphManusFileHandoff(undefined);

    expect(fromNull.version).toBe('v1');
    expect(fromNull.operationalMode).toBe('no_op');
    expect(fromNull.warnings).toContain('missing_file_kind');

    expect(fromUndefined).toEqual(fromNull);
  });
});
