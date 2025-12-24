import * as zod from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useCallback } from 'react';
import { User, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LoadingState from '@/components/ui/loader';
import axios from 'src/utils/axios';
import { updateUser, getUserIdFromToken } from 'src/sections/accountdetails/utils';
import { useAuthContext } from 'src/auth/hooks';
import { STORAGE_KEY, STORAGE_KEY_REFRESH } from 'src/auth/context/jwt/constant';

// Schema for validation
const ProfileSchema = zod.object({
  fullName: zod.string().min(1, { message: 'Full Name is required' }),
});

interface FullNameDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function FullNameDialog({ open, onClose, onSuccess, onError }: FullNameDialogProps) {
  const { user } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState<boolean>(false);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(5);

  // Form setup
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      fullName: '',
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user?.fullName) {
      reset({ fullName: user.fullName });
    }
  }, [user, reset]);

  // Disable the beforeunload warning when submitting the form
  useEffect(() => {
    // Function to remove any existing beforeunload handlers
    const removeBeforeUnloadWarning = () => {
      window.onbeforeunload = null;
    };

    // If submitting, remove the warning
    if (isSubmitting) {
      removeBeforeUnloadWarning();
    }

    return () => {
      // Cleanup
      if (isSubmitting) {
        removeBeforeUnloadWarning();
      }
    };
  }, [isSubmitting]);

  // Function to refresh the token and reload the page
  const refreshAndReload = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);

      if (!refreshToken) {
        // If no refresh token, show error and don't proceed
        toast.error('Session information missing. Please log in again.');
        return;
      }

      // Get a new access token using the refresh token
      const response = await axios.post(
        `/api/v1/userAccount/refresh/token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        }
      );

      // Update the access token in localStorage
      if (response.data && response.data.accessToken) {
        localStorage.setItem(STORAGE_KEY, response.data.accessToken);
        // Keep the same refresh token

        // Update axios default headers
        axios.defaults.headers.common.Authorization = `Bearer ${response.data.accessToken}`;

        // Instead of reloading, just close the dialog and optionally trigger a user context refresh
        if (onSuccess) {
          onSuccess('Full name updated successfully!');
        }
        if (onClose) {
          onClose();
        }
        // window.location.reload(); // Removed to prevent reload loop
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Failed to refresh your session. Please log in again.');
    }
  }, [onSuccess, onClose]);

  // Countdown effect for refresh message
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (showRefreshMessage && refreshCountdown > 0) {
      timer = setTimeout(() => {
        setRefreshCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showRefreshMessage && refreshCountdown === 0) {
      // When countdown reaches 0, refresh the access token and reload
      refreshAndReload();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showRefreshMessage, refreshCountdown, refreshAndReload]);

  // Handle form submission
  const onSubmitFullName = async (data: { fullName: string }) => {
    try {
      setIsSubmitting(true);

      // Remove beforeunload event handler immediately
      window.onbeforeunload = null;

      // Try to get userId from auth context first, fallback to token
      const userId = user?.id || user?._id || (await getUserIdFromToken());

      if (!userId) {
        throw new Error('Unable to determine user ID. Please try logging in again.');
      }

      const userData = {
        fullName: data.fullName.trim(),
        email: user?.email || '', // Include email from auth context
      };

      console.log('Updating user:', { userId, userData });

      // Update user with both fullName and email
      await updateUser(userId, userData);

      // Notify success
      if (onSuccess) {
        onSuccess('Your full name has been updated successfully!');
      }

      // Close dialog
      onClose();

      // Show the refresh message with countdown
      setShowRefreshMessage(true);
    } catch (error: any) {
      console.error('Error updating full name:', error);

      // If user not found (404), close the dialog and continue - user may not be synced yet
      if (error?.message?.includes('not found') || error?.statusCode === 404) {
        console.warn('User not found in database, skipping full name update');
        if (onSuccess) {
          onSuccess('Profile setup skipped - please contact support if issues persist.');
        }
        onClose();
        return;
      }

      if (onError) {
        onError(error?.message || 'Failed to update your full name. Please try again.');
      }
      // Reset submitting state if there's an error
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="max-w-md rounded-sm"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <form onSubmit={handleSubmit(onSubmitFullName)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Complete Your Profile
              </DialogTitle>
              <DialogDescription className="mt-2">
                Please enter your full name to continue using the application.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <InputField
                control={control}
                name="fullName"
                label="Full Name"
                placeholder="Enter your full name"
                required
                IconComponent={User}
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm">
                <LoadingState loading={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </LoadingState>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Session refresh message dialog */}
      <Dialog open={showRefreshMessage} onOpenChange={() => {}}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-6 w-6 text-primary" />
              Profile Updated Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Alert>
              <AlertDescription>Your profile has been updated successfully!</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              To see your changes, your session needs to be refreshed. The page will automatically
              refresh in <strong>{refreshCountdown}</strong> seconds.
            </p>
            <div className="rounded-sm bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> You will remain logged in. The application will simply
                refresh to update your profile information.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                // Skip countdown and proceed immediately
                setRefreshCountdown(0);
              }}
              className="rounded-sm"
            >
              Refresh Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
