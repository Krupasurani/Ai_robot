import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface RatingProps {
  /**
   * Current rating value (1-5)
   */
  value: number;
  /**
   * Callback when rating changes
   * @param value - New rating value, or null if clicking the same star (to clear)
   */
  onChange: (value: number | null) => void;
  /**
   * Maximum number of stars (default: 5)
   */
  maxStars?: number;
  /**
   * Size of the stars in pixels (default: 16)
   */
  size?: number;
  /**
   * Whether the rating is read-only
   */
  readOnly?: boolean;
  /**
   * Additional className for the container
   */
  className?: string;
  /**
   * Color for filled stars (default: yellow-400)
   */
  filledColor?: string;
  /**
   * Color for empty stars (default: muted-foreground/30)
   */
  emptyColor?: string;
}

/**
 * Rating Component
 *
 * A reusable star rating component with hover effects and theme-aware colors.
 *
 * @example
 * ```tsx
 * <Rating
 *   value={rating}
 *   onChange={(value) => setRating(value)}
 *   maxStars={5}
 * />
 * ```
 */
export const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  (
    {
      value,
      onChange,
      maxStars = 5,
      size = 16,
      readOnly = false,
      className,
      filledColor = 'fill-yellow-400 text-yellow-400',
      emptyColor = 'fill-transparent text-muted-foreground/30',
    },
    ref
  ) => {
    const [hoveredStar, setHoveredStar] = React.useState<number | null>(null);

    const handleClick = (starValue: number) => {
      if (readOnly) return;
      onChange(starValue === value ? null : starValue);
    };

    const handleMouseEnter = (starValue: number) => {
      if (readOnly) return;
      setHoveredStar(starValue);
    };

    const handleMouseLeave = () => {
      if (readOnly) return;
      setHoveredStar(null);
    };

    const getStarState = (starValue: number) => {
      const displayValue = hoveredStar ?? value;
      return starValue <= displayValue;
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-0.5', className)}
        role="radiogroup"
        aria-label={`Rating: ${value} out of ${maxStars} stars`}
      >
        {Array.from({ length: maxStars }, (_, index) => {
          const starValue = index + 1;
          const isFilled = getStarState(starValue);

          return (
            <button
              key={starValue}
              type="button"
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
              disabled={readOnly}
              className={cn(
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'rounded-sm p-0.5 transition-all duration-150',
                !readOnly && 'cursor-pointer hover:scale-110',
                readOnly && 'cursor-default'
              )}
              aria-label={`Rate ${starValue} out of ${maxStars}`}
              aria-pressed={isFilled}
            >
              <Star
                size={size}
                className={cn('transition-all duration-150', isFilled ? filledColor : emptyColor)}
              />
            </button>
          );
        })}
      </div>
    );
  }
);

Rating.displayName = 'Rating';
