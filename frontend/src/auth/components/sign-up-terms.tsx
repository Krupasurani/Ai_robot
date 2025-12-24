import { cn } from '@/utils/cn';

export type SignUpTermsProps = React.HTMLAttributes<HTMLSpanElement>;

export function SignUpTerms({ className, ...other }: SignUpTermsProps) {
  return (
    <span
      className={cn('mt-6 block text-center text-xs text-muted-foreground', className)}
      {...other}
    >
      {'By signing up, I agree to '}
      <a href="#" className="text-foreground underline underline-offset-4 hover:text-primary">
        Terms of service
      </a>
      {' and '}
      <a href="#" className="text-foreground underline underline-offset-4 hover:text-primary">
        Privacy policy
      </a>
      .
    </span>
  );
}
