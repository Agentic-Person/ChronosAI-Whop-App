/**
 * Whop API Client
 * Wrapper for Whop API calls with error handling and rate limiting
 */

import type {
  WhopUser,
  WhopMembership,
  WhopCompany,
  WhopAPIError,
  WhopOAuthTokenResponse,
} from '@/types/whop';

const WHOP_API_BASE = 'https://api.whop.com/api/v5';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export class WhopAPIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.WHOP_API_KEY || '';
    this.baseUrl = WHOP_API_BASE;

    if (!this.apiKey) {
      console.warn('WhopAPIClient initialized without API key');
    }
  }

  /**
   * Make authenticated request to Whop API
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const url = `${this.baseUrl}${endpoint}`;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error: WhopAPIError = await response.json();
        throw new Error(
          `Whop API Error: ${error.message} (${error.status_code})`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Whop API request failed:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<WhopOAuthTokenResponse> {
    const clientId = process.env.WHOP_CLIENT_ID;
    const clientSecret = process.env.WHOP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Whop OAuth credentials not configured');
    }

    const response = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return await response.json();
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<WhopOAuthTokenResponse> {
    const clientId = process.env.WHOP_CLIENT_ID;
    const clientSecret = process.env.WHOP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Whop OAuth credentials not configured');
    }

    const response = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    return await response.json();
  }

  /**
   * Get authenticated user info
   */
  async getUser(accessToken: string): Promise<WhopUser> {
    return this.request<WhopUser>('/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Get membership by ID
   */
  async getMembership(membershipId: string): Promise<WhopMembership> {
    return this.request<WhopMembership>(`/memberships/${membershipId}`);
  }

  /**
   * Get user's memberships
   */
  async getUserMemberships(userId: string): Promise<WhopMembership[]> {
    const response = await this.request<{ data: WhopMembership[] }>(
      `/memberships?user_id=${userId}`
    );
    return response.data;
  }

  /**
   * Validate membership status
   */
  async validateMembership(membershipId: string): Promise<boolean> {
    try {
      const membership = await this.getMembership(membershipId);
      return membership.valid && membership.status === 'active';
    } catch (error) {
      console.error('Failed to validate membership:', error);
      return false;
    }
  }

  /**
   * Get company info
   */
  async getCompany(companyId: string): Promise<WhopCompany> {
    return this.request<WhopCompany>(`/companies/${companyId}`);
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    await fetch('https://api.whop.com/oauth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
  }
}

// Singleton instance
export const whopClient = new WhopAPIClient();
