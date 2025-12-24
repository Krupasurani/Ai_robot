import { z } from 'zod';
import { cn } from '@/utils/cn';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { InputField } from '@/components/ui/input-field';
import { PasswordField } from '@/components/ui/password-field';
import { Loader, MapPin, ArrowLeft, Building2, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { setEmail } from 'src/store/authSlice';
import { OrgExists, AccountSetUp } from 'src/auth/context/jwt';

export type AccountType = 'individual' | 'business';

const permanentAddressSchema = z.object({
  addressLine1: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  postCode: z.string().max(20).optional(),
  country: z.string().max(20).optional(),
});

// Base schema with fields needed for both individual and business
const baseSchema = z.object({
  adminFullName: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Name must be less than 100 characters'),
  contactEmail: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
});

// business-specific schema
const organizationSchema = baseSchema.extend({
  registeredName: z.string().min(1, 'Organization name is required').max(100),
  shortName: z.string().max(50).optional(),
  permanentAddress: permanentAddressSchema.optional(),
});

// Individual schema (without organization fields)
const individualSchema = baseSchema.extend({});

// Function to choose the appropriate schema based on account type
const getValidationSchema = (accountType: AccountType) => {
  const schema = accountType === 'business' ? organizationSchema : individualSchema;

  return schema.refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
};

// Props interface for AccountSetupForm
interface AccountSetupFormProps {
  accountType: AccountType;
}

export const AccountSetupForm: React.FC<AccountSetupFormProps> = ({ accountType }) => {
  // Get the correct validation schema based on account type
  const schema = getValidationSchema(accountType);

  // Set up initial form data based on account type
  const initialFormData: any = {
    adminFullName: '',
    contactEmail: '',
    password: '',
    confirmPassword: '',
  };

  // Add organization-specific fields if needed
  if (accountType === 'business') {
    initialFormData.registeredName = '';
    initialFormData.shortName = '';
    initialFormData.permanentAddress = {
      addressLine1: '',
      city: '',
      state: '',
      postCode: '',
      country: '',
    };
  }

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialFormData,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
    trigger,
  } = methods;

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Stepper state for business
  const [step, setStep] = useState(0);
  const isBusiness = accountType === 'business';
  const steps = isBusiness ? ['Organization Details', 'Admin Details', 'Address & Password'] : [];

  // Helper to go to next step after validation
  const handleNext = async () => {
    // Validate current step fields only
    let fieldsToValidate: string[] = [];
    if (step === 0) fieldsToValidate = ['registeredName', 'shortName'];
    if (step === 1)
      fieldsToValidate = ['adminFullName', 'contactEmail', 'password', 'confirmPassword'];
    if (step === 2)
      fieldsToValidate = [
        'permanentAddress.addressLine1',
        'permanentAddress.city',
        'permanentAddress.state',
        'permanentAddress.postCode',
        'permanentAddress.country',
      ];
    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }
    setStep((s) => s + 1);
  };
  const handleBack = () => setStep((s) => s - 1);

  useEffect(() => {
    const checkOrgExists = async () => {
      try {
        const response = await OrgExists();
        if (response.exists === false) {
          toast.warning('Set up account to continue');
          navigate('/auth/sign-up');
        } else {
          navigate('/auth/sign-in');
        }
      } catch (err) {
        console.error('Error checking if organization exists:', err);
        // Default to false if there's an error
      }
    };

    checkOrgExists();
    // eslint-disable-next-line
  }, []);

  const onSubmit = async (data: any) => {
    try {
      // Add accountType to the data being sent to the API
      await AccountSetUp({ ...data, accountType });

      dispatch(setEmail(data.contactEmail));
      toast.success(
        accountType === 'business'
          ? 'Organization created successfully!'
          : 'Account created successfully!'
      );
      reset(initialFormData);
      navigate('/auth/sign-in');
    } catch (error) {
      toast.error(`Failed to create ${accountType === 'business' ? 'business' : 'account'}`);
    }
  };

  return (
    <div className="min-h-screen flex justify-center flex-col z-2  py-8 md:py-0 sm:px-8 m-0">
      <div className="!max-w-[800px] w-full flex justify-center m-0 h-full sm:p-4">
        <Card className={cn('flex-1 w-full  flex-col xs:py-2 sm:py-3 pt-[65px]')}>
          <div className="mb-2 text-center sm:mt-0 md:mt-8 lg:mt-10">
            <h3 className="font-bold mb-1 text-3xl dark:text-blue-500">
              {accountType === 'business' ? 'Set Up Your Organization' : 'Create Your Account'}
            </h3>
            <p className="text-sm dark:text-gray-300 text-gray-400">
              {accountType === 'business'
                ? 'Create your organization profile to get started with THERO'
                : 'Create your individual account to get started with THERO'}
            </p>
          </div>

          <div className="flex w-full justify-center items-center ">
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmit)} className="w-full p-6 md:p-4 px-10">
                <div className="flex flex-col w-full gap-3 ">
                  {/* Stepper for business */}
                  {isBusiness && (
                    <div className="flex justify-center mb-4 ">
                      {steps.map((label, idx) => (
                        <Badge
                          key={label}
                          className={cn(
                            'px-4 py-2 rounded-full mx-1 text-xs font-semibold',
                            idx === step
                              ? 'bg-blue-600 text-white'
                              : 'dark:bg-gray-200 bg-[#f4f4f4] text-black',
                            'transition-colors duration-150'
                          )}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Step 1: Organization Details */}
                  {(!isBusiness || (isBusiness && step === 0)) && (
                    <>
                      {isBusiness && (
                        <>
                          <InputField
                            control={control}
                            name="registeredName"
                            label="Organisation Name"
                            IconComponent={Building2}
                            placeholder="Something-org"
                            required
                          />

                          <InputField
                            control={control}
                            name="shortName"
                            label="Short Name (optional)"
                            IconComponent={Building2}
                            placeholder="something"
                          />
                        </>
                      )}
                      {/* Next button for business */}
                      {isBusiness && (
                        <div className="flex justify-end mt-4 dark:text-white ">
                          <Button
                            type="button"
                            onClick={handleNext}
                            className="px-6 cursor-pointer"
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  {/* Step 2: Admin Details */}
                  {isBusiness && step === 1 && (
                    <>
                      <div className="flex md:flex-row flex-col md:gap-2">
                        <div className="w-full">
                          <InputField
                            control={control}
                            name="adminFullName"
                            label="Admin Name"
                            IconComponent={User}
                            placeholder="Hello"
                            required
                          />
                        </div>

                        <div className="w-full">
                          <InputField
                            control={control}
                            name="contactEmail"
                            label="Email"
                            IconComponent={Mail}
                            placeholder="john@gmail.com"
                            type="email"
                            required
                          />
                        </div>
                      </div>
                      <PasswordField
                        control={control}
                        name="password"
                        label="Password"
                        required
                        autoFocus
                      />
                      <PasswordField
                        control={control}
                        name="confirmPassword"
                        label="Confirm Password"
                        required
                      />
                      <div className="flex justify-between mt-4 ">
                        <Button
                          type="button"
                          onClick={handleBack}
                          variant="outline"
                          className="px-6 cursor-pointer"
                        >
                          <ArrowLeft size={12} />
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleNext}
                          className="px-6 text-white cursor-pointer"
                        >
                          Next
                        </Button>
                      </div>
                    </>
                  )}
                  {/* Step 3: Address (rest of the form) */}
                  {(!isBusiness && (
                    <>
                      <div className="flex md:flex-row flex-col md:gap-2">
                        <div className="w-full">
                          <InputField
                            control={control}
                            name="adminFullName"
                            label="Full Name"
                            IconComponent={User}
                            placeholder="John Doe"
                            required
                          />
                        </div>

                        <div className="w-full">
                          <InputField
                            control={control}
                            name="contactEmail"
                            label="Email"
                            IconComponent={Mail}
                            placeholder="john@gmail.com"
                            type="email"
                            required
                          />
                        </div>
                      </div>
                      <PasswordField
                        control={control}
                        name="password"
                        label="Password"
                        required
                        autoFocus
                      />
                      <PasswordField
                        control={control}
                        name="confirmPassword"
                        label="Confirm Password"
                        required
                      />
                      {/* Form Actions */}
                      <div>
                        <div className="flex flex-end gap-2 mt-2">
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full p-5 text-sm cursor-pointer"
                          >
                            {isSubmitting ? (
                              <Loader size={24} className="animate-spin" />
                            ) : (
                              <div className="text-white font-bold flex items-center  justify-between gap-2">
                                {isBusiness ? 'Create Organization' : 'Create Account'}
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )) ||
                    (isBusiness && step === 2 && (
                      <>
                        {/* Address Section - Only show for organization account type */}
                        <div>
                          <p className="flex gap-1 items-center">
                            <MapPin size={16} />
                            Address Details (optional)
                          </p>
                        </div>

                        <div className="w-full">
                          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-2">
                            <div className="col-span-1 md:col-span-2">
                              <InputField
                                control={control}
                                name="permanentAddress.addressLine1"
                                label="Street Address"
                                placeholder="Los-Angeles-Platz 41"
                              />
                            </div>

                            <div>
                              <InputField
                                control={control}
                                name="permanentAddress.city"
                                label="City"
                                placeholder="Hamburg Wilhelmsburg"
                              />
                            </div>

                            <div>
                              <InputField
                                control={control}
                                name="permanentAddress.state"
                                label="State / Province"
                                placeholder="Hamburg"
                              />
                            </div>

                            <div>
                              <InputField
                                control={control}
                                name="permanentAddress.postCode"
                                label="Zip / Postal code"
                                placeholder="21109"
                              />
                            </div>

                            <div>
                              <InputField
                                control={control}
                                name="permanentAddress.country"
                                label="Country"
                                placeholder="Germany"
                              />
                            </div>
                          </div>
                        </div>
                        {/* Form Actions */}
                        <div className="flex justify-between gap-2 mt-2">
                          <Button
                            type="button"
                            onClick={handleBack}
                            variant="outline"
                            className="px-6 cursor-pointer group"
                          >
                            <ArrowLeft size={12} />
                            Back
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className=" p-5 text-sm text-white cursor-pointer"
                          >
                            {isSubmitting ? (
                              <Loader size={24} className="animate-spin" />
                            ) : (
                              <div className="text-white font-bold flex items-center  justify-between gap-2">
                                Create Organization
                              </div>
                            )}
                          </Button>
                        </div>
                      </>
                    ))}
                </div>
              </form>
            </FormProvider>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AccountSetupForm;
