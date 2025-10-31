// API client configuration for backend communication
const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';

// Authentication utility functions
export const authUtils = {
  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('access_token');
    return !!token;
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Clear authentication data
  clearAuth: (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Store authentication data
  storeAuth: (token: string, user: any, refreshToken?: string): void => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  },

  // Get refresh token
  getRefreshToken: (): string | null => {
    return localStorage.getItem('refresh_token');
  },

  // Logout and redirect to login
  logout: (): void => {
    authUtils.clearAuth();
    window.location.href = '/login';
  }
};

// Authentication API functions
export const authAPI = {
  // Login
  login: (credentials: { email: string; password: string }) => {
    return apiRequest<{
      access_token: string;
      refresh_token: string;
      user: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Check authentication status
  checkAuth: () => {
    return apiRequest<{
      status: string;
      user?: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
      };
    }>('/auth/me');
  },

  // Refresh access token
  refreshToken: (refreshToken: string) => {
    return apiRequest<{
      access_token: string;
      user: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
      };
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  // Logout
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },

  // Health check
  healthCheck: () => {
    return apiRequest<{
      status: string;
      service: string;
    }>('/auth/health');
  },
};

// Dashboard API functions
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: () => {
    return apiRequest<{
      success: boolean;
      data: {
        total_users: number;
        total_contacts: number;
        active_contacts: number;
        unsubscribed_contacts: number;
        bounced_contacts: number;
        total_campaigns: number;
        total_emails_sent: number;
        total_emails_opened: number;
        total_emails_clicked: number;
        total_emails_bounced: number;
        email_open_rate: number;
        email_click_rate: number;
        email_bounce_rate: number;
        recent_campaigns: Array<{
          id: number;
          name: string;
          status: string;
          emails_sent: number;
          emails_opened: number;
          emails_clicked: number;
          created_at: string;
        }>;
      };
    }>('/dashboard/stats');
  },
};

// Campaign interfaces
export interface Campaign {
  id: number;
  name: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  html_content: string;
  text_content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  total_recipients: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  created_at: string;
  scheduled_at?: string;
  sent_at?: string;
}

export interface CampaignCreateData {
  name: string;
  subject: string;
  sender_name?: string;
  sender_email: string;
  reply_to?: string;
  email_content: string;  // html_content
  text_content?: string;
  recipients?: string;  // comma-separated emails
  send_immediately?: boolean;
  scheduled_at?: string;
  smtp_account_id: number;
}

export interface CampaignSendResponse {
  success: boolean;
  message: string;
  sent_count: number;
  failed_count: number;
  total_recipients: number;
}

export interface TestEmailData {
  subject: string;
  sender_name?: string;
  sender_email: string;
  test_email: string;
  email_content: string;
}

// Campaigns API functions
export const campaignsAPI = {
  // Get all campaigns (filtered by user role)
  getCampaigns: () => {
    return apiRequest<{
      success: boolean;
      campaigns: Campaign[];
      total: number;
    }>('/campaigns');
  },

  // Get single campaign by ID
  getCampaign: (id: number) => {
    return apiRequest<{
      success: boolean;
      campaign: Campaign;
    }>(`/campaigns/${id}`);
  },

  // Create new campaign
  createCampaign: (data: CampaignCreateData) => {
    return apiRequest<{
      success: boolean;
      message: string;
      campaign_id: number;
    }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update existing campaign
  updateCampaign: (id: number, data: Partial<CampaignCreateData>) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete campaign
  deleteCampaign: (id: number, force: boolean = false) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/campaigns/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    });
  },

  // Send campaign
  sendCampaign: (id: number, forceSend: boolean = false) => {
    return apiRequest<CampaignSendResponse>(`/campaigns/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ force_send: forceSend }),
    });
  },

  // Send test email
  sendTestEmail: (data: TestEmailData) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/campaigns/test-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get auth token from localStorage
  const token = localStorage.getItem('access_token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle authentication errors (401 Unauthorized)
      if (response.status === 401) {
        // Check if it's a token expiration error
        if (data.error && (
          data.error.includes('Signature has expired') || 
          data.error.includes('token has expired') ||
          data.error.includes('Authentication error')
        )) {
          // Try to refresh the token before giving up
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken && !endpoint.includes('/auth/refresh')) {
            try {
              const refreshResult = await authAPI.refreshToken(refreshToken);
              // Store new access token
              authUtils.storeAuth(refreshResult.access_token, refreshResult.user);
              
              // Retry the original request with new token
              const newConfig = {
                ...config,
                headers: {
                  ...config.headers,
                  'Authorization': `Bearer ${refreshResult.access_token}`,
                }
              };
              
              const retryResponse = await fetch(url, newConfig);
              const retryData = await retryResponse.json();
              
              if (retryResponse.ok) {
                return retryData;
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }
          
          // Clear expired token and user data
          authUtils.clearAuth();
          
          // Redirect to login page
          window.location.href = '/login';
          return Promise.reject(new Error('Session expired. Please log in again.'));
        }
      }
      
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    // If it's a network error or parsing error, pass it through
    throw error;
  }
}

// Contact-related API functions
export const contactsAPI = {
  // Get all contacts
  getContacts: (search?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    
    const queryString = params.toString();
    const endpoint = `/contacts${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<{
      success: boolean;
      data: Contact[];
      total: number;
    }>(endpoint);
  },

  // Create new contact
  createContact: (contactData: Omit<Contact, 'id' | 'createdAt'>) => {
    return apiRequest<{
      success: boolean;
      data: Contact;
    }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  },

  // Update contact
  updateContact: (id: number, contactData: Partial<Contact>) => {
    return apiRequest<{
      success: boolean;
      data: Contact;
    }>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  },

  // Delete contact
  deleteContact: (id: number) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },

  // Get contact statistics
  getContactStats: () => {
    return apiRequest<{
      success: boolean;
      data: {
        total: number;
        active: number;
        unsubscribed: number;
        bounced: number;
        total_emails_sent: number;
        total_emails_bounced: number;
        total_emails_opened: number;
        total_emails_clicked: number;
        delivery_rate: number;
        open_rate: number;
      };
    }>('/contacts/stats');
  },

  // Upload CSV file
  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<{
      success: boolean;
      message: string;
      stats: {
        total_rows: number;
        successful_imports: number;
        skipped_rows: number;
        duplicate_emails: number;
        invalid_emails: number;
      };
      errors?: string[];
      additional_errors?: number;
    }>('/contacts/upload-csv', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type to let browser set it with boundary for FormData
    });
  },

  // Download CSV template
  downloadCSVTemplate: () => {
    return apiRequest<{
      success: boolean;
      template: string;
      filename: string;
      instructions: {
        required_columns: string[];
        optional_columns: string[];
        status_values: string[];
        notes: string[];
      };
    }>('/contacts/download-template');
  },

  // Enhanced file upload (Excel/CSV) with storage and tracking
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<{
      success: boolean;
      message: string;
      upload_id: number;
      statistics: {
        total_rows: number;
        successful_imports: number;
        skipped_rows: number;
        errors_count: number;
      };
      file_info: {
        original_filename: string;
        stored_filename: string;
        file_size: number;
        mime_type: string;
      };
      errors: string[];
    }>('/contacts/upload-file', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type to let browser set it with boundary for FormData
    });
  },

  // Get upload history
  getUploads: (limit = 50) => {
    return apiRequest<{
      success: boolean;
      data: UploadRecord[];
      count: number;
    }>(`/contacts/uploads?limit=${limit}`);
  },

  // Get specific upload details
  getUploadDetails: (uploadId: number) => {
    return apiRequest<{
      success: boolean;
      data: UploadRecord;
    }>(`/contacts/uploads/${uploadId}`);
  },

  // Manual contact entry (tracked)
  manualEntry: (contacts: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
  }>) => {
    return apiRequest<{
      success: boolean;
      upload_id: number;
      statistics: {
        total_entries: number;
        successful_imports: number;
        skipped_entries: number;
        errors_count: number;
      };
      errors: string[];
    }>('/contacts/manual-entry', {
      method: 'POST',
      body: JSON.stringify({ contacts }),
    });
  },
};

// Contact interface to match backend
export interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  tags: string[];
  createdAt: string;
}

// SMTP Settings API functions
export const settingsAPI = {
  // Get SMTP settings
  getSMTPSettings: () => {
    return apiRequest<SMTPSettings>('/settings/smtp');
  },

  // Save SMTP settings
  saveSMTPSettings: (settings: SMTPSettingsInput) => {
    return apiRequest<{
      message: string;
      settings: SMTPSettings;
    }>('/settings/smtp', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  // Test SMTP connection
  testSMTPConnection: (settings?: SMTPSettingsInput) => {
    return apiRequest<{
      success: boolean;
      message?: string;
      error?: string;
      tested_at?: string;
    }>('/settings/smtp/test', {
      method: 'POST',
      body: JSON.stringify(settings || {}),
    });
  },

  // Get SMTP status
  getSMTPStatus: () => {
    return apiRequest<{
      is_configured: boolean;
      test_status?: string;
      last_tested_at?: string;
    }>('/settings/smtp/status');
  },

  // Delete SMTP settings
  deleteSMTPSettings: () => {
    return apiRequest<{
      message: string;
    }>('/settings/smtp-settings', {
      method: 'DELETE',
    });
  },
};

// SMTP Settings interfaces
export interface SMTPSettings {
  id?: number;
  provider: string;
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
  sender_name: string;
  sender_email: string;
  is_configured: boolean;
  last_tested_at?: string;
  test_status?: string;
}

export interface SMTPSettingsInput {
  id?: number; // Optional - only present when updating existing SMTP
  provider: string;
  host: string;
  port: string | number;
  username: string;
  password: string;
  encryption: string;
  sender_name?: string;
  sender_email?: string;
}

// Upload tracking interface
export interface UploadRecord {
  id: number;
  user_id: number;
  upload_type: 'excel' | 'csv' | 'manual';
  status: 'success' | 'failed' | 'processing' | 'partial';
  original_filename?: string;
  stored_filename?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  metadata?: any;
  errors?: Array<{
    timestamp: string;
    message: string;
  }>;
  uploaded_at: string;
  processed_at?: string;
}

export default apiRequest;