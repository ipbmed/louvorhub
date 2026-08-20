import type { DbOrganization } from '@/lib/dbTypes';
import type { Church } from '@/types';

export function dbOrgToChurch(org: DbOrganization): Church {
  return {
    id: org.id,
    name: org.name,
    city: org.city || '',
    address: org.address ?? undefined,
    leader: org.leader ?? undefined,
    phone: org.phone ?? undefined,
    color: org.color ?? undefined,
    slug: org.slug,
    sigla: org.sigla,
    inviteCode: org.invite_code,
    isGlobal: org.is_global,
    createdAt: org.created_at || new Date().toISOString(),
  };
}

export function slugifyOrgName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'igreja';
}
