import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFollowUps } from '@/contexts/FollowUpsContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Phone,
  MessageCircle,
  MapPin,
  ChevronRight,
  UserPlus,
  Clock,
  CheckCircle2,
  Users,
  AlertTriangle,
  TrendingUp,
  Plus,
  Filter,
  Search,
  User,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function FollowUpsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getFollowUps,
    getFollowUpStats,
    updateFollowUpStatus,
    reassignFollowUp,
    canCreateFollowUp,
    canEditFollowUp,
    canReassignFollowUp,
    canViewAnalytics
  } = useFollowUps();

  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted' | 'visited' | 'integrated'>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowUp, setSelectedFollowUp] = useState<string | null>(null);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState(false);
  const [reassignDialog, setReassignDialog] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const stats = getFollowUpStats();

  const filteredFollowUps = useMemo(() => {
    const filters = {
      status: filter === 'all' ? undefined : filter,
      search: searchQuery || undefined,
      isOverdue: showOverdueOnly ? true : undefined,
    };
    return getFollowUps(filters);
  }, [getFollowUps, filter, searchQuery, showOverdueOnly]);

  const getStatusConfig = (status: string, isOverdue: boolean = false) => {
    const baseConfig = {
      integrated: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', label: 'Integrated', icon: CheckCircle2 },
      visited: { color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', label: 'Visited', icon: MapPin },
      contacted: { color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-50', label: 'Contacted', icon: Phone },
      pending: { color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', label: 'Pending', icon: Clock },
    };

    const config = baseConfig[status as keyof typeof baseConfig] || baseConfig.pending;

    if (isOverdue) {
      return {
        ...config,
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        label: `${config.label} (Overdue)`,
      };
    }

    return config;
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent': return { color: 'bg-red-100 text-red-800', label: 'Urgent' };
      case 'high': return { color: 'bg-orange-100 text-orange-800', label: 'High' };
      case 'normal': return { color: 'bg-blue-100 text-blue-800', label: 'Normal' };
      default: return { color: 'bg-gray-100 text-gray-800', label: 'Low' };
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'visited', label: 'Visited' },
    { value: 'integrated', label: 'Integrated' },
  ];

  // Mock members for reassignment
  const mockMembers = [
    { id: 'm1', name: 'Adebayo Johnson', role: 'leader' },
    { id: 'm2', name: 'Chidinma Okafor', role: 'assistant' },
    { id: 'm3', name: 'Emmanuel Nwachukwu', role: 'assistant' },
    { id: 'm4', name: 'Folake Adeleke', role: 'provider' },
  ];

  const handleStatusUpdate = async (followUpId: string, newStatus: string, contactMethod?: string) => {
    try {
      await updateFollowUpStatus(followUpId, newStatus as any, statusNotes, contactMethod as any);
      toast.success(`Follow-up status updated to ${newStatus}`);
      setStatusUpdateDialog(false);
      setStatusNotes('');
      setSelectedFollowUp(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleReassign = async (followUpId: string) => {
    if (!newAssignee) return;

    try {
      await reassignFollowUp(followUpId, newAssignee);
      toast.success('Follow-up reassigned successfully');
      setReassignDialog(false);
      setNewAssignee('');
      setSelectedFollowUp(null);
    } catch (error) {
      toast.error('Failed to reassign follow-up');
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'pending': return 25;
      case 'contacted': return 50;
      case 'visited': return 75;
      case 'integrated': return 100;
      default: return 0;
    }
  };

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Follow-ups"
        subtitle="Track new members"
        onBack={() => navigate(-1)}
        action={
          canCreateFollowUp() && (
            <Button
              onClick={() => navigate('/followups/add')}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          )
        }
      />

      {/* Analytics Overview */}
      {canViewAnalytics() && (
        <Section className="px-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="text-lg font-semibold">{stats.successRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                    <p className="text-lg font-semibold text-red-600">{stats.overdue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>
      )}

      {/* Search and Filters */}
      <div className="px-4 pb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search follow-ups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as typeof filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all press-effect ${
                filter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all press-effect flex items-center gap-1 ${
              showOverdueOnly
                ? 'bg-red-500 text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Overdue
          </button>
        </div>
      </div>

      {/* Follow-ups List */}
      <div className="px-4 pb-8">
        {filteredFollowUps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No follow-ups</h3>
            <p className="text-sm text-muted-foreground">
              {showOverdueOnly ? 'No overdue follow-ups!' : 'All caught up for now!'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredFollowUps.map((followUp, index) => {
              const statusConfig = getStatusConfig(followUp.status, followUp.isOverdue);
              const priorityConfig = getPriorityConfig(followUp.priority);
              const progressPercent = getProgressPercentage(followUp.status);

              return (
                <motion.div
                  key={followUp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${statusConfig.bgColor}`}>
                        <statusConfig.icon className={`w-5 h-5 ${statusConfig.textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{followUp.memberName}</h3>
                          <div className="flex gap-1">
                            <Badge className={priorityConfig.color}>
                              {priorityConfig.label}
                            </Badge>
                            <Badge variant="outline" className={`${statusConfig.color} ${statusConfig.textColor}`}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{followUp.phone}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{followUp.assignedToName}</span>
                          </div>
                          {followUp.lastContactDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(followUp.lastContactDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>

                        {followUp.notes && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">{followUp.notes}</p>
                          </div>
                        )}

                        {followUp.isOverdue && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm font-medium">Overdue by {followUp.overdueDays} days</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex border-t border-border">
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors press-effect border-r border-border">
                      <Phone className="w-4 h-4" />
                      Call
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors press-effect border-r border-border">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                    {canEditFollowUp(followUp) && (
                      <Dialog open={statusUpdateDialog && selectedFollowUp === followUp.id} onOpenChange={(open) => {
                        setStatusUpdateDialog(open);
                        if (!open) setSelectedFollowUp(null);
                      }}>
                        <DialogTrigger asChild>
                          <button
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors press-effect"
                            onClick={() => setSelectedFollowUp(followUp.id)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Update
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Follow-up Status</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>New Status</Label>
                              <Select onValueChange={(value) => handleStatusUpdate(followUp.id, value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contacted">Contacted</SelectItem>
                                  <SelectItem value="visited">Visited</SelectItem>
                                  <SelectItem value="integrated">Integrated</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Notes (Optional)</Label>
                              <Textarea
                                value={statusNotes}
                                onChange={(e) => setStatusNotes(e.target.value)}
                                placeholder="Add notes about this update..."
                                rows={3}
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {/* Reassignment Option for Leaders */}
                  {canReassignFollowUp(followUp) && (
                    <div className="border-t border-border">
                      <Dialog open={reassignDialog && selectedFollowUp === followUp.id} onOpenChange={(open) => {
                        setReassignDialog(open);
                        if (!open) setSelectedFollowUp(null);
                      }}>
                        <DialogTrigger asChild>
                          <button
                            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors press-effect"
                            onClick={() => setSelectedFollowUp(followUp.id)}
                          >
                            <User className="w-4 h-4" />
                            Reassign
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reassign Follow-up</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>New Assignee</Label>
                              <Select value={newAssignee} onValueChange={setNewAssignee}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                  {mockMembers.filter(m => m.id !== followUp.assignedTo).map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{member.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {member.role}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={() => handleReassign(followUp.id)}
                              disabled={!newAssignee}
                              className="w-full"
                            >
                              Reassign Follow-up
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
