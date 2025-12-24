import type React from 'react';
import type * as NsWalktourRoot from 'react-joyride';
import type { Button } from '../ui/button';

export type ButtonProps = React.ComponentProps<typeof Button>;

export { NsWalktourRoot };

export type WalktourCustomStep = NsWalktourRoot.Step & {
  slotProps?: {
    root?: {
      className?: string;
      style?: React.CSSProperties;
    };
    title?: {
      className?: string;
      style?: React.CSSProperties;
    };
    content?: {
      className?: string;
      style?: React.CSSProperties;
    };
    progress?: {
      className?: string;
      style?: React.CSSProperties;
    };
    closeBtn?: React.ButtonHTMLAttributes<HTMLButtonElement>;
    skipBtn?: ButtonProps;
    backBtn?: ButtonProps;
    nextBtn?: ButtonProps;
  };
};

export type WalktourTooltipProps = NsWalktourRoot.TooltipRenderProps & {
  step: WalktourCustomStep;
};

export type WalktourProps = NsWalktourRoot.Props;

export type WalktourProgressBarProps = {
  totalSteps: number;
  currentStep: number;
  onGoStep: (index: number) => void;
};

export type UseWalktourProps = {
  defaultRun?: boolean;
  steps: WalktourCustomStep[];
};

export type UseWalktourReturn = {
  run: boolean;
  steps: WalktourCustomStep[];
  setRun: React.Dispatch<React.SetStateAction<boolean>>;
  onCallback: (data: NsWalktourRoot.CallBackProps) => void;
  setHelpers: (storeHelpers: NsWalktourRoot.StoreHelpers) => void;
};
