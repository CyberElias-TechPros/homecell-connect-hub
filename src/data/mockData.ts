// Mock data for the Homecell Management App
import { Announcement } from '../types';

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
  updatedAt?: string;
  syncedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt?: string;
}


export interface Material {
  id: string;
  title: string;
  type: 'weekly' | 'monthly' | 'special';
  format: 'pdf' | 'audio' | 'text';
  description: string;
  url: string;
  fileSize?: number; // in bytes
  duration?: number; // for audio in seconds
  publishedAt: string;
  scheduledAt?: string; // for scheduled publishing
  targetAudience: 'all' | 'leaders' | 'assistants' | 'providers';
  isNew?: boolean;
  isPublished: boolean;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  // Offline support
  downloaded?: boolean;
  downloadedAt?: string;
  localPath?: string;
  // Provider acknowledgment
  acknowledgedBy?: string[];
  requiresAcknowledgment?: boolean;
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
export const mockMembers: import('../types').Member[] = [
  {
    id: 'm1',
    fullName: 'Adebayo Johnson',
    phone: '+2348012345678',
    gender: 'male',
    maritalStatus: 'married',
    birthday: '1990-03-15',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'adult',
    joinedAt: '2022-03-15',
    isActive: true,
    createdAt: '2022-03-15T00:00:00Z',
    updatedAt: '2022-03-15T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm2',
    fullName: 'Chidinma Okafor',
    phone: '+2348023456789',
    gender: 'female',
    maritalStatus: 'single',
    birthday: '1988-06-20',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'adult',
    joinedAt: '2021-06-20',
    isActive: true,
    createdAt: '2021-06-20T00:00:00Z',
    updatedAt: '2021-06-20T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm3',
    fullName: 'Emmanuel Nwachukwu',
    phone: '+2348034567890',
    gender: 'male',
    maritalStatus: 'single',
    birthday: '1995-01-08',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'adult',
    joinedAt: '2024-01-08',
    isActive: true,
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm4',
    fullName: 'Folake Adeleke',
    phone: '+2348045678901',
    gender: 'female',
    maritalStatus: 'married',
    birthday: '1985-11-12',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'adult',
    joinedAt: '2020-11-12',
    isActive: true,
    createdAt: '2020-11-12T00:00:00Z',
    updatedAt: '2020-11-12T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm5',
    fullName: 'Grace Eze',
    phone: '+2348056789012',
    gender: 'female',
    maritalStatus: 'widowed',
    birthday: '1979-08-25',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'adult',
    joinedAt: '2019-08-25',
    isActive: true,
    createdAt: '2019-08-25T00:00:00Z',
    updatedAt: '2019-08-25T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm6',
    fullName: 'Henry Obi',
    phone: '+2348067890123',
    gender: 'male',
    maritalStatus: 'married',
    birthday: '1992-02-14',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'adult',
    joinedAt: '2023-02-14',
    isActive: true,
    createdAt: '2023-02-14T00:00:00Z',
    updatedAt: '2023-02-14T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm7',
    fullName: 'Ifeoma Nwosu',
    phone: '+2348078901234',
    gender: 'female',
    maritalStatus: 'single',
    birthday: '1998-01-15',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'first_timer',
    tag: 'adult',
    joinedAt: '2024-01-15',
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm8',
    fullName: 'Joshua Adeyemi',
    phone: '+2348089012345',
    gender: 'male',
    maritalStatus: 'single',
    birthday: '2010-09-01',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'child',
    joinedAt: '2022-09-01',
    isActive: true,
    createdAt: '2022-09-01T00:00:00Z',
    updatedAt: '2022-09-01T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm9',
    fullName: 'Kemi Balogun',
    phone: '+2348090123456',
    gender: 'female',
    maritalStatus: 'married',
    birthday: '1987-04-18',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'adult',
    joinedAt: '2021-04-18',
    isActive: true,
    createdAt: '2021-04-18T00:00:00Z',
    updatedAt: '2021-04-18T00:00:00Z',
    createdBy: 'admin1'
  },
  {
    id: 'm10',
    fullName: 'Oluwaseun Alade',
    phone: '+2348001234567',
    gender: 'male',
    maritalStatus: 'single',
    birthday: '1980-07-22',
    serviceUnit: 'hc-001',
    serviceUnitName: 'Victory House Fellowship',
    membershipType: 'regular',
    tag: 'adult',
    joinedAt: '2020-07-22',
    isActive: true,
    createdAt: '2020-07-22T00:00:00Z',
    updatedAt: '2020-07-22T00:00:00Z',
    createdBy: 'admin1'
  },
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
    content: 'Join us for a special week of prayer and fasting starting next Monday. All homecell leaders are expected to mobilize their members.',
    summary: 'Special prayer and fasting week starting Monday',
    urgency: 'high',
    target: 'all',
    channels: ['in_app', 'push'],
    status: 'published',
    publishedAt: '2024-01-18T10:00:00Z',
    createdAt: '2024-01-18T09:00:00Z',
    createdBy: 'admin1',
    createdByName: 'Admin User',
    updatedAt: '2024-01-18T10:00:00Z',
    deliveryStats: {
      totalRecipients: 150,
      delivered: 145,
      read: 120,
      failed: 5
    }
  },
  {
    id: 'ann2',
    title: 'Report Submission Deadline',
    content: 'Kindly submit your weekly reports before Friday 6:00 PM. Late submissions will be flagged.',
    summary: 'Weekly report deadline reminder',
    urgency: 'urgent',
    target: 'leaders',
    channels: ['in_app', 'push', 'sms'],
    status: 'published',
    publishedAt: '2024-01-17T14:30:00Z',
    createdAt: '2024-01-17T14:00:00Z',
    createdBy: 'admin1',
    createdByName: 'Admin User',
    updatedAt: '2024-01-17T14:30:00Z',
    deliveryStats: {
      totalRecipients: 45,
      delivered: 43,
      read: 38,
      failed: 2
    }
  },
  {
    id: 'ann3',
    title: 'Zone Leaders Meeting',
    content: 'All zonal leaders are invited to the monthly coordination meeting this Saturday at 10:00 AM.',
    summary: 'Monthly zonal leaders coordination meeting',
    urgency: 'normal',
    target: 'zones',
    channels: ['in_app', 'push'],
    status: 'published',
    publishedAt: '2024-01-15T09:00:00Z',
    createdAt: '2024-01-15T08:00:00Z',
    createdBy: 'admin1',
    createdByName: 'Admin User',
    updatedAt: '2024-01-15T09:00:00Z',
    deliveryStats: {
      totalRecipients: 8,
      delivered: 8,
      read: 7,
      failed: 0
    }
  },
  {
    id: 'ann4',
    title: 'Provider Training Session',
    content: 'All homecell providers are required to attend the monthly training session on effective ministry.',
    summary: 'Monthly provider training session',
    urgency: 'normal',
    target: 'providers',
    channels: ['in_app', 'push', 'whatsapp'],
    status: 'scheduled',
    scheduledAt: '2024-01-25T14:00:00Z',
    createdAt: '2024-01-20T10:00:00Z',
    createdBy: 'admin1',
    createdByName: 'Admin User',
    updatedAt: '2024-01-20T10:00:00Z',
    deliveryStats: {
      totalRecipients: 0,
      delivered: 0,
      read: 0,
      failed: 0
    }
  },
  {
    id: 'ann5',
    title: 'Welcome New Members',
    content: 'Draft: Welcome message for new members joining our homecells this month.',
    summary: 'Welcome message for new members',
    urgency: 'low',
    target: 'all',
    channels: ['in_app'],
    status: 'draft',
    createdAt: '2024-01-19T15:00:00Z',
    createdBy: 'admin1',
    createdByName: 'Admin User',
    updatedAt: '2024-01-19T15:00:00Z',
    deliveryStats: {
      totalRecipients: 0,
      delivered: 0,
      read: 0,
      failed: 0
    }
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
    fileSize: 2457600, // 2.4MB
    publishedAt: '2024-01-14T08:00:00Z',
    targetAudience: 'all',
    isNew: true,
    isPublished: true,
    createdBy: 'admin1',
    createdByName: 'Admin User',
    requiresAcknowledgment: true,
  },
  {
    id: 'mat2',
    title: 'January Monthly Theme - Year of Open Doors',
    type: 'monthly',
    format: 'pdf',
    description: 'Monthly teaching outline and discussion points',
    url: '#',
    fileSize: 1536000, // 1.5MB
    publishedAt: '2024-01-01T08:00:00Z',
    targetAudience: 'leaders',
    isPublished: true,
    createdBy: 'admin1',
    createdByName: 'Admin User',
  },
  {
    id: 'mat3',
    title: 'Prayer Guide Audio',
    type: 'weekly',
    format: 'audio',
    description: 'Audio prayer guide for personal and group devotion',
    url: '#',
    fileSize: 51200000, // 50MB
    duration: 1800, // 30 minutes
    publishedAt: '2024-01-14T08:00:00Z',
    targetAudience: 'providers',
    isPublished: true,
    createdBy: 'admin1',
    createdByName: 'Admin User',
    requiresAcknowledgment: true,
  },
  {
    id: 'mat4',
    title: 'Leadership Training Manual',
    type: 'special',
    format: 'pdf',
    description: 'Comprehensive guide for homecell leaders and assistants',
    url: '#',
    fileSize: 5120000, // 5MB
    publishedAt: '2024-01-10T08:00:00Z',
    targetAudience: 'leaders',
    isPublished: true,
    createdBy: 'admin1',
    createdByName: 'Admin User',
  },
  {
    id: 'mat5',
    title: 'Provider Guidelines Update',
    type: 'special',
    format: 'text',
    description: 'Updated guidelines for homecell providers',
    url: '#',
    publishedAt: '2024-01-12T08:00:00Z',
    targetAudience: 'providers',
    isPublished: true,
    createdBy: 'admin1',
    createdByName: 'Admin User',
    requiresAcknowledgment: true,
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
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
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

// Admin Dashboard Data
export const mockAdminDashboardData = {
  globalMetrics: {
    totalHomecells: 45,
    totalHomecellsChange: 3,
    totalAttendance: 285,
    totalAttendanceChange: 12,
    firstTimers: 18,
    firstTimersChange: 5,
    newConverts: 12,
    newConvertsChange: 2,
  },
  heatMapData: [
    { zone: 'Zone A - Lekki', area: 'Area 1', attendance: 85, percentage: 85 },
    { zone: 'Zone B - Ikoyi', area: 'Area 1', attendance: 72, percentage: 72 },
    { zone: 'Zone C - Victoria Island', area: 'Area 1', attendance: 68, percentage: 68 },
    { zone: 'Zone D - Surulere', area: 'Area 2', attendance: 60, percentage: 60 },
    { zone: 'Zone E - Yaba', area: 'Area 2', attendance: 55, percentage: 55 },
    { zone: 'Zone F - Ikeja', area: 'Area 3', attendance: 48, percentage: 48 },
    { zone: 'Zone G - Maryland', area: 'Area 3', attendance: 42, percentage: 42 },
    { zone: 'Zone H - Ojodu', area: 'Area 3', attendance: 38, percentage: 38 },
  ],
  reportsStatus: {
    submitted: 38,
    pending: 7,
    late: 3,
    total: 45,
  },
  growthTrends: {
    attendance: [
      { week: 'Week 8', attendance: 245, date: '2024-01-14' },
      { week: 'Week 7', attendance: 238, date: '2024-01-07' },
      { week: 'Week 6', attendance: 252, date: '2023-12-31' },
      { week: 'Week 5', attendance: 265, date: '2023-12-24' },
      { week: 'Week 4', attendance: 258, date: '2023-12-17' },
      { week: 'Week 3', attendance: 272, date: '2023-12-10' },
      { week: 'Week 2', attendance: 268, date: '2023-12-03' },
      { week: 'Week 1', attendance: 275, date: '2023-11-26' },
    ],
    conversions: [
      { week: 'Week 8', firstTimers: 15, newConverts: 8, date: '2024-01-14' },
      { week: 'Week 7', firstTimers: 12, newConverts: 6, date: '2024-01-07' },
      { week: 'Week 6', firstTimers: 18, newConverts: 10, date: '2023-12-31' },
      { week: 'Week 5', firstTimers: 14, newConverts: 7, date: '2023-12-24' },
      { week: 'Week 4', firstTimers: 16, newConverts: 9, date: '2023-12-17' },
      { week: 'Week 3', firstTimers: 13, newConverts: 5, date: '2023-12-10' },
      { week: 'Week 2', firstTimers: 17, newConverts: 11, date: '2023-12-03' },
      { week: 'Week 1', firstTimers: 19, newConverts: 12, date: '2023-11-26' },
    ],
  },
};
