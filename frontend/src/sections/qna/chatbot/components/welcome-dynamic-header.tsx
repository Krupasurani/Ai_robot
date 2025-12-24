import { cn } from '@/utils/cn';
import { useState, useEffect } from 'react';
import { AnimatePresence, m, type Variants } from 'framer-motion';

// Dynamic action verbs for the header
const ACTION_VERBS = [
  'give an update',
  'summarize this file',
  'create a jira ticket',
  'explain this code',
  'write documentation',
  'analyze this data',
  'generate a report',
  'review this PR',
];

const textVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96] as const, // easeOut cubic bezier
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
      ease: [0.43, 0.13, 0.23, 0.96] as const, // easeIn cubic bezier
    },
  },
};

export const DynamicHeader = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ACTION_VERBS.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <h2
      className={cn(
        'text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-center',
        'bg-gradient-to-br from-foreground to-foreground/60 dark:from-foreground dark:to-foreground/60',
        'bg-clip-text text-transparent tracking-normal',
        'leading-normal pb-1'
      )}
    >
      Ask Assistant to{' '}
      <span className="inline-block relative min-w-[200px] sm:min-w-[240px] md:min-w-[280px]">
        <AnimatePresence mode="wait">
          <m.span
            key={ACTION_VERBS[currentIndex]}
            variants={textVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="inline-block"
            style={{
              background: 'linear-gradient(to bottom right, rgb(99, 102, 241), rgb(168, 85, 247))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {ACTION_VERBS[currentIndex]}
          </m.span>
        </AnimatePresence>
      </span>
    </h2>
  );
};
