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
import { useConnectorManager } from '../hooks/use-connector-manager';
import { useConnectorConfig } from '../hooks/use-connector-config';
import type { Connector } from '../types/types';

interface S3SetupViewProps {
    showStats?: boolean;
}

export const S3SetupView: React.FC<S3SetupViewProps> = () => {
    const [showCrawlDialog, setShowCrawlDialog] = useState(false);

    const {
        connector,
        connectorConfig,
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
        { text: 'Sync files and folders from Amazon S3 buckets' },
        { text: 'Index documents, images, and various file types' },
        { text: 'Secure access using IAM credentials' },
    ];

    const guideContent = (
        <>
            {/* Step 1: Create IAM User */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={1} variant="filled" />
                    Create an IAM User
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Go to the AWS IAM Console:
                    </p>
                    <a
                        href="https://console.aws.amazon.com/iam/home#/users"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        console.aws.amazon.com/iam - Users
                    </a>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2">
                        <li>Click <strong>&quot;Add users&quot;</strong></li>
                        <li>Enter a username (e.g., &quot;thero-s3-access&quot;)</li>
                        <li>Select <strong>&quot;Access key - Programmatic access&quot;</strong></li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 2: Attach S3 Read Policy */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={2} variant="filled" />
                    Attach S3 Read Policy
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Grant S3 read access to the user:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Select <strong>&quot;Attach policies directly&quot;</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Search for <strong>&quot;AmazonS3ReadOnlyAccess&quot;</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Or create a custom policy for specific buckets</span>
                        </li>
                    </ul>
                </div>
            </div>

            <Separator />

            {/* Step 3: Create Access Keys */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={3} variant="filled" />
                    Create Access Keys
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        After creating the user, generate access keys:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Go to the user&apos;s <strong>&quot;Security credentials&quot;</strong> tab</li>
                        <li>Click <strong>&quot;Create access key&quot;</strong></li>
                        <li>Select <strong>&quot;Third-party service&quot;</strong> as use case</li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 4: Copy Credentials */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={4} variant="filled" />
                    Copy Credentials
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Copy both keys from the confirmation screen:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Copy the <strong>Access Key ID</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Copy the <strong>Secret Access Key</strong></span>
                        </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                        Save the secret key now - you won&apos;t see it again!
                    </p>
                </div>
            </div>

            <Separator />

            {/* Step 5: Get Bucket Details */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={5} variant="filled" />
                    Get Bucket Details
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Find your S3 bucket information:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Go to S3 Console and select your bucket</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Copy the <strong>bucket name</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Note the <strong>AWS Region</strong> (e.g., us-east-1)</span>
                        </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                        Paste these values into the form on the left.
                    </p>
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
                            href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                        >
                            View AWS IAM Documentation →
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
                connectorName="S3"
                connectorDisplayName="Amazon S3"
                connectorSubtitle="AWS Cloud Storage"
                iconPath={connector?.iconPath || '/assets/icons/connectors/s3.svg'}
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
                            defaultValue="Amazon S3"
                            className="max-w-md bg-muted/50"
                        />
                    </div>
                </div>

                {/* Step 1: Grant Access */}
                <SetupStepSection
                    number={1}
                    description="Grant access by creating an IAM user with S3 read permissions. Follow the instructions in the document provided below."
                >
                    <a
                        href="https://console.aws.amazon.com/iam/home#/users"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <BookOpen className="h-4 w-4" />
                        Connect Amazon S3
                    </a>
                </SetupStepSection>

                {/* Step 2: Configuration Form - Dynamic Fields from Backend */}
                <SetupStepSection
                    number={2}
                    description="Provide the following information about your S3 bucket:"
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
                connectorName="Amazon S3"
                onStartCrawl={handleStartCrawl}
                onDoLater={handleDoLater}
            />
        </>
    );
};

export default S3SetupView;
