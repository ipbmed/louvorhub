import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import type { DbMembership, DbOrganization, MemberRole } from '@/lib/dbTypes';

const ACTIVE_ORG_KEY = 'louvorhub_active_org_id';

export function useOrg() {
  const { memberships, user, ready } = useAuth();
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_ORG_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!memberships.length) return;
    const stillValid = memberships.some((m) => m.org_id === activeOrgId);
    if (!activeOrgId || !stillValid) {
      const next = memberships[0].org_id;
      setActiveOrgIdState(next);
      try {
        localStorage.setItem(ACTIVE_ORG_KEY, next);
      } catch {
        /* ignore */
      }
    }
  }, [memberships, activeOrgId]);

  const setActiveOrgId = useCallback((orgId: string) => {
    setActiveOrgIdState(orgId);
    try {
      localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    } catch {
      /* ignore */
    }
  }, []);

  const membership: DbMembership | undefined = useMemo(
    () => memberships.find((m) => m.org_id === activeOrgId),
    [memberships, activeOrgId],
  );

  const org: DbOrganization | undefined = membership?.organizations;
  const role: MemberRole | undefined = membership?.role;
  const canManage = Boolean(role && ['owner', 'admin', 'leader'].includes(role));
  const canAdmin = Boolean(role && ['owner', 'admin'].includes(role));

  return {
    ready,
    user,
    memberships,
    membership,
    org,
    orgId: org?.id ?? activeOrgId ?? undefined,
    role,
    canManage,
    canAdmin,
    activeOrgId,
    setActiveOrgId,
  };
}
