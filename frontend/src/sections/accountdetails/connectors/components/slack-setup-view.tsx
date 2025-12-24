import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    BookOpen,
    Check,
    ExternalLink,
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
import { ConnectorDeleteButton } from './connector-delete-button';
import { ConnectorDetailStats } from './connector-detail-stats';
import { useConnectorManager } from '../hooks/use-connector-manager';
import { useConnectorConfig } from '../hooks/use-connector-config';
import { ConnectorApiService } from '../services/api';
import type { Connector } from '../types/types';

interface SlackSetupViewProps {
    showStats?: boolean;
}

export const SlackSetupView: React.FC<SlackSetupViewProps> = () => {
    const [showCrawlDialog, setShowCrawlDialog] = useState(false);

    const {
        connector,
        loading,
        error,
        isDeleting,
        handleToggleConnector,
        handleDeleteConnector,
    } = useConnectorManager();

    const configHook = useConnectorConfig({
        connector: connector as Connector,
        onClose: () => { },
        onSuccess: () => {
            // Note: For OAuth connectors, we redirect to OAuth after saving,
            // so the crawl dialog is not shown here. The user will be redirected
            // back to this page after OAuth completes, and can then enable the connector.
        },
    });

    const handleSaveConfig = async () => {
        try {
            await configHook.handleSave();
            
            // After saving credentials, initiate OAuth flow to get access token
            // This redirects the user to Slack for authorization
            toast.info('Redirecting to Slack for authorization...');
            
            const { authorizationUrl } = await ConnectorApiService.getOAuthAuthorizationUrl('Slack');
            
            // Redirect to Slack OAuth
            window.location.href = authorizationUrl;
        } catch (err) {
            console.error('Failed to save configuration:', err);
            toast.error('Failed to save configuration or start OAuth flow');
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
        { text: 'Sync messages and threads from public/private channels' },
        { text: 'Index shared files and attachments' },
        { text: 'Support for Direct Messages (DMs) with user authorization' },
        { text: 'RBAC-aware: respects workspace permissions' },
    ];

    const guideContent = (
// ... (rest of guideContent remains the same as I just updated it)
        <>
            {/* Step 1 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={1} variant="filled" />
                    Create a Slack App
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Go to the Slack API Dashboard:
                    </p>
                    <a
                        href="https://api.slack.com/apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        api.slack.com/apps
                    </a>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2">
                        <li>Click <strong>&quot;Create New App&quot;</strong></li>
                        <li>Select <strong>&quot;From scratch&quot;</strong></li>
                        <li>Name your app (e.g., &quot;Thero&quot;) and select your workspace</li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 2 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={2} variant="filled" />
                    Configure OAuth & Scopes
                </h3>
                <div className="space-y-4 ml-7">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Redirect URL</p>
                        <p className="text-sm text-muted-foreground">
                            In <strong>&quot;OAuth & Permissions&quot;</strong>, add this Redirect URL:
                        </p>
                        <code className="block w-full p-2 text-xs bg-muted rounded border border-border overflow-x-auto whitespace-nowrap">
                            {(() => {
                                const url = `${window.location.origin}/api/connectors/oauth/callback/Slack`;
                                if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
                                    return url.replace('http://', 'https://');
                                }
                                return url;
                            })()}
                        </code>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bot Token Scopes</p>
                        <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                            {[
                                'channels:read', 'channels:history', 'channels:join',
                                'groups:read', 'groups:history', 'users:read',
                                'users:read.email', 'files:read', 'team:read'
                            ].map(scope => (
                                <li key={scope} className="flex items-center gap-1.5">
                                    <Check className="h-3 w-3 text-green-500" />
                                    <code>{scope}</code>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Token Scopes</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mb-1">
                            Required for Direct Message (DM) indexing.
                        </p>
                        <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                            {['im:read', 'im:history', 'mpim:read', 'mpim:history'].map(scope => (
                                <li key={scope} className="flex items-center gap-1.5">
                                    <Check className="h-3 w-3 text-green-500" />
                                    <code>{scope}</code>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Step 3 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={3} variant="filled" />
                    Get Credentials
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Collect these from <strong>&quot;Basic Information&quot;</strong> and <strong>&quot;App Credentials&quot;</strong>:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Client ID</li>
                        <li>Client Secret</li>
                        <li>Signing Secret</li>
                    </ul>
                </div>
            </div>

            <Separator />

            {/* Documentation Link */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-foreground">Setup Guide</p>
                        <a
                            href="https://docs.thero.com/connectors/slack"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                        >
                            Read detailed setup instructions →
                        </a>
                    </div>
                </div>
            </div>
        </>
    );

    // Get auth fields from backend schema
    const authFields = configHook.connectorConfig?.config?.auth?.schema?.fields || [];

    return (
        <>
            <ConnectorSetupLayout
                connectorName="Slack"
                connectorDisplayName="Slack"
                connectorSubtitle="Sync your workspace communication"
                iconPath={connector?.iconPath || '/assets/icons/connectors/slack.svg'}
                features={features}
                loading={loading || !connector}
                error={error}
                guideContent={guideContent}
                headerActions={
                    connector && (
                        <ConnectorDeleteButton
                            connector={connector}
                            isDeleting={isDeleting}
                            onDelete={handleDeleteConnector}
                        />
                    )
                }
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
                            defaultValue="Slack"
                            className="max-w-md bg-muted/50"
                        />
                    </div>
                </div>

                {/* Step 1: Configuration Form - Dynamic Fields from Backend */}
                <SetupStepSection
                    number={1}
                    description="Enter your Slack App credentials from the Basic Information page:"
                >
                    {authFields.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 max-w-md">
                            {authFields.map((field) => (
                                <FieldRenderer
                                    key={field.name}
                                    field={field}
                                    value={configHook.formData.auth[field.name]}
                                    onChange={(value) => configHook.handleFieldChange('auth', field.name, value)}
                                    error={configHook.formErrors.auth[field.name]}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading configuration fields...
                        </div>
                    )}
                </SetupStepSection>

                {/* Step 2: Save and Connect */}
                <SetupStepSection
                    number={2}
                    description="Save your credentials and authorize the connection:"
                >
                    <div className="flex flex-col gap-3 items-start">
                        <Button
                            onClick={handleSaveConfig}
                            className="gap-2"
                            disabled={configHook.saving || authFields.length === 0}
                        >
                            {configHook.saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="h-4 w-4" />
                                    Save & Connect to Slack
                                </>
                            )}
                        </Button>
                        <p className="text-[11px] text-muted-foreground max-w-xs">
                            You will be redirected to Slack to authorize the application for your workspace.
                            After authorization, you&apos;ll return here to enable the connector.
                        </p>
                    </div>
                </SetupStepSection>

                {/* Indexing Statistics */}
                {connector?.isConfigured && (
                    <div className="pt-6">
                        <ConnectorDetailStats connectorName="Slack" />
                    </div>
                )}
            </ConnectorSetupLayout>

            {/* Start Crawl Dialog */}
            <StartCrawlDialog
                open={showCrawlDialog}
                onOpenChange={setShowCrawlDialog}
                connectorName="Slack"
                onStartCrawl={handleStartCrawl}
                onDoLater={handleDoLater}
            />
        </>
    );
};

export default SlackSetupView;
