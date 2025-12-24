import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Check,
    HelpCircle,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Types for the layout props
export interface ConnectorFeature {
    text: string;
}

export interface SetupStep {
    number: number;
    title?: string;
    description: string;
    content?: React.ReactNode;
}

export interface GuideStep {
    number: number;
    title: string;
    content: React.ReactNode;
}

export interface ConnectorSetupLayoutProps {
    // Connector info
    connectorName: string;
    connectorDisplayName: string;
    connectorSubtitle?: string;
    iconPath: string;
    defaultIconPath?: string;

    // Features shown in header
    features?: ConnectorFeature[];

    // Loading and error states
    loading?: boolean;
    error?: string | null;

    // Main content - rendered in the setup area
    children: React.ReactNode;

    // Help guide sidebar content
    guideContent?: React.ReactNode;

    // Header actions
    headerActions?: React.ReactNode;

    // Back navigation
    backPath?: string;
    backLabel?: string;
}

// Reusable step number component
export const StepNumber: React.FC<{ number: number; variant?: 'outline' | 'filled' }> = ({
    number,
    variant = 'outline'
}) => {
    if (variant === 'filled') {
        return (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {number}
            </span>
        );
    }
    return (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 text-muted-foreground">
            <span className="text-xs font-medium">{number}</span>
        </div>
    );
};

// Reusable setup step component
export const SetupStepSection: React.FC<{
    number: number;
    description: string;
    children?: React.ReactNode;
}> = ({ number, description, children }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <StepNumber number={number} />
                <p className="text-sm text-foreground">{description}</p>
            </div>
            {children && <div className="space-y-4">{children}</div>}
        </div>
    );
};

// Reusable form field component
export const FormField: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: 'text' | 'password' | 'email' | 'url';
    endAdornment?: React.ReactNode;
}> = ({ id, label, value, onChange, placeholder = '', type = 'text', endAdornment }) => {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div className={endAdornment ? "flex items-center gap-2 max-w-md" : ""}>
                <Input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`${endAdornment ? "" : "max-w-md"} bg-muted/50`}
                />
                {endAdornment}
            </div>
        </div>
    );
};

// Main layout component
export const ConnectorSetupLayout: React.FC<ConnectorSetupLayoutProps> = ({
    connectorName,
    connectorDisplayName,
    connectorSubtitle,
    iconPath,
    defaultIconPath = '/assets/icons/connectors/default.svg',
    features = [],
    loading = false,
    error = null,
    children,
    guideContent,
    headerActions,
    backPath = '/account/company-settings/settings/connector',
    backLabel = 'Back to Apps',
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate(backPath);
    };

    // Loading state
    if (loading) {
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
                    {backLabel}
                </Button>
            </div>
        );
    }

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
                            {backLabel}
                        </Button>

                        {headerActions}
                    </div>

                    <div className="flex items-start gap-16">
                        <div className="flex items-start gap-4 ml-6">
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-muted/40">
                                <img
                                    src={iconPath}
                                    alt={connectorName}
                                    className="h-10 w-10 object-contain"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = defaultIconPath;
                                    }}
                                />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold text-foreground">{connectorDisplayName}</h1>
                                {connectorSubtitle && (
                                    <p className="mt-1 text-sm text-muted-foreground">{connectorSubtitle}</p>
                                )}
                            </div>
                        </div>

                        {/* Feature list with checkmarks */}
                        {features.length > 0 && (
                            <ul className="mt-1 space-y-1 text-sm text-foreground">
                                {features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <Check className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <span>{feature.text}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Setup Content */}
                <ScrollArea className="flex-1">
                    <div className="px-6 py-6">
                        <div className="mx-auto max-w-3xl space-y-8">
                            {children}
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Help Guide Sidebar */}
            {guideContent && (
                <div className="w-[31.2rem] flex-shrink-0 border-l border-border/60 bg-muted/30">
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            <div className="mb-6 flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold text-foreground">
                                    Setup Guide
                                </h2>
                            </div>
                            <div className="space-y-5">
                                {guideContent}
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
};

export default ConnectorSetupLayout;
