import { useCallback, useEffect, useState, useMemo, memo, lazy, Suspense, useRef } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { useMediaQuery } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { Folder, MoreHorizontal, Plus, Search, SquarePen, X } from 'lucide-react';
import type { InfiniteQueryObserverResult } from '@tanstack/react-query';
import type { ConversationListResponse } from 'librechat-data-provider';
import type { List } from 'react-virtualized';
import {
  useLocalize,
  useHasAccess,
  useAuthContext,
  useLocalStorage,
  useNavScrolling,
  useNewConvo,
} from '~/hooks';
import { useConversationsInfiniteQuery, useTitleGeneration } from '~/data-provider';
import { Conversations } from '~/components/Conversations';
import SearchBar from '~/components/Nav/SearchBar';
import store from '~/store';

const BookmarkNav = lazy(() => import('~/components/Nav/Bookmarks/BookmarkNav'));
const AccountSettings = lazy(() => import('~/components/Nav/AccountSettings'));

type LocalProject = {
  id: string;
  name: string;
};

const defaultProjectNames = [
  'Projeto 01',
  'Projeto 02',
  'Projeto 03',
  'Projeto 04',
  'Projeto 05',
  'Projeto 06',
];

const projectsStorageKey = 'lph.sidebar.projects';

const ConversationsSection = memo(() => {
  const localize = useLocalize();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const setSidebarExpanded = useSetRecoilState(store.sidebarExpanded);
  const { isAuthenticated } = useAuthContext();
  const { newConversation } = useNewConvo();
  useTitleGeneration(isAuthenticated);

  const [isChatsExpanded, setIsChatsExpanded] = useLocalStorage('chatsExpanded', true);
  const [showLoading, setShowLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [localProjects, setLocalProjects] = useState<LocalProject[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const storedProjects = window.localStorage.getItem(projectsStorageKey);
      return storedProjects ? JSON.parse(storedProjects) : [];
    } catch {
      return [];
    }
  });

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const search = useRecoilValue(store.search);

  const { data, fetchNextPage, isFetchingNextPage, isLoading, isFetching } =
    useConversationsInfiniteQuery(
      {
        tags: tags.length === 0 ? undefined : tags,
        search: search.debouncedQuery || undefined,
      },
      {
        enabled: isAuthenticated,
        staleTime: 30000,
        cacheTime: 300000,
      },
    );

  const computedHasNextPage = useMemo(() => {
    if (data?.pages && data.pages.length > 0) {
      const lastPage: ConversationListResponse = data.pages[data.pages.length - 1];
      return lastPage.nextCursor !== null;
    }
    return false;
  }, [data?.pages]);

  const conversationsRef = useRef<List | null>(null);

  const { moveToTop } = useNavScrolling<ConversationListResponse>({
    setShowLoading,
    fetchNextPage: async (options?) => {
      if (computedHasNextPage) {
        return fetchNextPage(options);
      }
      return Promise.resolve({} as InfiniteQueryObserverResult<ConversationListResponse, unknown>);
    },
    isFetchingNext: isFetchingNextPage,
  });

  const conversations = useMemo(() => {
    return data ? data.pages.flatMap((page) => page.conversations) : [];
  }, [data]);

  const visibleProjects = useMemo(() => {
    const savedNames = new Set(localProjects.map((project) => project.name));
    const fallbackProjects = defaultProjectNames
      .filter((project) => !savedNames.has(project))
      .map((name, index) => ({ id: `default-${index}`, name }));
    return [...localProjects, ...fallbackProjects].slice(0, 6);
  }, [localProjects]);

  const hiddenProjects = useMemo(() => {
    const savedNames = new Set(localProjects.map((project) => project.name));
    const fallbackProjects = defaultProjectNames
      .filter((project) => !savedNames.has(project))
      .map((name, index) => ({ id: `hidden-default-${index}`, name }));
    return [...localProjects, ...fallbackProjects].slice(6);
  }, [localProjects]);

  useEffect(() => {
    window.localStorage.setItem(projectsStorageKey, JSON.stringify(localProjects));
  }, [localProjects]);

  const createProject = useCallback(() => {
    const nextName = projectName.trim();
    if (!nextName) {
      return;
    }

    setLocalProjects((projects) => [
      { id: `${Date.now()}`, name: nextName },
      ...projects.filter((project) => project.name.toLowerCase() !== nextName.toLowerCase()),
    ]);
    setProjectName('');
    setIsProjectModalOpen(false);
  }, [projectName]);

  const toggleNav = useCallback(() => {
    if (isSmallScreen) {
      setSidebarExpanded(false);
    }
  }, [isSmallScreen, setSidebarExpanded]);

  const loadMoreConversations = useCallback(() => {
    if (isFetchingNextPage || !computedHasNextPage) {
      return;
    }
    fetchNextPage();
  }, [isFetchingNextPage, computedHasNextPage, fetchNextPage]);

  const [isSearchLoading, setIsSearchLoading] = useState(
    !!search.query && (search.isTyping || isLoading || isFetching),
  );

  useEffect(() => {
    if (search.isTyping) {
      setIsSearchLoading(true);
    } else if (!isLoading && !isFetching) {
      setIsSearchLoading(false);
    } else if (!!search.query && (isLoading || isFetching)) {
      setIsSearchLoading(true);
    }
  }, [search.query, search.isTyping, isLoading, isFetching]);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden px-3 pb-3 pt-4"
      role="region"
      aria-label={localize('com_ui_chat_history')}
    >
      <div className="mb-5 flex items-center gap-3 px-1">
        <img
          src="assets/leads-per-hour/icon.png"
          alt="Leads Per Hour"
          className="h-8 w-8 rounded-lg"
        />
        <span className="truncate text-base font-semibold text-text-primary">Leads Per Hour</span>
      </div>

      <button
        type="button"
        className="mb-2 flex h-10 w-full items-center gap-3 rounded-lg px-2 text-sm font-medium text-text-primary hover:bg-surface-active-alt"
        onClick={() => newConversation()}
      >
        <SquarePen className="h-5 w-5" aria-hidden="true" />
        Novo chat
      </button>

      <div className="mb-5 flex items-center gap-2 rounded-lg px-2 text-sm text-text-primary hover:bg-surface-active-alt">
        <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
        {search.enabled ? (
          <div className="min-w-0 flex-1">
            <SearchBar isSmallScreen={isSmallScreen} />
          </div>
        ) : (
          <span>Buscar em chats</span>
        )}
      </div>

      <div className="mb-5">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-normal text-text-secondary">
          Projetos
        </div>
        <div className="space-y-1">
          <button
            type="button"
            className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-sm text-text-primary hover:bg-surface-active-alt"
            onClick={() => setIsProjectModalOpen(true)}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Novo Projeto</span>
          </button>
          {visibleProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-sm text-text-primary hover:bg-surface-active-alt"
            >
              <Folder className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
          <button
            type="button"
            className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-sm text-text-primary hover:bg-surface-active-alt"
          >
            <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Mais</span>
          </button>
          {hiddenProjects.length > 0 && (
            <div className="hidden">
              {hiddenProjects.map((project) => (
                <span key={project.id}>{project.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-grow flex-col overflow-hidden">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-normal text-text-secondary">
          Recentes
        </div>
        <Conversations
          conversations={conversations}
          moveToTop={moveToTop}
          toggleNav={toggleNav}
          containerRef={conversationsRef}
          loadMoreConversations={loadMoreConversations}
          isLoading={isFetchingNextPage || showLoading || isLoading}
          isSearchLoading={isSearchLoading}
          isChatsExpanded={isChatsExpanded}
          setIsChatsExpanded={setIsChatsExpanded}
        />
      </div>

      <div className="mt-3 border-t border-border-light pt-3">
        {hasAccessToBookmarks && (
          <div className="hidden">
            <Suspense fallback={null}>
              <BookmarkNav tags={tags} setTags={setTags} />
            </Suspense>
          </div>
        )}
        <Suspense fallback={null}>
          <AccountSettings />
        </Suspense>
      </div>

      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border-light bg-surface-primary p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Criar projeto</h2>
              <button
                type="button"
                className="rounded-lg p-2 text-text-secondary hover:bg-surface-active-alt hover:text-text-primary"
                aria-label="Fechar"
                onClick={() => setIsProjectModalOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="project-name">
              Nome do projeto
            </label>
            <input
              id="project-name"
              className="mb-4 h-11 w-full rounded-xl border border-border-light bg-surface-secondary px-3 text-sm text-text-primary outline-none focus:border-text-primary"
              value={projectName}
              placeholder="Ex: Leads Per Hour"
              onChange={(event) => setProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  createProject();
                }
              }}
              autoFocus
            />
            <p className="mb-5 text-sm text-text-secondary">
              Esta primeira versão organiza projetos na sidebar. Na próxima fase, conectamos ao banco
              para vincular chats, arquivos e memórias.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-full bg-text-primary px-5 py-2 text-sm font-medium text-surface-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!projectName.trim()}
                onClick={createProject}
              >
                Criar projeto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ConversationsSection.displayName = 'ConversationsSection';

export default ConversationsSection;
