import { useState, useEffect, useCallback } from 'react';
import { useActiveLink } from 'src/routes/hooks/use-active-link';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { NavItem } from './nav-item';

type NavItemBaseProps = {
  path: string;
  title: string;
  children?: NavItemBaseProps[];
  caption?: string;
  roles?: string[];
  disabled?: boolean;
  icon?: string | React.ReactNode;
  info?: string[] | React.ReactNode;
};

type NavListProps = {
  data: NavItemBaseProps;
  depth?: number;
  enabledRootRedirect?: boolean;
};

export function NavList({ data, depth = 1, enabledRootRedirect }: NavListProps) {
  const active = useActiveLink(data.path, !!data.children);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  const handleToggle = useCallback(() => {
    if (data.children) {
      setOpen((prev) => !prev);
    }
  }, [data.children]);

  if (data.children) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <NavItem
          path={data.path}
          icon={data.icon}
          info={data.info}
          title={data.title}
          caption={data.caption}
          depth={depth}
          active={active}
          disabled={data.disabled}
          hasChild={!!data.children}
          open={open}
          enabledRootRedirect={enabledRootRedirect}
          onClick={handleToggle}
        />
        <CollapsibleContent className="ml-4 mt-0.5 space-y-0.5 border-l border-border/40 pl-2">
          {data.children.map((child) => (
            <NavList
              key={child.title}
              data={child}
              depth={depth + 1}
              enabledRootRedirect={enabledRootRedirect}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <NavItem
      path={data.path}
      icon={data.icon}
      info={data.info}
      title={data.title}
      caption={data.caption}
      depth={depth}
      active={active}
      disabled={data.disabled}
    />
  );
}
