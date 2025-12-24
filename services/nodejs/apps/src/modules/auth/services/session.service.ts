import { v4 as uuidv4 } from 'uuid';
import { injectable, inject } from 'inversify';
import { RedisService } from '../../../libs/services/redis.service';
import { RedisServiceNotInitializedError } from '../../../libs/errors/redis.errors';

export interface SessionData {
  token?: string;
  userId: string;
  email: string;
  isAuthenticated?: boolean;
  // Multiple session support fields
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: number;
  lastActiveAt?: number;
  [key: string]: any; // Allows additional properties
}

// Session expiry times
const SESSION_EXPIRY = 3600; // 1 hour in seconds for temporary sessions
const AUTH_SESSION_EXPIRY = 7 * 24 * 3600; // 7 days for authenticated sessions
const USER_SESSIONS_LIST_EXPIRY = 30 * 24 * 3600; // 30 days for user session list

@injectable()
export class SessionService {
  constructor(
    @inject('RedisService') private redisService: RedisService,
  ) {}

  async createSession(
    sessionData: { userId: string; email: string } & Partial<SessionData>,
  ): Promise<SessionData> {
    if (!this.redisService)
      throw new RedisServiceNotInitializedError('Redis service is not initialized.');

    const token = uuidv4();
    const now = Date.now();
    const session: SessionData = { 
      ...sessionData, 
      token,
      createdAt: now,
      lastActiveAt: now
    };
    
    await this.redisService.set(`session:${token}`, session, {
      ttl: SESSION_EXPIRY,
    });

    // Add session to user's session list for multiple session tracking
    if (session.userId) {
      await this.addSessionToUserList(session.userId, token);
    }

    return session;
  }

  async getSession(token: string): Promise<SessionData | null> {
    if (!this.redisService)
      throw new RedisServiceNotInitializedError('Redis service is not initialized.');

    const session = await this.redisService.get<SessionData>(`session:${token}`);
    
    // Update last active time
    if (session) {
      session.lastActiveAt = Date.now();
      await this.updateSession(session);
    }

    return session;
  }

  async updateSession(session: SessionData): Promise<void> {
    if (!this.redisService)
      throw new RedisServiceNotInitializedError('Redis service is not initialized.');

    const ttl = session.isAuthenticated ? AUTH_SESSION_EXPIRY : SESSION_EXPIRY;
    
    await this.redisService.set(`session:${session.token}`, session, {
      ttl: ttl,
    });
  }

  async updateLastActive(token: string): Promise<void> {
    if (!this.redisService)
      throw new RedisServiceNotInitializedError('Redis service is not initialized.');

    const session = await this.redisService.get<SessionData>(`session:${token}`);
    if (session) {
      session.lastActiveAt = Date.now();
      await this.updateSession(session);
    }
  }

  async completeAuthentication(session: SessionData): Promise<void> {
    if (!session.token) {
      throw new Error('Session token is missing');
    }

    session.isAuthenticated = true;
    // Instead of deleting, we update the session with authenticated status
    // and extend its TTL
    await this.updateSession(session);
  }

  async deleteSession(token: string): Promise<void> {
    if (!this.redisService)
      throw new Error('Redis service is not initialized.');

    // Get session to remove from user list
    const session = await this.getSession(token);
    if (session && session.userId) {
      await this.removeSessionFromUserList(session.userId, token);
    }

    await this.redisService.delete(`session:${token}`);
  }

  async extendSession(token: string): Promise<void> {
    if (!this.redisService)
      throw new Error('Redis service is not initialized.');

    const session = await this.getSession(token);
    if (!session) return;
    
    const ttl = session.isAuthenticated ? AUTH_SESSION_EXPIRY : SESSION_EXPIRY;
    
    await this.redisService.increment(`session:${token}`, {
      ttl: ttl,
    });
  }

  // Multiple session support methods
  
  async addSessionToUserList(userId: string, sessionToken: string): Promise<void> {
    if (!this.redisService)
      throw new Error('Redis service is not initialized.');

    const userSessionsKey = `user:${userId}:sessions`;
    const existingSessions = await this.redisService.get<string[]>(userSessionsKey) || [];
    
    if (!existingSessions.includes(sessionToken)) {
      existingSessions.push(sessionToken);
      await this.redisService.set(userSessionsKey, existingSessions, {
        ttl: USER_SESSIONS_LIST_EXPIRY,
      });
    }
  }

  async removeSessionFromUserList(userId: string, sessionToken: string): Promise<void> {
    if (!this.redisService)
      throw new Error('Redis service is not initialized.');

    const userSessionsKey = `user:${userId}:sessions`;
    const existingSessions = await this.redisService.get<string[]>(userSessionsKey) || [];
    
    const filteredSessions = existingSessions.filter(token => token !== sessionToken);
    
    if (filteredSessions.length > 0) {
      await this.redisService.set(userSessionsKey, filteredSessions, {
        ttl: USER_SESSIONS_LIST_EXPIRY,
      });
    } else {
      await this.redisService.delete(userSessionsKey);
    }
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    if (!this.redisService)
      throw new Error('Redis service is not initialized.');

    const userSessionsKey = `user:${userId}:sessions`;
    const sessionTokens = await this.redisService.get<string[]>(userSessionsKey) || [];
    
    const sessions: SessionData[] = [];
    for (const token of sessionTokens) {
      const session = await this.redisService.get<SessionData>(`session:${token}`);
      if (session) {
        sessions.push(session);
      } else {
        // Clean up invalid tokens
        await this.removeSessionFromUserList(userId, token);
      }
    }
    
    return sessions;
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    if (!this.redisService)
      throw new Error('Redis service is not initialized.');

    const sessions = await this.getUserSessions(userId);
    
    for (const session of sessions) {
      if (session.token) {
        await this.deleteSession(session.token);
      }
    }
  }

  async deleteOtherUserSessions(userId: string, currentToken: string): Promise<void> {
    if (!this.redisService)
      throw new Error('Redis service is not initialized.');

    const sessions = await this.getUserSessions(userId);
    
    for (const session of sessions) {
      if (session.token && session.token !== currentToken) {
        await this.deleteSession(session.token);
      }
    }
  }
}
