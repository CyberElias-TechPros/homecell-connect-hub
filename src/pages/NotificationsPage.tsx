import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { Bell, Check, Trash2 } from 'lucide-react';

const mockNotifications = [
  {
    id: 'n1',
    title: 'Report Reminder',
    message: 'Weekly report submission deadline is tomorrow at 6:00 PM.',
    type: 'reminder',
    time: '2 hours ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'New Announcement',
    message: 'Special Prayer Week starts next Monday.',
    type: 'announcement',
    time: '5 hours ago',
    read: false,
  },
  {
    id: 'n3',
    title: 'Follow-up Update',
    message: 'Emmanuel Nwachukwu was marked as contacted.',
    type: 'update',
    time: '1 day ago',
    read: true,
  },
  {
    id: 'n4',
    title: 'New Material Available',
    message: 'Week 3 study guide has been uploaded.',
    type: 'material',
    time: '2 days ago',
    read: true,
  },
];

export function NotificationsPage() {
  const navigate = useNavigate();

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Notifications"
        onBack={() => navigate(-1)}
        action={
          <button className="text-sm text-primary font-medium press-effect">
            Mark all read
          </button>
        }
      />

      <div className="p-4 pb-8">
        {mockNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {mockNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 bg-card rounded-xl border transition-all ${
                  notification.read ? 'border-border' : 'border-primary/50 bg-primary/5'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    notification.read ? 'bg-muted-foreground/30' : 'bg-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
