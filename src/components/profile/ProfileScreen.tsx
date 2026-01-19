import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  User, 
  Phone, 
  Calendar, 
  MapPin,
  Save,
  CheckCircle2
} from 'lucide-react';

export function ProfileScreen() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    name: 'Pastor David Okonkwo',
    phone: '+234 803 123 4567',
    email: 'david.okonkwo@email.com',
    gender: 'Male',
    birthday: '1985-03-15',
    address: '15 Harmony Close, Lekki Phase 1, Lagos',
    role: 'Homecell Leader',
    homecell: 'Victory House Fellowship',
    zone: 'Zone A - Lekki',
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Profile"
        onBack={() => navigate(-1)}
        action={
          isEditing ? (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gradient-primary shadow-primary press-effect"
            >
              {isSaving ? (
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
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="press-effect"
            >
              Edit
            </Button>
          )
        }
      />

      <div className="p-4 pb-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-28 h-28 gradient-primary rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-primary-foreground">PD</span>
            </div>
            {isEditing && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute bottom-0 right-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center shadow-lg press-effect"
              >
                <Camera className="w-5 h-5 text-secondary-foreground" />
              </motion.button>
            )}
          </div>
          <h2 className="text-xl font-serif font-bold text-foreground">{profile.name}</h2>
          <p className="text-muted-foreground">{profile.role}</p>
        </div>

        {/* Role Info Card */}
        <Section className="mb-6">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-medium text-foreground">{profile.role}</span>
            </div>
            <p className="text-sm text-muted-foreground">{profile.homecell}</p>
            <p className="text-xs text-muted-foreground">{profile.zone}</p>
          </div>
        </Section>

        {/* Personal Information */}
        <Section title="Personal Information" className="mb-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              {isEditing ? (
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-2 h-12 bg-muted border-border rounded-xl"
                />
              ) : (
                <p className="mt-1 text-foreground">{profile.name}</p>
              )}
            </div>

            <div>
              <Label className="text-sm flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <p className="mt-1 text-foreground">{profile.phone}</p>
            </div>

            <div>
              <Label className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Birthday
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={profile.birthday}
                  onChange={(e) => setProfile(prev => ({ ...prev, birthday: e.target.value }))}
                  className="mt-2 h-12 bg-muted border-border rounded-xl"
                />
              ) : (
                <p className="mt-1 text-foreground">
                  {new Date(profile.birthday).toLocaleDateString('en-NG', { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </Label>
              {isEditing ? (
                <Input
                  value={profile.address}
                  onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                  className="mt-2 h-12 bg-muted border-border rounded-xl"
                />
              ) : (
                <p className="mt-1 text-foreground">{profile.address}</p>
              )}
            </div>
          </div>
        </Section>
      </div>
    </MobileLayout>
  );
}
