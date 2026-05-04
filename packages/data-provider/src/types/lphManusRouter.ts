export type LphManusRouterIntent =
  | 'simple_text'
  | 'strategic_text'
  | 'landing_page'
  | 'html_artifact'
  | 'document_artifact'
  | 'spreadsheet_artifact'
  | 'dashboard_artifact'
  | 'diagram_artifact'
  | 'presentation_artifact'
  | 'react_artifact'
  | 'image_generation'
  | 'file_analysis'
  | 'research'
  | 'coding'
  | 'debug'
  | 'crm_task'
  | 'sales_copy';

export type LphManusCostPolicy = 'low_cost' | 'balanced' | 'quality_first';

export type LphManusArtifactTarget =
  | 'none'
  | 'text/html'
  | 'application/vnd.code-html'
  | 'application/vnd.react'
  | 'application/vnd.mermaid'
  | 'text/markdown'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'image';

export type LphManusArtifactMime =
  | 'text/html'
  | 'application/vnd.react'
  | 'application/vnd.mermaid'
  | 'text/markdown'
  | 'document'
  | 'spreadsheet/table'
  | 'presentation'
  | 'image';

export type LphManusFallbackModel = {
  fallbackProvider: string;
  fallbackModel: string;
};

export type LphManusFileKind =
  | 'pdf'
  | 'docx'
  | 'spreadsheet'
  | 'csv'
  | 'image'
  | 'pptx'
  | 'text'
  | 'html'
  | 'json'
  | 'unknown';

export type LphManusFileHandlingMode =
  | 'inline_context'
  | 'rag_search'
  | 'native_attachment'
  | 'vision'
  | 'spreadsheet_parse'
  | 'document_parse'
  | 'unsupported_or_unknown';

export type LphManusRecommendedToolResource =
  | 'file_search'
  | 'vision'
  | 'document_parser'
  | 'execute_code'
  | 'none';

export type LphManusFileRouteMetadata = {
  fileKind?: LphManusFileKind;
  fileHandlingMode?: LphManusFileHandlingMode;
  recommendedToolResource?: LphManusRecommendedToolResource;
  needsVision?: boolean;
  needsRag?: boolean;
  recommendedModelReason?: string;
};

export type LphManusRouteDecision = LphManusFallbackModel & {
  intent: LphManusRouterIntent;
  primaryProvider: string;
  primaryModel: string;
  costPolicy: LphManusCostPolicy;
  artifactType: LphManusArtifactTarget;
  artifactMime?: LphManusArtifactMime;
  reason: string;
  matchedSignals: string[];
} & LphManusFileRouteMetadata;
