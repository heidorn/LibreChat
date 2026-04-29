import { useState, useId, useRef, memo, useCallback, useMemo } from 'react';
import * as Ariakit from '@ariakit/react';
import { useParams, useNavigate } from 'react-router-dom';
import { QueryKeys } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { DropdownPopup, Spinner, useToastContext } from '@librechat/client';
import { Archive, CopyPlus, Ellipsis, FolderPlus, Pen, Share2, Trash, X } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { TConversation, TMessage } from 'librechat-data-provider';
import {
  useDuplicateConversationMutation,
  useDeleteConversationMutation,
  useGetStartupConfig,
  useArchiveConvoMutation,
  useConversationTagMutation,
  useTagConversationMutation,
} from '~/data-provider';
import { useLocalize, useNavigateToConvo, useNewConvo } from '~/hooks';
import { NotificationSeverity } from '~/common';
import { useChatContext } from '~/Providers';
import DeleteButton from './DeleteButton';
import ShareButton from './ShareButton';
import { cn } from '~/utils';
import {
  createProjectId,
  getAllProjects,
  getProjectTag,
  saveStoredProjects,
  type LphProject,
} from '~/utils/projects';

function ConvoOptions({
  conversation,
  conversationId,
  title,
  retainView,
  renameHandler,
  isPopoverActive,
  setIsPopoverActive,
  isActiveConvo,
  isShiftHeld = false,
}: {
  conversation: TConversation;
  conversationId: string | null;
  title: string | null;
  retainView: () => void;
  renameHandler: (e: MouseEvent) => void;
  isPopoverActive: boolean;
  setIsPopoverActive: (open: boolean) => void;
  isActiveConvo: boolean;
  isShiftHeld?: boolean;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { index } = useChatContext();
  const { data: startupConfig } = useGetStartupConfig();
  const { navigateToConvo } = useNavigateToConvo(index);
  const { showToast } = useToastContext();

  const navigate = useNavigate();
  const { conversationId: currentConvoId } = useParams();
  const { newConversation } = useNewConvo();

  const menuId = useId();
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState(title || '');
  const [announcement, setAnnouncement] = useState('');

  const archiveConvoMutation = useArchiveConvoMutation();
  const createProjectTagMutation = useConversationTagMutation({
    context: 'conversation-project-menu',
  });
  const tagConversationMutation = useTagConversationMutation(conversationId ?? '', {
    onSuccess: () => {
      showToast({
        message: 'Conversa vinculada ao projeto.',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
    },
    onError: () => {
      showToast({
        message: 'Não consegui adicionar a conversa ao projeto.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const deleteMutation = useDeleteConversationMutation({
    onSuccess: () => {
      if (currentConvoId === conversationId || currentConvoId === 'new') {
        newConversation();
        navigate('/c/new', { replace: true });
      }
      retainView();
      showToast({
        message: localize('com_ui_convo_delete_success'),
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_convo_delete_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const duplicateConversation = useDuplicateConversationMutation({
    onSuccess: (data) => {
      navigateToConvo(data.conversation);
      showToast({
        message: localize('com_ui_duplication_success'),
        status: 'success',
      });
      setIsPopoverActive(false);
    },
    onMutate: () => {
      showToast({
        message: localize('com_ui_duplication_processing'),
        status: 'info',
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_duplication_error'),
        status: 'error',
      });
    },
  });

  const isDuplicateLoading = duplicateConversation.isLoading;
  const isArchiveLoading = archiveConvoMutation.isLoading;
  const isDeleteLoading = deleteMutation.isLoading;

  const shareHandler = useCallback(() => {
    setShowShareDialog(true);
  }, []);

  const deleteHandler = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleInstantDelete = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const convoId = conversationId ?? '';
      if (!convoId) {
        return;
      }
      const messages = queryClient.getQueryData<TMessage[]>([QueryKeys.messages, convoId]);
      const thread_id = messages?.[messages.length - 1]?.thread_id;
      const endpoint = messages?.[messages.length - 1]?.endpoint;
      deleteMutation.mutate({ conversationId: convoId, thread_id, endpoint, source: 'button' });
    },
    [conversationId, deleteMutation, queryClient],
  );

  const handleArchiveClick = useCallback(
    async (e?: MouseEvent) => {
      e?.stopPropagation();
      const convoId = conversationId ?? '';
      if (!convoId) {
        return;
      }

      archiveConvoMutation.mutate(
        { conversationId: convoId, isArchived: true },
        {
          onSuccess: () => {
            setAnnouncement(localize('com_ui_convo_archived'));
            setTimeout(() => {
              setAnnouncement('');
            }, 10000);
            if (currentConvoId === convoId || currentConvoId === 'new') {
              newConversation();
              navigate('/c/new', { replace: true });
            }
            retainView();
            setIsPopoverActive(false);
          },
          onError: () => {
            showToast({
              message: localize('com_ui_archive_error'),
              severity: NotificationSeverity.ERROR,
              showIcon: true,
            });
          },
        },
      );
    },
    [
      conversationId,
      currentConvoId,
      archiveConvoMutation,
      navigate,
      newConversation,
      retainView,
      setIsPopoverActive,
      showToast,
      localize,
    ],
  );

  const handleDuplicateClick = useCallback(() => {
    duplicateConversation.mutate({
      conversationId: conversationId ?? '',
    });
  }, [conversationId, duplicateConversation]);

  const linkConversationToProject = useCallback(
    (project: LphProject) => {
      const projectTag = getProjectTag(project.id);
      const currentTags = conversation.tags ?? [];
      createProjectTagMutation.mutate({
        tag: projectTag,
        description: project.name,
      });
      tagConversationMutation.mutate({
        tag: projectTag,
        tags: Array.from(new Set([...currentTags, projectTag])),
      });
      setShowProjectDialog(false);
      setIsPopoverActive(false);
    },
    [conversation.tags, createProjectTagMutation, setIsPopoverActive, tagConversationMutation],
  );

  const createProjectWithConversation = useCallback(() => {
    const nextName = newProjectName.trim();
    if (!nextName) {
      return;
    }

    const project = {
      id: createProjectId(nextName),
      name: nextName,
      createdAt: new Date().toISOString(),
    };
    const existingProjects = getAllProjects();
    const nextProjects = [
      project,
      ...existingProjects.filter(
        (item) => item.name.toLowerCase() !== nextName.toLowerCase() && item.id !== project.id,
      ),
    ];
    saveStoredProjects(nextProjects);
    linkConversationToProject(project);
  }, [linkConversationToProject, newProjectName]);

  const dropdownItems = useMemo(
    () => [
      {
        label: localize('com_ui_share'),
        onClick: shareHandler,
        icon: <Share2 className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
        show: startupConfig && startupConfig.sharedLinksEnabled,
        ariaHasPopup: 'dialog' as const,
        ariaControls: 'share-conversation-dialog',
        /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
        hideOnClick: false,
        ref: shareButtonRef,
        render: (props) => <button {...props} />,
      },
      {
        label: localize('com_ui_rename'),
        onClick: renameHandler,
        icon: <Pen className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      },
      {
        label: localize('com_ui_duplicate'),
        onClick: handleDuplicateClick,
        hideOnClick: false,
        icon: isDuplicateLoading ? (
          <Spinner className="size-4" />
        ) : (
          <CopyPlus className="icon-sm mr-2 text-text-primary" aria-hidden="true" />
        ),
      },
      {
        label: localize('com_ui_archive'),
        onClick: handleArchiveClick,
        hideOnClick: false,
        icon: isArchiveLoading ? (
          <Spinner className="size-4" />
        ) : (
          <Archive className="icon-sm mr-2 text-text-primary" aria-hidden="true" />
        ),
      },
      {
        label: 'Adicionar ao projeto',
        onClick: () => setShowProjectDialog(true),
        hideOnClick: false,
        icon: <FolderPlus className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      },
      {
        label: localize('com_ui_delete'),
        onClick: deleteHandler,
        icon: <Trash className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
        ariaHasPopup: 'dialog' as const,
        ariaControls: 'delete-conversation-dialog',
        /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
        hideOnClick: false,
        ref: deleteButtonRef,
        render: (props) => <button {...props} />,
      },
    ],
    [
      localize,
      shareHandler,
      startupConfig,
      renameHandler,
      deleteHandler,
      isArchiveLoading,
      isDuplicateLoading,
      handleArchiveClick,
      handleDuplicateClick,
    ],
  );

  const buttonClassName = cn(
    'inline-flex h-7 w-7 items-center justify-center rounded-md border-none p-0 text-sm font-medium ring-ring-primary transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
    isActiveConvo === true || isPopoverActive
      ? 'opacity-100'
      : 'opacity-0 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[open]:opacity-100',
  );

  if (isShiftHeld && isActiveConvo && !isPopoverActive && !showShareDialog && !showDeleteDialog) {
    return (
      <div className="flex items-center gap-0.5">
        <button
          aria-label={localize('com_ui_archive')}
          className={cn(buttonClassName, 'hover:bg-surface-hover')}
          onClick={handleArchiveClick}
          disabled={isArchiveLoading}
        >
          {isArchiveLoading ? (
            <Spinner className="size-4" />
          ) : (
            <Archive className="icon-md text-text-secondary" aria-hidden={true} />
          )}
        </button>
        <button
          aria-label={localize('com_ui_delete')}
          className={cn(buttonClassName, 'hover:bg-surface-hover')}
          onClick={handleInstantDelete}
          disabled={isDeleteLoading}
        >
          {isDeleteLoading ? (
            <Spinner className="size-4" />
          ) : (
            <Trash className="icon-md text-text-secondary" aria-hidden={true} />
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      <DropdownPopup
        portal={true}
        menuId={menuId}
        focusLoop={true}
        className="z-[125]"
        unmountOnHide={true}
        isOpen={isPopoverActive}
        setIsOpen={setIsPopoverActive}
        trigger={
          <Ariakit.MenuButton
            id={`conversation-menu-${conversationId}`}
            aria-label={localize('com_nav_convo_menu_options')}
            aria-expanded={isPopoverActive}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center gap-2 rounded-md border-none p-0 text-sm font-medium ring-ring-primary transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
              isActiveConvo === true || isPopoverActive
                ? 'opacity-100'
                : 'opacity-0 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[open]:opacity-100',
            )}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
          >
            <Ellipsis className="icon-md text-text-secondary" aria-hidden={true} />
          </Ariakit.MenuButton>
        }
        items={dropdownItems}
      />
      {showShareDialog && (
        <ShareButton
          conversationId={conversationId ?? ''}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          triggerRef={shareButtonRef}
        />
      )}
      {showDeleteDialog && (
        <DeleteButton
          title={title ?? ''}
          retainView={retainView}
          triggerRef={deleteButtonRef}
          setMenuOpen={setIsPopoverActive}
          showDeleteDialog={showDeleteDialog}
          conversationId={conversationId ?? ''}
          setShowDeleteDialog={setShowDeleteDialog}
        />
      )}
      {showProjectDialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar conversa ao projeto"
          onClick={() => setShowProjectDialog(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-light bg-surface-primary p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Adicionar ao projeto</h2>
              <button
                type="button"
                className="rounded-lg p-2 text-text-secondary hover:bg-surface-active-alt hover:text-text-primary"
                aria-label="Fechar"
                onClick={() => setShowProjectDialog(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-5 max-h-56 overflow-y-auto">
              {getAllProjects().map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-sm text-text-primary hover:bg-surface-active-alt"
                  onClick={() => linkConversationToProject(project)}
                >
                  <FolderPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-border-light pt-4">
              <label
                className="mb-2 block text-sm font-medium text-text-primary"
                htmlFor={`project-from-convo-${conversationId}`}
              >
                Criar projeto com esta conversa
              </label>
              <input
                id={`project-from-convo-${conversationId}`}
                className="mb-3 h-10 w-full rounded-xl border border-border-light bg-surface-secondary px-3 text-sm text-text-primary outline-none focus:border-text-primary"
                value={newProjectName}
                placeholder="Nome do projeto"
                onChange={(event) => setNewProjectName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    createProjectWithConversation();
                  }
                }}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-full bg-text-primary px-4 py-2 text-sm font-medium text-surface-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!newProjectName.trim() || tagConversationMutation.isLoading}
                  onClick={createProjectWithConversation}
                >
                  Criar e vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(ConvoOptions, (prevProps, nextProps) => {
  return (
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.title === nextProps.title &&
    prevProps.conversation.tags === nextProps.conversation.tags &&
    prevProps.isPopoverActive === nextProps.isPopoverActive &&
    prevProps.isActiveConvo === nextProps.isActiveConvo &&
    prevProps.isShiftHeld === nextProps.isShiftHeld
  );
});
