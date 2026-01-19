import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplashScreen } from '@/components/onboarding/SplashScreen';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { PhoneLoginScreen } from '@/components/onboarding/PhoneLoginScreen';
import { OTPVerificationScreen } from '@/components/onboarding/OTPVerificationScreen';
import { RoleSelectionScreen } from '@/components/onboarding/RoleSelectionScreen';
import { ProfileSetupScreen } from '@/components/onboarding/ProfileSetupScreen';
import { useAuth, UserRole } from '@/contexts/AuthContext';

type OnboardingStep = 'splash' | 'welcome' | 'phone' | 'otp' | 'role' | 'profile';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { login, verifyOTP, selectRole, updateProfile, isLoading } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [phone, setPhone] = useState('');

  // Show splash for 2 seconds then move to welcome
  useEffect(() => {
    if (step === 'splash') {
      const timer = setTimeout(() => {
        setStep('welcome');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handlePhoneSubmit = async (phoneNumber: string) => {
    setPhone(phoneNumber);
    await login(phoneNumber);
    setStep('otp');
  };

  const handleOTPVerify = async (otp: string) => {
    const isValid = await verifyOTP(otp);
    if (isValid) {
      // For demo, show role selection if user has multiple roles
      // In production, this would be determined by the backend
      setStep('role');
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    selectRole(role);
    setStep('profile');
  };

  const handleProfileComplete = (data: { name: string; gender: string; birthday: string }) => {
    updateProfile({
      name: data.name,
      homecellId: 'hc-001',
      homecellName: 'Victory House Fellowship',
      zoneName: 'Zone A - Lekki',
    });
    navigate('/dashboard');
  };

  // Available roles for demo (in production, this comes from backend)
  const availableRoles: UserRole[] = ['leader', 'assistant', 'provider'];

  switch (step) {
    case 'splash':
      return <SplashScreen />;
    case 'welcome':
      return <WelcomeScreen onContinue={() => setStep('phone')} />;
    case 'phone':
      return <PhoneLoginScreen onSubmit={handlePhoneSubmit} isLoading={isLoading} />;
    case 'otp':
      return (
        <OTPVerificationScreen
          phone={phone}
          onVerify={handleOTPVerify}
          onResend={() => login(phone)}
          isLoading={isLoading}
        />
      );
    case 'role':
      return (
        <RoleSelectionScreen
          availableRoles={availableRoles}
          onSelectRole={handleRoleSelect}
        />
      );
    case 'profile':
      return <ProfileSetupScreen onComplete={handleProfileComplete} isLoading={isLoading} />;
    default:
      return <SplashScreen />;
  }
}
