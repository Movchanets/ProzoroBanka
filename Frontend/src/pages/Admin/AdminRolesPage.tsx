import { useAdminRoles } from '@/hooks/queries/useAdminQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminRolesPage() {
  const { data: roles, isLoading } = useAdminRoles();

  return (
    <div className="space-y-6" data-testid="admin-roles-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Системні ролі</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Огляд ролей та permission-claim, які доступні в системі.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ролі доступу</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Назва ролі</TableHead>
                <TableHead>Опис</TableHead>
                <TableHead>Дозволи</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Завантаження...
                  </TableCell>
                </TableRow>
              ) : !roles?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Немає ролей
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.name} data-testid={`admin-roles-row-${role.name.toLowerCase()}`}>
                    <TableCell className="font-semibold">{role.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{role.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5" data-testid={`admin-roles-permissions-${role.name.toLowerCase()}`}>
                        {role.permissions.length === 0 ? (
                          <Badge variant="secondary">Без дозволів</Badge>
                        ) : (
                          role.permissions.map((permission) => (
                            <Badge key={permission} variant="outline" className="font-mono text-[11px]">
                              {permission}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
