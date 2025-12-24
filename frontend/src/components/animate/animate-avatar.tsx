import { cn } from '@/utils/cn';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export type AnimateAvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  width?: number;
  children?: React.ReactNode;
  slotProps?: {
    avatar?: {
      src?: string;
      alt?: string;
      className?: string;
    };
    overlay?: {
      color?: string;
      border?: number;
      spacing?: number;
      rotate?: boolean; // Whether to rotate the border (default: true for conic-gradient, false for linear-gradient)
    };
  };
};

export function AnimateAvatar({
  className,
  slotProps,
  children,
  width = 40,
  ...other
}: AnimateAvatarProps) {
  const borderWidth = slotProps?.overlay?.border ?? 2;
  const spacing = slotProps?.overlay?.spacing ?? 2;
  const avatarSize = `calc(100% - ${(borderWidth + spacing) * 2}px)`;

  // Default to conic-gradient for rotating effect
  const defaultGradient =
    'conic-gradient(hsl(var(--primary)), hsl(var(--warning)), hsl(var(--primary)))';
  const gradientColor = slotProps?.overlay?.color ?? defaultGradient;

  // Determine if we should rotate based on gradient type or explicit prop
  const isConicGradient = gradientColor.includes('conic-gradient');
  const shouldRotate =
    slotProps?.overlay?.rotate !== undefined ? slotProps.overlay.rotate : isConicGradient;

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full',
        className
      )}
      style={{ width, height: width }}
      {...other}
    >
      {/* Rotating/Static gradient border */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradientColor,
          mask: 'linear-gradient(#FFF 0 0) content-box, linear-gradient(#FFF 0 0)',
          WebkitMask: 'linear-gradient(#FFF 0 0) content-box, linear-gradient(#FFF 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: `${borderWidth}px`,
          ...(shouldRotate && {
            animation: 'spin-slow 8s linear infinite',
          }),
        }}
      />

      {/* Avatar */}
      <Avatar
        className={cn('relative z-10', slotProps?.avatar?.className)}
        style={{ width: avatarSize, height: avatarSize }}
      >
        {slotProps?.avatar?.src && (
          <AvatarImage src={slotProps?.avatar?.src} alt={slotProps?.avatar?.alt ?? 'Avatar'} />
        )}
        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
          {children}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
