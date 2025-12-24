import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type PageBreadcrumbsLink = {
  name?: string;
  href?: string;
  icon?: React.ReactElement;
};

type PageBreadcrumbsProps = {
  heading?: string;
  moreLink?: string[];
  activeLast?: boolean;
  action?: React.ReactNode;
  links: PageBreadcrumbsLink[];
  slotProps?: {
    action?: {
      className?: string;
      style?: React.CSSProperties;
    };
    heading?: {
      className?: string;
      style?: React.CSSProperties;
    };
    moreLink?: {
      className?: string;
      style?: React.CSSProperties;
    };
    breadcrumbs?: {
      className?: string;
      style?: React.CSSProperties;
    };
  };
  className?: string;
  style?: React.CSSProperties;
};

function BreadcrumbIcon({ icon }: { icon: React.ReactElement }) {
  return (
    <span className="mr-1.5 inline-flex items-center [&_svg]:size-4 [&_img]:size-4">{icon}</span>
  );
}

function BreadcrumbItemContent({
  link,
  isLast,
  isDisabled,
  activeLast,
}: {
  link: PageBreadcrumbsLink;
  isLast: boolean;
  isDisabled: boolean;
  activeLast?: boolean;
}) {
  if (isLast && !activeLast) {
    return (
      <BreadcrumbPage
        className={cn(
          'text-foreground',
          isDisabled && 'cursor-default pointer-events-none text-muted-foreground'
        )}
      >
        {link.icon && <BreadcrumbIcon icon={link.icon} />}
        {link.name}
      </BreadcrumbPage>
    );
  }

  if (link.href) {
    return (
      <BreadcrumbLink asChild>
        <Link
          to={link.href}
          className={cn(
            'inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground',
            isDisabled && 'cursor-default pointer-events-none text-muted-foreground'
          )}
        >
          {link.icon && <BreadcrumbIcon icon={link.icon} />}
          {link.name}
        </Link>
      </BreadcrumbLink>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center text-sm text-foreground',
        isDisabled && 'cursor-default pointer-events-none text-muted-foreground'
      )}
    >
      {link.icon && <BreadcrumbIcon icon={link.icon} />}
      {link.name}
    </span>
  );
}

export function PageBreadcrumbs({
  links,
  action,
  heading,
  moreLink,
  activeLast,
  slotProps,
  className,
  style,
  ...other
}: PageBreadcrumbsProps) {
  const lastLink = links[links.length - 1]?.name;

  return (
    <div className={cn('flex flex-col gap-2', className)} style={style}>
      <div className="flex items-center">
        <div className="flex-1">
          {heading && (
            <h4
              className={cn(
                'mb-2 text-2xl font-semibold text-foreground',
                slotProps?.heading?.className
              )}
              style={slotProps?.heading?.style}
            >
              {heading}
            </h4>
          )}

          {links.length > 0 && (
            <Breadcrumb
              className={cn(slotProps?.breadcrumbs?.className)}
              style={slotProps?.breadcrumbs?.style}
              {...other}
            >
              <BreadcrumbList>
                {links.map((link, index) => {
                  const isLast = index === links.length - 1;
                  const isDisabled = link.name === lastLink && !activeLast;

                  return (
                    <Fragment key={link.name ?? index}>
                      <BreadcrumbItem>
                        <BreadcrumbItemContent
                          link={link}
                          isLast={isLast}
                          isDisabled={isDisabled}
                          activeLast={activeLast}
                        />
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        {action && (
          <div
            className={cn('shrink-0', slotProps?.action?.className)}
            style={slotProps?.action?.style}
          >
            {action}
          </div>
        )}
      </div>

      {moreLink && moreLink.length > 0 && (
        <ul className="list-none space-y-1">
          {moreLink.map((href) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'text-sm text-muted-foreground transition-colors hover:text-foreground',
                  slotProps?.moreLink?.className
                )}
                style={slotProps?.moreLink?.style}
              >
                {href}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
