import { useCallback, useEffect, useState, useMemo, memo, lazy, Suspense, useRef } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { useMediaQuery } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { Folder, MoreHorizontal, Plus, Search, SquarePen, X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { InfiniteQueryObserverResult } from '@tanstack/react-query';
import type { ConversationListResponse } from 'librechat-data-provider';
import type { List } from 'react-virtualized';
import { useLocalize, useHasAccess, useAuthContext, useNavScrolling, useNewConvo } from '~/hooks';
import {
  useConversationsInfiniteQuery,
  useCreateProjectMutation,
  useProjectsQuery,
  useTitleGeneration,
} from '~/data-provider';
import { Conversations } from '~/components/Conversations';
import SearchBar from '~/components/Nav/SearchBar';
import { cn } from '~/utils';
import store from '~/store';

const BookmarkNav = lazy(() => import('~/components/Nav/Bookmarks/BookmarkNav'));
const AccountSettings = lazy(() => import('~/components/Nav/AccountSettings'));

const ConversationsSection = memo(() => {
  const localize = useLocalize();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const setSidebarExpanded = useSetRecoilState(store.sidebarExpanded);
  const { isAuthenticated } = useAuthContext();
  const { newConversation } = useNewConvo();
  useTitleGeneration(isAuthenticated);

  const [showLoading, setShowLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const projectsQuery = useProjectsQuery();
  const createProject = useCreateProjectMutation();

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

  const projects = useMemo(
    () => projectsQuery.data?.projects ?? [],
    [projectsQuery.data?.projects],
  );
  const visibleProjects = useMemo(() => projects.slice(0, 6), [projects]);
  const activeProjectId = useMemo(() => {
    const fromSearch = searchParams.get('projectId');
    if (fromSearch) {
      return fromSearch;
    }
    const match = location.pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  }, [location.pathname, searchParams]);

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

  const openProject = useCallback(
    (projectId: string) => {
      toggleNav();
      navigate(`/projects/${projectId}`);
    },
    [navigate, toggleNav],
  );

  const handleCreateProject = useCallback(() => {
    const name = projectName.trim();
    if (!name) {
      return;
    }
    createProject.mutate(
      { name },
      {
        onSuccess: (project) => {
          setProjectName('');
          setIsProjectModalOpen(false);
          navigate(`/projects/${project.projectId}`);
        },
      },
    );
  }, [createProject, navigate, projectName]);

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
      className="lph-sidebar-shell flex h-full min-h-0 flex-col overflow-hidden px-3 pb-3 pt-4"
      role="region"
      aria-label={localize('com_ui_chat_history')}
    >
      <div className="mb-6 flex items-center gap-3 px-1">
        <img
          src="assets/leads-per-hour/icon.png"
          alt="Leads Per Hour"
          className="h-8 w-8 rounded-lg"
        />
        <span className="lph-brand-font truncate text-lg font-semibold text-[#faf9f5]">
          Leads Per Hour
        </span>
      </div>

      <button
        type="button"
        className="lph-nav-item mb-2 flex h-10 w-full items-center gap-3 px-2 text-sm font-semibold"
        onClick={() =>
          newConversation({
            template: activeProjectId ? { projectId: activeProjectId } : undefined,
          })
        }
      >
        <SquarePen className="h-5 w-5" aria-hidden="true" />
        Nova conversa
      </button>

      <div className="lph-nav-item mb-6 flex min-h-10 items-center gap-2 px-2 text-sm font-medium">
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
        <div className="lph-section-label mb-2 px-2">Projetos</div>
        <div className="space-y-1">
          <button
            type="button"
            className="lph-nav-item flex h-9 w-full items-center gap-3 px-2 text-sm font-medium"
            onClick={() => setIsProjectModalOpen(true)}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Novo Projeto</span>
          </button>
          {visibleProjects.map((project) => (
            <button
              key={project.projectId}
              type="button"
              className={cn(
                'lph-nav-item flex h-9 w-full items-center gap-3 px-2 text-sm font-medium',
                project.projectId === activeProjectId && 'lph-nav-item-active',
              )}
              onClick={() => openProject(project.projectId)}
            >
              <Folder className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
          <button
            type="button"
            className="lph-nav-item flex h-9 w-full items-center gap-3 px-2 text-sm font-medium"
          >
            <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Mais</span>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-grow flex-col overflow-hidden">
        <div className="lph-section-label mb-2 px-2">Recentes</div>
        <Conversations
          conversations={conversations}
          moveToTop={moveToTop}
          toggleNav={toggleNav}
          containerRef={conversationsRef}
          loadMoreConversations={loadMoreConversations}
          isLoading={isFetchingNextPage || showLoading || isLoading}
          isSearchLoading={isSearchLoading}
          isChatsExpanded={true}
          setIsChatsExpanded={() => undefined}
        />
      </div>

      <div className="mt-3 border-t border-[var(--lph-border-soft)] pt-3">
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
          <div className="lph-panel w-full max-w-md p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="lph-brand-font text-2xl font-semibold text-[var(--lph-text)]">
                Criar projeto
              </h2>
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--lph-text-muted)] hover:bg-[var(--lph-bg-panel-hover)] hover:text-[var(--lph-text)]"
                aria-label="Fechar"
                onClick={() => setIsProjectModalOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <label
              className="mb-2 block text-sm font-medium text-[var(--lph-text)]"
              htmlFor="project-name"
            >
              Nome do projeto
            </label>
            <input
              id="project-name"
              className="lph-input h-11 w-full px-3 text-sm"
              value={projectName}
              placeholder="Ex: Cliente ACME"
              onChange={(event) => setProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleCreateProject();
                }
              }}
              autoFocus
            />
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="lph-primary-button px-5 py-2 text-sm"
                disabled={!projectName.trim() || createProject.isLoading}
                onClick={handleCreateProject}
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
