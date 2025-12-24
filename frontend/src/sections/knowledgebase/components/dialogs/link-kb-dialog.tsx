import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Link as LinkIcon, Library, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import { KnowledgeBaseAPI } from '../../services/api';
import type { LinkedKB } from '../../types/kb';

interface LinkKnowledgeBaseDialogProps {
    open: boolean;
    onClose: () => void;
    kbId: string;
    kbName: string;
    currentLinkedKBs?: LinkedKB[];
    onLink?: (linkedKbId: string) => Promise<void>;
    onUnlink?: (linkedKbId: string) => Promise<void>;
}

interface AvailableKB {
    id: string;
    name: string;
    icon?: string;
    documentCount?: number;
}

export function LinkKnowledgeBaseDialog({
    open,
    onClose,
    kbId,
    kbName,
    currentLinkedKBs = [],
    onLink,
    onUnlink,
}: LinkKnowledgeBaseDialogProps) {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [availableKBs, setAvailableKBs] = useState<AvailableKB[]>([]);
    const [linkedKBs, setLinkedKBs] = useState<LinkedKB[]>(currentLinkedKBs);

    const fetchAvailableKBs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await KnowledgeBaseAPI.getKnowledgeBases();
            // Map KB list to AvailableKB format and filter out current KB
            const kbs = (response.knowledgeBases || [])
                .filter((kb: any) => kb.id !== kbId)
                .map((kb: any) => ({
                    id: kb.id,
                    name: kb.name || kb.groupName,
                    icon: kb.icon,
                    documentCount: kb.documentCount,
                }));
            setAvailableKBs(kbs);
        } catch (error) {
            console.error('Failed to fetch KBs:', error);
            toast.error('Failed to load available Knowledge Bases');
        } finally {
            setLoading(false);
        }
    }, [kbId]);

    const fetchLinkedKBs = useCallback(async () => {
        try {
            const linked = await KnowledgeBaseAPI.getLinkedKnowledgeBases(kbId);
            setLinkedKBs(linked || []);
        } catch (error) {
            console.error('Failed to fetch linked KBs:', error);
            // Fall back to prop value if API call fails
            setLinkedKBs(currentLinkedKBs || []);
        }
    }, [kbId, currentLinkedKBs]);

    // Fetch both available and linked KBs when dialog opens
    useEffect(() => {
        if (open) {
            setSearchQuery('');
            fetchAvailableKBs();
            fetchLinkedKBs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const filteredKBs = availableKBs.filter(kb => {
        const matchesSearch = kb.name.toLowerCase().includes(searchQuery.toLowerCase());
        const notAlreadyLinked = !linkedKBs.some(linked => linked.id === kb.id);
        return matchesSearch && notAlreadyLinked;
    });

    const handleLink = async (kb: AvailableKB) => {
        try {
            if (onLink) {
                await onLink(kb.id);
            }

            // Update local state
            setLinkedKBs(prev => [...prev, {
                id: kb.id,
                name: kb.name,
                icon: kb.icon,
                documentCount: kb.documentCount,
            }]);

            toast.success(`Linked "${kb.name}" to this Knowledge Base`);
        } catch (error) {
            console.error('Failed to link KB:', error);
            toast.error('Failed to link Knowledge Base');
        }
    };

    const handleUnlink = async (linkedKb: LinkedKB) => {
        try {
            if (onUnlink) {
                await onUnlink(linkedKb.id);
            }

            // Update local state
            setLinkedKBs(prev => prev.filter(kb => kb.id !== linkedKb.id));

            toast.success(`Unlinked "${linkedKb.name}"`);
        } catch (error) {
            console.error('Failed to unlink KB:', error);
            toast.error('Failed to unlink Knowledge Base');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden rounded-xl font-roboto" showCloseButton={false} aria-describedby={undefined}>
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-border/30">
                    <DialogTitle className="text-[20px] font-bold text-foreground">
                        Link Knowledge Bases
                    </DialogTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50 transition-colors" onClick={onClose}>
                        <X className="w-5 h-5 text-muted-foreground/60" />
                    </Button>
                </div>

                {/* Body */}
                <div className="px-6 pt-4 pb-5 space-y-5">
                    {/* Description */}
                    <p className="text-[14px] text-muted-foreground">
                        Link other Knowledge Bases to include their documents in &quot;{kbName}&quot;. Contributors from linked KBs will be shown in the header.
                    </p>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                            placeholder="Search for a Knowledge Base..."
                            className="h-11 pl-10 pr-4 text-[15px] bg-white border-gray-300 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all rounded-lg placeholder:text-muted-foreground/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Currently Linked KBs */}
                    {linkedKBs.length > 0 && (
                        <div>
                            <h3 className="text-[13px] font-medium text-black mb-3">Linked Knowledge Bases</h3>
                            <ScrollArea className="max-h-[140px] -mx-1 px-1">
                                <div className="space-y-1">
                                    {linkedKBs.map((kb) => (
                                        <div
                                            key={`linked-${kb.id}`}
                                            className="flex items-center justify-between py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="text-2xl flex-shrink-0">{kb.icon || '📚'}</div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[15px] font-medium text-foreground truncate">{kb.name}</span>
                                                    {kb.documentCount !== undefined && (
                                                        <span className="text-[13px] text-muted-foreground">
                                                            {kb.documentCount} documents
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={() => handleUnlink(kb)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Available KBs to Link */}
                    <div>
                        <h3 className="text-[13px] font-medium text-black mb-3">
                            {searchQuery ? 'Search Results' : 'Available Knowledge Bases'}
                        </h3>
                        <ScrollArea className="max-h-[240px] -mx-1 px-1">
                            <div className="space-y-1">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 py-2.5 px-3">
                                            <Skeleton className="h-8 w-8 rounded" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-4 w-40" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                        </div>
                                    ))
                                ) : filteredKBs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-[14px]">
                                        {searchQuery ? 'No Knowledge Bases found' : 'No available Knowledge Bases to link'}
                                    </div>
                                ) : (
                                    filteredKBs.map((kb) => (
                                        <button
                                            key={`available-${kb.id}`}
                                            className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-accent/50 rounded-lg transition-colors text-left group"
                                            onClick={() => handleLink(kb)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="text-2xl flex-shrink-0">{kb.icon || '📚'}</div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[15px] font-medium text-foreground truncate">{kb.name}</span>
                                                    {kb.documentCount !== undefined && (
                                                        <span className="text-[13px] text-muted-foreground">
                                                            {kb.documentCount} documents
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <LinkIcon className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 flex items-center justify-end border-t border-border/30 bg-background">
                    <Button
                        className="rounded-lg px-6 h-9 text-[14px] font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        onClick={onClose}
                    >
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
