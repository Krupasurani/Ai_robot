import { cn } from '@/utils/cn';

interface IconProps {
  className?: string;
}

// Google - Colorful brand icon
export const GoogleIcon = ({ className }: IconProps) => (
  <svg className={cn('h-10 w-10', className)} viewBox="0 0 24 24" fill="none">
    <g data-name="Product Icons">
      <g>
        <path
          d="M3.33,7,12,2l8.66,5v9.72L17.33,14H6.67L3.33,16.67ZM16,8.67a4,4,0,1,0-4,4A4,4,0,0,0,16,8.67Zm-1.33,0A2.67,2.67,0,1,1,12,6,2.67,2.67,0,0,1,14.67,8.67Z"
          fill="#669df6"
        />
        <path
          d="M12,12.67a4,4,0,0,0,0-8V2l8.66,5v9.72L17.33,14H12Zm2.67-4A2.67,2.67,0,0,1,12,11.31V6A2.67,2.67,0,0,1,14.67,8.66Z"
          fill="#4285f4"
        />
        <polygon points="4 18 12 22 20 18 16.67 15.33 7.33 15.33 4 18" fill="#669df6" />
        <polygon points="12 22 20 18 16.67 15.33 12 15.33 12 22" fill="#4285f4" />
      </g>
    </g>
  </svg>
);

// Microsoft - Colorful brand icon
export const MicrosoftIcon = ({ className }: IconProps) => (
  <svg className={cn('h-10 w-10', className)} viewBox="0 0 24 24" fill="none">
    <path d="M3 3h8.5v8.5H3V3z" fill="#F25022" />
    <path d="M12.5 3H21v8.5h-8.5V3z" fill="#7FBA00" />
    <path d="M3 12.5h8.5V21H3v-8.5z" fill="#00A4EF" />
    <path d="M12.5 12.5H21V21h-8.5v-8.5z" fill="#FFB900" />
  </svg>
);

// Azure AD - Entra ID icon
export const AzureAdIcon = ({ className }: IconProps) => (
  <svg className={cn('h-10 w-10', className)} viewBox="0 0 18 18" fill="none">
    <path
      d="m3.802,14.032c.388.242,1.033.511,1.715.511.621,0,1.198-.18,1.676-.487,0,0,.001,0,.002-.001l1.805-1.128v4.073c-.286,0-.574-.078-.824-.234l-4.374-2.734Z"
      fill="#225086"
    />
    <path
      d="m7.853,1.507L.353,9.967c-.579.654-.428,1.642.323,2.111,0,0,2.776,1.735,3.126,1.954.388.242,1.033.511,1.715.511.621,0,1.198-.18,1.676-.487,0,0,.001,0,.002-.001l1.805-1.128-4.364-2.728,4.365-4.924V1s0,0,0,0c-.424,0-.847.169-1.147.507Z"
      fill="#6df"
    />
    <polygon points="4.636 10.199 4.688 10.231 9 12.927 9.001 12.927 9.001 12.927 9.001 5.276 9 5.275 4.636 10.199" fill="#cbf8ff" />
    <path
      d="m17.324,12.078c.751-.469.902-1.457.323-2.111l-4.921-5.551c-.397-.185-.842-.291-1.313-.291-.925,0-1.752.399-2.302,1.026l-.109.123h0s4.364,4.924,4.364,4.924h0s0,0,0,0l-4.365,2.728v4.073c.287,0,.573-.078.823-.234l7.5-4.688Z"
      fill="#074793"
    />
    <path
      d="m9.001,1v4.275s.109-.123.109-.123c.55-.627,1.377-1.026,2.302-1.026.472,0,.916.107,1.313.291l-2.579-2.909c-.299-.338-.723-.507-1.146-.507Z"
      fill="#0294e4"
    />
    <polygon points="13.365 10.199 13.365 10.199 13.365 10.199 9.001 5.276 9.001 12.926 13.365 10.199" fill="#96bcc2" />
  </svg>
);

// SAML SSO - Shield icon
export const SamlSsoIcon = ({ className }: IconProps) => (
  <svg className={cn('h-10 w-10', className)} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
      fill="#FF6B35"
      fillOpacity="0.15"
    />
    <path
      d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
      stroke="#FF6B35"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12l2 2 4-4"
      stroke="#FF6B35"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// OAuth - Lock icon
export const OAuthIcon = ({ className }: IconProps) => (
  <svg className={cn('h-10 w-10', className)} viewBox="0 0 20 20" fill="none">
    <path
      d="M10,20c-3.9,0-7-3.1-7-7s3.1-7,7-7s7,3.1,7,7S13.9,20,10,20z M10,8c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S12.8,8,10,8z"
      fill="#000"
    />
    <path d="M14,5h-2V4c0-1.1-0.9-2-2-2S8,2.9,8,4v1H6V4c0-2.2,1.8-4,4-4s4,1.8,4,4V5z" fill="#000" />
    <path
      d="M12,12c0-1.1-0.9-2-2-2s-2,0.9-2,2c0,0.7,0.4,1.4,1,1.7V16h2v-2.3C11.6,13.4,12,12.7,12,12z"
      fill="#000"
    />
  </svg>
);

// OTP / Email - Mail with checkmark
export const OtpIcon = ({ className }: IconProps) => (
  <svg className={cn('h-10 w-10', className)} viewBox="0 0 24 24" fill="none">
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="3"
      fill="#14B8A6"
      fillOpacity="0.15"
    />
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="3"
      stroke="#14B8A6"
      strokeWidth="1.5"
    />
    <path
      d="M2 7l10 6 10-6"
      stroke="#14B8A6"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="18" cy="16" r="4" fill="#14B8A6" />
    <path
      d="M16.5 16l1 1 2-2"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Password - Lock icon
export const PasswordIcon = ({ className }: IconProps) => (
  <svg className={cn('h-10 w-10', className)} viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
      fill="#6B7280"
      fillOpacity="0.15"
    />
    <rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
      stroke="#6B7280"
      strokeWidth="1.5"
    />
    <path
      d="M7 11V7a5 5 0 0110 0v4"
      stroke="#6B7280"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="16" r="1.5" fill="#6B7280" />
    <path d="M12 17.5v2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// SMTP - Mail server icon
export const SmtpIcon = ({ className }: IconProps) => (
  <svg className={cn('h-10 w-10', className)} viewBox="0 0 24 24" fill="none">
    <rect
      x="2"
      y="6"
      width="20"
      height="12"
      rx="2"
      fill="#10B981"
      fillOpacity="0.15"
    />
    <rect
      x="2"
      y="6"
      width="20"
      height="12"
      rx="2"
      stroke="#10B981"
      strokeWidth="1.5"
    />
    <path
      d="M2 9l10 5 10-5"
      stroke="#10B981"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 3v3M12 3v3M18 3v3"
      stroke="#10B981"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Map of auth method types to their icons
export const AUTH_PROVIDER_ICONS: Record<string, React.FC<IconProps>> = {
  google: GoogleIcon,
  microsoft: MicrosoftIcon,
  azureAd: AzureAdIcon,
  samlSso: SamlSsoIcon,
  oauth: OAuthIcon,
  otp: OtpIcon,
  password: PasswordIcon,
  smtp: SmtpIcon,
};

// Get icon component by type
export const getAuthProviderIcon = (type: string): React.FC<IconProps> => {
  return AUTH_PROVIDER_ICONS[type] || PasswordIcon;
};




