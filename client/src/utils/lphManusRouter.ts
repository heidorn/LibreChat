import { EModelEndpoint } from 'librechat-data-provider';
import type {
  Agent,
  TAgentsMap,
  TConversation,
  LphManusCostPolicy,
  LphManusRouteDecision,
  LphManusArtifactMime,
  LphManusFileRouteMetadata,
  LphManusArtifactTarget,
  LphManusRouterIntent,
} from 'librechat-data-provider';
import type { ExtendedFile } from '~/common';

import logger from './logger';

export const LPH_MANUS_SPEC = 'lph-manus';

type RouteKind = LphManusRouterIntent;
type CostPolicy = LphManusCostPolicy;
type ArtifactType = LphManusArtifactTarget;
type ArtifactMime = LphManusArtifactMime;

type RouterFile = Pick<ExtendedFile, 'type' | 'filepath' | 'file_id'> & {
  bytes?: number;
  filename?: string;
  size?: number;
  source?: string;
  file?: Pick<File, 'name' | 'size' | 'type'>;
};
type RoutedConversation = Omit<Partial<TConversation>, 'endpoint' | 'endpointType'> & {
  endpoint?: EModelEndpoint | string | null;
  endpointType?: EModelEndpoint | string | null;
};

export type LphManusRouteMetadata = LphManusRouteDecision;

export type LphManusRoute = {
  kind: RouteKind;
  reason: string;
  fallback: RoutedConversation;
  costPolicy: CostPolicy;
  artifactType: ArtifactType;
  artifactMime?: ArtifactMime;
  metadata: LphManusRouteMetadata;
  conversation: RoutedConversation;
};

const IMAGE_AGENT_FALLBACK_NAMES = [
  'criador de imagens openai',
  'criador de imagens gemini',
  'criador de imagens',
];

const IMAGE_TERMS =
  /\b(imagem|imagens|image|foto|fotorealista|render|ilustracao|ilustração|poster|banner|criativo|thumbnail|logo|visual)\b/i;

const IMAGE_ACTION_TERMS =
  /\b(crie|cria|criar|gere|gera|gerar|desenhe|desenha|produza|faca|faça|make|generate|create)\b/i;

const WEB_TERMS =
  /\b(hoje|agora|atual|atuais|ultima|última|ultimas|últimas|semana|semanal|recente|recentes|noticia|noticias|notícia|notícias|preco|preço|cotacao|cotação|pesquise|pesquisar|procure|procurar|busque|buscar|web|internet|fonte|fontes|link|links)\b/i;

const FILE_ANALYSIS_TERMS =
  /\b(analisar|analise|análise|resumir|resuma|extrair|compare|comparar|tabela|xlsx|csv|pdf|docx|arquivo|arquivos|contrato|documento|dados)\b/i;

const STRONG_TERMS =
  /\b(estrategia|estratégia|profundo|completo|complexo|arquitetura|plano|planejamento|decisao|decisão|critique|revisar|debug|bug|codigo|código|implementar|refatorar|tradeoff|trade-off)\b/i;

const LANDING_PAGE_TERMS =
  /\b(landing page|pagina de vendas|página de vendas|pagina captura|página captura|sales page|one page|hotsite)\b/i;

const HTML_ARTIFACT_TERMS =
  /\b(html|site estatico|site estático|pagina html|página html|artifact html|artefato html)\b/i;

const DOCUMENT_ARTIFACT_TERMS =
  /\b(proposta|pdf|docx|documento|contrato|relatorio|relatório|briefing|one-pager|one pager)\b/i;

const SPREADSHEET_ARTIFACT_TERMS =
  /\b(planilha|spreadsheet|xlsx|csv|modelo financeiro|forecast|projecao|projeção|tabela)\b/i;

const DASHBOARD_ARTIFACT_TERMS =
  /\b(dashboard|painel|kpi|metricas|métricas|grafico|gráfico|charts?|analytics|bi)\b/i;

const DIAGRAM_ARTIFACT_TERMS =
  /\b(diagrama|fluxograma|mermaid|flowchart|mindmap|mapa mental|arquitetura)\b/i;

const PRESENTATION_ARTIFACT_TERMS =
  /\b(apresentacao|apresentação|slides?|deck|pptx|powerpoint|pitch deck)\b/i;

const REACT_ARTIFACT_TERMS =
  /\b(react|app|aplicativo|componente|interface|ui|frontend|protótipo|prototipo|saas)\b/i;

const CODING_TERMS =
  /\b(codigo|código|programar|implementar|função|funcao|api|endpoint|componente|hook|refatorar|typescript|javascript|python)\b/i;

const DEBUG_TERMS =
  /\b(debug|bug|erro|falha|quebrou|quebrado|corrigir|corrija|corrige|correcao|correção|consertar|conserte|nao funciona|não funciona|stack trace|exception|regressao|regressão)\b/i;

const CRM_TERMS =
  /\b(crm|lead|leads|pipeline|sdr|cadencia|cadência|follow-up|follow up|hubspot|pipedrive|salesforce)\b/i;

const SALES_COPY_TERMS =
  /\b(copy|vendas|email|whatsapp|anuncio|anúncio|headline|oferta|cta|roteiro|script comercial|cold email)\b/i;

const hasFiles = (files?: RouterFile[]) => Boolean(files?.length);
const longDocumentBytes = 15 * 1024 * 1024;

const basePrompt =
  'Você é a Leads Per Hour, um assistente de IA geral, claro e prático. Ajude o usuário com escrita, pesquisa, análise, imagens, arquivos, ideias, planejamento e execução. Não force nenhum contexto específico a menos que o usuário peça.';

const htmlArtifactPrompt = `${basePrompt}

Quando o usuário pedir landing page, página HTML, site estático ou artifact HTML, responda criando um Artifact HTML real, não um bloco de código comum no chat.
Use exatamente o formato:
:::artifact{identifier="nome-descritivo-em-kebab-case" type="text/html" title="Título curto"}
\`\`\`html
<!DOCTYPE html>
<html lang="pt-BR">
...
</html>
\`\`\`
:::
O HTML deve ser completo, com CSS embutido quando apropriado, responsivo e pronto para preview.`;

const documentArtifactPrompt = `${basePrompt}

Quando o usuário pedir uma proposta, documento, contrato, relatório, briefing ou one-pager, responda criando um Document Artifact em Markdown, não apenas texto solto no chat.
Use exatamente o formato:
:::artifact{identifier="nome-descritivo-em-kebab-case" type="text/markdown" title="Título curto"}
\`\`\`markdown
# Título do documento

...
\`\`\`
:::
O documento deve ser bem estruturado, visualmente escaneável, com capa/título, seções, tabelas em Markdown quando úteis e próximos passos claros.`;

const openAIImageFallback: RoutedConversation = {
  endpoint: EModelEndpoint.openAI,
  endpointType: EModelEndpoint.openAI,
  model: 'gpt-4o-mini',
  modelLabel: 'LPH Manus • imagem fallback',
  iconURL: 'openAI',
  promptPrefix: basePrompt,
};

/**
 * Central routing matrix for the client-side LPH Manus v1.
 * `metadata` is the future server-side decision contract; the client still sends one primary
 * route today, and `fallback` remains descriptive until retry moves out of the UI flow.
 */
const ROUTE_MATRIX: Record<
  RouteKind,
  {
    reason: string;
    costPolicy: CostPolicy;
    artifactType: ArtifactType;
    artifactMime?: ArtifactMime;
    primary: RoutedConversation;
    fallback: RoutedConversation;
  }
> = {
  simple_text: {
    reason: 'pedido simples; usando modelo barato',
    costPolicy: 'low_cost',
    artifactType: 'none',
    primary: {
      endpoint: 'DeepSeek',
      endpointType: 'DeepSeek',
      model: 'deepseek-v4-flash',
      modelLabel: 'LPH Manus • barato',
      iconURL: 'assets/deepseek.svg',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o-mini',
      modelLabel: 'LPH Manus • rápido',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  strategic_text: {
    reason: 'pedido estratégico/complexo; usando Claude',
    costPolicy: 'quality_first',
    artifactType: 'none',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • estratégico',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • forte',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  landing_page: {
    reason: 'pedido de landing page; usando Claude para HTML/design',
    costPolicy: 'quality_first',
    artifactType: 'text/html',
    artifactMime: 'text/html',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • landing',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • landing fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  html_artifact: {
    reason: 'pedido de artifact HTML; usando Claude',
    costPolicy: 'quality_first',
    artifactType: 'text/html',
    artifactMime: 'text/html',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • HTML',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • HTML fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  document_artifact: {
    reason: 'pedido de documento/proposta; usando Claude',
    costPolicy: 'balanced',
    artifactType: 'document',
    artifactMime: 'document',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • documento',
      iconURL: 'anthropic',
      promptPrefix: documentArtifactPrompt,
    },
    fallback: {
      endpoint: 'OpenRouter',
      endpointType: 'OpenRouter',
      model: 'moonshotai/kimi-k2.6',
      modelLabel: 'LPH Manus • documento fallback',
      iconURL: 'assets/openrouter.png',
      max_tokens: 2048,
      promptPrefix: documentArtifactPrompt,
    },
  },
  spreadsheet_artifact: {
    reason: 'pedido de planilha; usando Gemini',
    costPolicy: 'balanced',
    artifactType: 'spreadsheet',
    artifactMime: 'spreadsheet/table',
    primary: {
      endpoint: EModelEndpoint.google,
      endpointType: EModelEndpoint.google,
      model: 'gemini-2.5-pro',
      modelLabel: 'LPH Manus • planilha',
      iconURL: 'google',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • planilha fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  dashboard_artifact: {
    reason: 'pedido de dashboard; usando Claude para estrutura visual',
    costPolicy: 'quality_first',
    artifactType: 'application/vnd.react',
    artifactMime: 'application/vnd.react',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • dashboard',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • dashboard fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  diagram_artifact: {
    reason: 'pedido de diagrama; usando Claude com artifact Mermaid',
    costPolicy: 'balanced',
    artifactType: 'application/vnd.mermaid',
    artifactMime: 'application/vnd.mermaid',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • diagrama',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o-mini',
      modelLabel: 'LPH Manus • diagrama fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  presentation_artifact: {
    reason: 'pedido de apresentação; usando Claude',
    costPolicy: 'quality_first',
    artifactType: 'presentation',
    artifactMime: 'presentation',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • apresentação',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: 'OpenRouter',
      endpointType: 'OpenRouter',
      model: 'moonshotai/kimi-k2.6',
      modelLabel: 'LPH Manus • apresentação fallback',
      iconURL: 'assets/openrouter.png',
      max_tokens: 2048,
      promptPrefix: basePrompt,
    },
  },
  react_artifact: {
    reason: 'pedido de app/componente React; usando Claude',
    costPolicy: 'quality_first',
    artifactType: 'application/vnd.react',
    artifactMime: 'application/vnd.react',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • React',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • React fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  image_generation: {
    reason: 'pedido de geração de imagem; usando agente de imagem',
    costPolicy: 'quality_first',
    artifactType: 'image',
    artifactMime: 'image',
    primary: openAIImageFallback,
    fallback: {
      endpoint: EModelEndpoint.google,
      endpointType: EModelEndpoint.google,
      model: 'gemini-2.5-flash-image',
      modelLabel: 'LPH Manus • imagem Gemini fallback',
      iconURL: 'google',
      promptPrefix: basePrompt,
    },
  },
  file_analysis: {
    reason: 'pedido com arquivo/análise; usando Gemini',
    costPolicy: 'balanced',
    artifactType: 'none',
    primary: {
      endpoint: EModelEndpoint.google,
      endpointType: EModelEndpoint.google,
      model: 'gemini-2.5-pro',
      modelLabel: 'LPH Manus • arquivos',
      iconURL: 'google',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • arquivos fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  research: {
    reason: 'pedido com sinal de atualidade/pesquisa; usando Perplexity',
    costPolicy: 'balanced',
    artifactType: 'none',
    primary: {
      endpoint: 'Perplexity',
      endpointType: 'Perplexity',
      model: 'sonar',
      modelLabel: 'LPH Manus • web',
      iconURL: 'assets/perplexity.png',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.google,
      endpointType: EModelEndpoint.google,
      model: 'gemini-2.5-flash',
      modelLabel: 'LPH Manus • web fallback',
      iconURL: 'google',
      promptPrefix: basePrompt,
    },
  },
  coding: {
    reason: 'pedido de código; usando Claude',
    costPolicy: 'quality_first',
    artifactType: 'none',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • código',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • código fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  debug: {
    reason: 'pedido de debug/correção; usando Claude',
    costPolicy: 'quality_first',
    artifactType: 'none',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • debug',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o',
      modelLabel: 'LPH Manus • debug fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  crm_task: {
    reason: 'pedido de CRM/vendas operacional; usando DeepSeek barato',
    costPolicy: 'low_cost',
    artifactType: 'none',
    primary: {
      endpoint: 'DeepSeek',
      endpointType: 'DeepSeek',
      model: 'deepseek-v4-flash',
      modelLabel: 'LPH Manus • CRM',
      iconURL: 'assets/deepseek.svg',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o-mini',
      modelLabel: 'LPH Manus • CRM fallback',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  },
  sales_copy: {
    reason: 'pedido de copy/vendas; usando Claude',
    costPolicy: 'balanced',
    artifactType: 'text/markdown',
    artifactMime: 'text/markdown',
    primary: {
      endpoint: EModelEndpoint.anthropic,
      endpointType: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-5-20250929',
      modelLabel: 'LPH Manus • copy',
      iconURL: 'anthropic',
      promptPrefix: basePrompt,
    },
    fallback: {
      endpoint: 'OpenRouter',
      endpointType: 'OpenRouter',
      model: 'moonshotai/kimi-k2.6',
      modelLabel: 'LPH Manus • copy fallback',
      iconURL: 'assets/openrouter.png',
      max_tokens: 2048,
      promptPrefix: basePrompt,
    },
  },
};

const getProvider = (conversation: RoutedConversation): string =>
  String(conversation.endpoint ?? conversation.endpointType ?? '');

const getModel = (conversation: RoutedConversation): string => String(conversation.model ?? '');

const logRouteDecision = (metadata: LphManusRouteMetadata): void => {
  logger.debug('LPH_MANUS_ROUTE_DECISION', metadata);
};

const normalizeFileType = (file?: RouterFile): string =>
  String(file?.type ?? file?.file?.type ?? '').toLowerCase();

const normalizeFileName = (file?: RouterFile): string =>
  String(file?.filename ?? file?.file?.name ?? file?.filepath ?? '').toLowerCase();

const getFileBytes = (file?: RouterFile): number =>
  Number(file?.bytes ?? file?.size ?? file?.file?.size ?? 0);

const hasExtension = (filename: string, extensions: string[]): boolean =>
  extensions.some((extension) => filename.endsWith(extension));

const classifyFile = (file?: RouterFile): LphManusFileRouteMetadata => {
  const mimeType = normalizeFileType(file);
  const filename = normalizeFileName(file);
  const bytes = getFileBytes(file);
  const isLong = bytes >= longDocumentBytes;

  if (mimeType === 'application/pdf' || hasExtension(filename, ['.pdf'])) {
    if (isLong) {
      return {
        fileKind: 'pdf',
        fileHandlingMode: 'rag_search',
        recommendedToolResource: 'file_search',
        needsRag: true,
        recommendedModelReason:
          'PDF longo; preferir RAG/file_search ou attachment nativo no Gemini',
      };
    }
    return {
      fileKind: 'pdf',
      fileHandlingMode: 'document_parse',
      recommendedToolResource: 'document_parser',
      needsRag: false,
      recommendedModelReason: 'PDF curto; parser/contexto inline ou attachment nativo funciona bem',
    };
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    hasExtension(filename, ['.docx', '.doc'])
  ) {
    return {
      fileKind: 'docx',
      fileHandlingMode: 'document_parse',
      recommendedToolResource: 'document_parser',
      needsRag: isLong,
      recommendedModelReason: 'Documento Word; extrair texto e analisar com Claude/Gemini',
    };
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    hasExtension(filename, ['.xlsx', '.xls', '.ods'])
  ) {
    return {
      fileKind: 'spreadsheet',
      fileHandlingMode: 'spreadsheet_parse',
      recommendedToolResource: 'document_parser',
      needsRag: false,
      recommendedModelReason: 'Planilha; Gemini é a rota primária para análise tabular',
    };
  }

  if (
    mimeType === 'text/csv' ||
    mimeType === 'application/csv' ||
    hasExtension(filename, ['.csv'])
  ) {
    return {
      fileKind: 'csv',
      fileHandlingMode: 'spreadsheet_parse',
      recommendedToolResource: 'document_parser',
      needsRag: false,
      recommendedModelReason: 'CSV; tratar como tabela e manter Gemini como primário',
    };
  }

  if (
    mimeType.startsWith('image/') ||
    hasExtension(filename, ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.heif'])
  ) {
    return {
      fileKind: 'image',
      fileHandlingMode: 'vision',
      recommendedToolResource: 'vision',
      needsVision: true,
      needsRag: false,
      recommendedModelReason: 'Imagem; requer visão do provider, não parser textual',
    };
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    hasExtension(filename, ['.pptx', '.ppt', '.odp'])
  ) {
    return {
      fileKind: 'pptx',
      fileHandlingMode: isLong ? 'rag_search' : 'native_attachment',
      recommendedToolResource: isLong ? 'file_search' : 'none',
      needsRag: isLong,
      recommendedModelReason:
        'Apresentação; preferir attachment nativo quando curto, RAG quando longo',
    };
  }

  if (mimeType === 'text/html' || hasExtension(filename, ['.html', '.htm'])) {
    return {
      fileKind: 'html',
      fileHandlingMode: 'inline_context',
      recommendedToolResource: 'none',
      needsRag: false,
      recommendedModelReason: 'HTML; ler como texto/contexto inline quando o tamanho permitir',
    };
  }

  if (mimeType === 'application/json' || hasExtension(filename, ['.json'])) {
    return {
      fileKind: 'json',
      fileHandlingMode: 'inline_context',
      recommendedToolResource: 'none',
      needsRag: false,
      recommendedModelReason: 'JSON; analisar como texto estruturado',
    };
  }

  if (
    mimeType.startsWith('text/') ||
    hasExtension(filename, ['.txt', '.md', '.markdown', '.log', '.xml', '.yaml', '.yml'])
  ) {
    return {
      fileKind: 'text',
      fileHandlingMode: 'inline_context',
      recommendedToolResource: 'none',
      needsRag: isLong,
      recommendedModelReason: 'Texto simples/Markdown; contexto inline é suficiente quando curto',
    };
  }

  return {
    fileKind: 'unknown',
    fileHandlingMode: 'unsupported_or_unknown',
    recommendedToolResource: 'none',
    needsRag: false,
    needsVision: false,
    recommendedModelReason:
      'Tipo de arquivo desconhecido; manter análise genérica sem assumir parser',
  };
};

const makeRoute = (
  kind: RouteKind,
  primary?: RoutedConversation,
  matchedSignals: string[] = [],
  fileMetadata?: LphManusFileRouteMetadata,
): LphManusRoute => {
  const route = ROUTE_MATRIX[kind];
  const conversation: RoutedConversation = { ...(primary ?? route.primary) };
  if (route.artifactMime === 'text/html') {
    conversation.promptPrefix = htmlArtifactPrompt;
    conversation.artifacts = 'default';
  }
  const metadata = {
    intent: kind,
    primaryProvider: getProvider(conversation),
    primaryModel: getModel(conversation),
    fallbackProvider: getProvider(route.fallback),
    fallbackModel: getModel(route.fallback),
    costPolicy: route.costPolicy,
    artifactType: route.artifactType,
    artifactMime: route.artifactMime,
    reason: route.reason,
    matchedSignals,
    ...fileMetadata,
  };
  logRouteDecision(metadata);
  return {
    kind,
    reason: route.reason,
    fallback: route.fallback,
    costPolicy: route.costPolicy,
    artifactType: route.artifactType,
    artifactMime: route.artifactMime,
    metadata,
    conversation,
  };
};

const findImageAgent = (agentsMap?: TAgentsMap): Agent | undefined => {
  if (!agentsMap) {
    return;
  }

  const agents = Object.values(agentsMap).filter(Boolean) as Agent[];
  for (const candidate of IMAGE_AGENT_FALLBACK_NAMES) {
    const agent = agents.find((item) => item.name?.trim().toLowerCase().includes(candidate));
    if (agent) {
      return agent;
    }
  }
};

export const isLphManusConversation = (conversation?: TConversation | null) =>
  conversation?.spec === LPH_MANUS_SPEC || conversation?.modelLabel?.startsWith('LPH Manus');

export const getLphManusRoute = ({
  text,
  files,
  agentsMap,
}: {
  text: string;
  files?: RouterFile[];
  agentsMap?: TAgentsMap;
}): LphManusRoute => {
  const normalizedText = text.trim();
  const imageAgent = IMAGE_ACTION_TERMS.test(normalizedText)
    ? findImageAgent(agentsMap)
    : undefined;
  const hasDocumentArtifactSignal = DOCUMENT_ARTIFACT_TERMS.test(normalizedText);

  if (
    imageAgent &&
    IMAGE_TERMS.test(normalizedText) &&
    !hasDocumentArtifactSignal &&
    !hasFiles(files)
  ) {
    return makeRoute(
      'image_generation',
      {
        endpoint: EModelEndpoint.agents,
        endpointType: EModelEndpoint.agents,
        agent_id: imageAgent.id,
        model: imageAgent.model ?? '',
        modelLabel: imageAgent.name ?? 'Criador de imagens',
        iconURL: imageAgent.avatar?.filepath ?? imageAgent.avatar?.source ?? '',
      },
      ['image_action_terms', 'image_terms', 'image_agent_available'],
    );
  }

  if (hasFiles(files)) {
    const fileMetadata = classifyFile(files?.[0]);
    const fileSignal = fileMetadata.fileKind ? `file_kind_${fileMetadata.fileKind}` : 'file_upload';
    return makeRoute('file_analysis', undefined, ['file_upload', fileSignal], fileMetadata);
  }

  if (WEB_TERMS.test(normalizedText)) {
    return makeRoute('research', undefined, ['web_terms']);
  }

  if (LANDING_PAGE_TERMS.test(normalizedText)) {
    return makeRoute('landing_page', undefined, ['landing_page_terms']);
  }

  if (HTML_ARTIFACT_TERMS.test(normalizedText)) {
    return makeRoute('html_artifact', undefined, ['html_artifact_terms']);
  }

  if (PRESENTATION_ARTIFACT_TERMS.test(normalizedText)) {
    return makeRoute('presentation_artifact', undefined, ['presentation_artifact_terms']);
  }

  if (DASHBOARD_ARTIFACT_TERMS.test(normalizedText)) {
    return makeRoute('dashboard_artifact', undefined, ['dashboard_artifact_terms']);
  }

  if (DIAGRAM_ARTIFACT_TERMS.test(normalizedText)) {
    return makeRoute('diagram_artifact', undefined, ['diagram_artifact_terms']);
  }

  if (hasDocumentArtifactSignal) {
    return makeRoute('document_artifact', undefined, ['document_artifact_terms']);
  }

  if (SPREADSHEET_ARTIFACT_TERMS.test(normalizedText)) {
    return makeRoute('spreadsheet_artifact', undefined, ['spreadsheet_artifact_terms']);
  }

  if (FILE_ANALYSIS_TERMS.test(normalizedText)) {
    return makeRoute('file_analysis', undefined, ['file_analysis_terms']);
  }

  if (DEBUG_TERMS.test(normalizedText)) {
    return makeRoute('debug', undefined, ['debug_terms']);
  }

  if (REACT_ARTIFACT_TERMS.test(normalizedText)) {
    return makeRoute('react_artifact', undefined, ['react_artifact_terms']);
  }

  if (CODING_TERMS.test(normalizedText)) {
    return makeRoute('coding', undefined, ['coding_terms']);
  }

  if (CRM_TERMS.test(normalizedText)) {
    return makeRoute('crm_task', undefined, ['crm_terms']);
  }

  if (SALES_COPY_TERMS.test(normalizedText)) {
    return makeRoute('sales_copy', undefined, ['sales_copy_terms']);
  }

  if (STRONG_TERMS.test(normalizedText)) {
    return makeRoute('strategic_text', undefined, ['strong_terms']);
  }

  return makeRoute('simple_text', undefined, ['default_simple_text']);
};
