import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Rating } from '@/components/ui/rating';

interface RatingsState {
  [key: string]: number;
}

interface FeedbackData {
  isHelpful: boolean;
  ratings: Partial<Record<ValidRating, number>>;
  categories: ValidCategory[];
}

interface MessageFeedbackProps {
  messageId: string;
  conversationId: string | null;
  onFeedbackSubmit: (messageId: string, feedback: FeedbackData) => Promise<void>;
  children?: (actions: {
    onPositive: () => Promise<void>;
    onRequestDetails: () => void;
  }) => React.ReactNode;
}

type ValidRating = 'accuracy' | 'relevance' | 'completeness' | 'clarity';
type ValidCategory =
  | 'incorrect_information'
  | 'missing_information'
  | 'irrelevant_information'
  | 'unclear_explanation'
  | 'poor_citations'
  | 'excellent_answer'
  | 'helpful_citations'
  | 'well_explained'
  | 'other';

const validRatings: ValidRating[] = ['accuracy', 'relevance', 'completeness', 'clarity'];
const validCategories: ValidCategory[] = [
  'incorrect_information',
  'missing_information',
  'irrelevant_information',
  'unclear_explanation',
  'poor_citations',
  'excellent_answer',
  'helpful_citations',
  'well_explained',
  'other',
];

// Map for user-friendly category labels
const categoryLabels: Record<ValidCategory, string> = {
  incorrect_information: 'Incorrect Information',
  missing_information: 'Missing Information',
  irrelevant_information: 'Irrelevant Information',
  unclear_explanation: 'Unclear Explanation',
  poor_citations: 'Poor Citations',
  excellent_answer: 'Excellent Answer',
  helpful_citations: 'Helpful Citations',
  well_explained: 'Well Explained',
  other: 'Other',
};

const MessageFeedback = ({
  messageId,
  conversationId,
  onFeedbackSubmit,
  children,
}: MessageFeedbackProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedCategories, setSelectedCategories] = useState<ValidCategory[]>([]);
  const [ratings, setRatings] = useState<RatingsState>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handlePositiveFeedback = async (): Promise<void> => {
    try {
      await onFeedbackSubmit(messageId, {
        isHelpful: true,
        ratings: { clarity: 5 },
        categories: ['excellent_answer', 'well_explained'],
      });
      setIsSubmitted(true);
      toast.success('Thank you for your positive feedback');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    }
  };

  const handleNegativeFeedbackSubmit = async (): Promise<void> => {
    try {
      const validatedRatings: Partial<Record<ValidRating, number>> = {};
      Object.entries(ratings).forEach(([key, value]) => {
        if (validRatings.includes(key as ValidRating) && value >= 1 && value <= 5) {
          validatedRatings[key as ValidRating] = value;
        }
      });

      const validatedCategories = selectedCategories.filter((cat) => validCategories.includes(cat));

      await onFeedbackSubmit(messageId, {
        isHelpful: false,
        ratings: validatedRatings,
        categories: validatedCategories,
      });
      setIsSubmitted(true);
      setIsExpanded(false);
      toast.success('Thank you for your detailed feedback');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    }
  };

  const handleCategoryToggle = (categoryId: ValidCategory): void => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleRatingChange = (type: string, value: number | null): void => {
    if (value && value >= 1 && value <= 5) {
      setRatings((prev) => ({
        ...prev,
        [type]: value,
      }));
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex text-sm items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle className="w-3 h-3" />
        <span className="text-sm">Thank you for your feedback</span>
      </div>
    );
  }

  const feedbackTriggers = children ? (
    children({
      onPositive: handlePositiveFeedback,
      onRequestDetails: () => setIsExpanded(true),
    })
  ) : (
    <div className="flex gap-2">
      <Tooltip>
        <TooltipContent>This was Helpful</TooltipContent>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handlePositiveFeedback}
            className="cursor-pointer text-foreground hover:text-primary transition-colors"
            aria-label="This was helpful"
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
        </TooltipTrigger>
      </Tooltip>
      <Tooltip>
        <TooltipContent>This Needs improvement</TooltipContent>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="cursor-pointer text-foreground hover:text-primary transition-colors"
            aria-label="This needs improvement"
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </TooltipTrigger>
      </Tooltip>
    </div>
  );

  return (
    <div>
      {!isExpanded && feedbackTriggers}

      {/* Detailed Negative Feedback Form */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <div className="mt-2 p-2 bg-card rounded-sm border border-border">
            <p className="text-sm mb-2 text-foreground">What could be improved?</p>

            {/* Ratings */}
            <div className="flex flex-col gap-2 mb-2">
              {validRatings.map((ratingId) => (
                <div className="flex gap-2 items-center" key={ratingId}>
                  <span className="mb-0.5 capitalize text-sm text-foreground min-w-[100px]">
                    {ratingId}
                  </span>
                  <Rating
                    value={ratings[ratingId] || 0}
                    onChange={(value) => handleRatingChange(ratingId, value)}
                  />
                </div>
              ))}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1 mb-2">
              {validCategories.map((categoryId) => (
                <Badge
                  onClick={() => handleCategoryToggle(categoryId)}
                  key={categoryId}
                  className={cn(
                    'rounded-sm cursor-pointer transition-colors',
                    selectedCategories.includes(categoryId)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  )}
                  variant={selectedCategories.includes(categoryId) ? 'default' : 'outline'}
                >
                  {categoryLabels[categoryId]}
                </Badge>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExpanded(false)}
                className="text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleNegativeFeedbackSubmit}
                disabled={Object.keys(ratings).length === 0 && selectedCategories.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Submit
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default MessageFeedback;
