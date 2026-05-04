import type { LphManusRouteDecision } from '../../../data-provider/src/types/lphManusRouter';

export type LphManusServerRouteMetadata = {
  version: 'v1';
  routedAt: string;
  intent: LphManusRouteDecision['intent'];
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  costPolicy: LphManusRouteDecision['costPolicy'];
  artifactType: LphManusRouteDecision['artifactType'];
  artifactMime?: LphManusRouteDecision['artifactMime'];
  reason: string;
  matchedSignals: string[];
};

export type LphManusRouteAdapterResult =
  | {
      valid: true;
      metadata: LphManusServerRouteMetadata;
    }
  | {
      valid: false;
      error: string;
      metadata: null;
    };

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function prepareLphManusRouteForServer(
  decision: Partial<LphManusRouteDecision> | null | undefined,
): LphManusRouteAdapterResult {
  const intent = asString(decision?.intent) as LphManusRouteDecision['intent'];
  if (!intent) {
    return {
      valid: false,
      error: 'missing_intent',
      metadata: null,
    };
  }

  const primaryProvider = asString(decision?.primaryProvider);
  const primaryModel = asString(decision?.primaryModel);
  if (!primaryProvider || !primaryModel) {
    return {
      valid: false,
      error: 'missing_primary_model',
      metadata: null,
    };
  }

  const fallbackProvider = asString(decision?.fallbackProvider);
  const fallbackModel = asString(decision?.fallbackModel);
  const matchedSignals = Array.isArray(decision?.matchedSignals) ? decision.matchedSignals : [];

  return {
    valid: true,
    metadata: {
      version: 'v1',
      routedAt: new Date().toISOString(),
      intent,
      primaryProvider,
      primaryModel,
      fallbackProvider: fallbackProvider || undefined,
      fallbackModel: fallbackModel || undefined,
      costPolicy: decision?.costPolicy ?? 'balanced',
      artifactType: decision?.artifactType ?? 'none',
      artifactMime: decision?.artifactMime,
      reason: asString(decision?.reason),
      matchedSignals,
    },
  };
}
