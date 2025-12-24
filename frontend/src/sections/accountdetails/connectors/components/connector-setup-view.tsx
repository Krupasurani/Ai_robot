import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CheckCircle2,
    Circle,
    ExternalLink,
    HelpCircle,
    Loader2,
    Save,
    AlertCircle,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StartCrawlDialog } from './start-crawl-dialog';
import { ConnectorDeleteButton } from './connector-delete-button';
import { useConnectorManager } from '../hooks/use-connector-manager';
import { useConnectorConfig } from '../hooks/use-connector-config';
import { isNoneAuthType } from '../utils/auth';
import AuthSection from './connector-config/auth-section';
import SyncSection from './connector-config/sync-section';

import type { Connector, ConnectorConfig } from '../types/types';

interface ConnectorSetupViewProps {
    showStats?: boolean;
}

export const ConnectorSetupView: React.FC<ConnectorSetupViewProps> = () => {
    const navigate = useNavigate();
    const [showCrawlDialog, setShowCrawlDialog] = useState(false);

    const {
        connector,
        connectorConfig,
        loading,
        error,
        isAuthenticated,
        isDeleting,
        handleToggleConnector,
        handleAuthenticate,
        handleRefresh,
        handleDeleteConnector,
        setError,
    } = useConnectorManager();

    // Use the config hook for form handling
    const configHook = useConnectorConfig({
        connector: connector as Connector,
        onClose: () => { },
        onSuccess: () => {
            setShowCrawlDialog(true);
        },
    });

    const handleBack = () => {
        navigate('/account/company-settings/settings/connector');
    };

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
        handleBack();
    };

    const handleDoLater = () => {
        setShowCrawlDialog(false);
        handleBack();
    };

    // Loading state
    if (loading || !connector) {
        return (
            <div className="flex h-full w-full items-center justify-center font-roboto">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 font-roboto">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={handleBack} variant="outline">
                    Back to Apps
                </Button>
            </div>
        );
    }

    const isNoAuthType = isNoneAuthType(connector.authType);
    const authType = (connector.authType || '').toUpperCase();
    const isOAuth = authType === 'OAUTH' || authType === 'OAUTH_ADMIN_CONSENT';

    // Generate setup steps based on connector type
    const getSetupSteps = () => {
        const steps: Array<{
            id: number;
            title: string;
            description: string;
            isAuth?: boolean;
            isSync?: boolean;
        }> = [];

        if (!isNoAuthType) {
            if (isOAuth) {
                steps.push({
                    id: 1,
                    title: `Grant access in ${connector.name}`,
                    description: `Follow the instructions in the document provided below to connect ${connector.name}.`,
                    isAuth: true,
                });
            } else {
                steps.push({
                    id: 1,
                    title: 'Provide authentication credentials',
                    description: `Enter your ${connector.name} API credentials below.`,
                    isAuth: true,
                });
            }
        }

        steps.push({
            id: steps.length + 1,
            title: `Configure sync settings for ${connector.name}`,
            description: 'Set up how often and what data should be synced.',
            isSync: true,
        });

        return steps;
    };

    const setupSteps = getSetupSteps();

    return (
        <div className="flex h-full w-full font-roboto">
            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-border/60 bg-background px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                            className="gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Apps
                        </Button>

                        {connector && (
                            <ConnectorDeleteButton
                                connector={connector}
                                isDeleting={isDeleting}
                                onDelete={handleDeleteConnector}
                            />
                        )}
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-muted/40">
                            <img
                                src={connector.iconPath}
                                alt={connector.name}
                                className="h-10 w-10 object-contain"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/assets/icons/connectors/default.svg';
                                }}
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-semibold text-foreground">{connector.name}</h1>
                                {connector.isConfigured && (
                                    <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Configured
                                    </Badge>
                                )}
                                {connector.isActive && (
                                    <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                                        Active
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{connector.appGroup}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="secondary" className="text-xs">
                                    ✓ Index user permissions associated with documents
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    ✓ Content and permissions updates sync multiple times every hour
                                </Badge>
                                {connector.supportsRealtime && (
                                    <Badge variant="secondary" className="text-xs">
                                        ✓ Real-time sync support
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Setup Content */}
                <ScrollArea className="flex-1">
                    <div className="px-6 py-6">
                        <div className="mx-auto max-w-3xl space-y-6">
                            {/* Name Field */}
                            <Card className="border-border/60">
                                <CardHeader className="pb-3">
                                    <CardDescription>
                                        Give this app a unique name visible to all teammates in search results
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label htmlFor="connector-name">Name</Label>
                                        <Input
                                            id="connector-name"
                                            defaultValue={connector.name}
                                            className="max-w-md"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Setup Steps */}
                            <div className="space-y-4">
                                {setupSteps.map((step, index) => (
                                    <Card
                                        key={step.id}
                                        className="border-border/60"
                                    >
                                        <CardHeader>
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
                                                    <span className="text-sm font-semibold">{step.id}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-base">{step.title}</CardTitle>
                                                    <CardDescription className="mt-1">{step.description}</CardDescription>

                                                    {/* OAuth Connect Button */}
                                                    {step.isAuth && isOAuth && (
                                                        <div className="mt-3">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleAuthenticate}
                                                                className="gap-2"
                                                                disabled={isAuthenticated}
                                                            >
                                                                {isAuthenticated ? (
                                                                    <>
                                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                        Connected
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ExternalLink className="h-4 w-4" />
                                                                        Connect {connector.name}
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>

                                        {/* Auth Section Content */}
                                        {step.isAuth && !isOAuth && connectorConfig && (
                                            <CardContent className="pt-0">
                                                <Separator className="mb-4" />
                                                <AuthSection
                                                    connector={connector}
                                                    connectorConfig={connectorConfig}
                                                    formData={configHook.formData.auth}
                                                    formErrors={configHook.formErrors.auth}
                                                    conditionalDisplay={configHook.conditionalDisplay}
                                                    accountTypeLoading={false}
                                                    isBusiness={false}
                                                    adminEmail={configHook.adminEmail}
                                                    adminEmailError={configHook.adminEmailError}
                                                    selectedFile={configHook.selectedFile}
                                                    fileName={configHook.fileName}
                                                    fileError={configHook.fileError}
                                                    jsonData={configHook.jsonData}
                                                    onAdminEmailChange={configHook.handleAdminEmailChange}
                                                    onFileUpload={configHook.handleFileUpload}
                                                    onFileChange={configHook.handleFileChange}
                                                    fileInputRef={configHook.fileInputRef}
                                                    onFieldChange={configHook.handleFieldChange}
                                                />
                                            </CardContent>
                                        )}

                                        {/* Sync Section Content */}
                                        {step.isSync && connectorConfig && (
                                            <CardContent className="pt-0">
                                                <Separator className="mb-4" />
                                                <SyncSection
                                                    connectorConfig={connectorConfig}
                                                    formData={configHook.formData.sync}
                                                    formErrors={configHook.formErrors.sync}
                                                    onFieldChange={configHook.handleFieldChange}
                                                    saving={configHook.saving}
                                                />
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between border-t border-border/60 pt-6">
                                <div className="text-sm text-muted-foreground">
                                    Need help or don&apos;t have permissions?{' '}
                                    <button type="button" className="font-medium text-primary hover:underline">
                                        Invite a teammate
                                    </button>{' '}
                                    to set this up.
                                </div>
                                <Button
                                    onClick={handleSaveConfig}
                                    size="lg"
                                    className="gap-2"
                                    disabled={configHook.saving}
                                >
                                    {configHook.saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Help Guide Sidebar */}
            <div className="hidden w-96 border-l border-border/60 bg-muted/30 lg:block">
                <ScrollArea className="h-full">
                    <div className="p-6">
                        <div className="mb-6 flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">
                                Connect to {connector.name}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            {/* Step 1 Help */}
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    1. Install the Thero app
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Go to the {connector.name} marketplace and install the Thero app to allow
                                        indexing of your content.
                                    </p>
                                    <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                                        <li>Sign in to {connector.name} as an admin</li>
                                        <li>Navigate to the marketplace or integrations page</li>
                                        <li>Search for &quot;Thero&quot; and click Install</li>
                                        <li>Grant the required permissions</li>
                                    </ol>
                                </div>
                            </div>

                            <Separator />

                            {/* Step 2 Help */}
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    2. Set up the basics
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Copy your {connector.name} domain or API credentials and paste them into the
                                        configuration form on the left.
                                    </p>
                                    <div className="rounded-lg border border-border bg-background p-3">
                                        <code className="text-xs text-foreground">
                                            https://your-domain.{connector.name.toLowerCase()}.com
                                        </code>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Best Practices */}
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    Best Practices for New Data Sources
                                </h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex gap-2">
                                        <Circle className="mt-1 h-2 w-2 flex-shrink-0 fill-current" />
                                        <span>Initially set visibility to &quot;Visible to test group only&quot;</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Circle className="mt-1 h-2 w-2 flex-shrink-0 fill-current" />
                                        <span>Configure your test group through the Manage test group option</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Circle className="mt-1 h-2 w-2 flex-shrink-0 fill-current" />
                                        <span>Let the test group verify search results and content accuracy</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Circle className="mt-1 h-2 w-2 flex-shrink-0 fill-current" />
                                        <span>Once verified, set visibility to &quot;visible to everyone&quot;</span>
                                    </li>
                                </ul>
                            </div>

                            <Separator />

                            {/* Additional Resources */}
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    Additional Resources
                                </h3>
                                <div className="space-y-2">
                                    <a
                                        href="#"
                                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        View full documentation
                                    </a>
                                    <a
                                        href="#"
                                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Troubleshooting guide
                                    </a>
                                    <a
                                        href="#"
                                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Contact support
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Start Crawl Dialog */}
            <StartCrawlDialog
                open={showCrawlDialog}
                onOpenChange={setShowCrawlDialog}
                connectorName={connector.name}
                onStartCrawl={handleStartCrawl}
                onDoLater={handleDoLater}
            />
        </div>
    );
};

export default ConnectorSetupView;
