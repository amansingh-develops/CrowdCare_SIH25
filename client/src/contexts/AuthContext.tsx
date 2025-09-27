import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService, setAuthTokens, clearAuthTokens, getAuthTokens, User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: 'citizen' | 'admin') => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check for existing authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { accessToken, user: storedUser } = getAuthTokens();
        
        if (accessToken && storedUser) {
          // Verify token is still valid by fetching current user
          const currentUser = await apiService.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Token is invalid, clear stored auth
        clearAuthTokens();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, role: 'citizen' | 'admin') => {
    try {
      setIsLoading(true);
      
      const loginData = { email, password, role };
      const authResponse = role === 'citizen' 
        ? await apiService.loginCitizen(loginData)
        : await apiService.loginAdmin(loginData);
      
      // Store tokens and user data
      setAuthTokens(authResponse);
      setUser(authResponse.user);
      setIsAuthenticated(true);
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${authResponse.user.full_name}!`,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    try {
      setIsLoading(true);
      
      const userData = data.role === 'citizen' 
        ? await apiService.registerCitizen(data)
        : await apiService.registerAdmin(data);
      
      // Auto-login after registration
      await login(data.email, data.password, data.role);
      
      toast({
        title: "Registration Successful",
        description: `Welcome to CrowdCare, ${userData.full_name}!`,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      const { refreshToken } = getAuthTokens();
      if (refreshToken) {
        apiService.logout(refreshToken).catch(() => {
          // Ignore logout errors on backend
        });
      }
    } catch (error) {
      // Ignore errors
    } finally {
      clearAuthTokens();
      setUser(null);
      setIsAuthenticated(false);
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
