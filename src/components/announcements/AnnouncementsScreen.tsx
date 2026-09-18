import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Announcement, AnnouncementUrgency, AnnouncementStatus } from '@/types';
import {
  Bell,
  ChevronRight,
  AlertTriangle,
  Calendar,
  MessageCircle,
  Filter,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Search
} from 'lucide-react';
import { format } from 'date-fns';

export function AnnouncementsScreen() {
  const navigate = useNavigate();
  const { announcements, getAnnouncements, markAsRead, getUnreadCount, canCreateAnnouncement, getReadReceipts, getDeliveryReport } = useAnnouncements();
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    status: 'all' as 'all' | AnnouncementStatus,
    urgency: 'all' as 'all' | AnnouncementUrgency,
    search: ''
  });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredAnnouncements = getAnnouncements({
    status: filters.status === 'all' ? undefined : filters.status,
    urgency: filters.urgency === 'all' ? undefined : filters.urgency,
    search: filters.search || undefined
  });

  const unreadCount = getUnreadCount();

  const getUrgencyConfig = (urgency: AnnouncementUrgency) => {
    switch (urgency) {
      case 'urgent':
        return { icon: AlertTriangle, color: 'bg-destructive', textColor: 'text-destructive', bgColor: 'bg-destructive/10' };
      case 'high':
        return { icon: AlertTriangle, color: 'bg-warning', textColor: 'text-warning', bgColor: 'bg-warning/10' };
      case 'low':
        return { icon: MessageCircle, color: 'bg-muted', textColor: 'text-muted-foreground', bgColor: 'bg-muted/50' };
      default:
        return { icon: Bell, color: 'bg-secondary', textColor: 'text-secondary', bgColor: 'bg-secondary/10' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, h:mm a');
  };

  const handleAnnouncementClick = async (announcement: Announcement) => {
    await markAsRead(announcement.id);
    setSelectedAnnouncement(announcement);
  };

  const getStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="text-xs">Published</Badge>;
      case 'scheduled':
        return <Badge variant="secondary" className="text-xs">Scheduled</Badge>;
      case 'draft':
        return <Badge variant="outline" className="text-xs">Draft</Badge>;
      default:
        return null;
    }
  };

  return (
    <MobileLayout>
      <PageHeader
        title="Announcements"
        subtitle={`${unreadCount} unread`}
        action={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilterOpen(true)}
              className="press-effect"
            >
              <Filter className="w-4 h-4" />
            </Button>
            {canCreateAnnouncement() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/announcements/create')}
                className="press-effect"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Filters Dialog */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Announcements</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Urgency</label>
              <Select
                value={filters.urgency}
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, urgency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsFilterOpen(false)} className="w-full">
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedAnnouncement.title}
                  {getStatusBadge(selectedAnnouncement.status)}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                <TabsContent value="content" className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedAnnouncement.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(selectedAnnouncement.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{selectedAnnouncement.urgency}</Badge>
                    <Badge variant="outline">{selectedAnnouncement.target}</Badge>
                    {selectedAnnouncement.channels.map(channel => (
                      <Badge key={channel} variant="secondary">{channel}</Badge>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="analytics" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-card rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {selectedAnnouncement.deliveryStats.delivered}
                      </div>
                      <div className="text-xs text-muted-foreground">Delivered</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {selectedAnnouncement.deliveryStats.read}
                      </div>
                      <div className="text-xs text-muted-foreground">Read</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Read Rate</span>
                      <span>
                        {selectedAnnouncement.deliveryStats.delivered > 0
                          ? Math.round((selectedAnnouncement.deliveryStats.read / selectedAnnouncement.deliveryStats.delivered) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={selectedAnnouncement.deliveryStats.delivered > 0
                        ? (selectedAnnouncement.deliveryStats.read / selectedAnnouncement.deliveryStats.delivered) * 100
                        : 0}
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Read Receipts</h4>
                    {getReadReceipts(selectedAnnouncement.id).slice(0, 5).map(receipt => (
                      <div key={receipt.userId} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3 h-3 text-success" />
                        <span>User {receipt.userId.slice(-4)}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(receipt.readAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="p-4 pb-24">
        {filteredAnnouncements.length === 0 ? (
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
            {filteredAnnouncements.map((announcement, index) => {
              const urgencyConfig = getUrgencyConfig(announcement.urgency);
              const UrgencyIcon = urgencyConfig.icon;
              const isUnread = announcement.status === 'published' && announcement.deliveryStats.read === 0;

              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAnnouncementClick(announcement)}
                  className={`p-4 bg-card rounded-xl border transition-all press-effect cursor-pointer ${
                    isUnread ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 ${urgencyConfig.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <UrgencyIcon className={`w-5 h-5 ${urgencyConfig.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">{announcement.title}</h3>
                        <div className="flex items-center gap-1">
                          {isUnread && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                          {getStatusBadge(announcement.status)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {announcement.urgency}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {announcement.channels.length} channel{announcement.channels.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(announcement.createdAt)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
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
