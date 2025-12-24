import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StartCrawlDialog } from './start-crawl-dialog';
import type { Connector } from '../types/types';

interface IntegrationSetupViewProps {
    connector: Connector;
    onBack: () => void;
}

interface SetupStep {
    id: number;
    title: string;
    description: string;
    completed: boolean;
    content?: React.ReactNode;
}

export const IntegrationSetupView: React.FC<IntegrationSetupViewProps> = ({
    connector,
    onBack,
}) => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [showCrawlDialog, setShowCrawlDialog] = useState(false);

    // Mock setup steps - in real implementation, these would come from connector config
    const setupSteps: SetupStep[] = [
        {
            id: 1,
            title: 'Install the Thero app',
            description: `Go to the ${connector.name} marketplace and install the Thero app`,
            completed: false,
            content: (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        1. Go to{' '}
                        <a
                            href="#"
                            className="font-medium text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            https://marketplace.example.com/apps/thero-crawler
                        </a>
                    </p>
                    <p className="text-sm text-muted-foreground">2. Click &quot;Get it now&quot;</p>
                    <p className="text-sm text-muted-foreground">
                        3. Select the site you&apos;re connecting, click Install App and complete the
                        installation process
                    </p>
                </div>
            ),
        },
        {
            id: 2,
            title: 'Provide connection information',
            description: `Enter your ${connector.name} instance details`,
            completed: false,
            content: (
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-foreground">Your Atlassian domain</label>
                        <input
                            type="text"
                            placeholder="your-domain.atlassian.net"
                            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground">Default group</label>
                        <input
                            type="text"
                            placeholder="jira-software-users"
                            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 3,
            title: 'Configure permissions',
            description: 'Set up access permissions for the Thero app',
            completed: false,
            content: (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        The Thero app needs the following permissions:
                    </p>
                    <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground">
                        <li>Read access to projects and issues</li>
                        <li>Read access to user profiles</li>
                        <li>Read access to comments and attachments</li>
                    </ul>
                </div>
            ),
        },
    ];

    const handleSave = () => {
        setShowCrawlDialog(true);
    };

    const handleStartCrawl = () => {
        setShowCrawlDialog(false);
        onBack();
    };

    const handleDoLater = () => {
        setShowCrawlDialog(false);
        onBack();
    };

    return (
        <div className="flex h-full w-full font-roboto">
            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-border/60 bg-background px-6 py-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Apps
                    </Button>

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
                                <h1 className="text-2xl font-semibold text-foreground">
                                    Connect to {connector.name}
                                </h1>
                                {connector.isConfigured && (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Configured
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {connector.appDescription ||
                                    `Follow the steps below to connect your ${connector.name} instance`}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="secondary" className="text-xs">
                                    ✓ Index user permissions associated with documents
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    ✓ Content and permissions updates sync multiple times every hour after initial
                                    indexing
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    ✓ Search for issues, stories, tasks, epics, dashboards, and filters
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Setup Steps */}
                <ScrollArea className="flex-1">
                    <div className="px-6 py-6">
                        <div className="mx-auto max-w-3xl space-y-6">
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Setup Steps
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Complete the following steps to connect {connector.name}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {setupSteps.map((step, index) => (
                                    <Card
                                        key={step.id}
                                        className={`border-border/60 transition-all ${currentStep === index ? 'border-primary/50 shadow-md' : ''
                                            }`}
                                    >
                                        <CardHeader>
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${step.completed
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                        : currentStep === index
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-border bg-background text-muted-foreground'
                                                        }`}
                                                >
                                                    {step.completed ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <span className="text-sm font-semibold">{step.id}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-base">{step.title}</CardTitle>
                                                    <CardDescription className="mt-1">{step.description}</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        {currentStep === index && step.content && (
                                            <CardContent className="pt-0">
                                                <Separator className="mb-4" />
                                                {step.content}
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
                                <Button onClick={handleSave} size="lg" className="gap-2">
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Help Guide Sidebar */}
            <div className="w-96 border-l border-border/60 bg-muted/30">
                <ScrollArea className="h-full">
                    <div className="p-6">
                        <div className="mb-6 flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">Help guide</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    1. Install the Thero app
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Sign into {connector.name} as an admin. Copy your Atlassian domain from the URL
                                        bar and paste into Thero:
                                    </p>
                                    <div className="rounded-lg border border-border bg-background p-3">
                                        <code className="text-xs text-foreground">
                                            https://YourAtlassianDomain.atlassian.net
                                        </code>
                                    </div>
                                    <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white">
                                                <img
                                                    src={connector.iconPath}
                                                    alt=""
                                                    className="h-5 w-5 object-contain"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                                    Choose a site to install your app
                                                </h4>
                                                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                                                    Select the site you&apos;re connecting, click Install App and complete
                                                    the installation process.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    2. Set up the basics
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Go to{' '}
                                        <a
                                            href="#"
                                            className="font-medium text-primary hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            https://admin.atlassian.net
                                        </a>{' '}
                                        and select the organization you want to connect.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Copy your Atlassian domain from the URL bar and paste into Thero.
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    Best Practices for New Data Sources
                                </h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex gap-2">
                                        <Circle className="mt-1 h-3 w-3 flex-shrink-0 fill-current" />
                                        <span>Initially set visibility to &quot;Visible to test group only&quot;</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Circle className="mt-1 h-3 w-3 flex-shrink-0 fill-current" />
                                        <span>Configure your test group through the Manage test group option</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Circle className="mt-1 h-3 w-3 flex-shrink-0 fill-current" />
                                        <span>Let the test group verify search results and content accuracy</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Circle className="mt-1 h-3 w-3 flex-shrink-0 fill-current" />
                                        <span>Once verified, set visibility to &quot;visible to everyone&quot;</span>
                                    </li>
                                </ul>
                            </div>

                            <Separator />

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
