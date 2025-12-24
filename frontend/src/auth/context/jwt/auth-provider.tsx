import { useLocation, useNavigate } from 'react-router';
import { useRef, useMemo, useEffect, useCallback } from 'react';

import { useSetState } from 'src/hooks/use-set-state';

import axios from 'src/utils/axios';

import { CONFIG } from 'src/config-global';
import { webSocketService } from 'src/services/websocket.service';

import { AuthContext } from '../auth-context';
import { STORAGE_KEY, STORAGE_KEY_REFRESH } from './constant';
import { jwtDecode, setSession, isValidToken } from './utils';

import type { AuthState, AuthContextValue } from '../../types';

// Utility to fetch current user's DP as data URL
async function fetchCurrentUserDp(): Promise<string | undefined> {
  try {
    const res = await axios.get(`${CONFIG.backendUrl}/api/v1/users/dp`, {
      responseType: 'arraybuffer',
      validateStatus: (status) => [200, 204, 400, 404].includes(status),
    });
    if (res.status !== 200) return undefined;
    const contentType = res.headers['content-type'];
    if (!contentType || contentType.includes('application/json')) return undefined;
    const blob = new Blob([res.data], { type: contentType });
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return dataUrl;
  } catch {
    return undefined;
  }
}

// ----------------------------------------------------------------------

/**
 * NOTE:
 * We only build demo at basic level.
 * Customer will need to do some extra handling yourself if you want to extend the logic and other features...
 */

type Props = {
  children: React.ReactNode;
};

// Cache for user data to avoid unnecessary API calls
const userDataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: Props) {
  const { state, setState } = useSetState<AuthState>({
    user: null,
    loading: true,
  });

  const navigate = useNavigate();
  const path = useLocation();
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserDataFetchRef = useRef<number>(0);



  // Validate token without fetching user data
  const validateTokenOnly = useCallback(async (accessToken: string) => {
    try {
      return await isValidToken(accessToken);
    } catch (error) {
      return false;
    }
  }, []);

  // Full session check with user data fetch
  const checkUserSession = useCallback(async (shouldFetchUserData = true) => {
    try {
      let accessToken = localStorage.getItem(STORAGE_KEY);
      const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);
      
      if (!accessToken) {
        setState({ user: null, loading: false });
        webSocketService.disconnect();
        return;
      }

      const isTokenValid = await validateTokenOnly(accessToken);
      
      if (isTokenValid) {
        accessToken = localStorage.getItem(STORAGE_KEY); // isValidToken might change accessToken
        setSession(accessToken, refreshToken);
        const decodedToken = jwtDecode(accessToken);
        const { userId } = decodedToken;

        if (shouldFetchUserData && accessToken) {
          // Fetch user data with caching
          const now = Date.now();
          const cached = userDataCache.get(userId);
          
          let userData;
          if (cached && (now - cached.timestamp) < CACHE_DURATION) {
            userData = cached.data;
          } else {
            // Fetch fresh data
            const res = await axios.get(`${CONFIG.authUrl}/api/v1/users/${userId}`);
            userData = res.data;
            
            // Cache the data
            userDataCache.set(userId, { data: userData, timestamp: now });
          }
          
          setState({
            user: {
              ...userData,
              accessToken,
              accountType: decodedToken.accountType,
              photoURL: (await fetchCurrentUserDp()) || userData?.photoURL,
            },
            loading: false,
          });
        } else if (state.user && accessToken) {
          // Just update the existing user with new token
          setState({
            user: { ...state.user, accessToken, accountType: decodedToken.accountType },
            loading: false,
          });
        }
        
        // Connect WebSocket when user is authenticated
        if (accessToken) {
          webSocketService.connect(accessToken);
        }
      } else {
        setState({ user: null, loading: false });
        webSocketService.disconnect();
        userDataCache.clear(); // Clear cache on logout
      }
    } catch (error) {
      console.error('Session check error:', error);
      setState({ user: null, loading: false });
      webSocketService.disconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateTokenOnly, setState]);

  // Initialize session check
  useEffect(() => {
    checkUserSession(true);
  }, [checkUserSession]);

  // Periodic token validation (reduced frequency, no user data fetch)
  useEffect(() => {
    if (state.user) {
      sessionCheckIntervalRef.current = setInterval(() => {
        checkUserSession(false); // Only validate token, don't fetch user data
      }, 10 * 60 * 1000); // 10 minutes instead of 30 seconds

      return () => {
        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
        }
      };
    }
    return undefined;
  }, [state.user, checkUserSession]);

  // Navigation logic
  useEffect(() => {
    const isAuthenticated = !!state.user;
    const isLoading = state.loading;
    
    if (isAuthenticated && !isLoading && path.pathname === '/auth/sign-in') {
      navigate('/');
    }
  }, [state.user, state.loading, path.pathname, navigate]);

  // Cleanup on unmount
  useEffect(() => () => {
    webSocketService.disconnect();
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
    }
  }, []);

  const handleCheckUserSession = useCallback(async () => {
    await checkUserSession(true);
  }, [checkUserSession]);

  const updateUserContext: AuthContextValue['updateUserContext'] = useCallback((patch: Record<string, any>) => {
    setState({ user: state.user ? { ...state.user, ...patch } : state.user });
  }, [setState, state.user]);

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
            ...state.user,
            role: state.user?.role ?? 'admin',
          }
        : null,
      checkUserSession: handleCheckUserSession,
      updateUserContext,
      loading: state.loading,
      authenticated: !!state.user,
      unauthenticated: !state.user && !state.loading,
    }),
    [state.user, state.loading, handleCheckUserSession, updateUserContext]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
