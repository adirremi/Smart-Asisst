import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useProfile(userId) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const refreshProfile = () =>
    queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });

  return { ...query, refreshProfile };
}
