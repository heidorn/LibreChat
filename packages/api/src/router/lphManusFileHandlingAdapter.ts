import type {
  LphManusFileHandlingMode,
  LphManusFileKind,
  LphManusRecommendedToolResource,
  LphManusRouteDecision,
} from '../../../data-provider/src/types/lphManusRouter';

export type LphManusOperationalFileMode =
  | 'no_op'
  | 'inline_context'
  | 'file_search'
  | 'vision'
  | 'spreadsheet_parse'
  | 'document_parser'
  | 'native_attachment'
  | 'unsupported_or_unknown';

export type LphManusFileHandlingResult = {
  valid: boolean;
  version: 'v1';
  mode: LphManusOperationalFileMode;
  toolResource: LphManusRecommendedToolResource;
  needsVision: boolean;
  needsRag: boolean;
  fileKind?: LphManusFileKind;
  recommendedProvider: string;
  recommendedModel: string;
  reason: string;
  warnings: string[];
};

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const modeByHandlingMode: Record<LphManusFileHandlingMode, LphManusOperationalFileMode> = {
  inline_context: 'inline_context',
  rag_search: 'file_search',
  native_attachment: 'native_attachment',
  vision: 'vision',
  spreadsheet_parse: 'spreadsheet_parse',
  document_parse: 'document_parser',
  unsupported_or_unknown: 'unsupported_or_unknown',
};

const getMode = (fileHandlingMode?: LphManusFileHandlingMode): LphManusOperationalFileMode => {
  if (!fileHandlingMode) {
    return 'unsupported_or_unknown';
  }

  return modeByHandlingMode[fileHandlingMode] ?? 'unsupported_or_unknown';
};

const getToolResource = (
  mode: LphManusOperationalFileMode,
  recommendedToolResource?: LphManusRecommendedToolResource,
): LphManusRecommendedToolResource => {
  if (recommendedToolResource) {
    return recommendedToolResource;
  }

  if (mode === 'vision') {
    return 'vision';
  }

  if (mode === 'file_search') {
    return 'file_search';
  }

  if (mode === 'document_parser' || mode === 'spreadsheet_parse') {
    return 'document_parser';
  }

  return 'none';
};

export function prepareLphManusFileHandling(
  decision: Partial<LphManusRouteDecision> | null | undefined,
): LphManusFileHandlingResult {
  const recommendedProvider = asString(decision?.primaryProvider);
  const recommendedModel = asString(decision?.primaryModel);
  const warnings: string[] = [];

  if (!decision?.fileKind) {
    return {
      valid: false,
      version: 'v1',
      mode: 'no_op',
      toolResource: 'none',
      needsVision: false,
      needsRag: false,
      recommendedProvider,
      recommendedModel,
      reason: 'decisão sem metadata de arquivo; nenhuma operação de arquivo recomendada',
      warnings: ['missing_file_kind'],
    };
  }

  if (!recommendedProvider || !recommendedModel) {
    warnings.push('missing_recommended_model');
  }

  const fileKind = decision.fileKind;
  const mode = getMode(decision.fileHandlingMode);
  const toolResource = getToolResource(mode, decision.recommendedToolResource);
  const needsVision = Boolean(decision.needsVision || fileKind === 'image' || mode === 'vision');
  const needsRag = Boolean(decision.needsRag || mode === 'file_search');
  const modelReason = asString(decision.recommendedModelReason);
  const routeReason = asString(decision.reason);
  const reason = modelReason || routeReason || `tratamento de arquivo ${fileKind} via ${mode}`;

  if (fileKind === 'unknown' || mode === 'unsupported_or_unknown') {
    return {
      valid: false,
      version: 'v1',
      mode: 'unsupported_or_unknown',
      toolResource: 'none',
      needsVision: false,
      needsRag: false,
      fileKind,
      recommendedProvider,
      recommendedModel,
      reason,
      warnings: [...warnings, 'unsupported_file_kind'],
    };
  }

  return {
    valid: true,
    version: 'v1',
    mode,
    toolResource,
    needsVision,
    needsRag,
    fileKind,
    recommendedProvider,
    recommendedModel,
    reason,
    warnings,
  };
}
