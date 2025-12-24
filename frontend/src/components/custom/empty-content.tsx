import { cn } from '@/utils/cn';
import { CONFIG } from 'src/config-global';
import {
  Empty,
  EmptyContent as EmptyContentWrapper,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export type EmptyContentProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  imgUrl?: string;
  filled?: boolean;
  description?: string;
  action?: React.ReactNode;
  slotProps?: {
    img?: React.ImgHTMLAttributes<HTMLImageElement>;
    title?: React.HTMLAttributes<HTMLHeadingElement>;
    description?: React.HTMLAttributes<HTMLParagraphElement>;
  };
};

export function EmptyContent({
  imgUrl,
  action,
  filled,
  slotProps,
  description,
  title = 'No data',
  className,
  ...other
}: EmptyContentProps) {
  return (
    <Empty
      className={cn(
        'flex-1 h-full',
        filled && 'border border-dashed border-border bg-muted/40 rounded-lg',
        className
      )}
      {...other}
    >
      <EmptyHeader>
        <EmptyMedia variant="default">
          <img
            alt="empty content"
            src={imgUrl ?? `${CONFIG.assetsDir}/assets/icons/empty/ic-content.svg`}
            className={cn('w-full max-w-[160px]', slotProps?.img?.className)}
            {...slotProps?.img}
          />
        </EmptyMedia>
        {title && (
          <EmptyTitle className={slotProps?.title?.className} {...slotProps?.title}>
            {title}
          </EmptyTitle>
        )}
        {description && (
          <EmptyDescription
            className={slotProps?.description?.className}
            {...slotProps?.description}
          >
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {action && <EmptyContentWrapper>{action}</EmptyContentWrapper>}
    </Empty>
  );
}
