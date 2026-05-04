import { useRef, useState, useEffect, useCallback } from 'react';
import copy from 'copy-to-clipboard';
import * as Tabs from '@radix-ui/react-tabs';
import { Check, Code, FolderOpen, Play, RefreshCw, Save, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSetRecoilState, useResetRecoilState, useRecoilValue } from 'recoil';
import { Button, Spinner, useMediaQuery, Radio } from '@librechat/client';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react';
import CopyButton from '~/components/Messages/Content/CopyButton';
import { useShareContext, useMutationState } from '~/Providers';
import { useCodeState } from '~/Providers/EditorContext';
import useArtifacts from '~/hooks/Artifacts/useArtifacts';
import { useSaveProjectArtifactMutation } from '~/data-provider';
import ArtifactLibrary from './ArtifactLibrary';
import DownloadArtifact from './DownloadArtifact';
import ArtifactVersion from './ArtifactVersion';
import ArtifactTabs from './ArtifactTabs';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

const MAX_BLUR_AMOUNT = 32;
const MAX_BACKDROP_OPACITY = 0.3;

export default function Artifacts() {
  const localize = useLocalize();
  const { isMutating } = useMutationState();
  const { isSharedConvo } = useShareContext();
  const { currentCode } = useCodeState();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 868px)');
  const previewRef = useRef<SandpackPreviewRef>();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [height, setHeight] = useState(90);
  const [isDragging, setIsDragging] = useState(false);
  const [blurAmount, setBlurAmount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(90);
  const setArtifactsVisible = useSetRecoilState(store.artifactsVisibility);
  const resetCurrentArtifactId = useResetRecoilState(store.currentArtifactId);
  const conversation = useRecoilValue(store.conversationByIndex(0));

  const tabOptions = [
    {
      value: 'code',
      label: localize('com_ui_code'),
      icon: <Code className="size-4" />,
    },
    {
      value: 'preview',
      label: localize('com_ui_preview'),
      icon: <Play className="size-4" />,
    },
  ];

  useEffect(() => {
    setIsMounted(true);
    const delay = isMobile ? 50 : 30;
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setBlurAmount(0);
      return;
    }

    const minHeightForBlur = 50;
    const maxHeightForBlur = 100;

    if (height <= minHeightForBlur) {
      setBlurAmount(0);
    } else if (height >= maxHeightForBlur) {
      setBlurAmount(MAX_BLUR_AMOUNT);
    } else {
      const progress = (height - minHeightForBlur) / (maxHeightForBlur - minHeightForBlur);
      setBlurAmount(Math.round(progress * MAX_BLUR_AMOUNT));
    }
  }, [height, isMobile]);

  const {
    activeTab,
    setActiveTab,
    currentIndex,
    currentArtifact,
    orderedArtifactIds,
    setCurrentArtifactId,
  } = useArtifacts();
  const searchParams = new URLSearchParams(location.search);
  const projectId = searchParams.get('projectId') ?? conversation?.projectId ?? '';
  const saveProjectArtifact = useSaveProjectArtifactMutation(projectId);
  const [isSaved, setIsSaved] = useState(false);

  const handleCopyArtifact = useCallback(() => {
    const content = currentArtifact?.content ?? '';
    if (!content) {
      return;
    }
    copy(content, { format: 'text/plain' });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  }, [currentArtifact?.content]);

  const isHtmlArtifact =
    currentArtifact?.type === 'text/html' || currentArtifact?.type === 'application/vnd.code-html';
  const isDocumentArtifact =
    currentArtifact?.type === 'document' ||
    currentArtifact?.type === 'text/markdown' ||
    currentArtifact?.type === 'text/md' ||
    currentArtifact?.type === 'text/plain';
  const canSaveProjectArtifact = isHtmlArtifact || isDocumentArtifact;

  const handleSaveArtifact = useCallback(() => {
    if (!currentArtifact || !projectId || !canSaveProjectArtifact) {
      return;
    }

    const content = currentCode ?? currentArtifact.content ?? '';
    if (!content) {
      return;
    }

    saveProjectArtifact.mutate(
      {
        artifactId: currentArtifact.id,
        title:
          currentArtifact.title ?? (isDocumentArtifact ? 'Document Artifact' : 'HTML Artifact'),
        type: currentArtifact.type ?? (isDocumentArtifact ? 'text/markdown' : 'text/html'),
        contentText: content,
        contentJson: {
          conversationId: conversation?.conversationId,
          messageId: currentArtifact.messageId,
          identifier: currentArtifact.identifier,
          sourceArtifactId: currentArtifact.id,
        },
        status: 'draft',
      },
      {
        onSuccess: () => {
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 3000);
        },
      },
    );
  }, [
    conversation?.conversationId,
    currentArtifact,
    currentCode,
    canSaveProjectArtifact,
    isDocumentArtifact,
    projectId,
    saveProjectArtifact,
  ]);

  const renderSaveIcon = () => {
    if (saveProjectArtifact.isLoading) {
      return <Spinner size={16} />;
    }
    if (isSaved) {
      return <Check size={16} aria-hidden="true" />;
    }
    return <Save size={16} aria-hidden="true" />;
  };

  useEffect(() => {
    if (!projectId) {
      setIsLibraryOpen(false);
    }
  }, [projectId]);

  const handleDragStart = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) {
      return;
    }

    const deltaY = dragStartY.current - e.clientY;
    const viewportHeight = window.innerHeight;
    const deltaPercentage = (deltaY / viewportHeight) * 100;
    const newHeight = Math.max(10, Math.min(100, dragStartHeight.current + deltaPercentage));

    setHeight(newHeight);
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!isDragging) {
      return;
    }

    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Snap to positions based on final height
    if (height < 30) {
      closeArtifacts();
    } else if (height > 95) {
      setHeight(100);
    } else if (height < 60) {
      setHeight(50);
    } else {
      setHeight(90);
    }
  };

  if (!currentArtifact || !isMounted) {
    return null;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    const client = previewRef.current?.getClient();
    if (client) {
      client.dispatch({ type: 'refresh' });
    }
    setTimeout(() => setIsRefreshing(false), 750);
  };

  const closeArtifacts = () => {
    if (isMobile) {
      setIsClosing(true);
      setIsVisible(false);
      setTimeout(() => {
        setArtifactsVisible(false);
        setIsClosing(false);
        setHeight(90);
      }, 250);
    } else {
      resetCurrentArtifactId();
      setArtifactsVisible(false);
    }
  };

  const backdropOpacity =
    blurAmount > 0
      ? (Math.min(blurAmount, MAX_BLUR_AMOUNT) / MAX_BLUR_AMOUNT) * MAX_BACKDROP_OPACITY
      : 0;

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} asChild>
      <div className="flex h-full w-full flex-col">
        {/* Mobile backdrop with dynamic blur */}
        {isMobile && (
          <div
            className={cn(
              'fixed inset-0 z-[99] bg-black will-change-[opacity,backdrop-filter]',
              isVisible && !isClosing
                ? 'transition-all duration-300'
                : 'pointer-events-none opacity-0 backdrop-blur-none transition-opacity duration-150',
              blurAmount < 8 && isVisible && !isClosing ? 'pointer-events-none' : '',
            )}
            style={{
              opacity: isVisible && !isClosing ? backdropOpacity : 0,
              backdropFilter: isVisible && !isClosing ? `blur(${blurAmount}px)` : 'none',
              WebkitBackdropFilter: isVisible && !isClosing ? `blur(${blurAmount}px)` : 'none',
            }}
            onClick={blurAmount >= 8 ? closeArtifacts : undefined}
            aria-hidden="true"
          />
        )}
        <div
          className={cn(
            'lph-artifact-panel-shell flex w-full flex-col bg-surface-primary text-xl text-text-primary',
            isMobile
              ? cn(
                  'fixed inset-x-0 bottom-0 z-[100] rounded-t-[20px] shadow-[0_-10px_60px_rgba(0,0,0,0.35)]',
                  isVisible && !isClosing
                    ? 'translate-y-0 opacity-100'
                    : 'duration-250 translate-y-full opacity-0 transition-all',
                  isDragging ? '' : 'transition-all duration-300',
                )
              : cn(
                  'h-full shadow-2xl',
                  isVisible && !isClosing
                    ? 'duration-350 translate-x-0 opacity-100 transition-all'
                    : 'translate-x-5 opacity-0 transition-all duration-300',
                ),
          )}
          style={isMobile ? { height: `${height}vh` } : { overflow: 'hidden' }}
        >
          {isMobile && (
            <div
              className="flex flex-shrink-0 cursor-grab items-center justify-center bg-surface-primary-alt pb-1.5 pt-2.5 active:cursor-grabbing"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              <div className="h-1 w-12 rounded-full bg-border-xheavy opacity-40 transition-all duration-200 active:opacity-60" />
            </div>
          )}

          {/* Header */}
          <div
            className={cn(
              'lph-artifact-panel-header flex h-[52px] flex-shrink-0 items-center justify-between gap-2 border-b border-border-light bg-surface-primary-alt px-3 py-2 transition-all duration-300',
              isMobile ? 'justify-center' : 'overflow-hidden',
            )}
          >
            {!isMobile && (
              <div
                className={cn(
                  'lph-tabs-pill flex items-center transition-all duration-500',
                  isVisible && !isClosing
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-2 opacity-0',
                )}
              >
                <Radio
                  options={tabOptions}
                  value={activeTab}
                  onChange={setActiveTab}
                  disabled={isMutating && activeTab !== 'code'}
                  buttonClassName="h-8 px-3 gap-1.5"
                />
              </div>
            )}

            <div
              className={cn(
                'lph-action-cluster flex items-center gap-1 transition-all duration-500',
                isMobile ? 'min-w-max' : '',
                isVisible && !isClosing ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0',
              )}
            >
              {activeTab === 'preview' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="lph-action-icon h-8 w-8"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  aria-label={localize('com_ui_refresh')}
                >
                  {isRefreshing ? (
                    <Spinner size={16} />
                  ) : (
                    <RefreshCw
                      size={16}
                      className="transition-transform duration-200"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              )}
              {activeTab !== 'preview' && isMutating && (
                <RefreshCw size={16} className="animate-spin text-text-secondary" />
              )}
              {orderedArtifactIds.length > 1 && (
                <ArtifactVersion
                  currentIndex={currentIndex}
                  totalVersions={orderedArtifactIds.length}
                  onVersionChange={(index) => {
                    const target = orderedArtifactIds[index];
                    if (target) {
                      setCurrentArtifactId(target);
                    }
                  }}
                />
              )}
              <CopyButton isCopied={isCopied} iconOnly onClick={handleCopyArtifact} />
              {projectId && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="lph-action-icon h-8 w-8"
                  onClick={() => setIsLibraryOpen((value) => !value)}
                  aria-label="Abrir Artifact Library"
                  title="Artifact Library"
                >
                  <FolderOpen size={16} aria-hidden="true" />
                </Button>
              )}
              {canSaveProjectArtifact && projectId && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="lph-action-icon h-8 w-8"
                  onClick={handleSaveArtifact}
                  disabled={saveProjectArtifact.isLoading}
                  aria-label="Salvar artifact"
                  title="Salvar artifact"
                >
                  {renderSaveIcon()}
                </Button>
              )}
              <DownloadArtifact artifact={currentArtifact} />
              <Button
                size="icon"
                variant="ghost"
                className="lph-action-icon h-8 w-8"
                onClick={closeArtifacts}
                aria-label={localize('com_ui_close')}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-primary">
            {isLibraryOpen && projectId && (
              <ArtifactLibrary
                projectId={projectId}
                onOpenArtifact={() => setIsLibraryOpen(false)}
              />
            )}

            <div className="absolute inset-0 flex flex-col">
              <ArtifactTabs
                artifact={currentArtifact}
                previewRef={previewRef as React.MutableRefObject<SandpackPreviewRef>}
                isSharedConvo={isSharedConvo}
              />
            </div>

            {currentArtifact.type === 'unknown' && (
              <div className="pointer-events-auto absolute inset-x-3 top-3 z-[55]">
                <div className="lph-error-banner">
                  <div>
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    <div className="lph-error-banner-title">Tipo de artifact não reconhecido</div>
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    <div>
                      O conteúdo foi recebido, mas o formato não bate com nenhum preview suportado
                      (HTML, React, Mermaid, Markdown ou SVG).
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isMutating && (currentArtifact.content?.length ?? 0) < 80 && (
              <div
                className="pointer-events-none absolute inset-0 z-[58] flex items-start"
                aria-hidden="true"
              >
                <div className="lph-skeleton-stack">
                  <div className="lph-skeleton" />
                  <div className="lph-skeleton" />
                  <div className="lph-skeleton" />
                  <div className="lph-skeleton" />
                </div>
              </div>
            )}

            <div
              className={cn(
                'absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out',
                isRefreshing ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-hidden={!isRefreshing}
              role="status"
            >
              <div
                className={cn(
                  'transition-transform duration-300 ease-in-out',
                  isRefreshing ? 'scale-100' : 'scale-95',
                )}
              >
                <Spinner size={24} />
              </div>
            </div>
          </div>

          {isMobile && (
            <div className="flex-shrink-0 border-t border-border-light bg-surface-primary-alt p-2">
              <Radio
                fullWidth
                options={tabOptions}
                value={activeTab}
                onChange={setActiveTab}
                disabled={isMutating && activeTab !== 'code'}
              />
            </div>
          )}
        </div>
      </div>
    </Tabs.Root>
  );
}
