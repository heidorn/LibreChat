import type {
  LphManusFileHandlingMode,
  LphManusFileKind,
  LphManusRecommendedToolResource,
  LphManusRouteDecision,
  LphManusRouterIntent,
} from '../../../data-provider/src/types/lphManusRouter';
import {
  prepareLphManusFileHandling,
  type LphManusOperationalFileMode,
} from './lphManusFileHandlingAdapter';

/**
 * Pure DTO emitted from `prepareLphManusFileHandoff`.
 *
 * Represents the future server-side handoff payload for file handling. It is
 * a plain data envelope: nothing here calls tools, hits the database, or
 * touches the chat runtime. Consumers (Bloco 2D+) decide how to act on it.
 */
export type LphManusFileHandoff = {
  version: 'v1';
  routeIntent?: LphManusRouterIntent;
  fileKind?: LphManusFileKind;
  handlingMode?: LphManusFileHandlingMode;
  operationalMode: LphManusOperationalFileMode;
  toolResource: LphManusRecommendedToolResource;
  provider: string;
  model: string;
  needsVision: boolean;
  needsRag: boolean;
  shouldAttachNative: boolean;
  shouldUseRag: boolean;
  shouldInlineContext: boolean;
  shouldRunVision: boolean;
  shouldParseDocument: boolean;
  shouldParseSpreadsheet: boolean;
  reason: string;
  warnings: string[];
};

const inferShouldAttachNative = (
  operationalMode: LphManusOperationalFileMode,
  handlingMode?: LphManusFileHandlingMode,
): boolean => {
  if (operationalMode === 'native_attachment') {
    return true;
  }
  return handlingMode === 'native_attachment';
};

/**
 * Transforms an `LphManusRouteDecision` into a forward-looking handoff DTO.
 *
 * Pure function. Does not execute any operation, does not mutate the
 * decision, does not call into the runtime. Intended to be consumed by the
 * server-side bridge once Bloco 2D wires up real file handling.
 */
export function prepareLphManusFileHandoff(
  decision: Partial<LphManusRouteDecision> | null | undefined,
): LphManusFileHandoff {
  const handling = prepareLphManusFileHandling(decision);

  const operationalMode = handling.mode;
  const handlingMode = decision?.fileHandlingMode;

  const shouldUseRag = handling.needsRag || operationalMode === 'file_search';
  const shouldInlineContext = operationalMode === 'inline_context';
  const shouldRunVision = handling.needsVision || operationalMode === 'vision';
  const shouldParseDocument = operationalMode === 'document_parser';
  const shouldParseSpreadsheet = operationalMode === 'spreadsheet_parse';
  const shouldAttachNative = inferShouldAttachNative(operationalMode, handlingMode);

  return {
    version: 'v1',
    routeIntent: decision?.intent,
    fileKind: handling.fileKind,
    handlingMode,
    operationalMode,
    toolResource: handling.toolResource,
    provider: handling.recommendedProvider,
    model: handling.recommendedModel,
    needsVision: handling.needsVision,
    needsRag: handling.needsRag,
    shouldAttachNative,
    shouldUseRag,
    shouldInlineContext,
    shouldRunVision,
    shouldParseDocument,
    shouldParseSpreadsheet,
    reason: handling.reason,
    warnings: handling.warnings,
  };
}
