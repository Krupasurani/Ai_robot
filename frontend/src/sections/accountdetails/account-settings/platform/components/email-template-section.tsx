import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslate } from '@/locales';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Markdown } from '@/components/markdown/markdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mail, RotateCcw, Eye, Edit3, Info, CheckCircle2 } from 'lucide-react';

type EmailTemplateSettings = {
  enabled: boolean;
  subject: string;
  markdown: string;
  updatedAt?: string;
  updatedBy?: {
    name?: string;
    email?: string;
  };
};

interface EmailTemplateSectionProps {
  template: EmailTemplateSettings;
  charLimit: number;
  loading: boolean;
  templateTab: 'write' | 'preview';
  onTemplateTabChange: (tab: 'write' | 'preview') => void;
  onUpdateTemplate: (patch: Partial<EmailTemplateSettings>) => void;
  onResetTemplate: () => void;
}

export function EmailTemplateSection({
  template,
  charLimit,
  loading,
  templateTab,
  onTemplateTabChange,
  onUpdateTemplate,
  onResetTemplate,
}: EmailTemplateSectionProps) {
  const { t } = useTranslate('settings');
  const charCount = template.markdown.length;
  const charPercentage = Math.min((charCount / charLimit) * 100, 100);
  const isOverLimit = charCount > charLimit;

  return (
    <div className="rounded-2xl border-0 bg-card shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:translate-y-[-1px]">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/40 px-6 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('platform.email_template.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('platform.email_template.description')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Enable Toggle Card */}
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border px-5 py-4',
            'transition-all duration-300 ease-out',
            'hover:shadow-sm',
            template.enabled
              ? 'border-emerald-200 bg-emerald-50/50 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/30'
              : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/30'
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                template.enabled
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {template.enabled ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t('platform.email_template.use_custom')}
              </p>
              <p className="text-sm text-muted-foreground">
                {template.enabled
                  ? t('platform.email_template.active_desc')
                  : t('platform.email_template.default_desc')}
              </p>
            </div>
          </div>
          <Switch
            checked={template.enabled}
            disabled={loading}
            onCheckedChange={(checked) => onUpdateTemplate({ enabled: checked })}
            aria-label="Toggle custom markdown email template"
          />
        </div>

        {/* Subject Input */}
        <div className="space-y-2">
          <Label htmlFor="emailSubject" className="text-sm font-medium text-foreground">
            {t('platform.email_template.subject')}
          </Label>
          <Input
            id="emailSubject"
            maxLength={200}
            value={template.subject}
            onChange={(e) => onUpdateTemplate({ subject: e.target.value })}
            disabled={loading}
            placeholder={t('platform.email_template.subject_placeholder')}
            className="text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Editor/Preview Tabs */}
        <div className="space-y-3">
          <Tabs
            value={templateTab}
            onValueChange={(value) => onTemplateTabChange(value as 'write' | 'preview')}
          >
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="write" className="gap-2 data-[state=active]:bg-background">
                  <Edit3 className="h-3.5 w-3.5" />
                  {t('platform.email_template.write')}
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2 data-[state=active]:bg-background">
                  <Eye className="h-3.5 w-3.5" />
                  {t('platform.email_template.preview')}
                </TabsTrigger>
              </TabsList>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={onResetTemplate}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('platform.email_template.reset')}
              </Button>
            </div>

            <TabsContent value="write" className="mt-3">
              <div className="space-y-3">
                <Textarea
                  rows={12}
                  maxLength={charLimit}
                  value={template.markdown}
                  onChange={(e) => onUpdateTemplate({ markdown: e.target.value })}
                  disabled={loading}
                  placeholder={t('platform.email_template.markdown_placeholder')}
                  className={cn(
                    'resize-none font-mono text-sm leading-relaxed transition-all duration-200',
                    'focus:ring-2 focus:ring-primary/20',
                    isOverLimit && 'border-destructive focus:ring-destructive/20'
                  )}
                />
                
                {/* Character Progress Bar */}
                <div className="space-y-2">
                  <Progress
                    value={charPercentage}
                    className={cn(
                      'h-1.5',
                      isOverLimit && '[&>div]:bg-destructive'
                    )}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <p className="text-muted-foreground">
                      {t('platform.email_template.supports_vars')}:{' '}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                        {'{{invitee}}'}
                      </code>{' '}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                        {'{{orgName}}'}
                      </code>{' '}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                        {'{{link}}'}
                      </code>
                    </p>
                    <span
                      className={cn(
                        'font-medium tabular-nums',
                        isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-medium">
                    {t('platform.email_template.preview')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('platform.email_template.preview_info')}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <Markdown>{template.markdown}</Markdown>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
            {t('platform.email_template.layout_info')}
          </p>
        </div>
      </div>
    </div>
  );
}


