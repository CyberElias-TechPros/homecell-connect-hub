// Mock data for the Homecell Management App

export interface Member {
  id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female';
  type: 'adult' | 'child';
  membershipType: 'new_convert' | 'old_member';
  isFirstTimer?: boolean;
  joinedDate: string;
  avatar?: string;
}

export interface AttendanceRecord {
  memberId: string;
  date: string;
  present: boolean;
  isFirstTimer?: boolean;
}

export interface Homecell {
  id: string;
  name: string;
  code: string;
  address: string;
  meetingDay: string;
  meetingTime: string;
  leaderId: string;
  leaderName: string;
  assistantId?: string;
  assistantName?: string;
  providerId?: string;
  providerName?: string;
  zoneId: string;
  zoneName: string;
  areaId: string;
  areaName: string;
  districtId: string;
  districtName: string;
  memberCount: number;
}

export interface WeeklyReport {
  id: string;
  homecellId: string;
  weekEnding: string;
  totalAttendance: number;
  maleCount: number;
  femaleCount: number;
  adultCount: number;
  childrenCount: number;
  firstTimers: number;
  newConverts: number;
  soulsWon: number;
  testimonies: string;
  challenges: string;
  prayerPoints: string;
  offering?: number;
  loveSeeds?: number;
  status: 'draft' | 'submitted' | 'approved';
  submittedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'urgent' | 'event';
  targetAudience: 'all' | 'leaders' | 'providers' | 'zone';
  createdAt: string;
  readAt?: string;
}

export interface Material {
  id: string;
  title: string;
  type: 'weekly' | 'monthly' | 'special';
  format: 'pdf' | 'audio' | 'text';
  description: string;
  url: string;
  publishedAt: string;
  isNew?: boolean;
}

export interface FollowUp {
  id: string;
  memberId: string;
  memberName: string;
  phone: string;
  assignedTo: string;
  assignedToName: string;
  status: 'pending' | 'contacted' | 'visited' | 'integrated';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// Mock Members
export const mockMembers: Member[] = [
  { id: 'm1', name: 'Adebayo Johnson', phone: '+2348012345678', gender: 'male', type: 'adult', membershipType: 'old_member', joinedDate: '2022-03-15' },
  { id: 'm2', name: 'Chidinma Okafor', phone: '+2348023456789', gender: 'female', type: 'adult', membershipType: 'old_member', joinedDate: '2021-06-20' },
  { id: 'm3', name: 'Emmanuel Nwachukwu', phone: '+2348034567890', gender: 'male', type: 'adult', membershipType: 'new_convert', joinedDate: '2024-01-08' },
  { id: 'm4', name: 'Folake Adeleke', phone: '+2348045678901', gender: 'female', type: 'adult', membershipType: 'old_member', joinedDate: '2020-11-12' },
  { id: 'm5', name: 'Grace Eze', phone: '+2348056789012', gender: 'female', type: 'adult', membershipType: 'old_member', joinedDate: '2019-08-25' },
  { id: 'm6', name: 'Henry Obi', phone: '+2348067890123', gender: 'male', type: 'adult', membershipType: 'old_member', joinedDate: '2023-02-14' },
  { id: 'm7', name: 'Ifeoma Nwosu', phone: '+2348078901234', gender: 'female', type: 'adult', membershipType: 'new_convert', joinedDate: '2024-01-15', isFirstTimer: true },
  { id: 'm8', name: 'Joshua Adeyemi', phone: '+2348089012345', gender: 'male', type: 'child', membershipType: 'old_member', joinedDate: '2022-09-01' },
  { id: 'm9', name: 'Kemi Balogun', phone: '+2348090123456', gender: 'female', type: 'adult', membershipType: 'old_member', joinedDate: '2021-04-18' },
  { id: 'm10', name: 'Oluwaseun Alade', phone: '+2348001234567', gender: 'male', type: 'adult', membershipType: 'old_member', joinedDate: '2020-07-22' },
];

// Mock Homecell
export const mockHomecell: Homecell = {
  id: 'hc-001',
  name: 'Victory House Fellowship',
  code: 'VHF-001',
  address: '15 Harmony Close, Lekki Phase 1',
  meetingDay: 'Wednesday',
  meetingTime: '6:00 PM',
  leaderId: 'l1',
  leaderName: 'Pastor David Okonkwo',
  assistantId: 'a1',
  assistantName: 'Deacon Paul Adekunle',
  providerId: 'p1',
  providerName: 'Mrs. Sarah Ogundimu',
  zoneId: 'z1',
  zoneName: 'Zone A - Lekki',
  areaId: 'ar1',
  areaName: 'Area 1 - Victoria Island/Lekki',
  districtId: 'd1',
  districtName: 'Lagos Mainland District',
  memberCount: 10,
};

// Mock Attendance (last 4 weeks)
export const mockAttendanceHistory = [
  { week: 'Week 3', date: '2024-01-17', total: 8, present: 7 },
  { week: 'Week 2', date: '2024-01-10', total: 8, present: 6 },
  { week: 'Week 1', date: '2024-01-03', total: 8, present: 8 },
  { week: 'Week 52', date: '2023-12-27', total: 7, present: 5 },
];

// Mock Announcements
export const mockAnnouncements: Announcement[] = [
  {
    id: 'ann1',
    title: 'Special Prayer Week',
    message: 'Join us for a special week of prayer and fasting starting next Monday. All homecell leaders are expected to mobilize their members.',
    type: 'event',
    targetAudience: 'all',
    createdAt: '2024-01-18T10:00:00Z',
  },
  {
    id: 'ann2',
    title: 'Report Submission Deadline',
    message: 'Kindly submit your weekly reports before Friday 6:00 PM. Late submissions will be flagged.',
    type: 'urgent',
    targetAudience: 'leaders',
    createdAt: '2024-01-17T14:30:00Z',
  },
  {
    id: 'ann3',
    title: 'Zone Leaders Meeting',
    message: 'All zonal leaders are invited to the monthly coordination meeting this Saturday at 10:00 AM.',
    type: 'general',
    targetAudience: 'zone',
    createdAt: '2024-01-15T09:00:00Z',
    readAt: '2024-01-15T11:00:00Z',
  },
];

// Mock Materials
export const mockMaterials: Material[] = [
  {
    id: 'mat1',
    title: 'Week 3 - Faith That Moves Mountains',
    type: 'weekly',
    format: 'pdf',
    description: 'Study guide on developing mountain-moving faith based on Mark 11:22-24',
    url: '#',
    publishedAt: '2024-01-14T08:00:00Z',
    isNew: true,
  },
  {
    id: 'mat2',
    title: 'January Monthly Theme - Year of Open Doors',
    type: 'monthly',
    format: 'pdf',
    description: 'Monthly teaching outline and discussion points',
    url: '#',
    publishedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: 'mat3',
    title: 'Prayer Guide Audio',
    type: 'weekly',
    format: 'audio',
    description: 'Audio prayer guide for personal and group devotion',
    url: '#',
    publishedAt: '2024-01-14T08:00:00Z',
  },
];

// Mock Follow-ups
export const mockFollowUps: FollowUp[] = [
  {
    id: 'fu1',
    memberId: 'm7',
    memberName: 'Ifeoma Nwosu',
    phone: '+2348078901234',
    assignedTo: 'm2',
    assignedToName: 'Chidinma Okafor',
    status: 'contacted',
    notes: 'Visited on Sunday. She is interested in joining permanently.',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-17T00:00:00Z',
  },
  {
    id: 'fu2',
    memberId: 'm3',
    memberName: 'Emmanuel Nwachukwu',
    phone: '+2348034567890',
    assignedTo: 'm1',
    assignedToName: 'Adebayo Johnson',
    status: 'pending',
    notes: 'New convert from last Sunday service. Needs discipleship.',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
  },
];

// Mock Weekly Report
export const mockCurrentReport: WeeklyReport = {
  id: 'wr1',
  homecellId: 'hc-001',
  weekEnding: '2024-01-21',
  totalAttendance: 0,
  maleCount: 0,
  femaleCount: 0,
  adultCount: 0,
  childrenCount: 0,
  firstTimers: 0,
  newConverts: 0,
  soulsWon: 0,
  testimonies: '',
  challenges: '',
  prayerPoints: '',
  offering: 0,
  loveSeeds: 0,
  status: 'draft',
};

// Dashboard stats
export const mockDashboardStats = {
  thisWeekAttendance: 7,
  lastWeekAttendance: 6,
  growthPercentage: 16.7,
  pendingFollowUps: 2,
  overdueFollowUps: 1,
  reportsSubmitted: 2,
  reportsPending: 1,
  totalMembers: 10,
  newMembers: 2,
};
