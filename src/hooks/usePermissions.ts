import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { listMyGrants } from '@/services/grants';
import type { ResourceGrant } from '@/types';

export function usePermissions() {
  const { user, profile, ready } = useAuth();
  const [grants, setGrants] = useState<ResourceGrant[]>([]);
  const [grantsReady, setGrantsReady] = useState(false);

  const refreshGrants = useCallback(async () => {
    if (!user) {
      setGrants([]);
      setGrantsReady(true);
      return;
    }
    try {
      const list = await listMyGrants();
      setGrants(list);
    } catch {
      setGrants([]);
    } finally {
      setGrantsReady(true);
    }
  }, [user]);

  useEffect(() => {
    setGrantsReady(false);
    void refreshGrants();
  }, [refreshGrants, profile?.is_admin, profile?.updated_at]);

  const isAdmin = Boolean(profile?.is_admin);

  const canEditChurch = useCallback(
    (orgId?: string | null) => {
      if (isAdmin) return true;
      if (!orgId) return false;
      return grants.some((g) => g.role === 'church_editor' && g.orgId === orgId);
    },
    [grants, isAdmin],
  );

  const canEditGroup = useCallback(
    (groupId?: string | null, orgId?: string | null) => {
      if (isAdmin) return true;
      if (orgId && canEditChurch(orgId)) return true;
      if (!groupId) return false;
      return grants.some((g) => g.role === 'group_editor' && g.groupId === groupId);
    },
    [grants, isAdmin, canEditChurch],
  );

  const canManageLiturgies = useCallback(
    (orgId?: string | null) => {
      if (isAdmin) return true;
      if (!orgId) return false;
      return grants.some((g) => g.role === 'liturgo' && g.orgId === orgId);
    },
    [grants, isAdmin],
  );

  const churchEditorOrgIds = useMemo(
    () =>
      isAdmin
        ? null
        : grants.filter((g) => g.role === 'church_editor' && g.orgId).map((g) => g.orgId!),
    [grants, isAdmin],
  );

  const groupEditorGroupIds = useMemo(
    () =>
      isAdmin
        ? null
        : grants.filter((g) => g.role === 'group_editor' && g.groupId).map((g) => g.groupId!),
    [grants, isAdmin],
  );

  const liturgoOrgIds = useMemo(
    () =>
      isAdmin
        ? null
        : grants.filter((g) => g.role === 'liturgo' && g.orgId).map((g) => g.orgId!),
    [grants, isAdmin],
  );

  const canManageChurches = isAdmin || (churchEditorOrgIds?.length ?? 0) > 0 || (groupEditorGroupIds?.length ?? 0) > 0;
  const canAccessLiturgies = isAdmin || (liturgoOrgIds?.length ?? 0) > 0;
  const canAccessAdminPanel = isAdmin;
  const canManageUsers = isAdmin;
  const canManageSongs = isAdmin;
  const canManageSchedules = isAdmin;
  /** Calendário de eventos (equipe e/ou liturgia) */
  const canAccessEvents = canManageSchedules || canAccessLiturgies;
  /** Any elevated capability (nav beyond public/profile) */
  const canManage =
    isAdmin || canManageChurches || canAccessLiturgies || canManageSchedules;

  return {
    ready: ready && grantsReady,
    grants,
    refreshGrants,
    isAdmin,
    canEditChurch,
    canEditGroup,
    canManageLiturgies,
    churchEditorOrgIds,
    groupEditorGroupIds,
    liturgoOrgIds,
    canManageChurches,
    canAccessLiturgies,
    canAccessAdminPanel,
    canManageUsers,
    canManageSongs,
    canManageSchedules,
    canAccessEvents,
    canManage,
  };
}
