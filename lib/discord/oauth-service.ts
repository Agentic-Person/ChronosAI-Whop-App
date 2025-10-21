/**
 * Discord OAuth Service
 *
 * Handles Discord OAuth authentication for account linking.
 * Manages token exchange, user info retrieval, and guild membership.
 */

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified?: boolean;
}

export interface DiscordTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export class DiscordOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly guildId: string;
  private readonly botToken: string;

  constructor() {
    this.clientId = process.env.DISCORD_CLIENT_ID || '';
    this.clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord/callback`
      : 'http://localhost:3000/api/auth/discord/callback';
    this.guildId = process.env.DISCORD_GUILD_ID || '';
    this.botToken = process.env.DISCORD_BOT_TOKEN || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ Discord OAuth credentials not configured');
    }
  }

  /**
   * Generate Discord OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'identify email guilds.join',
      state, // CSRF protection
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<DiscordTokens> {
    try {
      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange code: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<DiscordTokens> {
    try {
      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to refresh token: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get user information from Discord
   */
  async getUserInfo(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get user info: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get user info error:', error);
      throw error;
    }
  }

  /**
   * Add user to guild (auto-join server)
   */
  async addGuildMember(
    userId: string,
    accessToken: string
  ): Promise<void> {
    if (!this.guildId) {
      console.warn('⚠️ DISCORD_GUILD_ID not set - skipping guild join');
      return;
    }

    try {
      const response = await fetch(
        `https://discord.com/api/guilds/${this.guildId}/members/${userId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: accessToken,
          }),
        }
      );

      // 201 = added, 204 = already a member (both OK)
      if (!response.ok && response.status !== 204) {
        const error = await response.text();
        console.error('Failed to add guild member:', error);
      } else {
        console.log(`✅ Added user ${userId} to guild`);
      }
    } catch (error) {
      console.error('Add guild member error:', error);
      // Don't throw - continue even if guild join fails
    }
  }

  /**
   * Assign role to guild member
   */
  async assignRole(
    userId: string,
    roleId: string
  ): Promise<void> {
    if (!this.guildId) {
      console.warn('⚠️ DISCORD_GUILD_ID not set - skipping role assignment');
      return;
    }

    try {
      const response = await fetch(
        `https://discord.com/api/guilds/${this.guildId}/members/${userId}/roles/${roleId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${this.botToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to assign role: ${error}`);
      }

      console.log(`✅ Assigned role ${roleId} to user ${userId}`);
    } catch (error) {
      console.error('Assign role error:', error);
      // Don't throw - continue even if role assignment fails
    }
  }

  /**
   * Get guild roles
   */
  async getGuildRoles(): Promise<any[]> {
    if (!this.guildId) {
      return [];
    }

    try {
      const response = await fetch(
        `https://discord.com/api/guilds/${this.guildId}/roles`,
        {
          headers: {
            Authorization: `Bot ${this.botToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get guild roles');
      }

      return await response.json();
    } catch (error) {
      console.error('Get guild roles error:', error);
      return [];
    }
  }

  /**
   * Find role by name
   */
  async findRoleByName(roleName: string): Promise<string | null> {
    const roles = await this.getGuildRoles();
    const role = roles.find((r: any) => r.name === roleName);
    return role?.id || null;
  }
}
