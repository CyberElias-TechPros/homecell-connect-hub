import React from 'react';

// User Roles
export type UserRole =
  | 'member'
  | 'leader'
  | 'assistant'
  | 'provider'
  | 'zonal'
  | 'area'
  | 'district'
  | 'admin'
  | 'super_admin';

// Permissions Matrix Types
export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  scope: 'homecell' | 'zone' | 'area' | 'district' | 'global';
}

export interface RBACContextType {
  user: User | null;
  permissions: Permission[];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  canAccessResource: (resourceType: string, resourceId: string) => boolean;
}

// Hierarchical Church Structure Data Models
export interface District {
  id: string;
  name: string;
  code: string;
  overseerId: string;
  overseerName: string;
  areaCount: number;
  totalMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  name: string;
  code: string;
  districtId: string;
  districtName: string;
  coordinatorId: string;
  coordinatorName: string;
  zoneCount: number;
  totalMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  areaId: string;
  areaName: string;
  zonalLeaderId: string;
  zonalLeaderName: string;
  homecellCount: number;
  totalMembers: number;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  homecellId?: string;
  homecellName?: string;
  zoneId?: string;
  zoneName?: string;
  areaId?: string;
  areaName?: string;
  districtId?: string;
  districtName?: string;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
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

export interface HierarchyContextType {
  districts: District[];
  areas: Area[];
  zones: Zone[];
  homecells: Homecell[];
  currentUserHierarchy: {
    district?: District;
    area?: Area;
    zone?: Zone;
    homecell?: Homecell;
  };
  getSubordinates: (level: 'district' | 'area' | 'zone' | 'homecell') => any[];
  getAccessibleResources: (resourceType: string) => any[];
}

// Role-Based Routing and Navigation
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: UserRole[];
  fallbackPath?: string;
}

export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  permissions?: string[];
  roles?: UserRole[];
  title: string;
  icon?: React.ComponentType;
  children?: RouteConfig[];
}

// Component Architecture for Role-Specific Dashboards
export interface DashboardStat {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType;
  trend?: 'up' | 'down' | 'neutral';
}

export interface QuickAction {
  id: string;
  title: string;
  icon: React.ComponentType;
  action: () => void;
}

export interface DashboardLayoutProps {
  title: string;
  stats: DashboardStat[];
  quickActions: QuickAction[];
  children: React.ReactNode;
}

export interface LeaderDashboardProps extends DashboardLayoutProps {
  homecellData: Homecell;
  attendanceStats: any; // Placeholder
  pendingTasks: any[]; // Placeholder
}

export interface ZonalDashboardProps extends DashboardLayoutProps {
  zoneData: Zone;
  homecellStats: any[]; // Placeholder
  approvalQueue: any[]; // Placeholder
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType;
  trend?: 'up' | 'down' | 'neutral';
}

export interface QuickActionGridProps {
  actions: QuickAction[];
  onActionClick: (action: QuickAction) => void;
}

// Offline Support Architecture
export interface OfflineStorage {
  user: User;
  permissions: Permission[];
  members: Member[];
  attendance: any[]; // Placeholder
  reports: any[]; // Placeholder
  announcements: any[]; // Placeholder
  materials: any[]; // Placeholder
  lastSyncAt: string;
  pendingChanges: PendingChange[];
  syncConflicts: SyncConflict[];
}

export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: any;
  timestamp: string;
  retryCount: number;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: any;
  serverData: any;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merge';
}

export interface SyncManager {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string;
  sync(): Promise<SyncResult>;
  queueChange(change: PendingChange): void;
  resolveConflict(conflictId: string, resolution: 'local' | 'server' | 'merge'): void;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: SyncConflict[];
  errors: string[];
}

// API Integration Patterns
export interface ApiClient {
  baseURL: string;
  authToken?: string;
  get<T>(endpoint: string, params?: any): Promise<ApiResponse<T>>;
  post<T>(endpoint: string, data: any): Promise<ApiResponse<T>>;
  put<T>(endpoint: string, data: any): Promise<ApiResponse<T>>;
  delete<T>(endpoint: string): Promise<ApiResponse<T>>;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  meta?: {
    pagination?: any; // Placeholder
    timestamp: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'LRU' | 'LFU' | 'FIFO';
}

// Attendance Management Types
export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  week: string;
  present: boolean;
  isFirstTimer: boolean;
  markedBy: string;
  markedAt: string;
  synced: boolean;
}

export interface WeeklyAttendance {
  id: string;
  homecellId: string;
  week: string;
  weekEnding: string;
  /** The exact meeting date this row covers ('YYYY-MM-DD'). */
  meetingDate?: string;
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  firstTimers: number;
  adults: number;
  children: number;
  maleCount: number;
  femaleCount: number;
  records: AttendanceRecord[];
  status: 'draft' | 'submitted' | 'synced';
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface AttendanceStats {
  currentWeek: {
    present: number;
    total: number;
    percentage: number;
    growth: number;
  };
  monthlyAverage: number;
  weeklyTrend: Array<{
    week: string;
    present: number;
    total: number;
    percentage: number;
    growth: number;
  }>;
  categoryBreakdown: {
    adults: number;
    children: number;
    firstTimers: number;
    males: number;
    females: number;
  };
}

export interface AttendanceContextType {
  // Current session
  currentAttendance: WeeklyAttendance | null;
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: string;

  // Actions
  startAttendanceSession: (week: string) => Promise<void>;
  markAttendance: (memberId: string, present: boolean, isFirstTimer?: boolean) => void;
  saveAttendance: () => Promise<void>;
  syncAttendance: () => Promise<void>;

  // Data
  getAttendanceHistory: (weeks?: number) => WeeklyAttendance[];
  getAttendanceStats: () => AttendanceStats;
  getPendingSync: () => WeeklyAttendance[];

  // Permissions
  canMarkAttendance: () => boolean;
  canViewAttendance: () => boolean;
  canViewAggregatedData: () => boolean;
}

// Member Management Types
export interface Member {
  id: string;
  fullName: string;
  phone: string;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  birthday: string; // ISO date string
  serviceUnit: string; // homecell ID
  serviceUnitName: string;
  membershipType: 'regular' | 'visitor' | 'first_timer' | 'inactive';
  tag: 'adult' | 'child';
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  joinedAt: string; // ISO date string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // user ID
  updatedBy?: string;
}

export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  adults: number;
  children: number;
  males: number;
  females: number;
  byMaritalStatus: {
    single: number;
    married: number;
    divorced: number;
    widowed: number;
  };
  byMembershipType: {
    regular: number;
    visitor: number;
    first_timer: number;
    inactive: number;
  };
  recentAdditions: number; // last 30 days
  growthRate: number; // percentage
}

export interface MemberContextType {
  members: Member[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: string;

  // CRUD Operations
  addMember: (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Member>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<Member>;
  deleteMember: (id: string) => Promise<void>;
  getMember: (id: string) => Member | undefined;

  // Search and Filter
  searchMembers: (query: string) => Member[];
  filterMembers: (filters: MemberFilters) => Member[];

  // Statistics
  getMemberStats: () => MemberStats;

  // Offline Support
  saveOffline: () => Promise<void>;
  syncMembers: () => Promise<void>;
  getPendingChanges: () => PendingChange[];

  // Permissions
  canAddMember: () => boolean;
  canEditMember: () => boolean;
  canDeleteMember: () => boolean;
  canViewMembers: () => boolean;
  canViewStats: () => boolean;
}

export interface MemberFilters {
  serviceUnit?: string;
  membershipType?: Member['membershipType'];
  tag?: Member['tag'];
  gender?: Member['gender'];
  maritalStatus?: Member['maritalStatus'];
  isActive?: boolean;
  ageRange?: { min: number; max: number };
}

// Announcement Management Types
export type AnnouncementTarget = 'all' | 'leaders' | 'providers' | 'zones' | 'areas' | 'districts';

export type AnnouncementChannel = 'in_app' | 'push' | 'sms' | 'whatsapp';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type AnnouncementUrgency = 'low' | 'normal' | 'high' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  summary?: string;
  urgency: AnnouncementUrgency;
  target: AnnouncementTarget;
  channels: AnnouncementChannel[];
  status: AnnouncementStatus;
  scheduledAt?: string; // ISO date string
  publishedAt?: string; // ISO date string
  expiresAt?: string; // ISO date string
  createdAt: string; // ISO date string
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  // Delivery tracking
  deliveryStats: {
    totalRecipients: number;
    delivered: number;
    read: number;
    failed: number;
  };
  // Attachments (optional)
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }[];
  // Metadata
  tags?: string[];
  category?: string;
}

export interface AnnouncementDelivery {
  id: string;
  announcementId: string;
  userId: string;
  channel: AnnouncementChannel;
  status: 'pending' | 'delivered' | 'failed' | 'read';
  deliveredAt?: string;
  readAt?: string;
  failedReason?: string;
  retryCount: number;
}

export interface AnnouncementReadReceipt {
  announcementId: string;
  userId: string;
  readAt: string;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

export interface AnnouncementStats {
  totalAnnouncements: number;
  publishedThisMonth: number;
  averageReadRate: number;
  byUrgency: Record<AnnouncementUrgency, number>;
  byChannel: Record<AnnouncementChannel, number>;
  byTarget: Record<AnnouncementTarget, number>;
}

export interface AnnouncementContextType {
  announcements: Announcement[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: string;

  // CRUD Operations
  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'deliveryStats'>) => Promise<Announcement>;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => Promise<Announcement>;
  deleteAnnouncement: (id: string) => Promise<void>;
  publishAnnouncement: (id: string) => Promise<void>;
  scheduleAnnouncement: (id: string, scheduledAt: string) => Promise<void>;

  // Viewing and Interaction
  getAnnouncements: (filters?: AnnouncementFilters) => Announcement[];
  markAsRead: (announcementId: string) => Promise<void>;
  getUnreadCount: () => number;
  /** Whether the signed-in user has read a given announcement. */
  isAnnouncementRead: (announcementId: string) => boolean;
  getReadReceipts: (announcementId: string) => AnnouncementReadReceipt[];

  // Statistics and Reports
  getAnnouncementStats: () => AnnouncementStats;
  getDeliveryReport: (announcementId: string) => AnnouncementDelivery[];

  // Offline Support
  saveOffline: () => Promise<void>;
  syncAnnouncements: () => Promise<void>;
  getPendingChanges: () => PendingChange[];

  // Permissions
  canCreateAnnouncement: () => boolean;
  canEditAnnouncement: (announcement: Announcement) => boolean;
  canDeleteAnnouncement: (announcement: Announcement) => boolean;
  canViewAnnouncement: (announcement: Announcement) => boolean;
  canPublishAnnouncement: () => boolean;
}

export interface AnnouncementFilters {
  status?: AnnouncementStatus;
  target?: AnnouncementTarget;
  urgency?: AnnouncementUrgency;
  channel?: AnnouncementChannel;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  tags?: string[];
}

// Follow-up Management Types
export interface FollowUp {
  id: string;
  memberId?: string; // Optional for first-timers not yet in system
  memberName: string;
  phone: string;
  address?: string; // Optional address field
  assignedTo: string; // User ID
  assignedToName: string;
  assignedBy: string; // User ID who assigned
  assignedByName: string;
  // 'cancelled' is a void record and is excluded from the active pipeline.
  status: 'pending' | 'contacted' | 'visited' | 'integrated' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string;
  followUpHistory: FollowUpHistoryEntry[];
  nextFollowUpDate?: string; // ISO date string
  lastContactDate?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  createdBy: string; // User ID
  updatedBy: string; // User ID
  isOverdue: boolean;
  overdueDays: number;
  tags?: string[]; // For categorization
}

export interface FollowUpHistoryEntry {
  id: string;
  status: FollowUp['status'];
  notes: string;
  contactMethod?: 'phone' | 'whatsapp' | 'visit' | 'email' | 'other';
  contactDate: string; // ISO date string
  updatedBy: string; // User ID
  updatedByName: string;
  createdAt: string; // ISO date string
}

export interface FollowUpStats {
  total: number;
  pending: number;
  contacted: number;
  visited: number;
  integrated: number;
  overdue: number;
  successRate: number; // Percentage of integrated vs total
  averageDaysToContact: number;
  averageDaysToVisit: number;
  averageDaysToIntegration: number;
  weeklyTrends: Array<{
    week: string;
    new: number;
    completed: number;
    successRate: number;
  }>;
}

export interface FollowUpFilters {
  status?: FollowUp['status'];
  assignedTo?: string;
  priority?: FollowUp['priority'];
  isOverdue?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  tags?: string[];
}

export interface FollowUpContextType {
  followUps: FollowUp[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: string;

  // CRUD Operations
  createFollowUp: (followUp: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'followUpHistory' | 'isOverdue' | 'overdueDays'>) => Promise<FollowUp>;
  updateFollowUp: (id: string, updates: Partial<FollowUp>) => Promise<FollowUp>;
  updateFollowUpStatus: (id: string, status: FollowUp['status'], notes?: string, contactMethod?: FollowUpHistoryEntry['contactMethod']) => Promise<FollowUp>;
  reassignFollowUp: (id: string, newAssigneeId: string, reason?: string) => Promise<FollowUp>;
  deleteFollowUp: (id: string) => Promise<void>;

  // Search and Filter
  getFollowUps: (filters?: FollowUpFilters) => FollowUp[];
  getFollowUp: (id: string) => FollowUp | undefined;
  getAssignedFollowUps: (userId: string) => FollowUp[];
  getOverdueFollowUps: () => FollowUp[];

  // Statistics and Analytics
  getFollowUpStats: () => FollowUpStats;
  getSuccessMetrics: () => {
    conversionRate: number;
    averageTimeToIntegration: number;
    followUpEfficiency: number;
  };

  // Offline Support
  saveOffline: () => Promise<void>;
  syncFollowUps: () => Promise<void>;
  getPendingChanges: () => PendingChange[];

  // Permissions
  canCreateFollowUp: () => boolean;
  canEditFollowUp: (followUp: FollowUp) => boolean;
  canDeleteFollowUp: (followUp: FollowUp) => boolean;
  canViewFollowUps: () => boolean;
  canReassignFollowUp: (followUp: FollowUp) => boolean;
  canViewAnalytics: () => boolean;
}

// Component Reusability and Mobile-First Design
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg';
}

export interface QuickActionGridProps {
  actions: QuickAction[];
  onActionClick: (action: QuickAction) => void;
}

export interface MobileLayoutProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  safeArea?: boolean;
}

export interface ResponsiveGridProps {
  columns: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  gap: string;
  children: React.ReactNode;
}
// ---------------------------------------------------------------------------
// Weekly cell report
//
// Previously defined inside src/data/mockData.ts. Moved here because it is a
// real domain type now that reports are backed by the API, not mock data.
// ---------------------------------------------------------------------------
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
