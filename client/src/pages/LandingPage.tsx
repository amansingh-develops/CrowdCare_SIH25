import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, AlertTriangle, Clock, Star, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function LandingPage() {
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'admin' | null>(null);
  const { t } = useLanguage();

  const handleRoleSelection = (role: 'citizen' | 'admin') => {
    setSelectedRole(role);
    // Navigate to appropriate registration/login page
    if (role === 'citizen') {
      window.location.href = '/citizen/auth';
    } else {
      window.location.href = '/admin/auth';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>
        
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/src/assets/gov-logo.png" 
              alt="Government Logo" 
              className="w-10 h-10 sm:w-12 sm:h-12 mr-3" 
            />
            <img 
              src="/src/assets/crowdcare-logo.png" 
              alt="CrowdCare Logo" 
              className="w-10 h-10 sm:w-12 sm:h-12 mr-3" 
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('landing.title')}</h1>
          </div>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            {t('landing.subtitle')}
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t('landing.chooseRole')}</h2>
            <p className="text-gray-600">{t('landing.roleDescription')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12">
            {/* Citizen Card */}
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer border-2 hover:border-blue-200">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-gray-800">{t('landing.citizen')}</CardTitle>
                <CardDescription className="text-gray-600">
                  {t('landing.citizenDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                    {t('citizen.reportWithPhotos')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-green-500 mr-2" />
                    {t('citizen.gpsDetection')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="w-4 h-4 text-yellow-500 mr-2" />
                    {t('citizen.aiDescriptions')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-blue-500 mr-2" />
                    {t('citizen.trackProgress')}
                  </div>
                </div>
                <Button 
                  onClick={() => handleRoleSelection('citizen')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {t('landing.continueAsCitizen')}
                </Button>
              </CardContent>
            </Card>

            {/* Admin Card */}
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer border-2 hover:border-green-200">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-gray-800">{t('landing.admin')}</CardTitle>
                <CardDescription className="text-gray-600">
                  {t('landing.adminDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Badge variant="destructive" className="mr-2">{t('severity.critical')}</Badge>
                    {t('citizen.urgencyRanking')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Badge variant="secondary" className="mr-2">{t('common.filter')}</Badge>
                    {t('citizen.advancedFiltering')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Badge variant="outline" className="mr-2">{t('common.view')}</Badge>
                    {t('citizen.resolutionManagement')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Badge variant="default" className="mr-2">Analytics</Badge>
                    {t('citizen.communityInsights')}
                  </div>
                </div>
                <Button 
                  onClick={() => handleRoleSelection('admin')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {t('landing.continueAsAdmin')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Section */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h3 className="text-xl font-semibold text-center mb-6 text-gray-800">
              {t('landing.howItWorks')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-800 mb-2">{t('landing.step1')}</h4>
                <p className="text-sm text-gray-600">
                  {t('landing.step1Desc')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-800 mb-2">{t('landing.step2')}</h4>
                <p className="text-sm text-gray-600">
                  {t('landing.step2Desc')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-800 mb-2">{t('landing.step3')}</h4>
                <p className="text-sm text-gray-600">
                  {t('landing.step3Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
