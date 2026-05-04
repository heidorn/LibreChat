import { getLphManusRoute } from '../lphManusRouter';

jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    dir: jest.fn(),
  },
}));

const imageAgentsMap = {
  openaiImage: {
    id: 'agent_openai_image',
    name: 'Criador de imagens OpenAI',
    model: 'gpt-4o-mini',
    avatar: {},
  },
};

const cases = [
  {
    input: 'oi, tudo bem?',
    intent: 'simple_text',
    primaryProvider: 'DeepSeek',
    primaryModel: 'deepseek-v4-flash',
    costPolicy: 'low_cost',
  },
  {
    input: 'crie uma landing page para minha empresa',
    intent: 'landing_page',
    primaryProvider: 'anthropic',
    artifactType: 'text/html',
    artifactMime: 'text/html',
    costPolicy: 'quality_first',
  },
  {
    input: 'faça uma proposta comercial em PDF',
    intent: 'document_artifact',
    primaryProvider: 'anthropic',
    artifactType: 'document',
    artifactMime: 'document',
    costPolicy: 'balanced',
  },
  {
    input: 'analise essa planilha',
    intent: 'spreadsheet_artifact',
    primaryProvider: 'google',
    primaryModel: 'gemini-2.5-pro',
    artifactType: 'spreadsheet',
    costPolicy: 'balanced',
  },
  {
    input: 'pesquise notícias atuais sobre IA',
    intent: 'research',
    primaryProvider: 'Perplexity',
    primaryModel: 'sonar',
  },
  {
    input: 'gere uma imagem de um robô vendedor',
    intent: 'image_generation',
    primaryProvider: 'agents',
    artifactType: 'image',
    artifactMime: 'image',
  },
  {
    input: 'corrija esse código React',
    intent: 'debug',
    primaryProvider: 'anthropic',
    artifactType: 'none',
  },
  {
    input: 'crie um componente React com contador',
    intent: 'react_artifact',
    primaryProvider: 'anthropic',
    artifactType: 'application/vnd.react',
    artifactMime: 'application/vnd.react',
  },
  {
    input: 'crie um dashboard comercial com métricas de vendas',
    intent: 'dashboard_artifact',
    primaryProvider: 'anthropic',
    artifactType: 'application/vnd.react',
    artifactMime: 'application/vnd.react',
  },
  {
    input: 'crie uma apresentação de 5 slides sobre IA em vendas',
    intent: 'presentation_artifact',
    primaryProvider: 'anthropic',
    artifactType: 'presentation',
    artifactMime: 'presentation',
  },
  {
    input: 'crie um fluxograma Mermaid do processo de vendas',
    intent: 'diagram_artifact',
    primaryProvider: 'anthropic',
    artifactType: 'application/vnd.mermaid',
    artifactMime: 'application/vnd.mermaid',
  },
];

const fileCases = [
  {
    label: 'arquivo PDF curto',
    file: {
      file_id: 'file_pdf',
      type: 'application/pdf',
      filename: 'proposta.pdf',
      filepath: '/uploads/user/proposta.pdf',
      bytes: 1024 * 1024,
    },
    fileKind: 'pdf',
    fileHandlingMode: 'document_parse',
    recommendedToolResource: 'document_parser',
    needsRag: false,
  },
  {
    label: 'arquivo PDF longo',
    file: {
      file_id: 'file_pdf_long',
      type: 'application/pdf',
      filename: 'manual.pdf',
      filepath: '/uploads/user/manual.pdf',
      bytes: 20 * 1024 * 1024,
    },
    fileKind: 'pdf',
    fileHandlingMode: 'rag_search',
    recommendedToolResource: 'file_search',
    needsRag: true,
  },
  {
    label: 'arquivo DOCX',
    file: {
      file_id: 'file_docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'contrato.docx',
      filepath: '/uploads/user/contrato.docx',
    },
    fileKind: 'docx',
    fileHandlingMode: 'document_parse',
    recommendedToolResource: 'document_parser',
  },
  {
    label: 'arquivo XLSX',
    file: {
      file_id: 'file_xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'vendas.xlsx',
      filepath: '/uploads/user/vendas.xlsx',
    },
    fileKind: 'spreadsheet',
    fileHandlingMode: 'spreadsheet_parse',
    recommendedToolResource: 'document_parser',
  },
  {
    label: 'arquivo CSV',
    file: {
      file_id: 'file_csv',
      type: 'text/csv',
      filename: 'leads.csv',
      filepath: '/uploads/user/leads.csv',
    },
    fileKind: 'csv',
    fileHandlingMode: 'spreadsheet_parse',
    recommendedToolResource: 'document_parser',
  },
  {
    label: 'imagem PNG',
    file: {
      file_id: 'file_png',
      type: 'image/png',
      filename: 'print.png',
      filepath: '/uploads/user/print.png',
    },
    fileKind: 'image',
    fileHandlingMode: 'vision',
    recommendedToolResource: 'vision',
    needsVision: true,
    needsRag: false,
  },
  {
    label: 'arquivo PPTX',
    file: {
      file_id: 'file_pptx',
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      filename: 'deck.pptx',
      filepath: '/uploads/user/deck.pptx',
    },
    fileKind: 'pptx',
    fileHandlingMode: 'native_attachment',
    recommendedToolResource: 'none',
  },
  {
    label: 'arquivo TXT',
    file: {
      file_id: 'file_txt',
      type: 'text/plain',
      filename: 'notas.txt',
      filepath: '/uploads/user/notas.txt',
    },
    fileKind: 'text',
    fileHandlingMode: 'inline_context',
    recommendedToolResource: 'none',
  },
  {
    label: 'arquivo MD',
    file: {
      file_id: 'file_md',
      type: 'text/markdown',
      filename: 'briefing.md',
      filepath: '/uploads/user/briefing.md',
    },
    fileKind: 'text',
    fileHandlingMode: 'inline_context',
    recommendedToolResource: 'none',
  },
  {
    label: 'arquivo JSON',
    file: {
      file_id: 'file_json',
      type: 'application/json',
      filename: 'dados.json',
      filepath: '/uploads/user/dados.json',
    },
    fileKind: 'json',
    fileHandlingMode: 'inline_context',
    recommendedToolResource: 'none',
  },
  {
    label: 'arquivo desconhecido',
    file: {
      file_id: 'file_unknown',
      type: 'application/octet-stream',
      filename: 'arquivo.bin',
      filepath: '/uploads/user/arquivo.bin',
    },
    fileKind: 'unknown',
    fileHandlingMode: 'unsupported_or_unknown',
    recommendedToolResource: 'none',
    needsVision: false,
    needsRag: false,
  },
];

describe('lphManusRouter', () => {
  it.each(cases)('routes "$input" to $intent', (testCase) => {
    const route = getLphManusRoute({ text: testCase.input, agentsMap: imageAgentsMap as never });

    expect(route.kind).toBe(testCase.intent);
    expect(route.metadata.intent).toBe(testCase.intent);
    expect(route.metadata.primaryProvider).toBe(testCase.primaryProvider);

    if (testCase.primaryModel) {
      expect(route.metadata.primaryModel).toBe(testCase.primaryModel);
    }
    if (testCase.costPolicy) {
      expect(route.metadata.costPolicy).toBe(testCase.costPolicy);
    }
    if (testCase.artifactType) {
      expect(route.metadata.artifactType).toBe(testCase.artifactType);
    }
    if (testCase.artifactMime) {
      expect(route.metadata.artifactMime).toBe(testCase.artifactMime);
    }
  });

  it.each(cases)('returns required metadata for "$input"', (testCase) => {
    const route = getLphManusRoute({ text: testCase.input, agentsMap: imageAgentsMap as never });

    expect(route.metadata.intent).toBeTruthy();
    expect(route.metadata.primaryProvider).toBeTruthy();
    expect(route.metadata.primaryModel).toBeTruthy();
    expect(route.metadata.costPolicy).toBeTruthy();
    expect(route.metadata.reason).toBeTruthy();
    expect(route.metadata.matchedSignals.length).toBeGreaterThan(0);
  });

  it('prioritizes debug over react_artifact when correction terms are present', () => {
    const route = getLphManusRoute({
      text: 'corrija esse código React',
      agentsMap: imageAgentsMap as never,
    });

    expect(route.metadata.intent).toBe('debug');
    expect(route.metadata.intent).not.toBe('react_artifact');
    expect(route.metadata.artifactType).toBe('none');
  });

  it('prioritizes react_artifact over generic coding for React component creation', () => {
    const route = getLphManusRoute({
      text: 'crie um componente React com contador',
      agentsMap: imageAgentsMap as never,
    });

    expect(route.metadata.intent).toBe('react_artifact');
    expect(route.metadata.artifactType).toBe('application/vnd.react');
    expect(route.metadata.artifactMime).toBe('application/vnd.react');
  });

  it('routes the observed premium landing page prompt to landing_page', () => {
    const route = getLphManusRoute({
      text: 'crie uma landing page premium e linda para leads per hour que e uma ia de prospeccao',
      agentsMap: imageAgentsMap as never,
    });

    expect(route.metadata.intent).toBe('landing_page');
    expect(route.metadata.matchedSignals).toContain('landing_page_terms');
    expect(route.metadata.primaryProvider).toBe('anthropic');
    expect(route.metadata.artifactType).toBe('text/html');
    expect(route.metadata.artifactMime).toBe('text/html');
    expect(route.conversation.modelLabel).toBe('LPH Manus • landing');
  });

  it.each([
    'crie uma landing page premium para leads per hour',
    'crie uma landing page linda para leads per hour',
    'crie uma landing page moderna para leads per hour',
  ])('keeps landing page variants on landing_page: %s', (input) => {
    const route = getLphManusRoute({ text: input, agentsMap: imageAgentsMap as never });

    expect(route.metadata.intent).toBe('landing_page');
    expect(route.metadata.primaryProvider).toBe('anthropic');
    expect(route.metadata.artifactMime).toBe('text/html');
  });

  it('keeps generic sales copy on sales_copy', () => {
    const route = getLphManusRoute({
      text: 'escreva uma copy de vendas',
      agentsMap: imageAgentsMap as never,
    });

    expect(route.metadata.intent).toBe('sales_copy');
    expect(route.metadata.artifactMime).toBe('text/markdown');
  });

  it('prioritizes document_artifact over spreadsheet/image signals for visual proposals with tables', () => {
    const route = getLphManusRoute({
      text: 'Crie um documento visual de proposta comercial para Leads Per Hour, com capa, seções, benefícios, tabela e próximos passos.',
      agentsMap: imageAgentsMap as never,
    });

    expect(route.metadata.intent).toBe('document_artifact');
    expect(route.metadata.intent).not.toBe('spreadsheet_artifact');
    expect(route.metadata.intent).not.toBe('image_generation');
    expect(route.metadata.artifactType).toBe('document');
    expect(route.metadata.artifactMime).toBe('document');
    expect(route.conversation.modelLabel).toBe('LPH Manus • documento');
  });

  it.each(fileCases)('adds file-aware metadata for $label', (testCase) => {
    const route = getLphManusRoute({
      text: 'analise este arquivo',
      files: [testCase.file] as never,
      agentsMap: imageAgentsMap as never,
    });

    expect(route.metadata.intent).toBe('file_analysis');
    expect(route.metadata.primaryProvider).toBe('google');
    expect(route.metadata.primaryModel).toBe('gemini-2.5-pro');
    expect(route.metadata.fileKind).toBe(testCase.fileKind);
    expect(route.metadata.fileHandlingMode).toBe(testCase.fileHandlingMode);
    expect(route.metadata.recommendedToolResource).toBe(testCase.recommendedToolResource);
    expect(route.metadata.recommendedModelReason).toBeTruthy();
    expect(route.metadata.matchedSignals).toContain(`file_kind_${testCase.fileKind}`);

    if ('needsVision' in testCase) {
      expect(route.metadata.needsVision).toBe(testCase.needsVision);
    }
    if ('needsRag' in testCase) {
      expect(route.metadata.needsRag).toBe(testCase.needsRag);
    }
  });
});
