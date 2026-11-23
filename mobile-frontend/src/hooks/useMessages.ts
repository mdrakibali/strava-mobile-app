import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const MESSAGES_QUERY_KEY = ['messages'] as const;

export function useConversations() {
  return useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, 'conversations'],
    queryFn: async () => {
      const res = await api.messages.getConversations();
      return res?.conversations || [];
    },
    staleTime: 15 * 1000,
  });
}

export function useMessageThread(idOrParticipantId: string | undefined) {
  return useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, 'thread', idOrParticipantId],
    queryFn: async () => {
      if (!idOrParticipantId) return null;
      try {
        return await api.messages.getThread(idOrParticipantId);
      } catch (err: any) {
        // If it fails because it's a new conversation with an athlete, fetch their profile
        if (idOrParticipantId.startsWith('ath_') || !idOrParticipantId.startsWith('chat_')) {
          const profile = await api.athletes.getProfile(idOrParticipantId).catch(() => null);
          if (profile?.athlete) {
            return {
              messages: [],
              chatId: '',
              partner: {
                id: profile.athlete.id,
                displayName: profile.athlete.displayName,
                avatarUrl: profile.athlete.avatarUrl,
              },
            };
          }
        }
        throw err;
      }
    },
    enabled: Boolean(idOrParticipantId),
    staleTime: 5 * 1000,
  });
}

export function useSendMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipientOrChatId,
      text,
      options,
    }: {
      recipientOrChatId: string;
      text: string;
      options?: { chatId?: string; recipientId?: string };
    }) => {
      return api.messages.send(recipientOrChatId, text, options);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...MESSAGES_QUERY_KEY, 'conversations'] });
      queryClient.invalidateQueries({
        queryKey: [...MESSAGES_QUERY_KEY, 'thread', variables.recipientOrChatId],
      });
      if (variables.options?.chatId) {
        queryClient.invalidateQueries({
          queryKey: [...MESSAGES_QUERY_KEY, 'thread', variables.options.chatId],
        });
      }
    },
  });
}

export function useOpenConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return api.messages.open(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MESSAGES_QUERY_KEY, 'conversations'] });
    },
  });
}
