import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';
import { Announcement, AnnouncementStatus } from '@/types';
import {
  Plus,
  Edit,
  Trash2,
  Send,
  Clock,
  Eye,
  BarChart3,
  Filter,
  MoreVertical,
  Calendar,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

export function AdminAnnouncementsScreen() {
  const navigate = useNavigate();
  const {
    announcements,
    publishAnnouncement,
    scheduleAnnouncement,
    deleteAnnouncement,
    canEditAnnouncement,
    canDeleteAnnouncement,
    canPublishAnnouncement,
    getAnnouncementStats
  } = useAnnouncements();

  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | 'all'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [actionDialog, setActionDialog] = useState<{ type: string; announcement: Announcement } | null>(null);

  const filteredAnnouncements = statusFilter === 'all'
    ? announcements
    : announcements.filter(a => a.status === statusFilter);

  const stats = getAnnouncementStats();

  const getStatusColor = (status: AnnouncementStatus) => {
    switch (status) {
      case 'published': return 'bg-success text-success-foreground';
      case 'scheduled': return 'bg-warning text-warning-foreground';
      case 'draft': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handlePublish = async (announcement: Announcement) => {
    try {
      await publishAnnouncement(announcement.id);
      setActionDialog(null);
    } catch (error) {
      console.error('Error publishing announcement:', error);
    }
  };

  const handleSchedule = async (announcement: Announcement, scheduledAt: string) => {
    try {
      await scheduleAnnouncement(announcement.id, scheduledAt);
      setActionDialog(null);
    } catch (error) {
      console.error('Error scheduling announcement:', error);
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    try {
      await deleteAnnouncement(announcement.id);
      setSelectedAnnouncement(null);
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  return (
    <MobileLayout>
      <PageHeader
        title="Manage Announcements"
        subtitle="Admin Panel"
        action={
          <Button
            onClick={() => navigate('/announcements/create')}
            size="sm"
            className="press-effect"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        }
      />

      {/* Stats Overview */}
      <Section className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Published</span>
              </div>
              <div className="text-2xl font-bold">{announcements.filter(a => a.status === 'published').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">Scheduled</span>
              </div>
              <div className="text-2xl font-bold">{announcements.filter(a => a.status === 'scheduled').length}</div>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Filters */}
      <Section className="mt-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Announcements</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* Announcements List */}
      <Section className="mt-4 pb-24">
        <div className="space-y-3">
          {filteredAnnouncements.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No announcements</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'all' ? 'Create your first announcement' : `No ${statusFilter} announcements`}
              </p>
            </motion.div>
          ) : (
            filteredAnnouncements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getUrgencyIcon(announcement.urgency)}
                      <h3 className="font-medium text-foreground truncate">{announcement.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${getStatusColor(announcement.status)}`}>
                        {announcement.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {announcement.target}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {announcement.channels.length} channels
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {announcement.deliveryStats.read}/{announcement.deliveryStats.delivered} read
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(announcement.updatedAt), 'MMM d')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {announcement.status === 'draft' && canPublishAnnouncement() && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setActionDialog({ type: 'publish', announcement })}
                        className="text-xs"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Publish
                      </Button>
                    )}
                    {announcement.status === 'draft' && canPublishAnnouncement() && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActionDialog({ type: 'schedule', announcement })}
                        className="text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Schedule
                      </Button>
                    )}
                    {canEditAnnouncement(announcement) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/announcements/${announcement.id}/edit`)}
                        className="text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedAnnouncement(announcement)}
                      className="text-xs"
                    >
                      <BarChart3 className="w-3 h-3" />
                    </Button>
                    {canDeleteAnnouncement(announcement) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-xs text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(announcement)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Section>

      {/* Action Dialogs */}
      <Dialog open={actionDialog?.type === 'publish'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Publish "{actionDialog?.announcement.title}" immediately?
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setActionDialog(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => actionDialog && handlePublish(actionDialog.announcement)}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Publish Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog?.type === 'schedule'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Schedule "{actionDialog?.announcement.title}" for publishing
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Date & Time</label>
              <input
                type="datetime-local"
                className="w-full p-2 border border-border rounded-md"
                onChange={(e) => {
                  if (actionDialog && e.target.value) {
                    handleSchedule(actionDialog.announcement, e.target.value);
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle>Announcement Analytics</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-card rounded-lg">
                    <div className="text-xl font-bold">{selectedAnnouncement.deliveryStats.totalRecipients}</div>
                    <div className="text-xs text-muted-foreground">Recipients</div>
                  </div>
                  <div className="text-center p-4 bg-card rounded-lg">
                    <div className="text-xl font-bold">{selectedAnnouncement.deliveryStats.delivered}</div>
                    <div className="text-xs text-muted-foreground">Delivered</div>
                  </div>
                  <div className="text-center p-4 bg-card rounded-lg">
                    <div className="text-xl font-bold">{selectedAnnouncement.deliveryStats.read}</div>
                    <div className="text-xs text-muted-foreground">Read</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Delivery Channels</h4>
                  <div className="space-y-2">
                    {selectedAnnouncement.channels.map(channel => (
                      <div key={channel} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{channel}</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </MobileLayout>
  );
}