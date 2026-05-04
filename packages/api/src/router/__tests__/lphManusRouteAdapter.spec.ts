import type { LphManusRouteDecision } from '../../../../data-provider/src/types/lphManusRouter';
import { prepareLphManusRouteForServer } from '../lphManusRouteAdapter';

const landingDecision: LphManusRouteDecision = {
  intent: 'landing_page',
  primaryProvider: 'anthropic',
  primaryModel: 'claude-sonnet-4-5-20250929',
  fallbackProvider: 'openAI',
  fallbackModel: 'gpt-4o',
  costPolicy: 'quality_first',
  artifactType: 'text/html',
  artifactMime: 'text/html',
  reason: 'pedido de landing page; usando Claude para HTML/design',
  matchedSignals: ['landing_page_terms'],
};

const contractDecisions: LphManusRouteDecision[] = [
  {
    intent: 'simple_text',
    primaryProvider: 'DeepSeek',
    primaryModel: 'deepseek-v4-flash',
    fallbackProvider: 'openAI',
    fallbackModel: 'gpt-4o-mini',
    costPolicy: 'low_cost',
    artifactType: 'none',
    reason: 'pedido simples; usando modelo barato',
    matchedSignals: ['default_simple_text'],
  },
  landingDecision,
  {
    intent: 'document_artifact',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-sonnet-4-5-20250929',
    fallbackProvider: 'OpenRouter',
    fallbackModel: 'moonshotai/kimi-k2.6',
    costPolicy: 'balanced',
    artifactType: 'document',
    artifactMime: 'document',
    reason: 'pedido de documento/proposta; usando Claude',
    matchedSignals: ['document_artifact_terms'],
  },
  {
    intent: 'spreadsheet_artifact',
    primaryProvider: 'google',
    primaryModel: 'gemini-2.5-pro',
    fallbackProvider: 'openAI',
    fallbackModel: 'gpt-4o',
    costPolicy: 'balanced',
    artifactType: 'spreadsheet',
    artifactMime: 'spreadsheet/table',
    reason: 'pedido de planilha; usando Gemini',
    matchedSignals: ['spreadsheet_artifact_terms'],
  },
  {
    intent: 'research',
    primaryProvider: 'Perplexity',
    primaryModel: 'sonar',
    fallbackProvider: 'google',
    fallbackModel: 'gemini-2.5-flash',
    costPolicy: 'balanced',
    artifactType: 'none',
    reason: 'pedido com sinal de atualidade/pesquisa; usando Perplexity',
    matchedSignals: ['web_terms'],
  },
  {
    intent: 'image_generation',
    primaryProvider: 'agents',
    primaryModel: 'gpt-4o-mini',
    fallbackProvider: 'google',
    fallbackModel: 'gemini-2.5-flash-image',
    costPolicy: 'quality_first',
    artifactType: 'image',
    artifactMime: 'image',
    reason: 'pedido de geração de imagem; usando agente de imagem',
    matchedSignals: ['image_action_terms', 'image_terms', 'image_agent_available'],
  },
  {
    intent: 'debug',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-sonnet-4-5-20250929',
    fallbackProvider: 'openAI',
    fallbackModel: 'gpt-4o',
    costPolicy: 'quality_first',
    artifactType: 'none',
    reason: 'pedido de debug/correção; usando Claude',
    matchedSignals: ['debug_terms'],
  },
  {
    intent: 'coding',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-sonnet-4-5-20250929',
    fallbackProvider: 'openAI',
    fallbackModel: 'gpt-4o',
    costPolicy: 'quality_first',
    artifactType: 'none',
    reason: 'pedido de código; usando Claude',
    matchedSignals: ['coding_terms'],
  },
  {
    intent: 'react_artifact',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-sonnet-4-5-20250929',
    fallbackProvider: 'openAI',
    fallbackModel: 'gpt-4o',
    costPolicy: 'quality_first',
    artifactType: 'application/vnd.react',
    artifactMime: 'application/vnd.react',
    reason: 'pedido de app/componente React; usando Claude',
    matchedSignals: ['react_artifact_terms'],
  },
  {
    intent: 'dashboard_artifact',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-sonnet-4-5-20250929',
    fallbackProvider: 'openAI',
    fallbackModel: 'gpt-4o',
    costPolicy: 'quality_first',
    artifactType: 'application/vnd.react',
    artifactMime: 'application/vnd.react',
    reason: 'pedido de dashboard; usando Claude para estrutura visual',
    matchedSignals: ['dashboard_artifact_terms'],
  },
  {
    intent: 'presentation_artifact',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-sonnet-4-5-20250929',
    fallbackProvider: 'OpenRouter',
    fallbackModel: 'moonshotai/kimi-k2.6',
    costPolicy: 'quality_first',
    artifactType: 'presentation',
    artifactMime: 'presentation',
    reason: 'pedido de apresentação; usando Claude',
    matchedSignals: ['presentation_artifact_terms'],
  },
  {
    intent: 'diagram_artifact',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-sonnet-4-5-20250929',
    fallbackProvider: 'openAI',
    fallbackModel: 'gpt-4o-mini',
    costPolicy: 'balanced',
    artifactType: 'application/vnd.mermaid',
    artifactMime: 'application/vnd.mermaid',
    reason: 'pedido de diagrama; usando Claude com artifact Mermaid',
    matchedSignals: ['diagram_artifact_terms'],
  },
];

describe('prepareLphManusRouteForServer', () => {
  it('returns v1 metadata for a valid landing_page decision', () => {
    const result = prepareLphManusRouteForServer(landingDecision);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.error);
    }
    expect(result.metadata).toMatchObject({
      version: 'v1',
      intent: 'landing_page',
      primaryProvider: 'anthropic',
      primaryModel: 'claude-sonnet-4-5-20250929',
      fallbackProvider: 'openAI',
      fallbackModel: 'gpt-4o',
      costPolicy: 'quality_first',
      artifactType: 'text/html',
      artifactMime: 'text/html',
      reason: 'pedido de landing page; usando Claude para HTML/design',
      matchedSignals: ['landing_page_terms'],
    });
    expect(Date.parse(result.metadata.routedAt)).not.toBeNaN();
  });

  it('returns v1 metadata without artifact mime for simple_text', () => {
    const result = prepareLphManusRouteForServer({
      intent: 'simple_text',
      primaryProvider: 'DeepSeek',
      primaryModel: 'deepseek-v4-flash',
      fallbackProvider: 'openAI',
      fallbackModel: 'gpt-4o-mini',
      costPolicy: 'low_cost',
      artifactType: 'none',
      reason: 'pedido simples; usando modelo barato',
      matchedSignals: ['default_simple_text'],
    });

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.error);
    }
    expect(result.metadata.artifactType).toBe('none');
    expect(result.metadata.artifactMime).toBeUndefined();
  });

  it('returns invalid when primary model is missing', () => {
    const result = prepareLphManusRouteForServer({
      ...landingDecision,
      primaryModel: '',
    });

    expect(result).toEqual({
      valid: false,
      error: 'missing_primary_model',
      metadata: null,
    });
  });

  it('normalizes undefined matchedSignals to an empty array', () => {
    const result = prepareLphManusRouteForServer({
      ...landingDecision,
      matchedSignals: undefined,
    });

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.error);
    }
    expect(result.metadata.matchedSignals).toEqual([]);
  });

  it('allows fallback fields to be omitted', () => {
    const result = prepareLphManusRouteForServer({
      ...landingDecision,
      fallbackProvider: undefined,
      fallbackModel: undefined,
    });

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.error);
    }
    expect(result.metadata.fallbackProvider).toBeUndefined();
    expect(result.metadata.fallbackModel).toBeUndefined();
  });

  it('returns invalid when intent is missing', () => {
    const result = prepareLphManusRouteForServer({
      ...landingDecision,
      intent: undefined,
    });

    expect(result).toEqual({
      valid: false,
      error: 'missing_intent',
      metadata: null,
    });
  });

  it.each(contractDecisions)('preserves client route contract for $intent', (decision) => {
    const result = prepareLphManusRouteForServer(decision);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.error);
    }
    expect(result.metadata.version).toBe('v1');
    expect(result.metadata.intent).toBe(decision.intent);
    expect(result.metadata.primaryProvider).toBe(decision.primaryProvider);
    expect(result.metadata.primaryModel).toBe(decision.primaryModel);
    expect(result.metadata.fallbackProvider).toBe(decision.fallbackProvider);
    expect(result.metadata.fallbackModel).toBe(decision.fallbackModel);
    expect(result.metadata.artifactType).toBe(decision.artifactType);
    expect(result.metadata.artifactMime).toBe(decision.artifactMime);
    expect(Array.isArray(result.metadata.matchedSignals)).toBe(true);
    expect(result.metadata.matchedSignals).toEqual(decision.matchedSignals);
  });
});
