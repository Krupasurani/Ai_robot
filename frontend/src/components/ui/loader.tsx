import React from 'react';
import { LoaderIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

type Props = {
  children?: React.ReactNode;
  loading?: boolean;
  className?: string | null;
};

const LoadingState = ({ children, loading, className }: Props) =>
  loading ? (
    <span className={cn('flex justify-center items-center w-full py-1', className)}>
      <LoaderIcon className="w-5 h-5 animate-spin" />
    </span>
  ) : (
    <>{children}</>
  );

export default LoadingState;
