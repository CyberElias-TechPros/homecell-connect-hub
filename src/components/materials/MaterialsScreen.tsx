import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { mockMaterials } from '@/data/mockData';
import { 
  FileText, 
  Headphones, 
  FileType,
  Download,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export function MaterialsScreen() {
  const navigate = useNavigate();

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return FileText;
      case 'audio':
        return Headphones;
      default:
        return FileType;
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'bg-red-500';
      case 'audio':
        return 'bg-purple-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <MobileLayout>
      <PageHeader 
        title="Materials" 
        subtitle="Study guides & resources"
        onBack={() => navigate(-1)}
      />

      {/* Featured Material */}
      <Section className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-primary rounded-2xl p-5 text-primary-foreground relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">This Week</span>
            </div>
            <h3 className="text-lg font-serif font-bold mb-2">
              {mockMaterials[0].title}
            </h3>
            <p className="text-sm text-primary-foreground/70 mb-4">
              {mockMaterials[0].description}
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-medium text-sm press-effect">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </motion.div>
      </Section>

      {/* All Materials */}
      <Section title="All Materials" className="mb-6">
        <div className="space-y-3">
          {mockMaterials.map((material, index) => {
            const FormatIcon = getFormatIcon(material.format);
            const formatColor = getFormatColor(material.format);

            return (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border press-effect cursor-pointer"
              >
                <div className={`w-12 h-12 ${formatColor} rounded-xl flex items-center justify-center`}>
                  <FormatIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{material.title}</h3>
                    {material.isNew && (
                      <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-medium rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{material.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 ${formatColor}/20 text-${formatColor.replace('bg-', '')} text-[10px] font-medium rounded capitalize`}>
                      {material.format}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">{material.type}</span>
                  </div>
                </div>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}
