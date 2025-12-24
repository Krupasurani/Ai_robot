import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Laptop,
  Loader2,
  Trash2,
  Shield,
  Clock,
  MapPin,
  Fingerprint,
  CheckCircle2,
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogClose,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';

import { useTranslate } from 'src/locales';

import {
  deleteSession,
  getUserSessions,
  type UserSession,
  type SessionsResponse,
  deleteAllOtherSessions,
} from 'src/auth/context/jwt/action';

export function SessionManager() {
  const { t } = useTranslate('navbar');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: SessionsResponse = await getUserSessions();
      setSessions(response.sessions);
    } catch (err) {
      setError(t('pages.sessionManagement.errorFetch', 'Failed to load sessions'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      await fetchSessions();
    } catch (err) {
      setError(t('pages.sessionManagement.errorDelete', 'Failed to delete session'));
      console.error(err);
    } finally {
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleDeleteAllOtherSessions = async () => {
    try {
      await deleteAllOtherSessions();
      await fetchSessions();
    } catch (err) {
      setError(t('pages.sessionManagement.errorDeleteAll', 'Failed to delete sessions'));
      console.error(err);
    } finally {
      setDeleteAllConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const selectedSession = sessions.find((session) => session.sessionId === sessionToDelete);
  const otherSessionsCount = sessions.filter((s) => !s.isCurrentSession).length;

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {t('pages.sessionManagement.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('pages.sessionManagement.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Card */}
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
            <Globe className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('pages.sessionManagement.activeSessionsTitle')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('pages.sessionManagement.activeSessionsDescription')}
            </p>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <span className="text-xl font-bold text-primary">{sessions.length}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {sessions.length === 1
                    ? t('pages.sessionManagement.activeSession', '1 active session')
                    : t('pages.sessionManagement.activeSessions', {
                        count: sessions.length,
                        defaultValue: `${sessions.length} active sessions`,
                      })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {otherSessionsCount > 0
                    ? t(otherSessionsCount > 1 ? 'pages.sessionManagement.onOtherDevices' : 'pages.sessionManagement.onOtherDevice', {
                        count: otherSessionsCount,
                      })
                    : t('pages.sessionManagement.allOnThisDevice')}
                </p>
              </div>
            </div>
            {sessions.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteAllConfirmOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('pages.sessionManagement.signOutOthers')}
              </Button>
            )}
          </div>
        </div>
      </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t('pages.sessionManagement.errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sessions List */}
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
              <p className="text-sm font-medium text-foreground">
                {t('pages.sessionManagement.emptyTitle')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('pages.sessionManagement.emptyDescription')}
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <article
                key={session.sessionId}
                className={cn(
                  'rounded-xl border bg-card shadow-sm overflow-hidden transition-all duration-200',
                  session.isCurrentSession
                    ? 'border-primary/30 ring-1 ring-primary/20'
                    : 'border-border/50 hover:border-border'
                )}
              >
                {/* Session Header */}
                <div
                  className={cn(
                    'px-5 py-4 border-b',
                    session.isCurrentSession
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/20 border-border/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-lg',
                          session.isCurrentSession
                            ? 'bg-primary/10'
                            : 'bg-muted'
                        )}
                      >
                        <Laptop
                          className={cn(
                            'h-5 w-5',
                            session.isCurrentSession
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {session.deviceName || t('pages.sessionManagement.unknownDevice')}
                          </p>
                          {session.isCurrentSession && (
                            <Badge
                              variant="default"
                              className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-2 py-0.5"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('pages.sessionManagement.currentSession')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            IP: {session.ipAddress}
                          </p>
                        </div>
                      </div>
                    </div>
                    {!session.isCurrentSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setSessionToDelete(session.sessionId);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('pages.sessionManagement.signOut')}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Session Details */}
                <div className="px-5 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                        <Fingerprint className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                          {t('pages.sessionManagement.sessionIdLabel')}
                        </p>
                        <p className="font-mono text-xs text-foreground truncate mt-0.5">
                          {session.sessionId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                        <Laptop className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                          {t('pages.sessionManagement.deviceIdLabel')}
                        </p>
                        <p className="font-mono text-xs text-foreground truncate mt-0.5">
                          {session.deviceId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                          {t('pages.sessionManagement.firstSeenLabel')}
                        </p>
                        <p className="text-xs text-foreground mt-0.5">
                          {format(new Date(session.createdAt), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                        <Clock className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                          {t('pages.sessionManagement.lastActiveLabel')}
                        </p>
                        <p className="text-xs text-foreground mt-0.5">
                          {format(new Date(session.lastActiveAt), 'PPp')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {/* Delete Single Session Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSessionToDelete(null);
          }
          setDeleteConfirmOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pages.sessionManagement.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('pages.sessionManagement.confirmDescription', {
                deviceName:
                  selectedSession?.deviceName || t('pages.sessionManagement.unknownDevice'),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('pages.sessionManagement.confirmCancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (sessionToDelete) {
                  handleDeleteSession(sessionToDelete);
                }
              }}
            >
              {t('pages.sessionManagement.confirmSignOut')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Sessions Dialog */}
      <Dialog open={deleteAllConfirmOpen} onOpenChange={(open) => setDeleteAllConfirmOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pages.sessionManagement.signOutOthersConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('pages.sessionManagement.signOutOthersConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('pages.sessionManagement.confirmCancel')}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteAllOtherSessions}>
              {t('pages.sessionManagement.signOutOthers')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
