import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CustomTooltipProps {
  title: string;
  children: React.ReactNode;
}

export const CustomTooltip = React.memo<CustomTooltipProps>(({ title, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{title}</TooltipContent>
  </Tooltip>
));

CustomTooltip.displayName = 'CustomTooltip';
