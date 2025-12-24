import { Controller, useFormContext } from 'react-hook-form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type RHFCodesProps = {
  name: string;
  length?: number;
};

export function RHFCode({ name, ...other }: RHFCodesProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const slots = Array.from({ length: other.length ?? 6 });

        return (
          <div className="flex flex-col gap-1.5">
            <InputOTP
              {...field}
              maxLength={other.length ?? 6}
              containerClassName="gap-2"
              className={error ? 'text-destructive' : undefined}
            >
              <InputOTPGroup>
                {slots.map((_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {error && <p className="px-2 text-xs text-destructive">{error.message}</p>}
          </div>
        );
      }}
    />
  );
}
