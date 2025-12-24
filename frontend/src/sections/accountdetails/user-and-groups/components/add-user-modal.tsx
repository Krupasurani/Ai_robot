import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Mail, UserPlus, X, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useTranslate } from 'src/locales';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import { updateInvitesCount } from '../../../../store/userAndGroupsSlice';
import { inviteUsers } from '../../utils';
import type { AddUserModalProps } from '../../types/group-details';

export function AddUserModal({
  open,
  onClose,
  groups,
  onUsersAdded,
  freeSeats,
}: AddUserModalProps) {
  const { t } = useTranslate('settings');
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedGroups, setSelectedGroups] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dispatch = useDispatch();
  const noSeatsAvailable = freeSeats != null && freeSeats <= 0;

  // Convert groups to Option format
  const groupOptions: Option[] = groups.map((group) => ({
    value: group._id,
    label: group.name,
  }));

  // Function to validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter((email) => email !== emailToRemove));
  };

  const handleAddEmail = (): void => {
    if (inputValue.trim() === '') return;

    setError('');
    const emailToAdd = inputValue.trim();

    if (validateEmail(emailToAdd)) {
      if (!emails.includes(emailToAdd)) {
        setEmails([...emails, emailToAdd]);
        setInputValue('');
      } else {
        setError(t('users_groups.add_user.email_already_added'));
        setTimeout(() => setError(''), 3000);
      }
    } else {
      setError(t('users_groups.add_user.valid_email_error'));
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleAddUsers = async (): Promise<void> => {
    try {
      if (noSeatsAvailable) {
        setError(t('users_groups.add_user.no_free_licenses'));
        setTimeout(() => setError(''), 3000);
        return;
      }
      if (emails.length === 0) {
        setError(t('users_groups.add_user.add_at_least_one_email'));
        setTimeout(() => setError(''), 3000);
        return;
      }
      setIsLoading(true);

      const groupIds = selectedGroups.map((option) => option.value);
      await inviteUsers({ emails, groupIds });

      dispatch(updateInvitesCount(emails.length));
      toast.success(
        t(emails.length > 1 ? 'users_groups.add_user.invites_sent_plural' : 'users_groups.add_user.invites_sent', {
          count: emails.length,
        })
      );

      setEmails([]);
      setSelectedGroups([]);
      onUsersAdded();
      onClose();
    } catch (err: any) {
      let errorMessage = t('users_groups.add_user.failed_send_invites');
      if (err.errorMessage) {
        errorMessage = err.errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmails([]);
    setInputValue('');
    setError('');
    setSelectedGroups([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            {t('users_groups.add_user.invite_team')}
          </DialogTitle>
          <DialogDescription>
            {t('users_groups.add_user.invite_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {noSeatsAvailable && (
            <Alert className="border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                {t('users_groups.add_user.no_licenses_warning')}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>{t('users_groups.add_user.email_addresses')}</Label>
            <div
              className={cn(
                'min-h-[100px] rounded-lg border bg-muted/30 p-3 transition-colors',
                error ? 'border-destructive' : 'border-border focus-within:border-primary'
              )}
            >
              {/* Email Badges */}
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {emails.map((email, index) => (
                    <Badge key={index} variant="secondary" className="h-7 pl-2.5 pr-1.5 gap-1.5">
                      {email}
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="hover:bg-muted rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={emails.length === 0 ? t('users_groups.add_user.email_placeholder') : t('users_groups.add_user.add_another_email')}
                  className="border-0 bg-transparent p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddEmail}
                  disabled={!inputValue.trim()}
                  className="h-7 px-2.5"
                >
                  {t('users_groups.add_user.add')}
                </Button>
              </div>
            </div>

            {/* Email count and error */}
            <div className="flex items-center justify-between">
              {emails.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t(emails.length !== 1 ? 'users_groups.add_user.emails_added_plural' : 'users_groups.add_user.emails_added', {
                    count: emails.length,
                  })}
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('users_groups.add_user.add_to_groups')}</Label>
            <MultipleSelector
              value={selectedGroups}
              onChange={(options) => setSelectedGroups(options)}
              options={groupOptions}
              placeholder={t('users_groups.add_user.select_groups')}
              hidePlaceholderWhenSelected
              className="bg-muted/30"
            />
            <p className="text-xs text-muted-foreground">
              {t('users_groups.add_user.permissions_inherit_info')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {t('users_groups.add_user.cancel')}
          </Button>
          <Button
            onClick={handleAddUsers}
            disabled={emails.length === 0 || isLoading || noSeatsAvailable}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('users_groups.add_user.sending')}
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {t(emails.length > 1 ? 'users_groups.add_user.send_invites' : 'users_groups.add_user.send_invite')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
