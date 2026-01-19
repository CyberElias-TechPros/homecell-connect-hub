import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Calendar,
  Users,
  CheckCircle2
} from 'lucide-react';

export function AddMemberScreen() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '' as 'male' | 'female' | '',
    type: 'adult' as 'adult' | 'child',
    membershipType: 'old_member' as 'new_convert' | 'old_member',
    isFirstTimer: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.gender) newErrors.gender = 'Please select gender';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      navigate('/members');
    }, 1500);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 bg-success rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-serif font-bold text-foreground mb-2"
        >
          Member Added!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center"
        >
          {formData.name} has been added to your homecell.
        </motion.p>
      </div>
    );
  }

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Add Member"
        onBack={() => navigate(-1)}
        action={
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gradient-primary shadow-primary press-effect"
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full"
              />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        }
      />

      <div className="p-4 pb-8">
        {/* Name */}
        <div className="mb-5">
          <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name
          </Label>
          <Input
            id="name"
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              setErrors(prev => ({ ...prev, name: '' }));
            }}
            className="mt-2 h-12 bg-muted border-border rounded-xl"
          />
          {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Phone */}
        <div className="mb-5">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number
          </Label>
          <div className="flex gap-2 mt-2">
            <div className="w-20 h-12 bg-muted rounded-xl flex items-center justify-center border border-border">
              <span className="text-sm font-medium">+234</span>
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="803 123 4567"
              value={formData.phone}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, phone: e.target.value }));
                setErrors(prev => ({ ...prev, phone: '' }));
              }}
              className="flex-1 h-12 bg-muted border-border rounded-xl"
            />
          </div>
          {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
        </div>

        {/* Gender */}
        <div className="mb-5">
          <Label className="text-sm font-medium">Gender</Label>
          <div className="flex gap-3 mt-2">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, gender: g }));
                  setErrors(prev => ({ ...prev, gender: '' }));
                }}
                className={`flex-1 h-12 rounded-xl border-2 font-medium capitalize transition-all press-effect ${
                  formData.gender === g
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {errors.gender && <p className="text-destructive text-sm mt-1">{errors.gender}</p>}
        </div>

        {/* Type */}
        <div className="mb-5">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Member Type
          </Label>
          <div className="flex gap-3 mt-2">
            {(['adult', 'child'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                className={`flex-1 h-12 rounded-xl border-2 font-medium capitalize transition-all press-effect ${
                  formData.type === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Membership Type */}
        <div className="mb-5">
          <Label className="text-sm font-medium">Membership Status</Label>
          <div className="flex gap-3 mt-2">
            {[
              { value: 'old_member', label: 'Existing Member' },
              { value: 'new_convert', label: 'New Convert' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, membershipType: option.value as typeof formData.membershipType }))}
                className={`flex-1 h-12 rounded-xl border-2 font-medium transition-all press-effect ${
                  formData.membershipType === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* First Timer Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
          <div>
            <p className="font-medium text-foreground">Mark as First Timer</p>
            <p className="text-sm text-muted-foreground">Add to follow-up list</p>
          </div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, isFirstTimer: !prev.isFirstTimer }))}
            className={`w-12 h-7 rounded-full transition-colors ${
              formData.isFirstTimer ? 'bg-primary' : 'bg-border'
            }`}
          >
            <motion.div
              animate={{ x: formData.isFirstTimer ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-5 h-5 bg-white rounded-full shadow"
            />
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}
