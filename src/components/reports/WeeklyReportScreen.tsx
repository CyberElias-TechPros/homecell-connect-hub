import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { mockHomecell } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { 
  Save, 
  Users, 
  UserPlus, 
  Heart, 
  MessageSquare,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Gift
} from 'lucide-react';

export function WeeklyReportScreen() {
  const navigate = useNavigate();
  const { currentWeek } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    totalAttendance: 7,
    maleCount: 4,
    femaleCount: 3,
    adultCount: 6,
    childrenCount: 1,
    firstTimers: 1,
    newConverts: 0,
    soulsWon: 0,
    testimonies: '',
    challenges: '',
    prayerPoints: '',
    offering: '',
    loveSeeds: '',
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      navigate('/reports');
    }, 2000);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-12 h-12 text-secondary" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-serif font-bold text-foreground mb-2"
        >
          Report Submitted!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center"
        >
          Your weekly report for {currentWeek} has been submitted.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 mt-4 text-secondary"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Keep up the great work!</span>
        </motion.div>
      </div>
    );
  }

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Weekly Report"
        subtitle={currentWeek}
        onBack={() => navigate(-1)}
      />

      <div className="p-4 pb-28">
        {/* Homecell Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/50 rounded-xl p-4 mb-6"
        >
          <p className="text-sm text-muted-foreground">Submitting for</p>
          <p className="font-serif font-semibold text-foreground">{mockHomecell.name}</p>
        </motion.div>

        {/* Attendance Section - Auto-filled */}
        <Section title="Attendance (Auto-filled)" className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formData.totalAttendance}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-secondary" />
                <span className="text-sm text-muted-foreground">First-Timers</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formData.firstTimers}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'Male', value: formData.maleCount },
              { label: 'Female', value: formData.femaleCount },
              { label: 'Adults', value: formData.adultCount },
              { label: 'Children', value: formData.childrenCount },
            ].map((stat) => (
              <div key={stat.label} className="bg-muted rounded-lg p-2 text-center">
                <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Evangelism Section */}
        <Section title="Evangelism" className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4" />
                New Converts
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.newConverts}
                onChange={(e) => setFormData(prev => ({ ...prev, newConverts: parseInt(e.target.value) || 0 }))}
                className="mt-2 h-12 bg-muted border-border rounded-xl text-center text-lg"
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Souls Won
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.soulsWon}
                onChange={(e) => setFormData(prev => ({ ...prev, soulsWon: parseInt(e.target.value) || 0 }))}
                className="mt-2 h-12 bg-muted border-border rounded-xl text-center text-lg"
              />
            </div>
          </div>
        </Section>

        {/* Testimonies */}
        <Section title="Testimonies" className="mb-6">
          <Textarea
            placeholder="Share any testimonies from members this week..."
            value={formData.testimonies}
            onChange={(e) => setFormData(prev => ({ ...prev, testimonies: e.target.value }))}
            className="min-h-[100px] bg-muted border-border rounded-xl resize-none"
          />
        </Section>

        {/* Challenges */}
        <Section title="Challenges & Prayer Points" className="mb-6">
          <div className="space-y-3">
            <div>
              <Label className="text-sm flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                Challenges Faced
              </Label>
              <Textarea
                placeholder="Any challenges faced during the week..."
                value={formData.challenges}
                onChange={(e) => setFormData(prev => ({ ...prev, challenges: e.target.value }))}
                className="min-h-[80px] bg-muted border-border rounded-xl resize-none"
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" />
                Prayer Points
              </Label>
              <Textarea
                placeholder="Prayer requests for the homecell..."
                value={formData.prayerPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, prayerPoints: e.target.value }))}
                className="min-h-[80px] bg-muted border-border rounded-xl resize-none"
              />
            </div>
          </div>
        </Section>

        {/* Financial (Optional) */}
        <Section title="Financial (Optional)" className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Offering (₦)
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formData.offering}
                onChange={(e) => setFormData(prev => ({ ...prev, offering: e.target.value }))}
                className="mt-2 h-12 bg-muted border-border rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Love Seeds (₦)
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formData.loveSeeds}
                onChange={(e) => setFormData(prev => ({ ...prev, loveSeeds: e.target.value }))}
                className="mt-2 h-12 bg-muted border-border rounded-xl"
              />
            </div>
          </div>
        </Section>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
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
              Submit Report
            </>
          )}
        </Button>
      </div>
    </MobileLayout>
  );
}
