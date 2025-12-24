import type { IconProps } from '@iconify/react';
import type { CSSProperties } from 'react';

export type IconifyProps = IconProps & {
  className?: string;
  style?: CSSProperties;
};
