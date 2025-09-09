import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, AlertTriangle, Clock, Star, MapPin, ArrowRight, Sparkles, Zap, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'admin' | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleRoleSelection = (role: 'citizen' | 'admin') => {
    setSelectedRole(role);
    // Add a small delay for animation before navigation
    setTimeout(() => {
      if (role === 'citizen') {
        window.location.href = '/citizen/auth';
      } else {
        window.location.href = '/admin/auth';
      }
    }, 300);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.02,
      y: -5,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-200 rounded-full opacity-20"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Header */}
      <motion.div 
        className="container mx-auto px-4 py-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        {/* Language Toggle */}
        <motion.div 
          className="flex justify-end mb-4"
          variants={itemVariants}
        >
          <LanguageToggle />
        </motion.div>
        
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-12"
          variants={itemVariants}
        >
          <motion.div 
            className="flex items-center justify-center mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.img 
              src="/src/assets/gov-logo.png" 
              alt="Government Logo" 
              className="w-12 h-12 sm:w-16 sm:h-16 mr-4" 
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            />
            <motion.img 
              src="/src/assets/crowdcare-logo.png" 
              alt="CrowdCare Logo" 
              className="w-12 h-12 sm:w-16 sm:h-16 mr-4" 
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ duration: 0.2 }}
            />
            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {t('landing.title')}
            </motion.h1>
          </motion.div>
          <motion.p 
            className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto px-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {t('landing.subtitle')}
          </motion.p>
        </motion.div>

        {/* Role Selection Cards */}
        <motion.div 
          className="max-w-6xl mx-auto"
          variants={containerVariants}
        >
          <motion.div 
            className="text-center mb-12"
            variants={itemVariants}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {t('landing.chooseRole')}
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              {t('landing.roleDescription')}
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16"
            variants={containerVariants}
          >
            {/* Citizen Card */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="group"
            >
              <Card className="h-full cursor-pointer border-2 border-transparent hover:border-blue-200 hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-6 pt-8">
                  <motion.div 
                    className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Users className="w-10 h-10 text-blue-600" />
                  </motion.div>
                  <CardTitle className="text-2xl sm:text-3xl text-gray-800 mb-3">{t('landing.citizen')}</CardTitle>
                  <CardDescription className="text-gray-600 text-lg">
                    {t('landing.citizenDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-8 pb-8">
                  <div className="space-y-4">
                    <motion.div 
                      className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="font-medium">{t('citizen.reportWithPhotos')}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <MapPin className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="font-medium">{t('citizen.gpsDetection')}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                        <Star className="w-4 h-4 text-yellow-500" />
                      </div>
                      <span className="font-medium">{t('citizen.aiDescriptions')}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <Clock className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="font-medium">{t('citizen.trackProgress')}</span>
                    </motion.div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={() => handleRoleSelection('citizen')}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {t('landing.continueAsCitizen')}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Admin Card */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="group"
            >
              <Card className="h-full cursor-pointer border-2 border-transparent hover:border-green-200 hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-6 pt-8">
                  <motion.div 
                    className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Shield className="w-10 h-10 text-green-600" />
                  </motion.div>
                  <CardTitle className="text-2xl sm:text-3xl text-gray-800 mb-3">{t('landing.admin')}</CardTitle>
                  <CardDescription className="text-gray-600 text-lg">
                    {t('landing.adminDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-8 pb-8">
                  <div className="space-y-4">
                    <motion.div 
                      className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="destructive" className="mr-3 w-8 h-8 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </Badge>
                      <span className="font-medium">{t('citizen.urgencyRanking')}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="secondary" className="mr-3 w-8 h-8 flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </Badge>
                      <span className="font-medium">{t('citizen.advancedFiltering')}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="outline" className="mr-3 w-8 h-8 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </Badge>
                      <span className="font-medium">{t('citizen.resolutionManagement')}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="default" className="mr-3 w-8 h-8 flex items-center justify-center">
                        <Star className="w-4 h-4" />
                      </Badge>
                      <span className="font-medium">{t('citizen.communityInsights')}</span>
                    </motion.div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={() => handleRoleSelection('admin')}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {t('landing.continueAsAdmin')}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Enhanced Features Section */}
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8 lg:p-12"
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            <motion.h3 
              className="text-3xl font-bold text-center mb-8 text-gray-800"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              {t('landing.howItWorks')}
            </motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              <motion.div 
                className="text-center group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                whileHover={{ y: -5 }}
              >
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-blue-600 font-bold text-xl">1</span>
                </motion.div>
                <h4 className="font-semibold text-gray-800 mb-3 text-lg">{t('landing.step1')}</h4>
                <p className="text-gray-600 leading-relaxed">
                  {t('landing.step1Desc')}
                </p>
              </motion.div>
              <motion.div 
                className="text-center group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.6 }}
                whileHover={{ y: -5 }}
              >
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-green-600 font-bold text-xl">2</span>
                </motion.div>
                <h4 className="font-semibold text-gray-800 mb-3 text-lg">{t('landing.step2')}</h4>
                <p className="text-gray-600 leading-relaxed">
                  {t('landing.step2Desc')}
                </p>
              </motion.div>
              <motion.div 
                className="text-center group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.8 }}
                whileHover={{ y: -5 }}
              >
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-purple-600 font-bold text-xl">3</span>
                </motion.div>
                <h4 className="font-semibold text-gray-800 mb-3 text-lg">{t('landing.step3')}</h4>
                <p className="text-gray-600 leading-relaxed">
                  {t('landing.step3Desc')}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
