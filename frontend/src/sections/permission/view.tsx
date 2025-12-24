import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard-content';
import { PageBreadcrumbs } from 'src/components/custom/breadcrumbs';
import { RoleBasedGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

export function PermissionDeniedView() {
  const [role, setRole] = useState('admin');

  const { user } = useAuthContext();

  const handleChangeRole = useCallback((newRole: string) => {
    setRole(newRole);
  }, []);

  return (
    <DashboardContent>
      <PageBreadcrumbs
        heading="Permission"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Permission' }]}
        className="mb-6 md:mb-10"
      />

      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
          <Button
            variant={role === 'admin' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleChangeRole('admin')}
            className={cn('rounded-md', role === 'admin' && 'bg-background shadow-sm')}
            aria-label="Admin role"
          >
            Admin role
          </Button>
          <Button
            variant={role === 'user' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleChangeRole('user')}
            className={cn('rounded-md', role === 'user' && 'bg-background shadow-sm')}
            aria-label="User role"
          >
            User role
          </Button>
        </div>
      </div>

      <RoleBasedGuard hasContent currentRole={user?.role} acceptRoles={[role]} className="py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(8)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <h3 className="text-base font-semibold">Card {index + 1}</h3>
                <p className="text-sm text-muted-foreground mt-1">Proin viverra ligula</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. In enim justo,
                  rhoncus ut, imperdiet a, venenatis vitae, justo. Vestibulum fringilla pede sit
                  amet augue.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </RoleBasedGuard>
    </DashboardContent>
  );
}
