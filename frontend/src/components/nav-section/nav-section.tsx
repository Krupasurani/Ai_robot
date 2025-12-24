import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { NavList } from './nav-list';

export type NavItemBaseProps = {
  path: string;
  title: string;
  children?: NavItemBaseProps[];
  caption?: string;
  roles?: string[];
  disabled?: boolean;
  icon?: string | React.ReactNode;
  info?: string[] | React.ReactNode;
};

export type NavSectionProps = {
  className?: string;
  data: {
    subheader?: string;
    items: NavItemBaseProps[];
  }[];
};

export function NavSection({ className, data }: NavSectionProps) {
  return (
    <nav className={cn('flex flex-col gap-0.5', className)}>
      {data.map((group) => (
        <NavGroup
          key={group.subheader ?? group.items[0]?.title}
          subheader={group.subheader}
          items={group.items}
        />
      ))}
    </nav>
  );
}

function NavGroup({
  subheader,
  items,
}: {
  subheader?: string;
  items: NavSectionProps['data'][0]['items'];
}) {
  const [open, setOpen] = useState(true);

  const content = (
    <div className="space-y-0.5">
      {items.map((item) => (
        <NavList key={item.title} data={item} depth={1} />
      ))}
    </div>
  );

  if (subheader) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground group">
          <span>{subheader}</span>
          <ChevronDown
            className={cn(
              'size-3.5 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground',
              open && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-0.5">{content}</CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
}
