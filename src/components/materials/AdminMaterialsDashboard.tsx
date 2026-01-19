import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMaterials } from '@/contexts/MaterialsContext';
import { Material } from '@/types';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Upload,
  FileText,
  Headphones,
  FileType,
  Calendar,
  Users,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminMaterialsDashboard() {
  const {
    materials,
    uploadMaterial,
    updateMaterial,
    deleteMaterial,
    publishMaterial,
    scheduleMaterial,
    isLoading
  } = useMaterials();
  const { toast } = useToast();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    type: 'weekly' as Material['type'],
    format: 'pdf' as Material['format'],
    targetAudience: 'all' as Material['targetAudience'],
    scheduledAt: '',
    requiresAcknowledgment: false,
    file: null as File | null
  });

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return FileText;
      case 'audio': return Headphones;
      default: return FileType;
    }
  };

  const getStatusBadge = (material: Material) => {
    const now = new Date();
    const publishedDate = new Date(material.publishedAt);
    const scheduledDate = material.scheduledAt ? new Date(material.scheduledAt) : null;

    if (!material.isPublished && scheduledDate && scheduledDate > now) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
    } else if (material.isPublished) {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Published</Badge>;
    } else {
      return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Draft</Badge>;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.description || !uploadForm.file) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select a file.",
        variant: "destructive"
      });
      return;
    }

    try {
      const materialData = {
        title: uploadForm.title,
        description: uploadForm.description,
        type: uploadForm.type,
        format: uploadForm.format,
        url: '#', // In real app, this would be the uploaded file URL
        fileSize: uploadForm.file.size,
        publishedAt: uploadForm.scheduledAt || new Date().toISOString(), // Use scheduled date or now
        targetAudience: uploadForm.targetAudience,
        isNew: true,
        isPublished: false,
        createdBy: 'admin1', // In real app, get from auth context
        createdByName: 'Admin User',
        requiresAcknowledgment: uploadForm.requiresAcknowledgment,
        ...(uploadForm.scheduledAt && { scheduledAt: uploadForm.scheduledAt })
      };

      await uploadMaterial(materialData);

      toast({
        title: "Success",
        description: "Material uploaded successfully.",
      });

      setIsUploadDialogOpen(false);
      setUploadForm({
        title: '',
        description: '',
        type: 'weekly',
        format: 'pdf',
        targetAudience: 'all',
        scheduledAt: '',
        requiresAcknowledgment: false,
        file: null
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload material.",
        variant: "destructive"
      });
    }
  };

  const handlePublish = async (materialId: string) => {
    try {
      await publishMaterial(materialId);
      toast({
        title: "Success",
        description: "Material published successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish material.",
        variant: "destructive"
      });
    }
  };

  const handleSchedule = async (materialId: string, scheduledAt: string) => {
    try {
      await scheduleMaterial(materialId, scheduledAt);
      toast({
        title: "Success",
        description: "Material scheduled successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule material.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      await deleteMaterial(materialId);
      toast({
        title: "Success",
        description: "Material deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete material.",
        variant: "destructive"
      });
    }
  };

  const publishedMaterials = materials.filter(m => m.isPublished);
  const draftMaterials = materials.filter(m => !m.isPublished);
  const scheduledMaterials = materials.filter(m =>
    !m.isPublished && m.scheduledAt && new Date(m.scheduledAt) > new Date()
  );

  return (
    <MobileLayout>
      <PageHeader
        title="Materials Management"
        subtitle="Upload and manage study materials"
      />

      <Section className="mb-6">
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Upload New Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Material</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter material title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter material description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={uploadForm.type} onValueChange={(value: Material['type']) =>
                    setUploadForm(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select value={uploadForm.format} onValueChange={(value: Material['format']) =>
                    setUploadForm(prev => ({ ...prev, format: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select value={uploadForm.targetAudience} onValueChange={(value: Material['targetAudience']) =>
                  setUploadForm(prev => ({ ...prev, targetAudience: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="leaders">Leaders</SelectItem>
                    <SelectItem value="assistants">Assistants</SelectItem>
                    <SelectItem value="providers">Providers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scheduledAt">Schedule Publication (Optional)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={uploadForm.scheduledAt}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requiresAcknowledgment"
                  checked={uploadForm.requiresAcknowledgment}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, requiresAcknowledgment: e.target.checked }))}
                />
                <Label htmlFor="requiresAcknowledgment">Requires acknowledgment</Label>
              </div>

              <div>
                <Label htmlFor="file">File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.mp3,.txt"
                  onChange={handleFileUpload}
                />
              </div>

              <Button onClick={handleUpload} disabled={isLoading} className="w-full">
                {isLoading ? 'Uploading...' : 'Upload Material'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Section>

      <Tabs defaultValue="published" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="published">Published ({publishedMaterials.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduledMaterials.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftMaterials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="space-y-4">
          {publishedMaterials.map((material) => {
            const FormatIcon = getFormatIcon(material.format);
            return (
              <Card key={material.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FormatIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{material.title}</h3>
                        {getStatusBadge(material)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {material.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{material.type}</span>
                        <span>•</span>
                        <span className="capitalize">{material.format}</span>
                        <span>•</span>
                        <Users className="w-3 h-3" />
                        <span className="capitalize">{material.targetAudience}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(material.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledMaterials.map((material) => {
            const FormatIcon = getFormatIcon(material.format);
            return (
              <Card key={material.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FormatIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{material.title}</h3>
                        {getStatusBadge(material)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {material.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Scheduled for {new Date(material.scheduledAt!).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePublish(material.id)}
                      >
                        Publish Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {draftMaterials.map((material) => {
            const FormatIcon = getFormatIcon(material.format);
            return (
              <Card key={material.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FormatIcon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{material.title}</h3>
                        {getStatusBadge(material)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {material.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{material.type}</span>
                        <span>•</span>
                        <span className="capitalize">{material.format}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePublish(material.id)}
                      >
                        Publish
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(material.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </MobileLayout>
  );
}