import { useState } from 'react';
import { Settings, Power, UserCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

import { Avatar, AvatarImage, AvatarFallback } from 'src/components/ui/avatar';
import { Button } from 'src/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from 'src/components/ui/popover';
import { Separator } from 'src/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import { Label } from 'src/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'src/components/ui/tooltip';

import { useAuthContext } from 'src/auth/hooks';

export function ChatNavAccount() {
  const { user } = useAuthContext();
  const [status, setStatus] = useState<'online' | 'alway' | 'busy' | 'offline'>('online');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="relative cursor-pointer">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user?.photoURL} alt={user?.displayName} />
            <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'absolute bottom-0 right-0 w-3 h-3 border-2 border-background rounded-full',
              status === 'online' && 'bg-green-500',
              status === 'alway' && 'bg-yellow-500',
              status === 'busy' && 'bg-red-500',
              status === 'offline' && 'bg-gray-400'
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex flex-row items-center gap-2 py-2 pr-1 pl-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Power className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator className="border-dashed" />

        <div className="my-0.5 px-0.5">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div
              className={cn(
                'w-3 h-3 rounded-full flex-shrink-0',
                status === 'online' && 'bg-green-500',
                status === 'alway' && 'bg-yellow-500',
                status === 'busy' && 'bg-red-500',
                status === 'offline' && 'bg-gray-400'
              )}
            />

            <div className="flex-1">
              <Label htmlFor="chat-status-select" className="sr-only">
                Status
              </Label>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                <SelectTrigger id="chat-status-select" className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['online', 'alway', 'busy', 'offline'].map((option) => (
                    <SelectItem key={option} value={option} className="capitalize">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            type="button"
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-secondary rounded-md transition-colors"
          >
            <UserCircle className="h-5 w-5" />
            Profile
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-secondary rounded-md transition-colors"
          >
            <Settings className="h-5 w-5" />
            Settings
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
