import { useState, useCallback } from 'react';
import { Maximize, Minimize2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

export function FullScreenButton() {
  const [fullscreen, setFullscreen] = useState(false);

  const onToggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullScreen}
          className={cn('transition-colors', fullscreen && 'text-primary')}
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{fullscreen ? 'Exit' : 'Full Screen'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
