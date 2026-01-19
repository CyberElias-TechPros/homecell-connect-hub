import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFollowUps } from '@/contexts/FollowUpsContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Phone, MapPin, MessageSquare, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function AddFirstTimerScreen() {
  const navigate = useNavigate();
  const { createFollowUp, canCreateFollowUp } = useFollowUps();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    memberName: '',
    phone: '',
    address: '',
    assignedTo: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock members for assignment (in real app, this would come from MembersContext)
  const mockMembers = [
    { id: 'm1', name: 'Adebayo Johnson', role: 'leader' },
    { id: 'm2', name: 'Chidinma Okafor', role: 'assistant' },
    { id: 'm3', name: 'Emmanuel Nwachukwu', role: 'assistant' },
    { id: 'm4', name: 'Folake Adeleke', role: 'provider' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.memberName.trim()) {
      newErrors.memberName = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Please assign this follow-up to someone';
    }

    if (!formData.notes.trim()) {
      newErrors.notes = 'Notes are required to help with follow-up';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateFollowUp()) {
      toast.error('You do not have permission to create follow-ups');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedMember = mockMembers.find(m => m.id === formData.assignedTo);
      if (!assignedMember) {
        throw new Error('Assigned member not found');
      }

      await createFollowUp({
        memberName: formData.memberName,
        phone: formData.phone,
        address: formData.address || undefined,
        assignedTo: formData.assignedTo,
        assignedToName: assignedMember.name,
        assignedBy: user?.id || 'unknown',
        assignedByName: user?.name || 'Unknown',
        status: 'pending',
        priority: formData.priority,
        notes: formData.notes,
        createdBy: user?.id || 'unknown',
        updatedBy: user?.id || 'unknown',
        tags: [],
      });

      toast.success('First-timer follow-up created successfully!');
      navigate('/followups');
    } catch (error) {
      console.error('Error creating follow-up:', error);
      toast.error('Failed to create follow-up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
  ];

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Add First-Timer"
        subtitle="Create a new follow-up"
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="px-4 pb-8">
        <div className="space-y-6">
          {/* Basic Information */}
          <Section title="Basic Information">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  First-Timer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="memberName" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name *
                  </Label>
                  <Input
                    id="memberName"
                    value={formData.memberName}
                    onChange={(e) => handleInputChange('memberName', e.target.value)}
                    placeholder="Enter full name"
                    className={errors.memberName ? 'border-red-500' : ''}
                  />
                  {errors.memberName && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.memberName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+234 xxx xxx xxxx"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address (Optional)
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter address for home visits"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Assignment & Priority */}
          <Section title="Assignment & Priority">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Follow-up Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="assignedTo">Assign To *</Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value) => handleInputChange('assignedTo', value)}
                  >
                    <SelectTrigger className={errors.assignedTo ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select who will handle this follow-up" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <span>{member.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {member.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.assignedTo && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.assignedTo}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') =>
                      handleInputChange('priority', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <Badge className={option.color}>
                            {option.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Notes */}
          <Section title="Additional Information">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Follow-up Notes *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Add any relevant information about this first-timer (how they came, interests, concerns, etc.)"
                    rows={4}
                    className={errors.notes ? 'border-red-500' : ''}
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Follow-up...' : 'Create Follow-up'}
            </Button>
          </div>
        </div>
      </form>
    </MobileLayout>
  );
}