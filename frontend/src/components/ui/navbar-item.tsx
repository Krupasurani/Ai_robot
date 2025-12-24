import React from 'react';
import { Link } from 'react-router-dom';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { usePathname } from '@/routes/hooks';

interface NavbarItemProps {
  navData: any;
  navIcons: Record<string, React.ElementType>;
}

const NavbarItem = ({ navData, navIcons }: NavbarItemProps) => {
  const pathname = usePathname();

  return (
    <>
      {navData.map((group: any) => (
        <SidebarGroup key={group.subheader || group.items?.[0]?.title}>
          {group.subheader && (
            <SidebarGroupLabel className="text-sm font-medium uppercase tracking-wide text-sidebar-foreground/60">
              {group.subheader}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item: any) => {
                const IconComponent = navIcons[item.title];

                return (
                  <SidebarMenuItem key={item.title} className="list-none rounded-sm">
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.path}
                      className="text-sm font-medium justify-start group-data-[collapsible=icon]:justify-center"
                    >
                      <Link
                        to={item.path}
                        className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center"
                      >
                        {IconComponent
                          ? React.createElement(IconComponent, {
                              className:
                                'size-6 shrink-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:block',
                            })
                          : null}
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
};

export default NavbarItem;
