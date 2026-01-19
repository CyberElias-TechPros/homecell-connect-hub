import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMembers } from '@/contexts/MemberContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Phone, ChevronRight, Filter, UserPlus } from 'lucide-react';

export function MembersScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members, searchMembers, filterMembers, canViewMembers, canAddMember, isLoading, getMemberStats } = useMembers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ tag: 'all', membershipType: 'all', gender: 'all' });

  const stats = getMemberStats();

  if (!canViewMembers) {
    return (
      <MobileLayout>
        <div className="text-center py-12">No permission to view members</div>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  // For providers, show only count
  if (user?.role === 'provider') {
    return (
      <MobileLayout>
        <PageHeader title="Members" subtitle="View member count" />
        <div className="px-4 py-8 text-center">
          <div className="text-4xl font-bold text-primary mb-2">{stats.totalMembers}</div>
          <div className="text-muted-foreground">Total Members</div>
        </div>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  const searchedMembers = searchQuery ? searchMembers(searchQuery) : members;
  const filteredMembers = filterMembers({
    tag: filters.tag === 'all' ? undefined : filters.tag as 'adult' | 'child',
    membershipType: filters.membershipType === 'all' ? undefined : filters.membershipType as any,
    gender: filters.gender === 'all' ? undefined : filters.gender as 'male' | 'female',
    isActive: true
  }).filter(m => searchedMembers.includes(m));

  const filterOptions = [
    { key: 'tag', value: 'all', label: 'All' },
    { key: 'tag', value: 'adult', label: 'Adults' },
    { key: 'tag', value: 'child', label: 'Children' },
    { key: 'membershipType', value: 'regular', label: 'Regular' },
    { key: 'membershipType', value: 'visitor', label: 'Visitors' },
    { key: 'membershipType', value: 'first_timer', label: 'First Timers' },
    { key: 'gender', value: 'male', label: 'Males' },
    { key: 'gender', value: 'female', label: 'Females' },
  ];

  return (
    <MobileLayout>
      <PageHeader 
        title="Members" 
        subtitle={`${stats.totalMembers} total members`}
        action={
          canAddMember ? (
            <Button
              size="icon"
              onClick={() => navigate('/members/add')}
              className="w-10 h-10 rounded-full gradient-primary shadow-primary press-effect"
            >
              <Plus className="w-5 h-5" />
            </Button>
          ) : null
        }
      />

      {/* Search & Filter */}
      <div className="px-4 pb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-muted border-0 rounded-xl"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {filterOptions.map((option) => (
            <button
              key={`${option.key}-${option.value}`}
              onClick={() => setFilters(prev => ({ ...prev, [option.key]: option.value }))}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all press-effect ${
                filters[option.key as keyof typeof filters] === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members List */}
      <div className="px-4 pb-24">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-xl border">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No members found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/members/edit/${member.id}`)}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border press-effect cursor-pointer"
              >
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                  member.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                }`}>
                  {member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{member.fullName}</h3>
                    {member.membershipType === 'first_timer' && (
                      <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-medium rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span className="truncate">{member.phone}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    member.tag === 'adult' ? 'bg-muted text-muted-foreground' : 'bg-purple-100 text-purple-600'
                  }`}>
                    {member.tag}
                  </span>
                  {member.membershipType !== 'regular' && (
                    <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-medium rounded-full">
                      {member.membershipType.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </MobileLayout>
  );
}
