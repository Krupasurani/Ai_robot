import type { ReactNode } from 'react';

import React, { useState, useEffect, useContext, createContext } from 'react';

import axiosInstance from 'src/utils/axios';

import { useAuthContext } from 'src/auth/hooks';


// Types based on API response
export interface User {
  _id: string;
  orgId: string;
  fullName: string;
  email: string;
  hasLoggedIn: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  slug: string;
  __v: number;
  designation?: string;
  firstName?: string; 
  lastName?: string;
  deletedBy?: string;
  isEmailVerified: boolean;
}

interface UserProviderProps {
  children: ReactNode;
}

// Create context with proper typing
const UserContext = createContext<User[] | undefined>(undefined);

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [users, setUsers] = useState<User[] | null>(null);

  const { authenticated } = useAuthContext();

  useEffect(() => {
    const fetchUsers = async (): Promise<void> => {
      if (!authenticated) {
        setUsers([]);
        return;
      }

      try {
        const response = await axiosInstance.get('/api/v1/users');
        // Handle both array responses and object responses with users/data property
        const data = response.data;
        const usersArray = Array.isArray(data) 
          ? data 
          : Array.isArray(data?.users) 
            ? data.users 
            : Array.isArray(data?.data) 
              ? data.data 
              : [];
        setUsers(usersArray);
      } catch (error) {
        // Set empty array in case of error to prevent infinite loading
        setUsers([]);
      }
    };

    fetchUsers();
  }, [authenticated]);

  // Don't render children until users are fetched
  if (users === null) {
    return null;
  }

  return (
    <UserContext.Provider value={users}>
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = (): User[] => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};