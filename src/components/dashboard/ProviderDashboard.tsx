import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Bell,
  Users,
  CheckCircle,
  Clock,
  ChevronRight,
  FileText,
  Calendar
} from 'lucide-react';
import { mockHomecell, mockDashboardStats, mockAnnouncements, mockMaterials } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [acknowledgments, setAcknowledgments] = useState({
    materialReceived: false,
    meetingConfirmed: false
  });

  // Calculate current week
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const currentWeek = `Week ${weekNumber}, ${now.getFullYear()}`;

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const homecell = mockHomecell;
  const stats = mockDashboardStats;
  const currentMaterial = mockMaterials.find(m => m.isNew) || mockMaterials[0];

  const handleAcknowledgment = (type: 'material' | 'meeting') => {
    setAcknowledgments(prev => ({
      ...prev,
      [type === 'material' ? 'materialReceived' : 'meetingConfirmed']: true
    }));
  };

  if (isLoading || authLoading) {
    return (
      <MobileLayout>
        {/* Loading Header */}
        <header className="gradient-primary px-4 pt-4 pb-8 safe-area-top">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
          <Skeleton className="h-32 rounded-2xl" />
        </header>

        {/* Loading Material Section */}
        <Section className="mt-6">
          <Skeleton className="h-24 rounded-xl" />
        </Section>

        {/* Loading Announcements */}
        <Section className="mt-6">
          <Skeleton className="h-32 rounded-xl" />
        </Section>

        {/* Loading Attendance Summary */}
        <Section className="mt-6">
          <Skeleton className="h-20 rounded-xl" />
        </Section>

        {/* Loading Acknowledgments */}
        <Section className="mt-6">
          <Skeleton className="h-24 rounded-xl" />
        </Section>

        <BottomNavigation />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      {/* Header */}
      <header className="gradient-primary px-4 pt-4 pb-8 safe-area-top">
        <div className="flex items-center justify-between mb-4">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-primary-foreground/70 text-sm"
            >
              {currentWeek}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-serif font-bold text-primary-foreground"
            >
              {homecell.name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-primary-foreground/70 text-sm mt-1"
            >
              {homecell.meetingDay} at {homecell.meetingTime}
            </motion.p>
          </div>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/notifications')}
            className="relative w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center press-effect"
          >
            <Bell className="w-5 h-5 text-primary-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
          </motion.button>
        </div>

        {/* Attendance Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-4 shadow-elevated"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Attendance Summary</span>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-bold text-foreground">{stats.thisWeekAttendance}</span>
            <span className="text-muted-foreground mb-1">total attendance</span>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Meeting Capacity</p>
            <p className="text-lg font-bold text-foreground">{stats.totalMembers} members</p>
          </div>
        </motion.div>
      </header>

      {/* This Week's Material */}
      <Section className="mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">This Week's Material</h3>
              <p className="text-sm text-muted-foreground mt-1">{currentMaterial.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{currentMaterial.description}</p>
            </div>
          </div>
          <Button
            onClick={() => handleAcknowledgment('material')}
            disabled={acknowledgments.materialReceived}
            className="w-full"
            variant={acknowledgments.materialReceived ? "secondary" : "default"}
          >
            {acknowledgments.materialReceived ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Material Received
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Acknowledge Receipt
              </>
            )}
          </Button>
        </motion.div>
      </Section>

      {/* Announcement Feed */}
      <Section
        title="Church Announcements"
        action={
          <button
            onClick={() => navigate('/announcements')}
            className="text-sm text-primary font-medium press-effect"
          >
            See All
          </button>
        }
        className="mt-6"
      >
        <div className="space-y-3">
          {mockAnnouncements.slice(0, 3).map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              onClick={() => navigate(`/announcements/${announcement.id}`)}
              className="p-4 bg-card rounded-xl border border-border press-effect cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  announcement.urgency === 'urgent' ? 'bg-destructive' :
                  announcement.urgency === 'high' ? 'bg-warning' : 'bg-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{announcement.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{announcement.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {announcement.target === 'zones' ? 'Zone Message' : 'Church Announcement'}
                    </p>
                    {announcement.status === 'published' && (
                      <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">New</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Meeting Confirmation */}
      <Section className="mt-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">Meeting Confirmation</h3>
              <p className="text-sm text-muted-foreground">Confirm your attendance for this week's meeting</p>
            </div>
          </div>
          <Button
            onClick={() => handleAcknowledgment('meeting')}
            disabled={acknowledgments.meetingConfirmed}
            className="w-full"
            variant={acknowledgments.meetingConfirmed ? "secondary" : "default"}
          >
            {acknowledgments.meetingConfirmed ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Meeting Confirmed
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Confirm Attendance
              </>
            )}
          </Button>
        </motion.div>
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}