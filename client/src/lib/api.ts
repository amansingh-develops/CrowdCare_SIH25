const API_BASE_URL = 'http://localhost:8000';

export interface User {
  id: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  role: 'citizen' | 'admin';
  admin_id?: string;
  municipality_name?: string;
  department_name?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface CitizenRegisterData {
  full_name: string;
  email: string;
  mobile_number: string;
  password: string;
  confirm_password: string;
  role: 'citizen';
}

export interface AdminRegisterData {
  full_name: string;
  email: string;
  mobile_number: string;
  password: string;
  confirm_password: string;
  role: 'admin';
  admin_id: string;
  municipality_name?: string;
  department_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
  role: 'citizen' | 'admin';
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Auth endpoints
  async registerCitizen(data: CitizenRegisterData): Promise<User> {
    return this.request<User>('/auth/citizen/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async registerAdmin(data: AdminRegisterData): Promise<User> {
    return this.request<User>('/auth/admin/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async loginCitizen(data: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/citizen/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async loginAdmin(data: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateUserProfile(data: { full_name?: string; email?: string; mobile_number?: string }): Promise<User> {
    return this.request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  // Report endpoints
  async createReport(formData: FormData): Promise<any> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}/reports/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getReports(): Promise<any[]> {
    return this.request<any[]>('/reports');
  }

  async getReport(id: string): Promise<any> {
    return this.request<any>(`/reports/${id}`);
  }

  // Community endpoints
  async getCommunityReports(params?: { skip?: number; limit?: number; sort?: 'upvotes' | 'latest' | 'urgency' }): Promise<any[]> {
    const search = new URLSearchParams();
    if (params?.skip !== undefined) search.append('skip', String(params.skip));
    if (params?.limit !== undefined) search.append('limit', String(params.limit));
    if (params?.sort) search.append('sort', params.sort);
    const query = search.toString() ? `?${search.toString()}` : '';
    return this.request<any[]>(`/reports/community${query}`);
  }

  async toggleUpvote(reportId: number): Promise<{ message: string; total_upvotes: number; user_has_upvoted: boolean }> {
    return this.request(`/reports/${reportId}/upvote`, {
      method: 'POST',
    });
  }

  async getComments(reportId: number): Promise<Array<{ id: number; report_id: number; user_id: string; user_name?: string; comment: string; created_at: string }>> {
    return this.request<Array<{ id: number; report_id: number; user_id: string; user_name?: string; comment: string; created_at: string }>>(`/reports/${reportId}/comments`);
  }

  async addComment(reportId: number, comment: string): Promise<{ id: number; report_id: number; user_id: string; user_name?: string; comment: string; created_at: string }> {
    return this.request(`/reports/${reportId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }

  async getAdminReports(filters?: { urgency_filter?: string; status_filter?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.urgency_filter) params.append('urgency_filter', filters.urgency_filter);
    if (filters?.status_filter) params.append('status_filter', filters.status_filter);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/admin/reports${query}`);
  }

  // Department-based report endpoints
  async getMyDepartmentReports(): Promise<any[]> {
    return this.request<any[]>('/admin/departments/my-issues');
  }

  async getOtherDepartmentReports(): Promise<any[]> {
    return this.request<any[]>('/admin/departments/other-issues');
  }

  async getDepartmentStats(): Promise<any> {
    return this.request<any>('/admin/departments/stats');
  }

  async getAllDepartments(): Promise<any[]> {
    return this.request<any[]>('/admin/departments');
  }

  // Citizen report management endpoints
  async getMyReports(): Promise<any[]> {
    return this.request<any[]>('/citizen/reports');
  }

  async createReply(replyData: { report_id: number; message: string; is_admin_reply?: boolean }): Promise<any> {
    return this.request<any>('/citizen/replies', {
      method: 'POST',
      body: JSON.stringify(replyData),
    });
  }

  async getReportReplies(reportId: number): Promise<any[]> {
    return this.request<any[]>(`/reports/${reportId}/replies`);
  }

  async rateReport(ratingData: { report_id: number; rating: number; feedback?: string }): Promise<any> {
    return this.request<any>('/citizen/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });
  }

  async deleteReport(reportId: number, reason: string): Promise<any> {
    return this.request<any>(`/citizen/reports/${reportId}`, {
      method: 'DELETE',
      body: JSON.stringify({ report_id: reportId, reason }),
    });
  }

  // Admin review endpoints
  async getCitizenReviews(): Promise<any[]> {
    return this.request<any[]>('/admin/reviews');
  }

  async getReviewStats(): Promise<any> {
    return this.request<any>('/admin/reviews/stats');
  }

  // Gamification endpoints
  async getGamificationProfile(): Promise<{
    user: { name: string; avatar: string | null; level: string; points: number; streak_days: number; rank: number; xp_in_level?: number; xp_required?: number };
    badges: Array<{ code: string; tier: number; name: string; icon_url: string; earned: boolean; earned_at?: string | null; progress: number; goal: number }>;
    leaderboard_preview: Array<{ rank: number; name: string; points: number }>;
  }> {
    return this.request('/gamification/profile');
  }

  // Status tracking endpoints
  async updateReportStatus(reportId: number, status: string, notes?: string): Promise<any> {
    return this.request<any>(`/admin/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async getReportStatusHistory(reportId: number): Promise<any[]> {
    return this.request<any[]>(`/reports/${reportId}/status-history`);
  }

  async getReportStatusTimeline(reportId: number): Promise<any> {
    return this.request<any>(`/reports/${reportId}/status-timeline`);
  }

  // Enhanced resolution endpoint
  async getPublicResolution(reportId: number): Promise<any> {
    return this.request<any>(`/reports/${reportId}/resolution`);
  }

  async resolveReport(reportId: number, formData: FormData): Promise<any> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}/admin/reports/${reportId}/resolve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      // Try to parse JSON error with a meaningful detail message
      try {
        const errJson = await response.json();
        const message = errJson?.detail || errJson?.message || JSON.stringify(errJson);
        throw new Error(message);
      } catch {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }
    }

    return response.json();
  }



  async verifyFaceInstant(imageBase64: string): Promise<{
    success: boolean;
    face_detected: boolean;
    openai_human: boolean;
  }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    const res = await fetch(`${this.baseUrl}/verify-face-instant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
    if (!res.ok) {
      let msg = await res.text();
      try { const j = JSON.parse(msg); msg = j.detail || msg; } catch {}
      throw new Error(msg || 'Face verification failed');
    }
    return res.json();
  }

  async verifyFace(reportId: number, imageBase64: string): Promise<{
    success: boolean;
    face_detected: boolean;
    openai_human: boolean;
    image_url?: string;
    verified_at?: string;
  }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }

    const res = await fetch(`${this.baseUrl}/resolve/${reportId}/verify-face`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ image_base64: imageBase64, report_id: reportId }),
    });
    if (!res.ok) {
      let msg = await res.text();
      try { const j = JSON.parse(msg); msg = j.detail || msg; } catch {}
      throw new Error(msg || 'Face verification failed');
    }
    return res.json();
  }
}

export const apiService = new ApiService();

// Auth utilities
export const setAuthTokens = (tokens: AuthResponse) => {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
  localStorage.setItem('user', JSON.stringify(tokens.user));
  localStorage.setItem('isAuthenticated', 'true');
};

export const clearAuthTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
};

export const getAuthTokens = () => {
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  const user = localStorage.getItem('user');
  
  return {
    accessToken,
    refreshToken,
    user: user ? JSON.parse(user) : null,
  };
};
