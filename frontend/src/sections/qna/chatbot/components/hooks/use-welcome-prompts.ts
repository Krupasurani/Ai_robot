import { useState, useEffect, useCallback, useMemo } from 'react';
import { PromptLibraryApi, type PromptTemplate } from '@/api/prompt-library';

export type PromptTab = 'recommended' | 'favorites' | 'created';

// Extended prompt type with display metadata
export type PromptWithMetadata = PromptTemplate & {
  displayCreatedBy?: string;
  usageCount?: number;
};

interface UseWelcomePromptsReturn {
  activeTab: PromptTab;
  setActiveTab: (tab: PromptTab) => void;
  displayedPrompts: PromptWithMetadata[];
  loadingPrompts: boolean;
  hasMorePrompts: boolean;
  isExpanded: boolean;
  handleLoadMore: () => void;
}

/**
 * Custom hook to manage prompts for the welcome message
 * Handles fetching, filtering, and pagination of prompts
 */
export const useWelcomePrompts = (): UseWelcomePromptsReturn => {
  const [activeTab, setActiveTab] = useState<PromptTab>('recommended');
  const [allPrompts, setAllPrompts] = useState<PromptTemplate[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  // Fetch prompts based on active tab
  useEffect(() => {
    const fetchPrompts = async () => {
      setLoadingPrompts(true);
      try {
        const filters: any = {
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        };

        if (activeTab === 'created') {
          // For "Created by me", filter by visibility private (user's own prompts)
          filters.visibility = 'private';
        } else if (activeTab === 'favorites') {
          // For favorites, show workspace prompts
          filters.visibility = 'workspace';
        } else {
          // Recommended - show all, sorted by usage/popularity
          filters.visibility = 'all';
        }

        const data = await PromptLibraryApi.list(filters);
        setAllPrompts(data);
        setIsExpanded(false); // Reset expansion when tab changes
      } catch (error) {
        console.error('Failed to load prompts:', error);
        setAllPrompts([]);
      } finally {
        setLoadingPrompts(false);
      }
    };

    fetchPrompts();
  }, [activeTab]);

  // Reset expansion when tab changes
  useEffect(() => {
    setIsExpanded(false);
  }, [activeTab]);

  // Handle expanding to show more prompts (9 total)
  const handleLoadMore = useCallback(() => {
    setIsExpanded(true);
  }, []);

  // Get displayed prompts: 3 initially, 9 when expanded, with metadata attached
  const displayedPrompts = useMemo<PromptWithMetadata[]>(() => {
    const count = isExpanded ? 9 : 3;
    return allPrompts.slice(0, count).map((prompt, index) => ({
      ...prompt,
      displayCreatedBy: index === 0 ? 'Jimmie Aber...' : index === 1 ? 'Susanna Rig...' : undefined,
      usageCount: index === 0 ? 1706 : index === 1 ? 1484 : 603,
    }));
  }, [allPrompts, isExpanded]);

  // Check if there are more than 3 prompts to show "See more" button
  const hasMorePrompts = allPrompts.length > 3;

  return {
    activeTab,
    setActiveTab,
    displayedPrompts,
    loadingPrompts,
    hasMorePrompts,
    isExpanded,
    handleLoadMore,
  };
};
