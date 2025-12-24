import * as React from 'react';
import Joyride from 'react-joyride';

import { WalktourTooltip } from './walktour-tooltip';

import type { WalktourProps } from './types';

export function Walktour({
  locale,
  continuous = true,
  showProgress = true,
  scrollDuration = 500,
  showSkipButton = true,
  disableOverlayClose = true,
  ...other
}: WalktourProps) {
  return (
    <Joyride
      scrollOffset={100}
      locale={{ last: 'Done', ...locale }}
      continuous={continuous}
      showProgress={showProgress}
      showSkipButton={showSkipButton}
      scrollDuration={scrollDuration}
      tooltipComponent={WalktourTooltip}
      disableOverlayClose={disableOverlayClose}
      floaterProps={{
        styles: {
          floater: { filter: 'none' },
          arrow: { spread: 20, length: 10 },
        },
      }}
      styles={{
        options: {
          zIndex: 9999,
          arrowColor: 'hsl(var(--background))',
        },
        overlay: {
          backgroundColor: 'hsl(var(--foreground) / 0.8)',
        },
        spotlight: {
          borderRadius: 'calc(var(--radius) * 2)',
        },
        beacon: {
          outline: 0,
        },
        beaconInner: {
          backgroundColor: 'hsl(var(--destructive))',
        },
        beaconOuter: {
          borderColor: 'hsl(var(--destructive))',
          backgroundColor: 'hsl(var(--destructive) / 0.24)',
        },
      }}
      {...other}
    />
  );
}
