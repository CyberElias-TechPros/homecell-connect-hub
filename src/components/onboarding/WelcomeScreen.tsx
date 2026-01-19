import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-32 h-32 gradient-primary rounded-[2rem] flex items-center justify-center shadow-primary mb-8"
        >
          <svg 
            className="w-20 h-20 text-secondary" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" 
            />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-serif font-bold text-foreground text-center mb-3"
        >
          Welcome to<br />Homecell Connect
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-muted-foreground text-center max-w-xs mb-8"
        >
          Empowering pastoral oversight, accurate reporting, and spiritual growth across all homecells.
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-sm space-y-3"
        >
          {[
            { icon: '📊', text: 'Track attendance & growth' },
            { icon: '📝', text: 'Submit weekly reports' },
            { icon: '👥', text: 'Manage your homecell' },
            { icon: '📢', text: 'Stay connected with updates' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
              className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3"
            >
              <span className="text-xl">{feature.icon}</span>
              <span className="text-sm text-foreground">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="p-6 safe-area-bottom"
      >
        <Button 
          onClick={onContinue}
          className="w-full h-14 text-base font-semibold gradient-primary shadow-primary press-effect"
        >
          Get Started
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Winners Chapel Nigeria
        </p>
      </motion.div>
    </div>
  );
}
