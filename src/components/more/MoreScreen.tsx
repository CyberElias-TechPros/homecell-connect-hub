import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { 
  User, 
  BookOpen, 
  Bell, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Shield,
  Settings,
  MessageSquare,
  Info,
  HeartHandshake,
  Sparkles,
  PhoneCall,
  UserPlus,
  FileText,
  ClipboardCheck
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useFollowUps } from '@/contexts/FollowUpsContext';
import { useTestimonies } from '@/contexts/TestimoniesContext';

export function MoreScreen() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { getOverdueFollowUps, getFollowUpStats } = useFollowUps();
  const { summary: testimonySummary } = useTestimonies();

  const followUpStats = getFollowUpStats();
  const overdue = getOverdueFollowUps().length;

  // Every entry below resolves to a real route. Nothing here leads to a page
  // that does not exist.
  const menuSections = [
    {
      title: 'Cell life',
      items: [
        { icon: HeartHandshake, label: 'Prayer', path: '/prayer', description: 'Share and pray for requests' },
        { icon: Sparkles, label: 'Testimonies', path: '/testimonies', description: 'What God has done', badge: hasPermission('manage_prayer_requests') && testimonySummary.pending > 0 ? testimonySummary.pending : undefined },
        { icon: MessageSquare, label: 'Announcements', path: '/announcements', description: 'Updates from your leaders' },
      ],
    },
    {
      title: 'Serve',
      items: [
        ...(hasPermission('view_followups')
          ? [{
              icon: PhoneCall,
              label: 'Follow-ups',
              path: '/followups',
              description: overdue > 0
                ? `${overdue} overdue — ${followUpStats.total} total`
                : `${followUpStats.total} to work through`,
              badge: overdue > 0 ? overdue : undefined,
            }]
          : []),
        ...(hasPermission('mark_attendance')
          ? [{ icon: ClipboardCheck, label: 'Attendance', path: '/attendance', description: 'Mark who attended' }]
          : []),
        ...(hasPermission('view_homecell_reports')
          ? [{ icon: FileText, label: 'Reports', path: '/reports', description: 'Weekly cell reports' }]
          : []),
        ...(hasPermission('manage_invitations')
          ? [{ icon: UserPlus, label: 'Invite people', path: '/invite', description: 'Create a link to join' }]
          : []),
        ...(hasPermission('manage_homecell_settings')
          ? [{ icon: Settings, label: 'Cell settings', path: '/cell-settings', description: 'Meeting link, schedule & joining' }]
          : []),
      ],
    },
    {
      title: 'Resources',
      items: [
        { icon: BookOpen, label: 'Materials', path: '/materials', description: 'Study guides and resources' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', path: '/profile', description: 'View and edit your profile' },
        { icon: Bell, label: 'Notifications', path: '/notifications', description: 'Your notifications' },
        { icon: Shield, label: 'Privacy', path: '/privacy', description: 'Your data and how it is handled' },
        { icon: Info, label: 'About', path: '/profile', description: 'Account and app information' },
      ],
    },
  ];

  return (
    <MobileLayout>
      <PageHeader title="More" subtitle="Settings & resources" />

      {/* User Card */}
      <Section className="mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/profile')}
          className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border press-effect cursor-pointer"
        >
          <div className="w-14 h-14 gradient-primary rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold text-primary-foreground">PD</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Pastor David Okonkwo</h3>
            <p className="text-sm text-muted-foreground">Homecell Leader</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </Section>

      {/* Menu Sections */}
      {menuSections.map((section, sectionIndex) => (
        <Section key={section.title} title={section.title} className="mb-4">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {section.items.map((item, itemIndex) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (sectionIndex * 0.1) + (itemIndex * 0.05) }}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 p-4 press-effect cursor-pointer ${
                  itemIndex < section.items.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                {/* Counts come from real data — overdue follow-ups, pending
                    testimonies — so a badge always means something. */}
                {'badge' in item && item.badge ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {Number(item.badge) > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        </Section>
      ))}

      {/* Logout */}
      <Section className="mb-6">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 p-4 bg-destructive/10 text-destructive rounded-2xl font-medium press-effect"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </motion.button>
      </Section>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground pb-6">
        Homecell Connect v1.0.0
      </p>

      <BottomNavigation />
    </MobileLayout>
  );
}
