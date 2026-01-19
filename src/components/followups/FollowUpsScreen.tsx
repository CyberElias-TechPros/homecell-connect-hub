import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { mockFollowUps, mockMembers } from '@/data/mockData';
import { 
  Phone, 
  MessageCircle, 
  MapPin,
  ChevronRight,
  UserPlus,
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';

export function FollowUpsScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted' | 'visited' | 'integrated'>('all');

  const filteredFollowUps = mockFollowUps.filter(f => 
    filter === 'all' || f.status === filter
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'integrated':
        return { color: 'bg-success', textColor: 'text-success', label: 'Integrated' };
      case 'visited':
        return { color: 'bg-blue-500', textColor: 'text-blue-500', label: 'Visited' };
      case 'contacted':
        return { color: 'bg-purple-500', textColor: 'text-purple-500', label: 'Contacted' };
      default:
        return { color: 'bg-warning', textColor: 'text-warning', label: 'Pending' };
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'visited', label: 'Visited' },
    { value: 'integrated', label: 'Integrated' },
  ];

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader 
        title="Follow-ups" 
        subtitle="Track new members"
        onBack={() => navigate(-1)}
      />

      {/* Filter Pills */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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
            <p className="text-sm text-muted-foreground">All caught up for now!</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredFollowUps.map((followUp, index) => {
              const statusConfig = getStatusConfig(followUp.status);

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
                      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{followUp.memberName}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}/20 ${statusConfig.textColor}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{followUp.phone}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Assigned to {followUp.assignedToName}</span>
                        </div>
                      </div>
                    </div>

                    {followUp.notes && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">{followUp.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex border-t border-border">
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors press-effect border-r border-border">
                      <Phone className="w-4 h-4" />
                      Call
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors press-effect">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
