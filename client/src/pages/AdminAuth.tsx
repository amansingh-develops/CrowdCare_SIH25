import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ArrowLeft, Eye, EyeOff, Phone, Mail, User, Lock, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { apiService } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

interface AdminRegistrationData {
  adminId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  municipalityName: string;
  departmentName: string;
  password: string;
  confirmPassword: string;
}

interface AdminLoginData {
  email: string;
  password: string;
}

export default function AdminAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const { toast } = useToast();
  const { login, register, isLoginLoading, isRegisterLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const [registrationData, setRegistrationData] = useState<AdminRegistrationData>({
    adminId: '',
    fullName: '',
    email: '',
    mobileNumber: '',
    municipalityName: '',
    departmentName: '',
    password: '',
    confirmPassword: ''
  });

  const [loginData, setLoginData] = useState<AdminLoginData>({
    email: '',
    password: ''
  });

  const handleRegistrationChange = (field: keyof AdminRegistrationData, value: string) => {
    setRegistrationData(prev => ({ ...prev, [field]: value }));
  };

  const handleLoginChange = (field: keyof AdminLoginData, value: string) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
  };

  // Load departments on component mount
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const depts = await apiService.getAllDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error('Error loading departments:', error);
        toast({
          title: 'Warning',
          description: 'Could not load departments. Please refresh the page.',
          variant: 'destructive'
        });
      }
    };

    loadDepartments();
  }, [toast]);

  const validateRegistration = (): boolean => {
    if (!registrationData.adminId.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Admin ID is required for verification',
        variant: 'destructive'
      });
      return false;
    }

    if (!registrationData.fullName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Full name is required',
        variant: 'destructive'
      });
      return false;
    }

    if (!registrationData.email.trim() || !/\S+@\S+\.\S+/.test(registrationData.email)) {
      toast({
        title: 'Validation Error',
        description: 'Valid email is required',
        variant: 'destructive'
      });
      return false;
    }

    if (!registrationData.mobileNumber.trim() || registrationData.mobileNumber.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Valid mobile number is required',
        variant: 'destructive'
      });
      return false;
    }

    if (!registrationData.municipalityName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Municipality name is required',
        variant: 'destructive'
      });
      return false;
    }

    if (!registrationData.departmentName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Department selection is required',
        variant: 'destructive'
      });
      return false;
    }

    if (registrationData.password.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      });
      return false;
    }

    if (registrationData.password !== registrationData.confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleSendOTP = async () => {
    if (!registrationData.mobileNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your mobile number first',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Simulate OTP sending (in real app, this would call backend)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOtpSent(true);
      toast({
        title: 'OTP Sent',
        description: `OTP sent to ${registrationData.mobileNumber}. Use 123456 for testing.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send OTP. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleRegistration = async () => {
    if (!validateRegistration()) return;

    if (!otpSent) {
      await handleSendOTP();
      return;
    }

    if (otp !== '123456') {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the correct OTP',
        variant: 'destructive'
      });
      return;
    }

    try {
      await register({
        full_name: registrationData.fullName,
        email: registrationData.email,
        mobile_number: registrationData.mobileNumber,
        password: registrationData.password,
        confirm_password: registrationData.confirmPassword,
        role: 'admin',
        admin_id: registrationData.adminId,
        municipality_name: registrationData.municipalityName,
        department_name: registrationData.departmentName
      });
      
      toast({
        title: 'Registration Successful',
        description: 'Welcome to CrowdCare Admin Portal! Please login to continue.'
      });

      // Switch to login tab
      setIsLogin(true);
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleLogin = async () => {
    if (!loginData.email.trim() || !loginData.password.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      await login({
        email: loginData.email,
        password: loginData.password,
        role: 'admin'
      });
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back! Redirecting to your dashboard...'
      });

      // Redirect to admin dashboard
      setTimeout(() => {
        setLocation('/admin/dashboard');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language Toggle and Back Button */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <LanguageToggle />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Admin Portal</CardTitle>
            <CardDescription>
              Manage and prioritize community issues for efficient resolution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(value) => setIsLogin(value === 'login')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={(e) => handleLoginChange('email', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => handleLoginChange('password', e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleLogin}
                    disabled={isLoginLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoginLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </div>
              </TabsContent>

              {/* Registration Tab */}
              <TabsContent value="register" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminId">Admin ID *</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="adminId"
                        type="text"
                        placeholder="Enter your admin ID"
                        value={registrationData.adminId}
                        onChange={(e) => handleRegistrationChange('adminId', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Required for admin verification</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        value={registrationData.fullName}
                        onChange={(e) => handleRegistrationChange('fullName', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={registrationData.email}
                        onChange={(e) => handleRegistrationChange('email', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="mobileNumber"
                        type="tel"
                        placeholder="Enter your mobile number"
                        value={registrationData.mobileNumber}
                        onChange={(e) => handleRegistrationChange('mobileNumber', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="municipalityName">Municipality Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="municipalityName"
                        type="text"
                        placeholder="Enter municipality name"
                        value={registrationData.municipalityName}
                        onChange={(e) => handleRegistrationChange('municipalityName', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departmentName">Department *</Label>
                    <Select 
                      value={registrationData.departmentName} 
                      onValueChange={(value) => handleRegistrationChange('departmentName', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name} - {dept.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Required for admin verification</p>
                  </div>
                  
                  {otpSent && (
                    <div className="space-y-2">
                      <Label htmlFor="otp">OTP Verification</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter OTP (use 123456 for testing)"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                      <Alert>
                        <AlertDescription>
                          OTP sent to {registrationData.mobileNumber}. Use 123456 for testing.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={registrationData.password}
                        onChange={(e) => handleRegistrationChange('password', e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={registrationData.confirmPassword}
                        onChange={(e) => handleRegistrationChange('confirmPassword', e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleRegistration}
                    disabled={isRegisterLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isRegisterLoading ? 'Processing...' : otpSent ? 'Complete Registration' : 'Send OTP & Continue'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
