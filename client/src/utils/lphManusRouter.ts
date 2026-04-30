import { EModelEndpoint } from 'librechat-data-provider';
import type { Agent, TAgentsMap, TConversation } from 'librechat-data-provider';
import type { ExtendedFile } from '~/common';

export const LPH_MANUS_SPEC = 'lph-manus';

type RouteKind = 'fast' | 'strong' | 'files' | 'web' | 'image' | 'longform';

type RouterFile = Pick<ExtendedFile, 'type' | 'filepath' | 'file_id'>;
type RoutedConversation = Omit<Partial<TConversation>, 'endpoint' | 'endpointType'> & {
  endpoint?: EModelEndpoint | string | null;
  endpointType?: EModelEndpoint | string | null;
};

export type LphManusRoute = {
  kind: RouteKind;
  reason: string;
  conversation: RoutedConversation;
};

const IMAGE_AGENT_NAMES = [
  'criador de imagens gemini',
  'criador de imagens openai',
  'criador de imagens',
];

const IMAGE_TERMS =
  /\b(imagem|imagens|image|foto|fotorealista|render|ilustracao|ilustração|poster|banner|criativo|thumbnail|logo|visual)\b/i;

const IMAGE_ACTION_TERMS =
  /\b(crie|cria|criar|gere|gera|gerar|desenhe|desenha|produza|faca|faça|make|generate|create)\b/i;

const WEB_TERMS =
  /\b(hoje|agora|atual|atuais|ultima|última|ultimas|últimas|semana|semanal|recente|recentes|noticia|noticias|notícia|notícias|preco|preço|cotacao|cotação|pesquise|pesquisar|procure|procurar|busque|buscar|web|internet|fonte|fontes|link|links)\b/i;

const FILE_ANALYSIS_TERMS =
  /\b(analisar|analise|análise|resumir|resuma|extrair|compare|comparar|tabela|planilha|xlsx|csv|pdf|docx|arquivo|arquivos|contrato|documento|dados|dashboard)\b/i;

const STRONG_TERMS =
  /\b(estrategia|estratégia|profundo|completo|complexo|arquitetura|plano|planejamento|decisao|decisão|critique|revisar|debug|bug|codigo|código|implementar|refatorar|tradeoff|trade-off)\b/i;

const LONGFORM_TERMS =
  /\b(copy|artigo|roteiro|manifesto|narrativa|landing page|pagina de vendas|página de vendas|email longo|proposta|apresentacao|apresentação)\b/i;

const hasFiles = (files?: RouterFile[]) => Boolean(files?.length);

const hasImageFiles = (files?: RouterFile[]) =>
  files?.some((file) => {
    const type = file.type?.toLowerCase() ?? '';
    const path = file.filepath?.toLowerCase() ?? '';
    return type.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|avif)$/i.test(path);
  }) ?? false;

const findImageAgent = (agentsMap?: TAgentsMap): Agent | undefined => {
  if (!agentsMap) {
    return;
  }

  const agents = Object.values(agentsMap).filter(Boolean) as Agent[];
  return agents.find((agent) => {
    const name = agent.name?.trim().toLowerCase() ?? '';
    return IMAGE_AGENT_NAMES.some((candidate) => name.includes(candidate));
  });
};

const basePrompt =
  'Você é a Leads Per Hour, um assistente de IA geral, claro e prático. Ajude o usuário com escrita, pesquisa, análise, imagens, arquivos, ideias, planejamento e execução. Não force nenhum contexto específico a menos que o usuário peça.';

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

  if (imageAgent && IMAGE_TERMS.test(normalizedText) && !hasFiles(files)) {
    return {
      kind: 'image',
      reason: `pedido de geração de imagem; usando agente ${imageAgent.name ?? imageAgent.id}`,
      conversation: {
        endpoint: EModelEndpoint.agents,
        endpointType: EModelEndpoint.agents,
        agent_id: imageAgent.id,
        model: imageAgent.model ?? '',
        modelLabel: imageAgent.name ?? 'Criador de imagens',
        iconURL: imageAgent.avatar?.filepath ?? imageAgent.avatar?.source ?? '',
      },
    };
  }

  if (hasFiles(files)) {
    return {
      kind: hasImageFiles(files) ? 'files' : 'files',
      reason: 'mensagem com anexo; usando Gemini para leitura/análise de arquivos',
      conversation: {
        endpoint: EModelEndpoint.google,
        endpointType: EModelEndpoint.google,
        model: 'gemini-2.5-pro',
        modelLabel: 'LPH Manus • arquivos',
        iconURL: 'google',
        promptPrefix: basePrompt,
      },
    };
  }

  if (WEB_TERMS.test(normalizedText)) {
    return {
      kind: 'web',
      reason: 'pedido com sinal de atualidade/pesquisa; usando Perplexity',
      conversation: {
        endpoint: 'Perplexity',
        endpointType: 'Perplexity',
        model: 'sonar',
        modelLabel: 'LPH Manus • web',
        iconURL: 'assets/perplexity.png',
        promptPrefix: basePrompt,
      },
    };
  }

  if (FILE_ANALYSIS_TERMS.test(normalizedText)) {
    return {
      kind: 'files',
      reason: 'pedido de análise estruturada; usando Gemini',
      conversation: {
        endpoint: EModelEndpoint.google,
        endpointType: EModelEndpoint.google,
        model: 'gemini-2.5-pro',
        modelLabel: 'LPH Manus • análise',
        iconURL: 'google',
        promptPrefix: basePrompt,
      },
    };
  }

  if (STRONG_TERMS.test(normalizedText)) {
    return {
      kind: 'strong',
      reason: 'pedido complexo/estratégico; usando Claude',
      conversation: {
        endpoint: EModelEndpoint.anthropic,
        endpointType: EModelEndpoint.anthropic,
        model: 'claude-sonnet-4-5-20250929',
        modelLabel: 'LPH Manus • estratégico',
        iconURL: 'anthropic',
        promptPrefix: basePrompt,
      },
    };
  }

  if (LONGFORM_TERMS.test(normalizedText)) {
    return {
      kind: 'longform',
      reason: 'pedido de escrita longa; usando Kimi via OpenRouter',
      conversation: {
        endpoint: 'OpenRouter',
        endpointType: 'OpenRouter',
        model: 'moonshotai/kimi-k2.6',
        modelLabel: 'LPH Manus • escrita',
        iconURL: 'assets/openrouter.png',
        max_tokens: 2048,
        promptPrefix: basePrompt,
      },
    };
  }

  return {
    kind: 'fast',
    reason: 'pedido simples; usando GPT rápido',
    conversation: {
      endpoint: EModelEndpoint.openAI,
      endpointType: EModelEndpoint.openAI,
      model: 'gpt-4o-mini',
      modelLabel: 'LPH Manus • rápido',
      iconURL: 'openAI',
      promptPrefix: basePrompt,
    },
  };
};
