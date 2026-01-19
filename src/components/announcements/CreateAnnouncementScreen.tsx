import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft,
  Send,
  Eye,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Smartphone,
  Bell,
  MessageSquare,
  Phone,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementTarget, AnnouncementChannel, AnnouncementUrgency, AnnouncementStatus } from '@/types';
import { format } from 'date-fns';

const targetOptions: { value: AnnouncementTarget; label: string; icon: React.ComponentType }[] = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'leaders', label: 'Leaders Only', icon: Users },
  { value: 'providers', label: 'Providers Only', icon: Users },
  { value: 'zones', label: 'Zone Leaders', icon: Users },
  { value: 'areas', label: 'Area Coordinators', icon: Users },
  { value: 'districts', label: 'District Overseers', icon: Users },
];

const channelOptions: { value: AnnouncementChannel; label: string; icon: React.ComponentType }[] = [
  { value: 'in_app', label: 'In-App', icon: Smartphone },
  { value: 'push', label: 'Push Notification', icon: Bell },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'whatsapp', label: 'WhatsApp', icon: Phone },
];

const urgencyOptions: { value: AnnouncementUrgency; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'normal', label: 'Normal', color: 'bg-secondary text-secondary-foreground' },
  { value: 'high', label: 'High', color: 'bg-warning text-warning-foreground' },
  { value: 'urgent', label: 'Urgent', color: 'bg-destructive text-destructive-foreground' },
];

export function CreateAnnouncementScreen() {
  const navigate = useNavigate();
  const { createAnnouncement, canCreateAnnouncement } = useAnnouncements();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    urgency: 'normal' as AnnouncementUrgency,
    target: 'all' as AnnouncementTarget,
    channels: ['in_app'] as AnnouncementChannel[],
    scheduledAt: null as Date | null,
    expiresAt: null as Date | null,
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  const handleChannelToggle = (channel: AnnouncementChannel) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const handleSubmit = async (publishNow = false) => {
    if (!user || !canCreateAnnouncement()) return;

    setIsSubmitting(true);
    try {
      const announcementData = {
        ...formData,
        status: (isDraft ? 'draft' : (publishNow ? 'published' : 'scheduled')) as AnnouncementStatus,
        scheduledAt: formData.scheduledAt?.toISOString(),
        expiresAt: formData.expiresAt?.toISOString(),
        publishedAt: publishNow ? new Date().toISOString() : undefined,
        createdBy: user.id,
        createdByName: user.name,
      };

      await createAnnouncement(announcementData);
      navigate('/announcements');
    } catch (error) {
      console.error('Error creating announcement:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = formData.title.trim() && formData.content.trim() && formData.channels.length > 0;

  return (
    <MobileLayout>
      <PageHeader
        title="Create Announcement"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/announcements')}
            className="press-effect"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="space-y-6 pb-6">
        {/* Basic Information */}
        <Section title="Basic Information">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter announcement title"
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Summary (Optional)
              </label>
              <Input
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief summary for notifications"
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Content *
              </label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the full announcement content"
                className="w-full min-h-[120px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Urgency Level
              </label>
              <Select
                value={formData.urgency}
                onValueChange={(value: AnnouncementUrgency) =>
                  setFormData(prev => ({ ...prev, urgency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </Section>

        {/* Target Audience */}
        <Section title="Target Audience">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Select
              value={formData.target}
              onValueChange={(value: AnnouncementTarget) =>
                setFormData(prev => ({ ...prev, target: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        </Section>

        {/* Delivery Channels */}
        <Section title="Delivery Channels">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {channelOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-3">
                <Checkbox
                  id={option.value}
                  checked={formData.channels.includes(option.value)}
                  onCheckedChange={() => handleChannelToggle(option.value)}
                />
                <label
                  htmlFor={option.value}
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer flex-1"
                >
                  <option.icon />
                  {option.label}
                </label>
              </div>
            ))}
          </motion.div>
        </Section>

        {/* Scheduling */}
        <Section title="Scheduling">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Schedule For Later (Optional)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduledAt ? format(formData.scheduledAt, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.scheduledAt || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, scheduledAt: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Expires At (Optional)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {formData.expiresAt ? format(formData.expiresAt, 'PPP') : 'Pick expiry date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expiresAt || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, expiresAt: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </motion.div>
        </Section>

        {/* Preview */}
        <Section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Preview</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-card rounded-lg border">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        formData.urgency === 'urgent' ? 'bg-destructive' :
                        formData.urgency === 'high' ? 'bg-warning' : 'bg-muted-foreground'
                      }`} />
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{formData.title || 'Announcement Title'}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formData.content || 'Announcement content will appear here...'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {targetOptions.find(t => t.value === formData.target)?.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {urgencyOptions.find(u => u.value === formData.urgency)?.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Channels: {formData.channels.map(c =>
                      channelOptions.find(ch => ch.value === c)?.label
                    ).join(', ')}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        </Section>

        {/* Action Buttons */}
        <Section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <Button
              onClick={() => handleSubmit(true)}
              disabled={!canSubmit || isSubmitting}
              className="w-full"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Now'}
            </Button>

            {formData.scheduledAt && (
              <Button
                onClick={() => handleSubmit(false)}
                disabled={!canSubmit || isSubmitting}
                variant="secondary"
                className="w-full"
                size="lg"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Schedule for {format(formData.scheduledAt, 'PPP')}
              </Button>
            )}

            <Button
              onClick={() => {
                setIsDraft(true);
                handleSubmit(false);
              }}
              disabled={!canSubmit || isSubmitting}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
          </motion.div>
        </Section>

        {!canCreateAnnouncement() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
          >
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Permission Required</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have permission to create announcements.
            </p>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  );
}