import { FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RecordHeaderProps {
  recordName: string;
  webUrl?: string;
  onExternalLink?: string;
}

export function RecordHeader({ recordName, webUrl, onExternalLink }: RecordHeaderProps) {
  return (
    <div className="flex items-center justify-between p-5 bg-primary/5 dark:bg-primary/10 border-b border-border/50">
      <h2 className="flex items-center gap-3 text-lg font-semibold text-foreground">
        <FileText className="size-5 text-primary" />
        <span>{recordName}</span>
        {webUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 ml-1 text-primary hover:bg-primary/10"
                onClick={() => window.open(webUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View document</TooltipContent>
          </Tooltip>
        )}
      </h2>

      {onExternalLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-primary hover:bg-primary/10"
              onClick={() => window.open(onExternalLink, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open External Link</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
