import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PromptCard } from './welcome-prompt-card';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import type { PromptTemplate } from '@/api/prompt-library';
import type { PromptWithMetadata } from './hooks/use-welcome-prompts';

export type PromptTab = 'recommended' | 'favorites' | 'created';

interface WelcomePromptLibraryProps {
  activeTab: PromptTab;
  onTabChange: (tab: PromptTab) => void;
  prompts: PromptWithMetadata[];
  loadingPrompts: boolean;
  onPromptSelect: (prompt: PromptTemplate) => void;
  onLoadMore: () => void;
  hasMorePrompts: boolean;
  isExpanded: boolean;
}

export const WelcomePromptLibrary = ({
  activeTab,
  onTabChange,
  prompts,
  loadingPrompts,
  onPromptSelect,
  onLoadMore,
  hasMorePrompts,
  isExpanded,
}: WelcomePromptLibraryProps) => {
  const router = useRouter();
  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as PromptTab)}>
        <TabsList className="mb-6 bg-transparent border-0 p-0 gap-2 w-fit mx-auto">
          <TabsTrigger
            value="recommended"
            className={cn(
              'rounded-full border border-transparent bg-muted/50 px-5 py-2.5 h-auto shadow-none',
              'data-[state=active]:bg-muted/50 data-[state=active]:text-foreground data-[state=active]:border-primary/50 data-[state=active]:shadow-none',
              'data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground',
              'transition-all duration-200 hover:border-primary/30'
            )}
          >
            Recommended
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className={cn(
              'rounded-full border border-transparent bg-muted/50 px-5 py-2.5 h-auto shadow-none',
              'data-[state=active]:bg-muted/50 data-[state=active]:text-foreground data-[state=active]:border-primary/50 data-[state=active]:shadow-none',
              'data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground',
              'transition-all duration-200 hover:border-primary/30'
            )}
          >
            Favorites
          </TabsTrigger>
          <TabsTrigger
            value="created"
            className={cn(
              'rounded-full border border-transparent bg-muted/50 px-5 py-2.5 h-auto shadow-none',
              'data-[state=active]:bg-muted/50 data-[state=active]:text-foreground data-[state=active]:border-primary/50 data-[state=active]:shadow-none',
              'data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground',
              'transition-all duration-200 hover:border-primary/30'
            )}
          >
            Created by me
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loadingPrompts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="rounded-3xl border border-transparent bg-muted/50 p-5 animate-pulse shadow-none"
                >
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </Card>
              ))}
            </div>
          ) : prompts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {prompts.map((prompt, index) => (
                  <PromptCard
                    key={prompt._id || index}
                    prompt={prompt}
                    onSelect={onPromptSelect}
                    createdBy={prompt.displayCreatedBy}
                    usageCount={prompt.usageCount}
                  />
                ))}
              </div>
              {!isExpanded && hasMorePrompts && (
                <div className="flex justify-start mt-6 w-full">
                  <Button
                    variant="link"
                    className="text-sm text-primary hover:text-primary/80 p-0 h-auto font-normal shadow-none"
                    onClick={onLoadMore}
                  >
                    See more
                  </Button>
                </div>
              )}
              {isExpanded && (
                <div className="flex justify-start mt-6 w-full">
                  <Button
                    variant="link"
                    className="text-sm text-primary hover:text-primary/80 p-0 h-auto font-normal shadow-none"
                    onClick={() => router.push(paths.dashboard.promptLibrary.root)}
                  >
                    Open Prompt Library
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No prompts available in this category.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
