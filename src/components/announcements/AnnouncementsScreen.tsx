import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { mockAnnouncements } from '@/data/mockData';
import { 
  Bell, 
  ChevronRight,
  AlertTriangle,
  Calendar,
  MessageCircle
} from 'lucide-react';

export function AnnouncementsScreen() {
  const navigate = useNavigate();

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'urgent':
        return { icon: AlertTriangle, color: 'bg-destructive', textColor: 'text-destructive' };
      case 'event':
        return { icon: Calendar, color: 'bg-secondary', textColor: 'text-secondary' };
      default:
        return { icon: MessageCircle, color: 'bg-muted', textColor: 'text-muted-foreground' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <MobileLayout>
      <PageHeader 
        title="Announcements" 
        subtitle="Stay updated"
        onBack={() => navigate(-1)}
      />

      <div className="p-4 pb-24">
        {mockAnnouncements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No announcements</h3>
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {mockAnnouncements.map((announcement, index) => {
              const typeConfig = getTypeConfig(announcement.type);
              const TypeIcon = typeConfig.icon;
              const isUnread = !announcement.readAt;

              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 bg-card rounded-xl border transition-all press-effect cursor-pointer ${
                    isUnread ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 ${typeConfig.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-foreground">{announcement.title}</h3>
                        {isUnread && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {announcement.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${typeConfig.color}/20 ${typeConfig.textColor}`}>
                          {announcement.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(announcement.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </MobileLayout>
  );
}
