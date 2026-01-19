import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { mockMembers, mockHomecell, Member } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { 
  Check, 
  X, 
  Users, 
  UserCheck, 
  Clock,
  Save,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface AttendanceState {
  [memberId: string]: boolean;
}

export function MarkAttendanceScreen() {
  const navigate = useNavigate();
  const { currentWeek } = useApp();
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalMembers = mockMembers.length;

  const toggleAttendance = (memberId: string) => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const markAllPresent = () => {
    const allPresent: AttendanceState = {};
    mockMembers.forEach(m => { allPresent[m.id] = true; });
    setAttendance(allPresent);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      navigate('/attendance');
    }, 2000);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-success rounded-full flex items-center justify-center mb-6 relative"
        >
          <CheckCircle2 className="w-12 h-12 text-white" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.5, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute inset-0 bg-success rounded-full"
          />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-serif font-bold text-foreground mb-2"
        >
          Attendance Saved!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center"
        >
          {presentCount} of {totalMembers} members marked present.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 mt-4 text-secondary"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Great job keeping records!</span>
        </motion.div>
      </div>
    );
  }

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Mark Attendance"
        subtitle={currentWeek}
        onBack={() => navigate(-1)}
      />

      {/* Summary Bar */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-success" />
              <span className="font-semibold">{presentCount}</span>
              <span className="text-muted-foreground">present</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">{totalMembers} total</span>
            </div>
          </div>
          <button
            onClick={markAllPresent}
            className="text-sm text-primary font-medium press-effect"
          >
            Mark All
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="p-4 pb-28">
        <div className="space-y-2">
          {mockMembers.map((member, index) => {
            const isPresent = attendance[member.id] ?? false;
            
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => toggleAttendance(member.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all press-effect cursor-pointer ${
                  isPresent 
                    ? 'bg-success/10 border-success' 
                    : 'bg-card border-border'
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                  member.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                }`}>
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{member.name}</h3>
                    {member.isFirstTimer && (
                      <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-medium rounded">
                        1ST
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{member.type}</p>
                </div>

                {/* Status Toggle */}
                <motion.div
                  animate={{ 
                    scale: isPresent ? [1, 1.2, 1] : 1,
                    backgroundColor: isPresent ? 'hsl(var(--success))' : 'hsl(var(--muted))'
                  }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                >
                  <AnimatePresence mode="wait">
                    {isPresent ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <Check className="w-5 h-5 text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="x"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || presentCount === 0}
          className="w-full h-14 text-base font-semibold gradient-primary shadow-primary press-effect disabled:opacity-50"
        >
          {isSubmitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Attendance ({presentCount}/{totalMembers})
            </>
          )}
        </Button>
      </div>
    </MobileLayout>
  );
}
