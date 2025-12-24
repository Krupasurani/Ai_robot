import 'react-lazy-load-image-component/src/effects/blur.css';

import { forwardRef } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { cn } from '@/utils/cn';
import { CONFIG } from 'src/config-global';

import type { LazyLoadImageProps } from 'react-lazy-load-image-component';
import type { CSSProperties } from 'react';

type BaseRatioType =
  | '2/3'
  | '3/2'
  | '4/3'
  | '3/4'
  | '6/4'
  | '4/6'
  | '16/9'
  | '9/16'
  | '21/9'
  | '9/21'
  | '1/1'
  | string;

export type ImageRatioType = BaseRatioType | { [key: string]: string };

export type ImageProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'> &
  LazyLoadImageProps & {
    ratio?: ImageRatioType;
    disabledEffect?: boolean;
    effect?: 'blur' | 'opacity' | 'black-and-white';
    style?: CSSProperties;
    slotProps?: {
      overlay?: CSSProperties;
    };
  };

// Helper to convert ratio to CSS aspect-ratio value
function getAspectRatio(ratio?: ImageRatioType): string | undefined {
  if (!ratio) return undefined;
  if (typeof ratio === 'string') {
    return ratio.includes('/') ? ratio.replace('/', ' / ') : ratio;
  }
  if (typeof ratio === 'object') {
    const firstValue = Object.values(ratio)[0];
    return typeof firstValue === 'string' ? firstValue.replace('/', ' / ') : undefined;
  }
  return undefined;
}

export const Image = forwardRef<HTMLSpanElement, ImageProps>(
  (
    {
      alt,
      src,
      ratio,
      delayTime,
      threshold,
      beforeLoad,
      delayMethod,
      placeholder,
      wrapperProps,
      scrollPosition,
      effect = 'blur',
      visibleByDefault,
      wrapperClassName,
      disabledEffect = false,
      useIntersectionObserver,
      slotProps,
      className,
      style,
      ...other
    },
    ref
  ) => {
    const aspectRatio = getAspectRatio(ratio);
    const hasRatio = !!ratio;

    const placeholderSrc =
      placeholder ||
      (visibleByDefault || disabledEffect
        ? `${CONFIG.assetsDir}/assets/core/transparent.png`
        : `${CONFIG.assetsDir}/assets/core/placeholder.svg`);

    return (
      <span
        ref={ref}
        className={cn(
          'relative inline-block overflow-hidden align-bottom',
          hasRatio && 'w-full',
          className
        )}
        style={style}
        {...other}
      >
        {slotProps?.overlay && (
          <span
            className="absolute top-0 left-0 z-[1] w-full h-full"
            style={slotProps.overlay as React.CSSProperties}
          />
        )}

        <LazyLoadImage
          alt={alt}
          src={src}
          delayTime={delayTime}
          threshold={threshold}
          beforeLoad={beforeLoad}
          delayMethod={delayMethod}
          placeholder={placeholder}
          wrapperProps={wrapperProps}
          scrollPosition={scrollPosition}
          visibleByDefault={visibleByDefault}
          effect={visibleByDefault || disabledEffect ? undefined : effect}
          useIntersectionObserver={useIntersectionObserver}
          wrapperClassName={typeof wrapperClassName === 'string' ? wrapperClassName : undefined}
          placeholderSrc={typeof placeholderSrc === 'string' ? placeholderSrc : undefined}
          className="w-full h-full object-cover align-bottom"
          style={{
            ...(aspectRatio && { aspectRatio }),
            ...style,
          }}
        />
      </span>
    );
  }
);

Image.displayName = 'Image';
