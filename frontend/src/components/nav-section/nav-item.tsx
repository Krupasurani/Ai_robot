import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Iconify } from '../iconify';

type NavItemProps = {
  path: string;
  icon?: string | React.ReactNode;
  info?: string | React.ReactNode;
  title?: string;
  caption?: string;
  depth?: number;
  active?: boolean;
  disabled?: boolean;
  hasChild?: boolean;
  open?: boolean;
  externalLink?: boolean;
  enabledRootRedirect?: boolean;
  className?: string;
  onClick?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(
  (
    {
      path,
      icon,
      info,
      title,
      caption,
      depth = 1,
      active,
      disabled,
      hasChild,
      open,
      externalLink,
      enabledRootRedirect,
      className,
      onClick,
      ...other
    },
    ref
  ) => {
    const isRoot = depth === 1;
    const isSub = depth > 1;

    const renderIcon =
      typeof icon === 'string' ? <Iconify icon={icon} className="size-4 shrink-0" /> : icon;

    // Thero-inspired: Clean, minimal styling with subtle interactions
    const baseClasses = cn(
      'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium',
      'transition-all duration-150 ease-in-out',
      'hover:bg-accent/50 hover:text-accent-foreground',
      disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
      // Root item styles
      isRoot && [
        'min-h-[36px]',
        active && 'bg-primary/8 text-primary font-semibold',
        open && !active && 'bg-accent/30',
      ],
      // Sub item styles
      isSub && [
        'min-h-[32px] pl-8 text-muted-foreground text-[13px]',
        active && 'text-foreground bg-accent/40 font-medium',
      ],
      className
    );

    const content = (
      <>
        {icon && (
          <span className="flex items-center justify-center text-muted-foreground group-hover:text-foreground">
            {renderIcon}
          </span>
        )}
        {title && (
          <span className="flex-1 truncate text-left" title={title}>
            {title}
          </span>
        )}
        {caption && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-auto flex items-center cursor-help">
                <Info className="size-3.5 text-muted-foreground/60" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <p>{caption}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {info && (
          <span className="ml-auto text-xs font-medium text-muted-foreground/70 px-1.5 py-0.5 rounded bg-muted/50">
            {info}
          </span>
        )}
        {hasChild && (
          <ChevronRight
            className={cn(
              'ml-auto size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200',
              open && 'rotate-90'
            )}
          />
        )}
      </>
    );

    if (!hasChild || enabledRootRedirect) {
      const { type, ...linkProps } = other as any;

      if (externalLink) {
        return (
          <a
            ref={ref as any}
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className={baseClasses}
            {...linkProps}
          >
            {content}
          </a>
        );
      }

      return (
        <Link ref={ref as any} to={path} className={baseClasses} {...linkProps}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={baseClasses}
        aria-expanded={open}
        {...other}
      >
        {content}
      </button>
    );
  }
);

NavItem.displayName = 'NavItem';
