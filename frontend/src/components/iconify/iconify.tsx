import { forwardRef } from 'react';
import { Icon, disableCache } from '@iconify/react';
import { cn } from '@/utils/cn';

import type { IconifyProps } from './types';

export const Iconify = forwardRef<SVGElement, IconifyProps>(
  ({ className, width = 20, style, ...other }, ref) => (
    <Icon
      ref={ref as React.RefObject<SVGSVGElement>}
      className={cn('shrink-0 inline-flex', className)}
      style={{
        width,
        height: width,
        ...style,
      }}
      {...other}
    />
  )
);

Iconify.displayName = 'Iconify';

// https://iconify.design/docs/iconify-icon/disable-cache.html
disableCache('local');
