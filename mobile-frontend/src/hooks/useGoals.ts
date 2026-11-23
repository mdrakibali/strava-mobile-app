import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { TrainingGoal } from '../types';

export const GOALS_QUERY_KEY = ['goals'] as const;

export function useGoals() {
  return useQuery({
    queryKey: GOALS_QUERY_KEY,
    queryFn: async (): Promise<TrainingGoal[]> => {
      const res = await api.goals.list();
      return (res?.goals || []) as TrainingGoal[];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      targetValue: number;
      unit?: string;
      period?: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
      sportType?: string;
    }) => {
      const res = await api.goals.create(data);
      return res.goal as TrainingGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      return api.goals.delete(goalId);
    },
    onMutate: async (goalId: string) => {
      await queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY });
      const previousGoals = queryClient.getQueryData<TrainingGoal[]>(GOALS_QUERY_KEY);

      if (previousGoals) {
        queryClient.setQueryData<TrainingGoal[]>(
          GOALS_QUERY_KEY,
          previousGoals.filter((g) => g.id !== goalId),
        );
      }

      return { previousGoals };
    },
    onError: (_err, _goalId, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(GOALS_QUERY_KEY, context.previousGoals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}
