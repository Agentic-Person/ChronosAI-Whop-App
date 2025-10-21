/**
 * Whop Authentication Service
 * Handles OAuth 2.0 flow, token management, and session handling
 * SECURITY: Implements encryption, CSRF protection, and secure token storage
 */

import crypto from 'crypto';
import { whopClient } from './api-client';
import { createClient } from '@/lib/utils/supabase-client';
import type { WhopSession, WhopOAuthTokenResponse, WhopUser, WhopMembership } from '@/types/whop';
import { WhopPlanChecker } from './plan-checker';
import { FeatureFlagService } from '@/lib/features/feature-flags';

const WHOP_OAUTH_BASE = 'https://whop.com/oauth';

/**
 * Token encryption utilities
 * Uses AES-256-GCM for secure token storage
 */
class TokenEncryption {
  private static algorithm = 'aes-256-gcm';

  /**
   * Get encryption key from environment
   */
  private static getKey(): Buffer {
    const key = process.env.WHOP_TOKEN_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('WHOP_TOKEN_ENCRYPTION_KEY is not configured');
    }
    // Key should be 32 bytes (64 hex characters)
    return Buffer.from(key, 'hex');
  }

  /**
   * Encrypt a token
   */
  static encrypt(text: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a token
   */
  static decrypt(encryptedText: string): string {
    const key = this.getKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export class WhopAuthService {
  /**
   * Generate OAuth authorization URL with CSRF protection
   */
  static getAuthorizationUrl(redirectUri: string, state?: string): string {
    const clientId = process.env.WHOP_CLIENT_ID || process.env.NEXT_PUBLIC_WHOP_CLIENT_ID;

    if (!clientId) {
      throw new Error('WHOP_CLIENT_ID is not configured');
    }

    // Generate CSRF state if not provided
    const csrfState = state || this.generateState();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email memberships',
      state: csrfState,
    });

    return `${WHOP_OAUTH_BASE}?${params.toString()}`;
  }

  /**
   * Generate secure random state for CSRF protection
   */
  static generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify state parameter for CSRF protection
   */
  static verifyState(state: string, expectedState: string): boolean {
    if (!state || !expectedState) {
      return false;
    }
    // Use timing-safe comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(state),
        Buffer.from(expectedState)
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   * Includes plan tier extraction and feature gating integration
   */
  static async handleCallback(
    code: string,
    redirectUri: string
  ): Promise<WhopSession> {
    try {
      // Exchange code for tokens
      const tokenResponse = await whopClient.exchangeCodeForTokens(code, redirectUri);

      // Get user info
      const user = await whopClient.getUser(tokenResponse.access_token);

      // Get user memberships
      const memberships = await whopClient.getUserMemberships(user.id);
      const activeMembership = memberships.find(m => m.valid && m.status === 'active');

      // Extract plan tier from membership
      const planTier = activeMembership
        ? WhopPlanChecker.extractPlanTier(activeMembership)
        : 'basic';

      // Create session
      const session: WhopSession = {
        userId: user.id,
        email: user.email,
        membershipId: activeMembership?.id,
        membershipValid: !!activeMembership?.valid,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      };

      // Store session in database with encrypted tokens
      await this.storeSession(session, user, activeMembership, planTier);

      // Log authentication event for analytics
      await this.logAuthEvent(user.id, 'login_success');

      return session;
    } catch (error) {
      console.error('OAuth callback failed:', error);
      // Log failure for monitoring
      await this.logAuthEvent('unknown', 'login_failed', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Failed to complete authentication');
    }
  }

  /**
   * Store session in database with encrypted tokens
   */
  private static async storeSession(
    session: WhopSession,
    user: WhopUser,
    membership: WhopMembership | undefined,
    planTier: string
  ): Promise<void> {
    const supabase = createClient();

    // Encrypt tokens before storage
    const encryptedAccessToken = TokenEncryption.encrypt(session.accessToken);
    const encryptedRefreshToken = TokenEncryption.encrypt(session.refreshToken);

    const sessionData = {
      whop_user_id: session.userId,
      email: user.email,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: new Date(session.expiresAt).toISOString(),
      membership_id: session.membershipId,
      membership_valid: session.membershipValid,
      current_plan: planTier,
      plan_expires_at: membership?.expires_at || null,
      updated_at: new Date().toISOString(),
    };

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('creators')
      .select('id')
      .eq('whop_user_id', session.userId)
      .single();

    if (existingUser) {
      // Update existing session
      await supabase
        .from('creators')
        .update(sessionData)
        .eq('whop_user_id', session.userId);

      // Invalidate plan cache since plan might have changed
      FeatureFlagService.invalidateCache(existingUser.id);
    } else {
      // Create new user and session
      await supabase.from('creators').insert({
        whop_user_id: session.userId,
        ...sessionData,
        company_name: user.username || 'New Creator',
        subscription_tier: planTier,
        settings: {},
      });
    }
  }

  /**
   * Get session from database with automatic token refresh
   */
  static async getSession(whopUserId: string): Promise<WhopSession | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .single();

    if (error || !data) {
      return null;
    }

    // Decrypt tokens
    let accessToken: string;
    let refreshToken: string;

    try {
      accessToken = TokenEncryption.decrypt(data.access_token);
      refreshToken = TokenEncryption.decrypt(data.refresh_token);
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      return null;
    }

    // Check if token is expired
    const expiresAt = new Date(data.expires_at).getTime();
    const now = Date.now();

    // If expired, try to refresh
    if (expiresAt <= now) {
      return await this.refreshSession(refreshToken, whopUserId);
    }

    return {
      userId: data.whop_user_id,
      email: data.email || '',
      membershipId: data.membership_id,
      membershipValid: data.membership_valid,
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Get stored tokens for a user (decrypted)
   */
  static async getStoredTokens(userId: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const session = await this.getSession(userId);
    if (!session) {
      return null;
    }
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  /**
   * Refresh session tokens with plan tier update
   */
  static async refreshSession(
    refreshToken: string,
    whopUserId: string
  ): Promise<WhopSession | null> {
    try {
      const tokenResponse = await whopClient.refreshAccessToken(refreshToken);

      const user = await whopClient.getUser(tokenResponse.access_token);
      const memberships = await whopClient.getUserMemberships(user.id);
      const activeMembership = memberships.find(m => m.valid && m.status === 'active');

      // Extract updated plan tier
      const planTier = activeMembership
        ? WhopPlanChecker.extractPlanTier(activeMembership)
        : 'basic';

      const session: WhopSession = {
        userId: user.id,
        email: user.email,
        membershipId: activeMembership?.id,
        membershipValid: !!activeMembership?.valid,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      };

      await this.storeSession(session, user, activeMembership, planTier);

      // Log token refresh event
      await this.logAuthEvent(user.id, 'token_refreshed');

      return session;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      await this.logAuthEvent(whopUserId, 'token_refresh_failed', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Auto-refresh tokens if they're about to expire
   * Call this before making API calls that require fresh tokens
   */
  static async autoRefreshTokens(userId: string): Promise<WhopSession | null> {
    const session = await this.getSession(userId);
    if (!session) {
      return null;
    }

    // Refresh if token expires in less than 5 minutes
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    if (session.expiresAt < fiveMinutesFromNow) {
      return await this.refreshSession(session.refreshToken, userId);
    }

    return session;
  }

  /**
   * Validate session and membership
   */
  static async validateSession(whopUserId: string): Promise<boolean> {
    const session = await this.getSession(whopUserId);

    if (!session) {
      return false;
    }

    // Validate membership is still active
    if (session.membershipId) {
      const isValid = await whopClient.validateMembership(session.membershipId);

      // Update membership status if changed
      if (isValid !== session.membershipValid) {
        const supabase = createClient();
        await supabase
          .from('creators')
          .update({ membership_valid: isValid })
          .eq('whop_user_id', whopUserId);
      }

      return isValid;
    }

    return false;
  }

  /**
   * Verify token and get user info
   */
  static async verifyToken(accessToken: string): Promise<WhopUser | null> {
    try {
      const user = await whopClient.getUser(accessToken);
      return user;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Revoke token and sign out user
   */
  static async revokeToken(accessToken: string): Promise<void> {
    try {
      await whopClient.revokeToken(accessToken);
    } catch (error) {
      console.error('Failed to revoke token:', error);
      // Continue anyway to clear local session
    }
  }

  /**
   * Sign out and revoke tokens
   */
  static async signOut(whopUserId: string): Promise<void> {
    const session = await this.getSession(whopUserId);

    if (session) {
      try {
        // Revoke access token
        await this.revokeToken(session.accessToken);
      } catch (error) {
        console.error('Failed to revoke token:', error);
      }

      // Clear session from database
      const supabase = createClient();
      await supabase
        .from('creators')
        .update({
          access_token: null,
          refresh_token: null,
          expires_at: null,
        })
        .eq('whop_user_id', whopUserId);

      // Log signout event
      await this.logAuthEvent(whopUserId, 'logout');
    }
  }

  /**
   * Log authentication event for analytics and monitoring
   */
  private static async logAuthEvent(
    userId: string,
    eventType: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const supabase = createClient();

      await supabase.from('analytics_events').insert({
        event_type: `auth_${eventType}`,
        event_data: {
          whop_user_id: userId,
          timestamp: new Date().toISOString(),
          error: errorMessage,
        },
      });
    } catch (error) {
      // Don't throw - logging should not break auth flow
      console.error('Failed to log auth event:', error);
    }
  }
}

/**
 * Convenience exports
 */
export const getAuthUrl = WhopAuthService.getAuthorizationUrl.bind(WhopAuthService);
export const exchangeCodeForTokens = WhopAuthService.handleCallback.bind(WhopAuthService);
export const refreshAccessToken = WhopAuthService.refreshSession.bind(WhopAuthService);
export const verifyToken = WhopAuthService.verifyToken.bind(WhopAuthService);
export const revokeToken = WhopAuthService.revokeToken.bind(WhopAuthService);
export const storeTokens = WhopAuthService.storeSession.bind(WhopAuthService);
export const getStoredTokens = WhopAuthService.getStoredTokens.bind(WhopAuthService);
export const autoRefreshTokens = WhopAuthService.autoRefreshTokens.bind(WhopAuthService);
