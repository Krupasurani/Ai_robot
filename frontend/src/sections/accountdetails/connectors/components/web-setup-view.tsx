import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    BookOpen,
    Check,
    Globe,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    ConnectorSetupLayout,
    StepNumber,
    SetupStepSection
} from './connector-setup-layout';
import { FieldRenderer } from './field-renderers';
import { StartCrawlDialog } from './start-crawl-dialog';
import { useConnectorManager } from '../hooks/use-connector-manager';
import { useConnectorConfig } from '../hooks/use-connector-config';
import type { Connector } from '../types/types';

interface WebSetupViewProps {
    showStats?: boolean;
}

export const WebSetupView: React.FC<WebSetupViewProps> = () => {
    const [showCrawlDialog, setShowCrawlDialog] = useState(false);

    const {
        connector,
        loading,
        error,
        handleToggleConnector,
    } = useConnectorManager();

    const configHook = useConnectorConfig({
        connector: connector as Connector,
        onClose: () => { },
        onSuccess: () => {
            setShowCrawlDialog(true);
        },
    });

    const handleSaveConfig = async () => {
        try {
            await configHook.handleSave();
        } catch (err) {
            console.error('Failed to save configuration:', err);
        }
    };

    const handleStartCrawl = async () => {
        setShowCrawlDialog(false);
        if (connector && !connector.isActive) {
            await handleToggleConnector(true);
        }
        toast.success(`Crawl started for ${connector?.name}`);
    };

    const handleDoLater = () => {
        setShowCrawlDialog(false);
    };

    const features = [
        { text: 'Crawl and index web pages' },
        { text: 'Follow links to specified depth' },
        { text: 'Extract text content from HTML' },
    ];

    const guideContent = (
        <>
            {/* Step 1 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={1} variant="filled" />
                    Choose Target URL
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Enter the starting URL for the crawler:
                    </p>
                    <div className="rounded-md bg-muted p-2 text-xs font-mono text-foreground">
                        https://docs.example.com
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        The crawler will start from this URL and follow links.
                    </p>
                </div>
            </div>

            <Separator />

            {/* Step 2 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={2} variant="filled" />
                    Configure Crawl Depth
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Set how many levels deep the crawler should follow links:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span><strong>Depth 0</strong> - Only the starting URL</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span><strong>Depth 1</strong> - Starting URL + direct links</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span><strong>Depth 2+</strong> - Follow links recursively</span>
                        </li>
                    </ul>
                </div>
            </div>

            <Separator />

            {/* Step 3 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={3} variant="filled" />
                    URL Patterns (Optional)
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Control which pages are crawled:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Include patterns</strong> - Only crawl matching URLs</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Exclude patterns</strong> - Skip matching URLs</span>
                        </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                        Example: <code className="text-xs bg-muted px-1 rounded">/blog/*</code> to include only blog posts
                    </p>
                </div>
            </div>

            <Separator />

            {/* Important Notes */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <div className="flex items-start gap-2">
                    <Globe className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Good to Know</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            The crawler respects robots.txt. Make sure the site allows crawling.
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Documentation Link */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-foreground">Need more help?</p>
                        <p className="text-xs text-muted-foreground">
                            Contact support for advanced crawling configurations.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );

    // Web connector uses sync.customFields (no auth required)
    const syncFields = configHook.connectorConfig?.config?.sync?.customFields || [];

    return (
        <>
            <ConnectorSetupLayout
                connectorName="Web"
                connectorDisplayName="Web Crawler"
                connectorSubtitle="Website Content"
                iconPath={connector?.iconPath || '/assets/icons/connectors/web.svg'}
                features={features}
                loading={loading || !connector}
                error={error}
                guideContent={guideContent}
            >
                {/* Name Field Section */}
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Give this app a unique name visible to all teammates in search results
                    </p>
                    <div className="space-y-2">
                        <Label htmlFor="connector-name">Name</Label>
                        <Input
                            id="connector-name"
                            defaultValue="Web Crawler"
                            className="max-w-md bg-muted/50"
                        />
                    </div>
                </div>

                {/* Step 1: Information */}
                <SetupStepSection
                    number={1}
                    description="Configure the web crawler to index content from your website or documentation."
                >
                    <div className="text-sm text-muted-foreground">
                        The crawler will start from the URL you specify and follow links based on your configuration.
                    </div>
                </SetupStepSection>

                {/* Step 2: Configuration Form - Dynamic Fields from Backend */}
                <SetupStepSection
                    number={2}
                    description="Configure your web crawler settings:"
                >
                    {syncFields.length > 0 ? (
                        syncFields.map((field) => (
                            <FieldRenderer
                                key={field.name}
                                field={field}
                                value={configHook.formData.sync[field.name]}
                                onChange={(value) => configHook.handleFieldChange('sync', field.name, value)}
                                error={configHook.formErrors.sync[field.name]}
                            />
                        ))
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            Loading configuration fields...
                        </div>
                    )}
                </SetupStepSection>

                {/* Save Button */}
                <div className="pt-2">
                    <Button
                        onClick={handleSaveConfig}
                        className="gap-2"
                        disabled={configHook.saving}
                    >
                        {configHook.saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </div>
            </ConnectorSetupLayout>

            {/* Start Crawl Dialog */}
            <StartCrawlDialog
                open={showCrawlDialog}
                onOpenChange={setShowCrawlDialog}
                connectorName="Web Crawler"
                onStartCrawl={handleStartCrawl}
                onDoLater={handleDoLater}
            />
        </>
    );
};

export default WebSetupView;
