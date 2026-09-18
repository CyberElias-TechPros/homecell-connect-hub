/**
 * Adapter between the API wire format and the view models the UI consumes.
 *
 * The screens were built against richer view models than the API currently
 * returns, so translation lives here in one place. Only adapters that are
 * actually in use are kept — unused ones would silently drift out of date.
 */

import type { Member } from '../types';

export interface ApiMember {
  id: string;
  name: string;
  preferredName?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  dateOfBirth?: string | null;
  role: string;
  status: string;
  memberStatus: string;
  membershipType?: string | null;
  isFirstTimer: boolean;
  avatarUrl?: string | null;
  occupation?: string | null;
  city?: string | null;
  country?: string | null;
  skills?: string[];
  homecellId?: string | null;
  joinedDate?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
}

export function toUiMember(m: ApiMember, homecellName = ''): Member {
  return {
    id: m.id,
    fullName: m.name,
    phone: m.phone ?? '',
    gender: m.gender === 'female' ? 'female' : 'male',
    // Marital status is not collected by the API yet. Defaulting here keeps
    // the existing screens working without inventing data the leader cannot
    // see or correct — see the note in docs/STATUS.md.
    maritalStatus: 'single',
    birthday: m.dateOfBirth ?? '',
    serviceUnit: m.homecellId ?? '',
    serviceUnitName: homecellName,
    membershipType: toMembershipType(m.memberStatus, m.isFirstTimer),
    tag: ageTag(m.dateOfBirth),
    email: m.email ?? undefined,
    address: m.city ?? undefined,
    joinedAt: m.joinedDate ?? m.createdAt,
    isActive: m.status === 'active',
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    createdBy: '',
  };
}

function toMembershipType(memberStatus: string, isFirstTimer: boolean): Member['membershipType'] {
  if (isFirstTimer || memberStatus === 'first_timer') return 'first_timer';
  if (memberStatus === 'visitor') return 'visitor';
  if (memberStatus === 'inactive' || memberStatus === 'archived' || memberStatus === 'transferred') {
    return 'inactive';
  }
  return 'regular';
}

/** UI tag derives from age; the API stores a date of birth. */
export function ageTag(dateOfBirth?: string | null): Member['tag'] {
  if (!dateOfBirth) return 'adult';
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 'adult';
  const ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return ageYears < 18 ? 'child' : 'adult';
}

/** Map the UI membership vocabulary onto the API's member_status values. */
export function toApiMemberStatus(type: Member['membershipType']): string {
  switch (type) {
    case 'first_timer':
      return 'first_timer';
    case 'visitor':
      return 'visitor';
    case 'inactive':
      return 'inactive';
    default:
      return 'member';
  }
}
