import { motion } from 'framer-motion';
import { UserRole } from '@/contexts/AuthContext';
import { 
  Users, 
  UserCheck, 
  Home, 
  MapPin, 
  Map, 
  Building2, 
  Shield, 
  Crown 
} from 'lucide-react';

interface RoleSelectionScreenProps {
  availableRoles: UserRole[];
  onSelectRole: (role: UserRole) => void;
}

const roleConfig: Record<UserRole, { label: string; description: string; icon: typeof Users; color: string }> = {
  member: { 
    label: 'Homecell Member', 
    description: 'Regular attendee of a homecell fellowship',
    icon: Users,
    color: 'bg-blue-500'
  },
  leader: { 
    label: 'Homecell Leader', 
    description: 'Lead and manage your homecell',
    icon: UserCheck,
    color: 'bg-green-500'
  },
  assistant: { 
    label: 'Assistant Leader', 
    description: 'Support the homecell leader',
    icon: UserCheck,
    color: 'bg-teal-500'
  },
  provider: { 
    label: 'Home Owner', 
    description: 'Host venue for homecell meetings',
    icon: Home,
    color: 'bg-amber-500'
  },
  zonal: { 
    label: 'Zonal Leader', 
    description: 'Oversee multiple homecells in a zone',
    icon: MapPin,
    color: 'bg-purple-500'
  },
  area: { 
    label: 'Area Fellowship Leader', 
    description: 'Manage an area fellowship',
    icon: Map,
    color: 'bg-indigo-500'
  },
  district: { 
    label: 'District Leader', 
    description: 'Oversee a district of area fellowships',
    icon: Building2,
    color: 'bg-rose-500'
  },
  admin: { 
    label: 'Church Admin', 
    description: 'Church-wide administrative access',
    icon: Shield,
    color: 'bg-slate-700'
  },
  superadmin: { 
    label: 'Super Admin', 
    description: 'Full system access',
    icon: Crown,
    color: 'bg-gradient-to-r from-amber-500 to-orange-500'
  },
};

export function RoleSelectionScreen({ availableRoles, onSelectRole }: RoleSelectionScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="pt-12 pb-6 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-serif font-bold text-foreground mb-2"
        >
          Select your role
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          You have access to multiple roles. Choose one to continue.
        </motion.p>
      </div>

      {/* Role List */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <div className="space-y-3">
          {availableRoles.map((role, index) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            
            return (
              <motion.button
                key={role}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onSelectRole(role)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-md transition-all press-effect"
              >
                <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">{config.label}</h3>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
