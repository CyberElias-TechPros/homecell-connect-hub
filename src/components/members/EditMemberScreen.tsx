import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { MobileLayout, PageHeader } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMembers } from '@/contexts/MemberContext';
import { useAuth } from '@/contexts/AuthContext';
import { Member } from '@/types';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Calendar,
  Users,
  CheckCircle2,
  Mail,
  MapPin
} from 'lucide-react';

export function EditMemberScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { getMember, updateMember, canEditMember, isLoading } = useMembers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '' as 'male' | 'female' | '',
    maritalStatus: '' as 'single' | 'married' | 'divorced' | 'widowed' | '',
    birthday: '',
    serviceUnit: '',
    serviceUnitName: '',
    membershipType: '' as 'regular' | 'visitor' | 'first_timer' | 'inactive' | '',
    tag: 'adult' as 'adult' | 'child',
    email: '',
    address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      const m = getMember(id);
      if (m) {
        setMember(m);
        setFormData({
          fullName: m.fullName,
          phone: m.phone.startsWith('+234') ? m.phone.slice(4) : m.phone,
          gender: m.gender,
          maritalStatus: m.maritalStatus,
          birthday: m.birthday.split('T')[0], // YYYY-MM-DD
          serviceUnit: m.serviceUnit,
          serviceUnitName: m.serviceUnitName,
          membershipType: m.membershipType,
          tag: m.tag,
          email: m.email || '',
          address: m.address || '',
        });
      } else {
        navigate('/members');
      }
    }
  }, [id, getMember, navigate]);

  if (!canEditMember) {
    return (
      <MobileLayout>
        <div className="text-center py-12">No permission to edit members</div>
      </MobileLayout>
    );
  }

  if (!member) {
    return (
      <MobileLayout>
        <div className="text-center py-12">Loading...</div>
      </MobileLayout>
    );
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.maritalStatus) newErrors.maritalStatus = 'Marital status is required';
    if (!formData.birthday) newErrors.birthday = 'Birthday is required';
    if (!formData.membershipType) newErrors.membershipType = 'Membership type is required';
    if (!formData.tag) newErrors.tag = 'Tag is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await updateMember(id!, {
        fullName: formData.fullName,
        phone: '+234' + formData.phone.replace(/\s/g, ''),
        gender: formData.gender as 'male' | 'female',
        maritalStatus: formData.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed',
        birthday: formData.birthday,
        membershipType: formData.membershipType as 'regular' | 'visitor' | 'first_timer' | 'inactive',
        tag: formData.tag as 'adult' | 'child',
        email: formData.email || undefined,
        address: formData.address || undefined,
        updatedBy: user?.id,
      });
      setShowSuccess(true);
      setTimeout(() => navigate('/members'), 1500);
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
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
          Member Updated!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center"
        >
          {formData.fullName}'s information has been updated.
        </motion.p>
      </div>
    );
  }

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Edit Member"
        onBack={() => navigate(-1)}
        action={
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="gradient-primary shadow-primary press-effect"
          >
            {isSubmitting || isLoading ? (
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
        {/* Phone */}
        <div className="mb-5">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number *
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

        {/* Full Name */}
        <div className="mb-5">
          <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name *
          </Label>
          <Input
            id="fullName"
            placeholder="Enter full name"
            value={formData.fullName}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, fullName: e.target.value }));
              setErrors(prev => ({ ...prev, fullName: '' }));
            }}
            className="mt-2 h-12 bg-muted border-border rounded-xl"
          />
          {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName}</p>}
        </div>

        {/* Birthday */}
        <div className="mb-5">
          <Label htmlFor="birthday" className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Birthday *
          </Label>
          <Input
            id="birthday"
            type="date"
            value={formData.birthday}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, birthday: e.target.value }));
              setErrors(prev => ({ ...prev, birthday: '' }));
            }}
            className="mt-2 h-12 bg-muted border-border rounded-xl"
          />
          {errors.birthday && <p className="text-destructive text-sm mt-1">{errors.birthday}</p>}
        </div>

        {/* Gender */}
        <div className="mb-5">
          <Label className="text-sm font-medium">Gender *</Label>
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

        {/* Marital Status */}
        <div className="mb-5">
          <Label className="text-sm font-medium">Marital Status *</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {(['single', 'married', 'divorced', 'widowed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, maritalStatus: status }));
                  setErrors(prev => ({ ...prev, maritalStatus: '' }));
                }}
                className={`h-12 rounded-xl border-2 font-medium capitalize transition-all press-effect ${
                  formData.maritalStatus === status
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          {errors.maritalStatus && <p className="text-destructive text-sm mt-1">{errors.maritalStatus}</p>}
        </div>

        {/* Membership Type */}
        <div className="mb-5">
          <Label className="text-sm font-medium">Membership Type *</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {([
              { value: 'regular', label: 'Regular' },
              { value: 'visitor', label: 'Visitor' },
              { value: 'first_timer', label: 'First Timer' },
              { value: 'inactive', label: 'Inactive' },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, membershipType: option.value }));
                  setErrors(prev => ({ ...prev, membershipType: '' }));
                }}
                className={`h-12 rounded-xl border-2 font-medium transition-all press-effect ${
                  formData.membershipType === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {errors.membershipType && <p className="text-destructive text-sm mt-1">{errors.membershipType}</p>}
        </div>

        {/* Tag */}
        <div className="mb-5">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Category *
          </Label>
          <div className="flex gap-3 mt-2">
            {(['adult', 'child'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, tag: t }));
                  setErrors(prev => ({ ...prev, tag: '' }));
                }}
                className={`flex-1 h-12 rounded-xl border-2 font-medium capitalize transition-all press-effect ${
                  formData.tag === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {errors.tag && <p className="text-destructive text-sm mt-1">{errors.tag}</p>}
        </div>

        {/* Email */}
        <div className="mb-5">
          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email (Optional)
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="mt-2 h-12 bg-muted border-border rounded-xl"
          />
        </div>

        {/* Address */}
        <div className="mb-5">
          <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address (Optional)
          </Label>
          <Textarea
            id="address"
            placeholder="Enter address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="mt-2 bg-muted border-border rounded-xl"
            rows={3}
          />
        </div>

        {errors.submit && <p className="text-destructive text-sm mt-1">{errors.submit}</p>}
      </div>
    </MobileLayout>
  );
}