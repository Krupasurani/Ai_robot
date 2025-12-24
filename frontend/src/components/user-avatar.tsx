import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserLogoById } from '@/sections/accountdetails/utils';
import { cn } from '@/utils/cn';

interface UserAvatarProps {
  userId?: string;
  fullName?: string;
  hasPhoto?: boolean;
  className?: string;
  fallbackClassName?: string;
}

// Avatar colors array (Thero-inspired color palette)
const AVATAR_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
];

const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const getAvatarColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + (acc * 32 - acc), 0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export function UserAvatar({
  userId,
  fullName = 'Unnamed User',
  hasPhoto,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (hasPhoto && userId) {
      getUserLogoById(userId).then((url) => {
        if (isMounted) {
          setPhotoURL(url);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [hasPhoto, userId]);

  return (
    <Avatar
      className={cn('h-9 w-9 text-sm', className)}
      style={{ backgroundColor: getAvatarColor(fullName) }}
    >
      {photoURL && <AvatarImage src={photoURL} alt={fullName} />}
      <AvatarFallback className={cn('text-white font-medium', fallbackClassName)}>
        {getInitials(fullName)}
      </AvatarFallback>
    </Avatar>
  );
}
