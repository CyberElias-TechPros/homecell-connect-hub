import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Phone } from 'lucide-react';

interface PhoneLoginScreenProps {
  onSubmit: (phone: string) => void;
  isLoading?: boolean;
}

export function PhoneLoginScreen({ onSubmit, isLoading }: PhoneLoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setError('');
    onSubmit(cleanPhone);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as XXX XXXX XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="pt-12 pb-6 px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-primary mb-6"
        >
          <Phone className="w-8 h-8 text-secondary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-serif font-bold text-foreground mb-2"
        >
          Enter your phone number
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          We'll send you a verification code to confirm your identity.
        </motion.p>
      </div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={handleSubmit}
        className="flex-1 px-6"
      >
        <div className="flex gap-3">
          {/* Country Code */}
          <div className="w-24">
            <div className="h-14 bg-muted rounded-xl flex items-center justify-center border border-border">
              <span className="text-lg">🇳🇬</span>
              <span className="ml-1 text-sm font-medium">+234</span>
            </div>
          </div>
          
          {/* Phone Input */}
          <div className="flex-1">
            <Input
              type="tel"
              placeholder="803 123 4567"
              value={phone}
              onChange={(e) => {
                setPhone(formatPhoneNumber(e.target.value));
                setError('');
              }}
              className="h-14 text-lg bg-muted border-border rounded-xl px-4"
              maxLength={13}
              autoFocus
            />
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-destructive text-sm mt-2"
          >
            {error}
          </motion.p>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.form>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 safe-area-bottom"
      >
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={phone.replace(/\s/g, '').length < 10 || isLoading}
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
              Send Code
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
