import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Settings, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Save,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService, type User as ApiUser } from '@/lib/api';

interface PersonalDetailsSettingsProps {
  user: ApiUser | null;
  onUserUpdate?: (updatedUser: ApiUser) => void;
}

export default function PersonalDetailsSettings({ user, onUserUpdate }: PersonalDetailsSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_number: ''
  });

  const { toast } = useToast();

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        mobile_number: user.mobile_number || ''
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Try to call the actual API endpoint first
      try {
        const updatedUser = await apiService.updateUserProfile({
          full_name: formData.full_name,
          email: formData.email,
          mobile_number: formData.mobile_number
        });
        
        // Update local storage with new user data
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Notify parent component of the update
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }
        
        toast({
          title: 'Profile Updated',
          description: 'Your personal details have been updated successfully.',
        });
        
        setIsOpen(false);
      } catch (apiError) {
        // If API call fails, fall back to local storage update
        console.warn('API update failed, updating locally:', apiError);
        
        const updatedUser = {
          ...user,
          full_name: formData.full_name,
          email: formData.email,
          mobile_number: formData.mobile_number
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Notify parent component of the update
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }
        
        toast({
          title: 'Profile Updated Locally',
          description: 'Your personal details have been updated locally. Changes will sync when the server is available.',
        });
        
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        mobile_number: user.mobile_number || ''
      });
    }
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <UserIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{user.full_name || 'User'}</span>
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[92vw] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Personal Details
          </DialogTitle>
          <DialogDescription>
            Update your personal information and account details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="pl-10"
                placeholder="Enter your full name"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10"
                placeholder="Enter your email"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mobile_number">Mobile Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="mobile_number"
                type="tel"
                value={formData.mobile_number}
                onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                className="pl-10"
                placeholder="Enter your mobile number"
              />
            </div>
          </div>
          
          {/* Role and Department Info (Read-only) */}
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700 capitalize">
              {user.role}
            </div>
          </div>
          
          {user.department_name && (
            <div className="space-y-2">
              <Label>Department</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                {user.department_name}
              </div>
            </div>
          )}
          
          {user.municipality_name && (
            <div className="space-y-2">
              <Label>Municipality</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                {user.municipality_name}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
