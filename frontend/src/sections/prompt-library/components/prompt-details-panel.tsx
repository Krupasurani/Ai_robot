import { ScrollArea } from '@/components/ui/scroll-area';
import { PromptTemplate, PromptVisibility } from '@/api/prompt-library';
import { Sparkles, Copy, Lock, MoreHorizontal, Pencil, Share2, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/drop-down-menu';
import { useTranslate } from '@/locales';

interface PromptDetailsPanelProps {
  prompt: PromptTemplate | null;
  onUse: (prompt: PromptTemplate) => void;
  onEdit: (prompt: PromptTemplate) => void;
  onDuplicate: (prompt: PromptTemplate) => void;
  onDelete: (prompt: PromptTemplate) => void;
  onVisibilityChange: (prompt: PromptTemplate, visibility: PromptVisibility) => void;
  onShare: (prompt: PromptTemplate) => void;
}

export function PromptDetailsPanel({
  prompt,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
  onVisibilityChange,
  onShare,
}: PromptDetailsPanelProps) {
  if (!prompt) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <Sparkles className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <p className="font-medium">Select a prompt to preview</p>
          <p className="text-sm">Choose a template from the list to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6">
          <PromptDetailsContent
            prompt={prompt}
            onUse={onUse}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onVisibilityChange={onVisibilityChange}
            onShare={onShare}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

function PromptDetailsContent({
  prompt,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
  onVisibilityChange,
  onShare,
}: {
  prompt: PromptTemplate;
  onUse: (prompt: PromptTemplate) => void;
  onEdit: (prompt: PromptTemplate) => void;
  onDuplicate: (prompt: PromptTemplate) => void;
  onDelete: (prompt: PromptTemplate) => void;
  onVisibilityChange: (prompt: PromptTemplate, visibility: PromptVisibility) => void;
  onShare: (prompt: PromptTemplate) => void;
}) {
  const { t } = useTranslate('prompt-library');
  const formattedUpdatedAt = prompt.updatedAt ? new Date(prompt.updatedAt).toLocaleString() : '�';

  return (
    <>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold mb-1">{prompt.title}</h2>
            {prompt.description && (
              <p className="text-sm text-muted-foreground">{prompt.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onDuplicate(prompt)}>
                <Copy className="mr-2 h-4 w-4" />
                {t('actions.duplicate')}
              </DropdownMenuItem>
              {prompt.visibility === 'users' && (
                <DropdownMenuItem onClick={() => onShare(prompt)}>
                  <Users className="mr-2 h-4 w-4" />
                  {t('actions.shareWithUsers')}
                </DropdownMenuItem>
              )}
              {prompt.visibility === 'workspace' ? (
                <DropdownMenuItem onClick={() => onVisibilityChange(prompt, 'private')}>
                  <Lock className="mr-2 h-4 w-4" />
                  {t('actions.makePrivate')}
                </DropdownMenuItem>
              ) : prompt.visibility === 'private' ? (
                <>
                  <DropdownMenuItem onClick={() => onShare(prompt)}>
                    <Users className="mr-2 h-4 w-4" />
                    {t('actions.shareWithUsers')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onVisibilityChange(prompt, 'workspace')}>
                    <Share2 className="mr-2 h-4 w-4" />
                    {t('actions.shareToWorkspace')}
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(prompt)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {prompt.visibility === 'workspace' ? (
              <>
                <Share2 className="mr-1 h-3 w-3" />
                Workspace
              </>
            ) : (
              <>
                <Lock className="mr-1 h-3 w-3" />
                Private
              </>
            )}
          </Badge>
          {prompt.category && (
            <Badge variant="secondary" className="text-xs">
              {prompt.category}
            </Badge>
          )}
          {(prompt.tags || []).slice(0, 5).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <Label className="mb-2 text-sm font-medium">Prompt Content</Label>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
            {prompt.content}
          </pre>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <span>Last updated</span>
        <span className="font-medium text-foreground">{formattedUpdatedAt}</span>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => onUse(prompt)} className="flex-1">
          <Copy className="mr-2 h-4 w-4" />
          Copy to clipboard
        </Button>
        <Button variant="outline" onClick={() => onEdit(prompt)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>
    </>
  );
}
