'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User as UserIcon, Mail, Shield, Building2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

interface UserProfileProps {
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ className }) => {
  const { data: session } = useSession();
  const { user } = useAuthContext();

  if (!user && !session?.user) {
    return null;
  }

  const currentUser = user || session?.user;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'MANAGER':
        return 'default';
      case 'STAFF':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatRoleName = (role: string) => {
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          User Profile
        </CardTitle>
        <CardDescription>
          Your account information and details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold">{currentUser?.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getRoleBadgeVariant(currentUser?.role || '')}>
                {formatRoleName(currentUser?.role || '')}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Role</p>
              <p className="text-sm text-muted-foreground">{formatRoleName(currentUser?.role || '')}</p>
            </div>
          </div>

          {currentUser?.branch && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Branch</p>
                <p className="text-sm text-muted-foreground">{currentUser.branch.name}</p>
              </div>
            </div>
          )}

          {currentUser?.id && (
            <div className="flex items-center gap-3">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-muted-foreground font-mono text-xs">{currentUser.id}</p>
              </div>
            </div>
          )}
        </div>

        {currentUser?.branchId && !currentUser?.branch && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Branch assignment: {currentUser.branchId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};