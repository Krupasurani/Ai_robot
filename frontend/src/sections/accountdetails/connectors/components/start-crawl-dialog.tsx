import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StartCrawlDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    connectorName: string;
    onStartCrawl: () => void;
    onDoLater: () => void;
}

export const StartCrawlDialog: React.FC<StartCrawlDialogProps> = ({
    open,
    onOpenChange,
    connectorName,
    onStartCrawl,
    onDoLater,
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md font-roboto">
            <DialogHeader>
                <DialogTitle className="text-xl">Start crawl for {connectorName}?</DialogTitle>
                <DialogDescription className="pt-2 text-sm">
                    To finish set up, Thero needs to crawl {connectorName} and parse its content, metadata,
                    and permissions to create an index to search over.
                </DialogDescription>
            </DialogHeader>

            <div className="py-2">
                <p className="text-sm text-muted-foreground">
                    Would you like to start the crawl for {connectorName}?
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                    You can also start the crawl later from the Overview tab for {connectorName}.
                </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={onDoLater}>
                    Do this later
                </Button>
                <Button onClick={onStartCrawl} className="bg-primary hover:bg-primary/90">
                    Start crawl
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
