import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Camera, User } from 'lucide-react';

interface ProfileSetupScreenProps {
  onComplete: (data: { name: string; gender: string; birthday: string }) => void;
  isLoading?: boolean;
}

export function ProfileSetupScreen({ onComplete, isLoading }: ProfileSetupScreenProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [birthday, setBirthday] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!gender) newErrors.gender = 'Please select your gender';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onComplete({ name: name.trim(), gender, birthday });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="pt-12 pb-6 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-serif font-bold text-foreground mb-2"
        >
          Complete your profile
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          Help us personalize your experience.
        </motion.p>
      </div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="flex-1 px-6"
      >
        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md press-effect"
            >
              <Camera className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors(prev => ({ ...prev, name: '' }));
            }}
            className="mt-2 h-12 bg-muted border-border rounded-xl"
          />
          {errors.name && (
            <p className="text-destructive text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Gender Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-foreground">
            Gender
          </Label>
          <div className="flex gap-3 mt-2">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGender(g);
                  setErrors(prev => ({ ...prev, gender: '' }));
                }}
                className={`flex-1 h-12 rounded-xl border-2 font-medium capitalize transition-all press-effect ${
                  gender === g
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {errors.gender && (
            <p className="text-destructive text-sm mt-1">{errors.gender}</p>
          )}
        </div>

        {/* Birthday Input */}
        <div className="mb-6">
          <Label htmlFor="birthday" className="text-sm font-medium text-foreground">
            Birthday <span className="text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="mt-2 h-12 bg-muted border-border rounded-xl"
          />
        </div>
      </motion.form>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 safe-area-bottom"
      >
        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || !gender || isLoading}
          className="w-full h-14 text-base font-semibold gradient-primary shadow-primary press-effect disabled:opacity-50"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full"
            />
          ) : (
            <>
              Complete Setup
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
