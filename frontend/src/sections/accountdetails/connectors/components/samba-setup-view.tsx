import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    BookOpen,
    Check,
    Loader2,
    Server,
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

interface SambaSetupViewProps {
    showStats?: boolean;
}

export const SambaSetupView: React.FC<SambaSetupViewProps> = () => {
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
        { text: 'Index files from network shares' },
        { text: 'Support for SMB/CIFS protocol' },
        { text: 'Respect file and folder permissions' },
    ];

    const guideContent = (
        <>
            {/* Step 1 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={1} variant="filled" />
                    Identify Your File Server
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Determine the network location of your Samba/SMB share:
                    </p>
                    <div className="rounded-md bg-muted p-2 text-xs font-mono text-foreground">
                        \\server-name\share-name
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Or use the IP address: \\192.168.1.100\share
                    </p>
                </div>
            </div>

            <Separator />

            {/* Step 2 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={2} variant="filled" />
                    Prepare Credentials
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        You&apos;ll need a user account with read access to the share:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Username</strong> - Domain user or local account</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Password</strong> - Account password</span>
                        </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                        For domain users, use format: DOMAIN\username
                    </p>
                </div>
            </div>

            <Separator />

            {/* Step 3 */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={3} variant="filled" />
                    Network Requirements
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Ensure the following ports are accessible:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Server className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span><strong>Port 445</strong> - SMB over TCP (required)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Server className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span><strong>Port 139</strong> - NetBIOS over TCP (optional)</span>
                        </li>
                    </ul>
                </div>
            </div>

            <Separator />

            {/* Security Note */}
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3">
                <div className="flex items-start gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Security Note</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            Use a service account with minimal required permissions. Avoid using admin credentials.
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
                        <a
                            href="https://wiki.samba.org/index.php/Main_Page"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                        >
                            View Samba Documentation →
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
                connectorName="Samba"
                connectorDisplayName="Samba / SMB"
                connectorSubtitle="File Server"
                iconPath={connector?.iconPath || '/assets/icons/connectors/samba.svg'}
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
                            defaultValue="Samba / SMB"
                            className="max-w-md bg-muted/50"
                        />
                    </div>
                </div>

                {/* Step 1: Grant Access */}
                <SetupStepSection
                    number={1}
                    description="Ensure your Samba share is accessible and you have valid credentials."
                >
                    <div className="text-sm text-muted-foreground">
                        Test connection: Try accessing the share from Windows Explorer or macOS Finder first.
                    </div>
                </SetupStepSection>

                {/* Step 2: Configuration Form - Dynamic Fields from Backend */}
                <SetupStepSection
                    number={2}
                    description="Provide your Samba connection details:"
                >
                    {authFields.length > 0 ? (
                        authFields.map((field) => (
                            <FieldRenderer
                                key={field.name}
                                field={field}
                                value={configHook.formData.auth[field.name]}
                                onChange={(value) => configHook.handleFieldChange('auth', field.name, value)}
                                error={configHook.formErrors.auth[field.name]}
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
                connectorName="Samba"
                onStartCrawl={handleStartCrawl}
                onDoLater={handleDoLater}
            />
        </>
    );
};

export default SambaSetupView;
