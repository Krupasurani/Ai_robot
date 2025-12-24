import { Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from './status-badge';
import { getAuthProviderIcon } from './icons/auth-provider-icons';

interface AuthMethodCardProps {
  type: string;
  title: string;
  description?: string;
  isSelected: boolean;
  isConfigured: boolean;
  isEnabled: boolean;
  requiresConfig?: boolean;
  requiresSmtp?: boolean;
  smtpConfigured?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onConfigure: () => void;
}

export function AuthMethodCard({
  type,
  title,
  description,
  isSelected,
  isConfigured,
  isEnabled,
  requiresConfig = false,
  requiresSmtp = false,
  smtpConfigured = false,
  disabled = false,
  onSelect,
  onConfigure,
}: AuthMethodCardProps) {
  const Icon = getAuthProviderIcon(type);

  // Determine if the card is clickable
  const isClickable = !disabled;

  // Determine the status badge to show
  const getStatus = () => {
    if (isEnabled && isSelected) return 'active';
    if (requiresConfig && !isConfigured) return 'requires-setup';
    if (requiresSmtp && !smtpConfigured) return 'requires-setup';
    if (isConfigured || !requiresConfig) return 'configured';
    return 'requires-setup';
  };

  // Tooltip message for disabled state
  const getTooltipMessage = () => {
    if (requiresSmtp && !smtpConfigured) {
      return 'SMTP configuration required';
    }
    if (requiresConfig && !isConfigured) {
      return `${title} must be configured first`;
    }
    return '';
  };

  const tooltipMessage = getTooltipMessage();
  const status = getStatus();

  const cardContent = (
    <div
      className={cn(
        'group relative flex flex-col items-center justify-center rounded-xl border bg-card transition-all duration-200',
        'p-4 min-h-[140px] w-full',
        isClickable && 'cursor-pointer hover:border-border hover:bg-accent/5',
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        !isSelected && 'border-border/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={isClickable ? onSelect : undefined}
    >
      {/* Status Badge - Top Left */}
      <div className="absolute top-2 left-2">
        <StatusBadge status={status} />
      </div>

      {/* Configure Button - Top Right (shown on hover or when needs config) */}
      {requiresConfig && (
        <div
          className={cn(
            'absolute top-2 right-2 transition-opacity',
            isConfigured ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onConfigure();
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Icon */}
      <div className="mt-4 mb-2">
        <Icon className="h-10 w-10" />
      </div>

      {/* Title */}
      <span className="text-sm font-medium text-foreground">{title}</span>

      {/* Description - Only show on hover or if space */}
      {description && (
        <span className="text-xs text-muted-foreground text-center mt-1 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {description}
        </span>
      )}
    </div>
  );

  // Wrap with tooltip if there's a message
  if (tooltipMessage && disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent>{tooltipMessage}</TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}

export default AuthMethodCard;




