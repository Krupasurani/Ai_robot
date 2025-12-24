// AdminContext.tsx
import React, { useRef, useMemo, useState, useEffect, useContext, createContext } from 'react';

import axios from 'src/utils/axios';

import { CONFIG } from 'src/config-global';

import { AuthContext } from 'src/auth/context/auth-context';

// Cache for admin status to avoid unnecessary API calls
const adminStatusCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const ADMIN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Define the context type with just isAdmin boolean
interface AdminContextType {
  isAdmin: boolean;
}

// Create the context with a default value
const AdminContext = createContext<AdminContextType>({ isAdmin: false });

interface AdminProviderProps {
  children: React.ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const auth = useContext(AuthContext);
  const lastCheckedUserId = useRef<string | null>(null);

  // Check admin status whenever the user changes
  useEffect(() => {
    const checkAdmin = async () => {
      // If not authenticated or no user, we're definitely not an admin
      if (!auth?.authenticated || !auth?.user) {
        setIsAdmin(false);
        lastCheckedUserId.current = null;
        return;
      }

      // Get userId from the auth context - with safe type checking
      const { user } = auth;
      const userId = user?.id || user?._id || user?.userId;

      if (!userId) {
        // User might still be loading, don't log error - just wait for next update
        setIsAdmin(false);
        lastCheckedUserId.current = null;
        return;
      }

      // Check if we already checked this user recently
      if (lastCheckedUserId.current === userId) {
        const cached = adminStatusCache.get(userId);
        if (cached && (Date.now() - cached.timestamp) < ADMIN_CACHE_DURATION) {
          setIsAdmin(cached.isAdmin);
          return;
        }
      }

      try {
        const response = await axios.get(`${CONFIG.backendUrl}/api/v1/userGroups/users/${userId}`);
        const groups = response.data;
        const isAdminTypeGroup = groups.some((group: any) => group.type === 'admin');
        
        // Cache the result
        adminStatusCache.set(userId, { isAdmin: isAdminTypeGroup, timestamp: Date.now() });
        lastCheckedUserId.current = userId;
        
        setIsAdmin(isAdminTypeGroup);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    // Only check admin status if we have a valid user
    if (auth?.authenticated && auth?.user) {
      checkAdmin();
    } else {
      setIsAdmin(false);
      lastCheckedUserId.current = null;
    }
  }, [auth]); // Depend on entire auth object

  // Clear cache when user logs out
  useEffect(() => {
    if (!auth?.authenticated) {
      adminStatusCache.clear();
      lastCheckedUserId.current = null;
    }
  }, [auth?.authenticated]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ isAdmin }), [isAdmin]);

  return <AdminContext.Provider value={contextValue}>{children}</AdminContext.Provider>;
};

// Simple hook to use the admin context
export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);

  // Ensure the context exists (in case someone uses the hook outside the provider)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }

  return context;
};
