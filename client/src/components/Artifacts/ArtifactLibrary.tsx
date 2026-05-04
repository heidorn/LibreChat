/* eslint-disable i18next/no-literal-string */
import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Download,
  ExternalLink,
  FileCode2,
  FileQuestion,
  FileText,
  FolderOpen,
} from 'lucide-react';
import { useSetRecoilState } from 'recoil';
import { Button, Spinner } from '@librechat/client';
import type { TProjectArtifact } from 'librechat-data-provider';
import type { Artifact } from '~/common';
import {
  useExportProjectArtifactPdfMutation,
  useProjectArtifactMutation,
  useProjectArtifactsQuery,
} from '~/data-provider';
import { cn } from '~/utils';
import store from '~/store';

type ArtifactLibraryProps = {
  projectId: string;
  onOpenArtifact?: () => void;
};

type ArtifactFilter = 'all' | 'html' | 'documents';
type ArtifactKind = 'html' | 'document' | 'markdown' | 'unknown';

const isHtmlArtifact = (artifact: Pick<TProjectArtifact, 'type'>): boolean =>
  artifact.type === 'text/html' || artifact.type === 'application/vnd.code-html';

const getArtifactKind = (artifact: Pick<TProjectArtifact, 'type'>): ArtifactKind => {
  if (isHtmlArtifact(artifact)) {
    return 'html';
  }
  if (artifact.type === 'document') {
    return 'document';
  }
  if (
    artifact.type === 'text/markdown' ||
    artifact.type === 'text/md' ||
    artifact.type === 'text/plain'
  ) {
    return 'markdown';
  }
  return 'unknown';
};

const isDocumentArtifact = (artifact: Pick<TProjectArtifact, 'type'>): boolean => {
  const kind = getArtifactKind(artifact);
  return kind === 'document' || kind === 'markdown';
};

const getArtifactKindInfo = (artifact: Pick<TProjectArtifact, 'type'>) => {
  const kind = getArtifactKind(artifact);
  if (kind === 'html') {
    return {
      badge: 'HTML',
      description: 'Página HTML',
      icon: FileCode2,
      iconClassName: 'text-emerald-400',
    };
  }
  if (kind === 'document') {
    return {
      badge: 'Document',
      description: 'Documento',
      icon: FileText,
      iconClassName: 'text-sky-400',
    };
  }
  if (kind === 'markdown') {
    return {
      badge: 'Markdown',
      description: 'Texto/Markdown',
      icon: FileText,
      iconClassName: 'text-violet-400',
    };
  }
  return {
    badge: 'Unknown',
    description: 'Tipo não suportado',
    icon: FileQuestion,
    iconClassName: 'text-text-secondary',
  };
};

const getMetadataString = (
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
};

const formatDate = (value?: string): string => {
  if (!value) {
    return 'Sem data';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sem data';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const getDownloadInfo = (artifact: TProjectArtifact) => {
  if (isHtmlArtifact(artifact)) {
    return { extension: 'html', label: 'HTML', mimeType: 'text/html' };
  }
  if (isDocumentArtifact(artifact)) {
    return { extension: 'md', label: 'MD', mimeType: 'text/markdown' };
  }
  return null;
};

const canExportPdf = (artifact: TProjectArtifact) =>
  isHtmlArtifact(artifact) || isDocumentArtifact(artifact);

const downloadArtifact = (artifact: TProjectArtifact) => {
  const content = artifact.contentText ?? '';
  const downloadInfo = getDownloadInfo(artifact);
  if (!content) {
    return;
  }
  if (!downloadInfo) {
    return;
  }

  const blob = new Blob([content], { type: downloadInfo.mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = (artifact.title || 'artifact').replace(/[^\w.-]+/g, '-').toLowerCase();
  link.href = url;
  link.download = `${safeTitle || 'artifact'}.${downloadInfo.extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const saveBlob = (blob: Blob, title: string, extension: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = (title || 'artifact').replace(/[^\w.-]+/g, '-').toLowerCase();
  link.href = url;
  link.download = `${safeTitle || 'artifact'}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function ArtifactLibrary({ projectId, onOpenArtifact }: ArtifactLibraryProps) {
  const { data, isError, isLoading, refetch } = useProjectArtifactsQuery(projectId);
  const openArtifact = useProjectArtifactMutation(projectId);
  const exportPdf = useExportProjectArtifactPdfMutation(projectId);
  const setArtifacts = useSetRecoilState(store.artifactsState);
  const setCurrentArtifactId = useSetRecoilState(store.currentArtifactId);
  const setArtifactsVisible = useSetRecoilState(store.artifactsVisibility);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [activePdfArtifactId, setActivePdfArtifactId] = useState<string | null>(null);
  const [pdfErrorArtifactId, setPdfErrorArtifactId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ArtifactFilter>('all');

  const artifacts = useMemo(() => data?.artifacts ?? [], [data?.artifacts]);
  const filteredArtifacts = useMemo(() => {
    if (filter === 'html') {
      return artifacts.filter((artifact) => getArtifactKind(artifact) === 'html');
    }
    if (filter === 'documents') {
      return artifacts.filter((artifact) => isDocumentArtifact(artifact));
    }
    return artifacts;
  }, [artifacts, filter]);

  const filters: { label: string; value: ArtifactFilter }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'HTML', value: 'html' },
    { label: 'Documentos', value: 'documents' },
  ];

  const handleOpenArtifact = async (artifactId: string) => {
    setActiveArtifactId(artifactId);
    try {
      const savedArtifact = await openArtifact.mutateAsync(artifactId);
      const contentJson = savedArtifact.contentJson;
      const lastUpdateTime =
        Date.parse(savedArtifact.updatedAt ?? savedArtifact.createdAt ?? '') || Date.now();
      const artifact: Artifact = {
        id: savedArtifact.artifactId,
        title: savedArtifact.title,
        type: savedArtifact.type,
        content: savedArtifact.contentText ?? '',
        identifier:
          getMetadataString(contentJson, 'identifier') ??
          getMetadataString(contentJson, 'sourceArtifactId'),
        messageId: getMetadataString(contentJson, 'messageId'),
        lastUpdateTime,
      };

      const showSavedArtifact = () => {
        setArtifacts((prev) => ({
          ...(prev ?? {}),
          [artifact.id]: artifact,
        }));
        setCurrentArtifactId(artifact.id);
        setArtifactsVisible(true);
      };

      showSavedArtifact();
      onOpenArtifact?.();
      window.setTimeout(showSavedArtifact, 0);
    } finally {
      setActiveArtifactId(null);
    }
  };

  const handleExportPdf = async (artifact: TProjectArtifact) => {
    if (!canExportPdf(artifact)) {
      return;
    }

    setPdfErrorArtifactId(null);
    setActivePdfArtifactId(artifact.artifactId);
    try {
      const response = await exportPdf.mutateAsync(artifact.artifactId);
      saveBlob(response.data, artifact.title, 'pdf');
    } catch {
      setPdfErrorArtifactId(artifact.artifactId);
    } finally {
      setActivePdfArtifactId(null);
    }
  };

  if (!projectId) {
    return null;
  }

  return (
    <div className="lph-artifact-library absolute inset-x-3 top-3 z-[56] max-h-[76%] overflow-hidden rounded-lg border border-border-medium bg-surface-primary shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-border-light bg-surface-primary-alt px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-light bg-surface-secondary text-text-secondary">
            <FolderOpen size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text-primary">Artifact Library</div>
            <div className="truncate text-xs text-text-secondary">
              Artifacts salvos neste projeto
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 px-2 text-xs"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Atualizar
        </Button>
      </div>

      <div className="border-b border-border-light bg-surface-primary px-3 py-2">
        <div className="flex items-center gap-1 rounded-md bg-surface-secondary p-1">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                'h-7 flex-1 rounded px-2 text-xs font-medium transition-colors',
                filter === item.value
                  ? 'bg-surface-primary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[calc(76vh-140px)] overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center gap-2 px-2 py-6 text-sm text-text-secondary">
            <Spinner size={16} />
            Carregando artifacts salvos...
          </div>
        )}

        {isError && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            Não foi possível carregar os artifacts salvos.
          </div>
        )}

        {!isLoading && !isError && artifacts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-medium bg-surface-secondary px-4 py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-surface-tertiary text-text-secondary">
              <FolderOpen size={18} aria-hidden="true" />
            </div>
            <div className="text-sm font-medium text-text-primary">
              Nenhum artifact salvo neste projeto
            </div>
            <div className="mt-1 max-w-[280px] text-xs leading-5 text-text-secondary">
              Salve um artifact pelo painel para ele aparecer aqui.
            </div>
          </div>
        )}

        {!isLoading && !isError && artifacts.length > 0 && filteredArtifacts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-medium bg-surface-secondary px-4 py-7 text-center">
            <div className="mb-2 text-sm font-medium text-text-primary">
              Nenhum artifact neste filtro
            </div>
            <div className="max-w-[280px] text-xs leading-5 text-text-secondary">
              Troque o filtro para ver outros tipos salvos neste projeto.
            </div>
          </div>
        )}

        {!isLoading &&
          !isError &&
          filteredArtifacts.map((artifact) => {
            const isOpening = activeArtifactId === artifact.artifactId && openArtifact.isLoading;
            const downloadInfo = getDownloadInfo(artifact);
            const kindInfo = getArtifactKindInfo(artifact);
            const Icon = kindInfo.icon;
            const isExportingPdf =
              activePdfArtifactId === artifact.artifactId && exportPdf.isLoading;
            const hasPdfError = pdfErrorArtifactId === artifact.artifactId;
            return (
              <div
                key={artifact.artifactId}
                className={cn(
                  'mb-2 rounded-md border border-border-light bg-surface-secondary p-3 last:mb-0',
                  'transition-all duration-200 hover:border-border-medium hover:bg-surface-hover hover:shadow-md',
                  activeArtifactId === artifact.artifactId &&
                    'border-border-medium bg-surface-hover',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-light bg-surface-tertiary">
                        <Icon size={15} aria-hidden="true" className={kindInfo.iconClassName} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold leading-5 text-text-primary">
                          {artifact.title}
                        </div>
                        <div className="truncate text-[11px] leading-4 text-text-secondary">
                          {kindInfo.description}
                        </div>
                      </div>
                    </div>
                    <div className="ml-10 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                      <span className="rounded border border-border-light bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-primary">
                        {kindInfo.badge}
                      </span>
                      <span className="max-w-[180px] truncate rounded-sm bg-surface-tertiary px-1.5 py-0.5 font-mono text-[10px]">
                        {artifact.type || 'unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarClock size={12} aria-hidden="true" />
                        {formatDate(artifact.updatedAt ?? artifact.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 min-w-12 gap-1 px-2 text-xs"
                      onClick={() => downloadArtifact(artifact)}
                      disabled={!downloadInfo || !artifact.contentText}
                      aria-label={
                        downloadInfo ? `Baixar ${downloadInfo.label}` : 'Download indisponível'
                      }
                      title={
                        downloadInfo
                          ? `Baixar ${downloadInfo.label}`
                          : 'Download indisponível para este tipo'
                      }
                    >
                      <Download size={15} aria-hidden="true" />
                      {downloadInfo?.label ?? 'N/D'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 min-w-12 gap-1 px-2 text-xs"
                      onClick={() => handleExportPdf(artifact)}
                      disabled={!canExportPdf(artifact) || isExportingPdf}
                      aria-label="Baixar PDF"
                      title={
                        canExportPdf(artifact) ? 'Baixar PDF' : 'PDF indisponível para este tipo'
                      }
                    >
                      {isExportingPdf ? <Spinner size={14} /> : <Download size={15} />}
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn('h-8 gap-1 px-2 text-xs', isOpening && 'pointer-events-none')}
                      onClick={() => handleOpenArtifact(artifact.artifactId)}
                      disabled={isOpening}
                    >
                      {isOpening ? <Spinner size={14} /> : <ExternalLink size={14} />}
                      Abrir
                    </Button>
                  </div>
                </div>
                {hasPdfError && (
                  <div className="ml-10 mt-2 text-xs text-red-300">
                    Não foi possível gerar o PDF agora.
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
