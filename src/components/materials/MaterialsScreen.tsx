import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useMaterials } from '@/contexts/MaterialsContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { AdminMaterialsDashboard } from './AdminMaterialsDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Headphones,
  FileType,
  Download,
  ChevronRight,
  Sparkles,
  CheckCircle,
  Archive,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function MaterialsScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    getAccessibleMaterials,
    getCurrentWeekMaterials,
    downloadMaterial,
    acknowledgeMaterial,
    isMaterialAcknowledged,
    canUploadMaterials,
    canDownloadMaterials,
    canAcknowledgeMaterials,
    isLoading
  } = useMaterials();
  const { hasRole } = usePermissions();

  const accessibleMaterials = getAccessibleMaterials();
  const currentWeekMaterials = getCurrentWeekMaterials();
  const archiveMaterials = accessibleMaterials.filter(m => !currentWeekMaterials.includes(m));

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

  const handleDownload = async (materialId: string) => {
    try {
      await downloadMaterial(materialId);
      toast({
        title: "Download Started",
        description: "Material is being downloaded for offline access.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download material. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAcknowledge = async (materialId: string) => {
    try {
      await acknowledgeMaterial(materialId);
      toast({
        title: "Acknowledged",
        description: "Material has been acknowledged.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge material.",
        variant: "destructive"
      });
    }
  };

  // Show admin dashboard for admins
  if (hasRole('admin') || hasRole('super_admin')) {
    return <AdminMaterialsDashboard />;
  }

  // Show provider view
  if (hasRole('provider')) {
    return (
      <MobileLayout>
        <PageHeader
          title="This Week's Materials"
          subtitle="Study guides for your homecell"
          onBack={() => navigate(-1)}
        />

        <Section className="mb-6">
          {currentWeekMaterials.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No materials available for this week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentWeekMaterials.map((material, index) => {
                const FormatIcon = getFormatIcon(material.format);
                const formatColor = getFormatColor(material.format);
                const acknowledged = isMaterialAcknowledged(material.id);

                return (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="gradient-primary rounded-2xl p-5 text-primary-foreground relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-secondary" />
                        <span className="text-sm font-medium text-secondary">This Week</span>
                      </div>
                      <h3 className="text-lg font-serif font-bold mb-2">
                        {material.title}
                      </h3>
                      <p className="text-sm text-primary-foreground/70 mb-4">
                        {material.description}
                      </p>

                      <div className="flex items-center gap-3">
                        {canDownloadMaterials && (
                          <Button
                            onClick={() => handleDownload(material.id)}
                            disabled={isLoading}
                            variant="secondary"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}

                        {material.requiresAcknowledgment && canAcknowledgeMaterials && (
                          <Button
                            onClick={() => handleAcknowledge(material.id)}
                            disabled={acknowledged || isLoading}
                            variant={acknowledged ? "outline" : "default"}
                            size="sm"
                          >
                            {acknowledged ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Acknowledged
                              </>
                            ) : (
                              'Acknowledge'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Section>

        <BottomNavigation />
      </MobileLayout>
    );
  }

  // Show leader/assistant view with tabs
  return (
    <MobileLayout>
      <PageHeader
        title="Materials"
        subtitle="Study guides & resources"
        onBack={() => navigate(-1)}
      />

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="current">This Week ({currentWeekMaterials.length})</TabsTrigger>
          <TabsTrigger value="archive">Archive ({archiveMaterials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {currentWeekMaterials.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No materials available for this week.</p>
            </div>
          ) : (
            currentWeekMaterials.map((material, index) => {
              const FormatIcon = getFormatIcon(material.format);
              const formatColor = getFormatColor(material.format);

              return (
                <motion.div
                  key={material.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="gradient-primary rounded-2xl p-5 text-primary-foreground relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-secondary" />
                      <span className="text-sm font-medium text-secondary">This Week</span>
                    </div>
                    <h3 className="text-lg font-serif font-bold mb-2">
                      {material.title}
                    </h3>
                    <p className="text-sm text-primary-foreground/70 mb-4">
                      {material.description}
                    </p>
                    {canDownloadMaterials && (
                      <Button
                        onClick={() => handleDownload(material.id)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-medium text-sm press-effect"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="archive" className="space-y-4">
          {archiveMaterials.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No archived materials available.</p>
            </div>
          ) : (
            archiveMaterials.map((material, index) => {
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
                        <Badge variant="secondary" className="text-xs">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{material.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {material.format}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {material.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(material.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {canDownloadMaterials && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(material.id)}
                      disabled={isLoading}
                    >
                      <Download className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  )}
                </motion.div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <BottomNavigation />
    </MobileLayout>
  );
}
