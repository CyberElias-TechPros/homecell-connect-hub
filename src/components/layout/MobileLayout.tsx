import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  hasBottomNav?: boolean;
}

export function MobileLayout({ children, className = '', hasBottomNav = true }: MobileLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${hasBottomNav ? 'pb-20' : ''} ${className}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
  className?: string;
}

export function PageHeader({ title, subtitle, action, onBack, className = '' }: PageHeaderProps) {
  return (
    <header className={`sticky top-0 z-40 bg-background/95 backdrop-blur-sm safe-area-top ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors press-effect"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold font-serif text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}

interface SectionProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, action, children, className = '' }: SectionProps) {
  return (
    <section className={`px-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
