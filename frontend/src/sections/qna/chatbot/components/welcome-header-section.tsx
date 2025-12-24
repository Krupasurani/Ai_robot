import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { DynamicHeader } from './welcome-dynamic-header';

export const WelcomeHeaderSection = () => {
  const router = useRouter();

  return (
    <div className="text-center mb-8 sm:mb-12 w-full">
      <DynamicHeader />

      {/* Sub-header */}
      <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-muted-foreground mt-4">
        <span>Try a prompt below to get started.</span>
        <Button
          variant="link"
          className="h-auto p-0 text-sm font-medium text-primary hover:text-primary/80 gap-1.5 shadow-none"
          onClick={() => {
            router.push(paths.dashboard.promptLibrary.root);
          }}
        >
          <BookOpen className="h-4 w-4" />
          Prompt Guide
        </Button>
      </div>
    </div>
  );
};
