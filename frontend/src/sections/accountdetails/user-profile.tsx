import { z as zod } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { useAdmin } from 'src/context/AdminContext';
import { Form } from 'src/components/hook-form';
import { InputField } from '@/components/ui/input-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { updateUser, getUserById, deleteUserLogo, uploadUserLogo, changePassword } from './utils';

const ProfileSchema = zod.object({
  fullName: zod.string().min(1, { message: 'Full Name is required' }),
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
  email: zod.string().email({ message: 'Invalid email' }).min(1, { message: 'Email is required' }),
  designation: zod.string().optional(),
});

const PasswordSchema = zod
  .object({
    currentPassword: zod.string().min(1, { message: 'Current password is required' }),
    newPassword: zod
      .string()
      .min(10, { message: 'Password must be at least 10 characters long' })
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

type ProfileFormData = zod.infer<typeof ProfileSchema>;
type PasswordFormData = zod.infer<typeof PasswordSchema>;

export default function UserProfile() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [saveChanges, setSaveChanges] = useState<boolean>(false);
  const { isAdmin } = useAdmin();

  const location = useLocation();
  const pathSegments = location.pathname.split('/');
  const userId = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;

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
    control,
    formState: { isValid, isDirty },
  } = methods;

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      try {
        setLoading(true);
        if (!userId) {
          throw new Error('User ID is required');
        }

        const userData = await getUserById(userId);
        const { fullName, firstName, email, lastName, designation } = userData;

        reset({
          fullName,
          firstName,
          email,
          lastName,
          designation,
        });

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch user data');
        toast.error('Failed to fetch user data');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [reset, userId]);

  // useEffect(() => {
  //   const fetchLogo = async (): Promise<void> => {
  //     try {
  //       if (!userId) return;
  //       const logoUrl = await getUserLogo(userId);
  //       setLogo(logoUrl);
  //     } catch (err) {
  //       setError('Failed to fetch user photo');
  //       // setSnackbar({ open: true, message: err.errorMessage, severity: 'error' });
  //     }
  //   };

  //   fetchLogo();
  // }, [userId]);

  const onSubmit = async (data: ProfileFormData): Promise<void> => {
    try {
      setSaveChanges(true);
      if (!userId) throw new Error('User ID is required');

      await updateUser(userId, data);
      toast.success('User updated successfully');
    } catch (err) {
      setError('Failed to update user');
      toast.error('Failed to update user');
    } finally {
      setSaveChanges(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      setDeleting(true);
      if (!userId) throw new Error('User ID is required');

      await deleteUserLogo(userId);
      toast.success('Photo removed successfully');
      setDeleting(false);
      setLogo(null);
    } catch (err) {
      toast.error('Failed to remove photo');
      setDeleting(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!userId) throw new Error('User ID is required');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);

      await uploadUserLogo(userId, formData);
      toast.success('Photo updated successfully');
      setUploading(false);
      setLogo(URL.createObjectURL(file));
    } catch (err) {
      setError('Failed to upload photo');
      toast.error('Failed to upload photo');
      setUploading(false);
    }
  };

  const handleChangePassword = async (data: PasswordFormData): Promise<void> => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      setIsChangePasswordOpen(false);
      passwordMethods.reset();
    } catch (err) {
      toast.error('Failed to change password');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-9 h-9 animate-spin text-gray-400" />
          <span className="mt-2 text-sm text-gray-500">Loading user profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 md:py-8 px-4">
      <Card className="rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 py-2.5 px-3 md:px-4">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">User Profile</h2>
          {/* In next release */}
          {/* {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangePasswordOpen(true)}
            >
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          )} */}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Avatar Section */}
            {/* <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pt: { xs: 1, md: 2 },
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  {logo ? (
                    <Avatar
                      src={logo}
                      alt="User Photo"
                      sx={{
                        width: 140,
                        height: 140,
                        border: `3px solid ${alpha(theme.palette.background.paper, 0.9)}`,
                        boxShadow: theme.shadows[2],
                      }}
                    />
                  ) : (
                    <Avatar
                      sx={{
                        width: 140,
                        height: 140,
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        boxShadow: theme.shadows[2],
                      }}
                    >
                      <Iconify
                        icon={accountIcon}
                        width={70}
                        height={70}
                        color={alpha(theme.palette.primary.main, 0.7)}
                      />
                    </Avatar>
                  )}

                  {isAdmin && (
                    <>
                      <input
                        style={{ display: 'none' }}
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                      /> */}

            {/* Upload button positioned directly on the avatar */}
            {/* <Box
                        sx={{
                          position: 'absolute',
                          bottom: -5,
                          right: -5,
                          display: 'flex',
                          gap: 1,
                        }}
                      >
                        <Tooltip title={logo ? 'Change photo' : 'Upload photo'}>
                          <label htmlFor="file-upload">
                            <IconButton
                              component="span"
                              size="medium"
                              sx={{
                                bgcolor: theme.palette.background.paper,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                color: theme.palette.primary.main,
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                                },
                                width: 44,
                                height: 44,
                                boxShadow: theme.shadows[3],
                              }}
                            >
                              {uploading ? (
                                <CircularProgress size={24} color="inherit" />
                              ) : (
                                <Iconify icon={uploadIcon} width={22} height={22} />
                              )}
                            </IconButton>
                          </label>
                        </Tooltip>

                        {logo && (
                          <Tooltip title="Remove photo">
                            <IconButton
                              size="medium"
                              color="error"
                              onClick={handleDelete}
                              disabled={deleting}
                              sx={{
                                bgcolor: theme.palette.background.paper,
                                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.error.main, 0.04),
                                },
                                width: 44,
                                height: 44,
                                boxShadow: theme.shadows[3],
                              }}
                            >
                              {deleting ? (
                                <CircularProgress size={24} color="inherit" />
                              ) : (
                                <Iconify icon={deleteIcon} width={22} height={22} />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </>
                  )}
                </Box> */}

            {/* {!logo && isAdmin && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    align="center"
                    sx={{ mt: 1.5, maxWidth: 130, fontSize: '0.75rem' }}
                  >
                    Add a profile photo
                  </Typography>
                )}
              </Box>
            </Grid> */}

            {/* Form Section */}
            <div className="md:col-span-8">
              <Form
                methods={methods}
                onSubmit={handleSubmit(onSubmit)}
                {...({ noValidate: true } as any)}
              >
                <div className="space-y-4">
                  <InputField
                    control={control}
                    name="fullName"
                    label="Full name"
                    required
                    disabled={!isAdmin}
                  />
                  <InputField
                    control={control}
                    name="designation"
                    label="Designation"
                    placeholder="e.g. Software Engineer"
                    disabled={!isAdmin}
                  />
                  <InputField
                    control={control}
                    name="email"
                    label="Email address"
                    type="email"
                    required
                    disabled={!isAdmin}
                  />
                  <Separator className="my-4" />
                  <Button
                    type="submit"
                    disabled={!isValid || !isDirty || !isAdmin || saveChanges}
                    className="h-10 px-4 rounded-md normal-case font-medium text-sm"
                  >
                    {saveChanges ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </Card>

      {/* Password Dialog */}
      {/* In next release */}
    </div>
  );
}
