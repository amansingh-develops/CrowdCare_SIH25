import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService, setAuthTokens, clearAuthTokens, getAuthTokens, type User } from "@/lib/api";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const tokens = getAuthTokens();
      if (!tokens.accessToken) {
        return null;
      }
      try {
        return await apiService.getCurrentUser();
      } catch (error) {
        // If token is invalid, clear it
        clearAuthTokens();
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password, role }: { email: string; password: string; role: 'citizen' | 'admin' }) => {
      if (role === 'citizen') {
        return await apiService.loginCitizen({ email, password, role });
      } else {
        return await apiService.loginAdmin({ email, password, role });
      }
    },
    onSuccess: (data) => {
      setAuthTokens(data);
      queryClient.setQueryData(["auth", "user"], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.role === 'citizen') {
        return await apiService.registerCitizen(data);
      } else {
        return await apiService.registerAdmin(data);
      }
    },
    onSuccess: (data) => {
      // For registration, we might want to auto-login or redirect to login
      queryClient.setQueryData(["auth", "user"], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const tokens = getAuthTokens();
      if (tokens.refreshToken) {
        try {
          await apiService.logout(tokens.refreshToken);
        } catch (error) {
          // Continue with logout even if API call fails
        }
      }
    },
    onSuccess: () => {
      clearAuthTokens();
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
}
