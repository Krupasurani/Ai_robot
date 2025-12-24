import { z as zod } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Separator } from '@/components/ui/separator';
import LoadingState from '@/components/ui/loader';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { InputField } from '@/components/ui/input-field';
import { PasswordField } from '@/components/ui/password-field';
import {
  Lock,
  Loader2,
  TriangleAlertIcon,
  Camera,
  User,
  Mail,
  Trash2,
  Upload,
  UserCircle,
  Shield,
} from 'lucide-react';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import {
  AlertDialog,
  AlertDialogFooter,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { useTranslate } from 'src/locales';
import { Form } from 'src/components/hook-form';
import { useAuthContext } from 'src/auth/hooks';

import {
  logout,
  updateUser,
  getUserById,
  getUserLogo,
  deleteUserLogo,
  uploadUserLogo,
  changePassword,
  getUserIdFromToken,
  getDataCollectionConsent,
  updateDataCollectionConsent,
} from './utils';

type ProfileFormData = zod.infer<typeof ProfileSchema>;
type PasswordFormData = zod.infer<typeof PasswordSchema>;

const ProfileSchema = zod.object({
  fullName: zod.string().min(1, { message: 'Full Name is required' }),
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
  email: zod.string().email({ message: 'Invalid email' }).min(1, { message: 'Email is required' }),
  designation: zod.string().optional(),
  dataCollectionConsent: zod.boolean().optional(),
});

const PasswordSchema = zod
  .object({
    currentPassword: zod.string().min(1, { message: 'Current password is required' }),
    newPassword: zod
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
      .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
      .regex(/[0-9]/, { message: 'Password must contain at least one number' })
      .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one symbol' }),
    repeatNewPassword: zod.string().min(1, { message: 'Please repeat your new password' }),
  })
  .refine((data) => data.newPassword === data.repeatNewPassword, {
    message: "Passwords don't match",
    path: ['repeatNewPassword'],
  });

export default function PersonalProfile() {
  const { t: tNavbar } = useTranslate('navbar');
  const { t } = useTranslate('settings');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [saveChanges, setSaveChanges] = useState<boolean>(false);
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [isEmailConfirmOpen, setIsEmailConfirmOpen] = useState<boolean>(false);
  const [pendingFormData, setPendingFormData] = useState<ProfileFormData | null>(null);
  const [consentLoading, setConsentLoading] = useState<boolean>(false);
  const { user, updateUserContext } = useAuthContext();
  const accountType = user?.accountType || 'individual';

  // Image cropper state
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const methods = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    mode: 'onChange',
  });

  const passwordMethods = useForm<PasswordFormData>({
    resolver: zodResolver(PasswordSchema),
    mode: 'onChange',
  });

  const {
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { isValid, isDirty },
  } = methods;

  // Watch for email changes
  const watchEmail = watch('email');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userId = getUserIdFromToken();
        const userData = await getUserById(userId);
        const { fullName, firstName, email, lastName, designation } = userData;

        // Store the current email to check if it changes later
        setCurrentEmail(email);

        // Only fetch data collection consent for individual accounts
        let consentStatus = false;
        if (accountType === 'individual') {
          consentStatus = Boolean(await getDataCollectionConsent());
        }

        reset({
          fullName,
          firstName,
          email,
          lastName,
          designation,
          dataCollectionConsent: consentStatus,
        });

        // Fetch user profile image
        try {
          const dp = await getUserLogo(userId);
          setLogo(dp);
        } catch (e) {
          // ignore if not found
        }

        setLoading(false);
      } catch (err) {
        setError(t('personal_profile.changes.failed'));
        setLoading(false);
      }
    };

    fetchUserData();
  }, [reset, accountType, t]);

  const userInitial =
    user?.fullName?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || 'U';

  // Handle file selection for cropping
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error(t('personal_profile.photo.unsupported_file_type'));
      return;
    }

    // Create object URL for cropper
    const imageUrl = URL.createObjectURL(file);
    setCropImageSrc(imageUrl);
    setIsCropDialogOpen(true);

    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [t]);

  // Handle cropped image upload
  const handleCropComplete = useCallback(
    async (croppedBlob: Blob, previewUrl: string) => {
      try {
        setUploading(true);
        const userId = await getUserIdFromToken();

        const formData = new FormData();
        formData.append('file', croppedBlob, 'profile.png');
        await uploadUserLogo(userId, formData);

        // Update the logo with the preview URL
        setLogo(previewUrl);
        if (previewUrl) {
          updateUserContext?.({ photoURL: previewUrl });
        }
        toast.success(t('personal_profile.photo.success'));
      } catch (err) {
        toast.error(t('personal_profile.photo.failed'));
      } finally {
        setUploading(false);
        setCropImageSrc(null);
      }
    },
    [updateUserContext, t]
  );

  const handleRemoveAvatar = async (): Promise<void> => {
    try {
      setDeleting(true);
      const userId = await getUserIdFromToken();
      await deleteUserLogo(userId);
      setLogo(null);
      updateUserContext?.({ photoURL: undefined });
      toast.success(t('personal_profile.photo.removed'));
    } catch (err) {
      toast.error(t('personal_profile.photo.remove_failed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleConsentChange = async (checked: boolean): Promise<void> => {
    try {
      setConsentLoading(true);
      await updateDataCollectionConsent(checked);
      setValue('dataCollectionConsent', checked, { shouldDirty: false });
      toast.success(
        checked
          ? t('personal_profile.photo.data_collection_enabled')
          : t('personal_profile.photo.data_collection_disabled')
      );
    } catch (err) {
      setError(t('personal_profile.photo.data_collection_failed'));
      toast.error(t('personal_profile.photo.data_collection_failed'));
      // Reset the switch to its previous state
      setValue('dataCollectionConsent', !checked, { shouldDirty: false });
    } finally {
      setConsentLoading(false);
    }
  };

  const handleFormSubmit = (data: ProfileFormData): void => {
    const emailChanged = data.email !== currentEmail;

    if (emailChanged) {
      // Store form data and show confirmation dialog
      setPendingFormData(data);
      setIsEmailConfirmOpen(true);
    } else {
      // Process the form directly if email hasn't changed
      processFormSubmission(data);
    }
  };

  const processFormSubmission = async (data: ProfileFormData): Promise<void> => {
    try {
      setSaveChanges(true);
      const userId = await getUserIdFromToken();
      await updateUser(userId, data);

      // Check if email was changed
      const emailChanged = data.email !== currentEmail;

      toast.success(t('personal_profile.changes.success'));
      if (emailChanged) {
        // Show a message about logout
        toast.info(t('personal_profile.contact.logout_warning'));

        // Add a slight delay to show the message before logout
        setTimeout(() => {
          logout(); // Call the logout function
        }, 2000);
      }

      setLoading(false);
    } catch (err) {
      setError(t('personal_profile.changes.failed'));
      setLoading(false);
    } finally {
      setSaveChanges(false);
      setPendingFormData(null);
    }
  };

  const handleConfirmEmailChange = () => {
    if (pendingFormData) {
      processFormSubmission(pendingFormData);
    }
    setIsEmailConfirmOpen(false);
  };

  const handleCancelEmailChange = () => {
    setIsEmailConfirmOpen(false);
    setPendingFormData(null);
    // Optionally reset the email field back to current email
    methods.setValue('email', currentEmail);
  };

  const handleChangePassword = async (data: PasswordFormData): Promise<void> => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success(t('personal_profile.security.success'));
      passwordMethods.reset();
    } catch (err) {
      toast.error(t('personal_profile.security.failed'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh] mx-auto my-auto">
        <div className="flex flex-col items-center max-w-[300px] w-full rounded-lg p-8">
          <Loader2 className="flex mt-2 items-center animate-spin text-muted-foreground" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {t('personal_profile.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('personal_profile.description')}</p>
          </div>
        </div>
      </div>

      {/* Two-column responsive grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Profile Photo (sticky on large screens) */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-6 space-y-6">
            {/* Profile Photo Card */}
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground">
                  {t('personal_profile.photo.title')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('personal_profile.photo.description')}
                </p>
              </div>
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  {/* Large Avatar with edit overlay */}
                  <div className="relative group mb-4">
                    <Avatar className="h-32 w-32 rounded-full ring-4 ring-background shadow-xl border-2 border-border/30">
                      <AvatarImage
                        src={logo || undefined}
                        alt={user?.fullName}
                        className="object-cover"
                        loading="eager"
                      />
                      <AvatarFallback className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-4xl font-semibold">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    {/* Edit overlay */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={cn(
                        'absolute inset-0 rounded-full bg-black/60 flex items-center justify-center',
                        'opacity-0 group-hover:opacity-100 transition-all duration-200',
                        'cursor-pointer backdrop-blur-sm'
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      ) : (
                        <Camera className="h-8 w-8 text-white" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      {methods.watch('fullName') || user?.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {methods.watch('designation') || t('personal_profile.photo.no_designation')}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {logo ? t('personal_profile.photo.change') : t('personal_profile.photo.upload')}
                    </Button>
                    {logo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={deleting}
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {t('personal_profile.photo.remove')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Card - moved to left column */}
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
                  <Shield className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {t('personal_profile.security.title')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t('personal_profile.security.description')}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t('personal_profile.security.password')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('personal_profile.security.password_desc')}
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Lock className="h-4 w-4" />
                        {t('personal_profile.security.change')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">
                          {t('personal_profile.security.dialog_title')}
                        </DialogTitle>
                        <DialogDescription>
                          {t('personal_profile.security.dialog_desc')}
                        </DialogDescription>
                      </DialogHeader>
                      <Separator className="my-2" />
                      <Form
                        methods={passwordMethods}
                        onSubmit={passwordMethods.handleSubmit(handleChangePassword)}
                      >
                        <div className="space-y-4">
                          <PasswordField
                            control={passwordMethods.control}
                            name="currentPassword"
                            label={t('personal_profile.security.current_label')}
                            placeholder={t('personal_profile.security.current_placeholder')}
                            required
                          />
                          <div>
                            <PasswordField
                              control={passwordMethods.control}
                              name="newPassword"
                              label={t('personal_profile.security.new_label')}
                              placeholder={t('personal_profile.security.new_placeholder')}
                              required
                              helperText={t('personal_profile.security.requirement_help')}
                            />
                          </div>
                          <PasswordField
                            control={passwordMethods.control}
                            name="repeatNewPassword"
                            label={t('personal_profile.security.confirm_label')}
                            placeholder={t('personal_profile.security.confirm_placeholder')}
                            required
                          />
                        </div>
                        <DialogFooter className="mt-6">
                          <Button
                            variant="outline"
                            type="button"
                            size="sm"
                            onClick={() => passwordMethods.reset()}
                            asChild
                          >
                            <DialogClose>{t('personal_profile.changes.discard')}</DialogClose>
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={
                              !passwordMethods.formState.isValid ||
                              passwordMethods.formState.isSubmitting
                            }
                          >
                            <LoadingState
                              loading={passwordMethods.formState.isSubmitting}
                              className="w-full h-full text-center"
                            >
                              {t('personal_profile.security.update_button')}
                            </LoadingState>
                          </Button>
                        </DialogFooter>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Form Fields */}
        <div className="lg:col-span-8 space-y-6">
          {/* Personal Information Card */}
          <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                <User className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t('personal_profile.info.title')}
                </h2>
                <p className="text-xs text-muted-foreground">{t('personal_profile.info.description')}</p>
              </div>
            </div>
            <div className="p-6">
              <Form
                methods={methods}
                onSubmit={handleSubmit(handleFormSubmit)}
                {...({ noValidate: true } as any)}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <InputField
                      control={control}
                      name="fullName"
                      label={t('personal_profile.info.full_name')}
                      placeholder={t('personal_profile.info.full_name_placeholder')}
                      required
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <InputField
                      control={control}
                      name="designation"
                      label={t('personal_profile.info.designation')}
                      placeholder={t('personal_profile.info.designation_placeholder')}
                    />
                  </div>
                </div>
              </Form>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                <Mail className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t('personal_profile.contact.title')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t('personal_profile.contact.description')}
                </p>
              </div>
            </div>
            <div className="p-6">
              <Form
                methods={methods}
                onSubmit={handleSubmit(handleFormSubmit)}
                {...({ noValidate: true } as any)}
              >
                <div className="space-y-4">
                  <InputField
                    control={control}
                    name="email"
                    label={t('personal_profile.contact.email')}
                    type="email"
                    placeholder={t('personal_profile.contact.email_placeholder')}
                    required
                    autoComplete="email"
                  />
                  {watchEmail !== currentEmail && (
                    <Alert
                      variant="destructive"
                      className="py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800"
                    >
                      <AlertTitle className="flex items-center gap-2 text-sm font-medium">
                        <TriangleAlertIcon className="h-4 w-4" />
                        {t('personal_profile.contact.logout_warning')}
                      </AlertTitle>
                    </Alert>
                  )}
                </div>
              </Form>
            </div>
          </div>

          {/* Save Changes Bar */}
          {isDirty && (
            <div className="sticky bottom-6 z-10">
              <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{t('personal_profile.changes.unsaved')}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => reset()}
                      disabled={saveChanges}
                    >
                      {t('personal_profile.changes.discard')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit(handleFormSubmit)}
                      disabled={!isValid || saveChanges}
                      className="min-w-[120px]"
                    >
                      <LoadingState loading={saveChanges} className="w-full h-full text-center">
                        {t('personal_profile.changes.save')}
                      </LoadingState>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Cropper Dialog */}
      <ImageCropperDialog
        open={isCropDialogOpen}
        onClose={() => {
          setIsCropDialogOpen(false);
          setCropImageSrc(null);
        }}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        cropShape="round"
        title={t('personal_profile.crop.title')}
        description={t('personal_profile.crop.description')}
      />

      {/* Email Change Confirmation Dialog */}
      <AlertDialog open={isEmailConfirmOpen} onOpenChange={handleCancelEmailChange}>
        <AlertDialogContent>
          <AlertDialogDescription>
            <div className="px-2 pb-2 pt-1">
              <div className="mb-3">
                <Alert className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800 px-3 text-sm font-medium rounded-lg py-4 mb-3">
                  <AlertTitle className="flex items-center gap-2">
                    <TriangleAlertIcon className="h-5 w-5" />
                    {t('personal_profile.contact.logout_warning')}
                  </AlertTitle>
                </Alert>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {t('personal_profile.email_confirm.change_from')}
              </div>
              <div className="rounded-lg bg-muted/50 px-4 py-3 mb-3 font-mono text-sm border border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">-</span>
                  <span>{currentEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+</span>
                  <span>{watchEmail}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {t('personal_profile.email_confirm.relogin_info')}
              </div>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <div className="flex justify-end gap-2 px-2 pb-2">
              <Button variant="outline" onClick={handleCancelEmailChange}>
                {t('personal_profile.changes.discard')}
              </Button>
              <Button onClick={handleConfirmEmailChange}>
                {t('personal_profile.email_confirm.confirm_button')}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
