import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  Menu,
  Home,
  MessageSquare,
  BookOpen,
  Bell
} from 'lucide-react';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/announcements', label: 'Announcements', icon: Bell },
  { path: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { path: '/members', label: 'Members', icon: Users },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/more', label: 'More', icon: Menu },
];

export function BottomNavigation() {
  const location = useLocation();
  const { getUnreadCount } = useAnnouncements();
  const unreadCount = getUnreadCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          const showBadge = item.path === '/announcements' && unreadCount > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-full h-full px-2 press-effect"
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-2 bg-primary/10 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon
                  className={`relative w-5 h-5 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                {showBadge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <span className="text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </motion.div>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
