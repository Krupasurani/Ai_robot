import type { CSSProperties } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { Link } from 'react-router-dom';

export type LogoProps = {
  href?: string;
  isSingle?: boolean;
  disableLink?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
};

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  (
    { width, href = '/', height, isSingle = true, disableLink = false, className, style, ...other },
    ref
  ) => {
    // const singleLogo = (
    //   <img
    //     alt="Logo"
    //     src="/logo/Icon_4.png"
    //     className="w-10 h-10 object-contain"
    //     height={36}
    //     width={36}
    //   />
    // );

    // const fullLogo = (
    //   <img
    //     alt="Logo"
    //     src="/logo/logo-transparent.png"
    //     className="w-32 h-12 object-contain"
    //     height={48}
    //     width={128}
    //   />
    // );

    // const content = isSingle ? singleLogo : fullLogo;

    if (disableLink) {
      return (
        <div
          ref={ref}
          className={cn('shrink-0 inline-flex align-middle', className)}
          aria-label="Logo"
          {...other}
        >
          <img
            alt="Logo"
            src="/logo/Icon_4.png"
            className={cn(
              'w-10 h-10 object-contain transition-all duration-200',
              isSingle ? 'block' : 'hidden'
            )}
            height={36}
            width={36}
          />

          <img
            alt="Logo"
            src="/logo/logo-transparent.png"
            className={cn(
              'w-32 h-12 object-contain transition-all duration-200',
              isSingle ? 'hidden' : 'block'
            )}
            height={48}
            width={128}
          />
        </div>
      );
    }

    return (
      <Link
        ref={ref as React.RefObject<HTMLAnchorElement>}
        to={href}
        className={cn('shrink-0 inline-flex align-middle', className)}
        aria-label="Logo"
        {...other}
      >
        <img
          alt="Logo"
          src="/logo/Icon_4.png"
          className={cn(
            'w-10 h-10 object-contain transition-all duration-200',
            isSingle ? 'block' : 'hidden'
          )}
          height={36}
          width={36}
        />

        <img
          alt="Logo"
          src="/logo/logo-transparent.png"
          className={cn(
            'w-32 h-10 object-contain transition-all duration-200',
            isSingle ? 'hidden' : 'block'
          )}
          height={36}
          width={128}
        />
      </Link>
    );
  }
);
