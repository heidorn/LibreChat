import { useEffect, useRef } from 'react';
import { useResetRecoilState } from 'recoil';
import { logger } from '~/utils';
import { useSetConvoContext } from '~/Providers/SetConvoContext';
import store from '~/store';

/**
 * Hook to reset visible artifacts when the conversation ID changes
 * @param conversationId - The current conversation ID
 */
export default function useIdChangeEffect(conversationId: string) {
  const lastConvoId = useRef<string | null>(null);
  const hasSetConversation = useSetConvoContext();
  const resetVisibleArtifacts = useResetRecoilState(store.visibleArtifacts);

  useEffect(() => {
    if (conversationId !== lastConvoId.current) {
      logger.log('conversation', 'Conversation ID change');
      hasSetConversation.current = false;
      resetVisibleArtifacts();
    }
    lastConvoId.current = conversationId;
  }, [conversationId, hasSetConversation, resetVisibleArtifacts]);
}
