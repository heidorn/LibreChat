import { useCallback, useEffect, useState, useMemo, memo, lazy, Suspense, useRef } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { useMediaQuery } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { Folder, MoreHorizontal, Plus, Search, SquarePen } from 'lucide-react';
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

const pinnedProjects = [
  'Novo Projeto',
  'Projeto 01',
  'Projeto 02',
  'Projeto 03',
  'Projeto 04',
  'Projeto 05',
  'Projeto 06',
];

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
          {pinnedProjects.map((project, index) => {
            const isNewProject = index === 0;
            const Icon = isNewProject ? Plus : Folder;
            return (
              <button
                key={project}
                type="button"
                className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-sm text-text-primary hover:bg-surface-active-alt"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{project}</span>
              </button>
            );
          })}
          <button
            type="button"
            className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-sm text-text-primary hover:bg-surface-active-alt"
          >
            <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Mais</span>
          </button>
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
    </div>
  );
});

ConversationsSection.displayName = 'ConversationsSection';

export default ConversationsSection;
