import React from 'react';
import { cn } from '../../utils/cn';
import { OrbitingCircles } from './orbiting-circles';

const platforms = [
  { name: 'Slack', icon: '/assets/icons/platforms/ic-slack.svg' },
  { name: 'Notion', icon: '/assets/icons/platforms/ic-notion.svg' },
  { name: 'Google Workspace', icon: '/assets/icons/platforms/ic-google-workspace.svg' },
  { name: 'Teams', icon: '/assets/icons/platforms/ic-teams.svg' },
  { name: 'Outlook', icon: '/assets/icons/platforms/ic-outlook.svg' },
  { name: 'OneDrive', icon: '/assets/icons/platforms/ic-onedrive.svg' },
  { name: 'SharePoint', icon: '/assets/icons/platforms/ic-sharepoint.svg' },
  { name: 'Dropbox', icon: '/assets/icons/platforms/ic-dropbox.svg' },
];

interface PlatformOrbitsProps {
  size?: number;
}

export function PlatformOrbits({ size = 600 }: PlatformOrbitsProps) {
  return (
    <div
      className="relative mx-auto flex items-center justify-center animate-float"
      style={{ width: size, height: size }}
    >
      {/* Center logo */}
      <img
        src="/logo/Icon_4.png"
        alt="Workplace AI"
        className={cn(
          'relative z-10 h-20 w-20 cursor-pointer rounded-full border-3 border-primary bg-background',
          'animate-breathe hover:animate-breathe-fast'
        )}
      />

      {/* Orbiting platform icons */}
      {platforms.map((platform, index) => {
        const radius = 140 + (index % 3) * 50;
        const duration = 15 + (index % 4) * 5;
        const delay = index * 2;

        return (
          <OrbitingCircles
            key={platform.name}
            radius={radius}
            duration={duration}
            delay={delay}
            reverse={index % 2 === 1}
          >
            <img
              src={platform.icon}
              alt={platform.name}
              className={cn(
                'h-10 w-10 cursor-pointer rounded-full border-2 border-border bg-background p-2 shadow-md',
                'transition-all duration-300',
                'animate-glow hover:animate-glow-fast',
                'hover:scale-125 hover:rotate-12 hover:border-primary',
                'hover:shadow-[0_0_20px_hsl(var(--primary))]'
              )}
              style={{
                animationDelay: `${index * 0.5}s`,
              }}
            />
          </OrbitingCircles>
        );
      })}
    </div>
  );
}
