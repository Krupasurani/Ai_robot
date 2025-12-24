import type { CSSProperties } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export type SvgColorProps = {
  src: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
};

export const SvgColor = forwardRef<HTMLSpanElement, SvgColorProps>(
  ({ src, width = 24, height, className, style, ...other }, ref) => (
    <span
      ref={ref}
      className={cn('shrink-0 inline-flex', className)}
      style={{
        width,
        height: height ?? width,
        backgroundColor: 'currentColor',
        mask: `url(${src}) no-repeat center / contain`,
        WebkitMask: `url(${src}) no-repeat center / contain`,
        ...style,
      }}
      {...other}
    />
  )
);
