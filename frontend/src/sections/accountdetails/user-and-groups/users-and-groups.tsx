import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Settings, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useTranslate } from 'src/locales';

import Users from './users';
import Groups from './groups';
import Invites from './invites';
import { allGroups, getAllUsersWithGroups } from '../utils';
import { setCounts, setLoading } from '../../../store/userAndGroupsSlice';

import type { CountsState } from '../../../store/userAndGroupsSlice';
import type { GroupUser, AppUserGroup } from '../types/group-details';

interface RootState {
  counts: CountsState;
}

export default function UsersAndGroups() {
  const { t } = useTranslate('settings');
  const navigate = useNavigate();
  const location = useLocation();
  const [tabValue, setTabValue] = useState<string>('users');

  const dispatch = useDispatch();
  const [freeSeats, setFreeSeats] = useState<number | null>(null);
  const loading = useSelector((state: RootState) => state.counts.loading);
  const userCount = useSelector((state: RootState) => state.counts.usersCount);
  const groupCount = useSelector((state: RootState) => state.counts.groupsCount);
  const invitesCount = useSelector((state: RootState) => state.counts.invitesCount);

  useEffect(() => {
    const fetchCounts = async (): Promise<void> => {
      dispatch(setLoading(true));
      try {
        const response: GroupUser[] = await getAllUsersWithGroups();
        const groups: AppUserGroup[] = await allGroups();
        const loggedInUsers = response.filter((user) => user.hasLoggedIn === true);
        const pendingUsers = response.filter((user) => user.hasLoggedIn === false);
        dispatch(
          setCounts({
            usersCount: loggedInUsers.length,
            groupsCount: groups.length,
            invitesCount: pendingUsers.length,
          })
        );
      } catch (error) {
        console.error('Error fetching counts:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchCounts();
  }, [dispatch]);

  useEffect(() => {
    if (location.pathname.includes('users')) {
      setTabValue('users');
    } else if (location.pathname.includes('groups')) {
      setTabValue('groups');
    } else if (location.pathname.includes('invites')) {
      setTabValue('invites');
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setTabValue(value);
    if (value === 'users') {
      navigate('/account/company-settings/users');
    } else if (value === 'groups') {
      navigate('/account/company-settings/groups');
    } else if (value === 'invites') {
      navigate('/account/company-settings/invites');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-3">{t('users_groups.loading')}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Header - Thero Style */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t('users_groups.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('users_groups.description')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* License Badge */}
            {freeSeats !== null && (
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
                  freeSeats === 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {freeSeats === 0 && <AlertCircle className="h-4 w-4" />}
                <span>
                  {freeSeats === 0
                    ? t('users_groups.no_licenses')
                    : t('users_groups.licenses_available', { count: freeSeats })}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/account/company-settings/settings/license')}
              className="h-9"
            >
              <Settings className="mr-2 h-4 w-4" />
              {t('users_groups.manage_settings')}
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Thero Style */}
      <div className="px-6 border-b border-border">
        <Tabs value={tabValue} onValueChange={handleTabChange}>
          <TabsList className="h-auto bg-transparent p-0 gap-0">
            <TabsTrigger
              value="users"
              className={cn(
                'relative h-10 px-4 rounded-none bg-transparent',
                'text-sm font-medium text-muted-foreground',
                'hover:text-foreground transition-colors',
                'data-[state=active]:text-foreground data-[state=active]:shadow-none',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
                'after:bg-transparent data-[state=active]:after:bg-primary'
              )}
            >
              {t('users_groups.users')}
              {userCount > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">({userCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className={cn(
                'relative h-10 px-4 rounded-none bg-transparent',
                'text-sm font-medium text-muted-foreground',
                'hover:text-foreground transition-colors',
                'data-[state=active]:text-foreground data-[state=active]:shadow-none',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
                'after:bg-transparent data-[state=active]:after:bg-primary'
              )}
            >
              {t('users_groups.groups')}
              {groupCount > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">({groupCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="invites"
              className={cn(
                'relative h-10 px-4 rounded-none bg-transparent',
                'text-sm font-medium text-muted-foreground',
                'hover:text-foreground transition-colors',
                'data-[state=active]:text-foreground data-[state=active]:shadow-none',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
                'after:bg-transparent data-[state=active]:after:bg-primary'
              )}
            >
              {t('users_groups.pending_invites')}
              {invitesCount > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">({invitesCount})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        <Tabs value={tabValue} onValueChange={handleTabChange}>
          <TabsContent value="users" className="mt-0 focus-visible:outline-none">
            <Users freeSeats={freeSeats} />
          </TabsContent>
          <TabsContent value="groups" className="mt-0 focus-visible:outline-none">
            <Groups />
          </TabsContent>
          <TabsContent value="invites" className="mt-0 focus-visible:outline-none">
            <Invites freeSeats={freeSeats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
