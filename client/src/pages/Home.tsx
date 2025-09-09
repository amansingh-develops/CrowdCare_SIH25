import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleToggle } from "@/components/RoleToggle";
import { CitizenPanel } from "@/components/CitizenPanel";
import { AdminPanel } from "@/components/AdminPanel";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type UserRole = 'citizen' | 'admin';

export default function Home() {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('citizen');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/logout";
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

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Enhanced Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-md border-b border-border shadow-lg sticky top-0 z-50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo Section */}
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.img 
                src="/src/assets/gov-logo.png" 
                alt="Government Logo" 
                className="w-8 h-8 lg:w-10 lg:h-10" 
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              />
              <motion.img 
                src="/src/assets/crowdcare-logo.png" 
                alt="CrowdCare Logo" 
                className="w-8 h-8 lg:w-10 lg:h-10" 
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ duration: 0.2 }}
              />
              <motion.h1 
                className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                CrowdCare
              </motion.h1>
            </motion.div>
            
            {/* Desktop Navigation */}
            <motion.div 
              className="hidden lg:flex items-center space-x-6"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {/* Role Toggle */}
              <RoleToggle
                currentRole={currentRole}
                onRoleChange={setCurrentRole}
                data-testid="role-toggle"
              />
              
              {/* User Menu */}
              <div className="flex items-center space-x-4">
                {user?.profileImageUrl && (
                  <motion.img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md"
                    data-testid="img-user-avatar"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <div className="text-sm">
                  <div className="font-semibold text-foreground" data-testid="text-user-name">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-muted-foreground text-xs" data-testid="text-user-role">
                    {user?.role === 'citizen' ? 'Community Member' : 'Administrator'}
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-2 bg-white/50 hover:bg-white/80 border-gray-200"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Mobile Menu Button */}
            <motion.button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                className="lg:hidden border-t border-border bg-white/95 backdrop-blur-md"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="py-4 space-y-4">
                  {/* Mobile Role Toggle */}
                  <div className="px-4">
                    <RoleToggle
                      currentRole={currentRole}
                      onRoleChange={setCurrentRole}
                      data-testid="mobile-role-toggle"
                    />
                  </div>
                  
                  {/* Mobile User Info */}
                  <div className="px-4 flex items-center space-x-3">
                    {user?.profileImageUrl && (
                      <img
                        src={user.profileImageUrl}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    )}
                    <div>
                      <div className="font-semibold text-foreground">
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user?.role === 'citizen' ? 'Community Member' : 'Administrator'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Logout Button */}
                  <div className="px-4">
                    <Button
                      variant="outline"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        <motion.div variants={itemVariants}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRole}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {currentRole === 'citizen' ? <CitizenPanel /> : <AdminPanel />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.main>

      {/* Enhanced Footer */}
      <motion.footer 
        className="bg-white/80 backdrop-blur-md border-t border-border mt-16"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <motion.img 
                  src="/src/assets/gov-logo.png" 
                  alt="Government Logo" 
                  className="w-8 h-8" 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.img 
                  src="/src/assets/crowdcare-logo.png" 
                  alt="CrowdCare Logo" 
                  className="w-8 h-8" 
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ duration: 0.2 }}
                />
                <h3 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  CrowdCare
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empowering communities to improve their neighborhoods through collaborative issue reporting and resolution.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
            >
              <h4 className="font-semibold mb-6 text-lg">Quick Links</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <motion.li 
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <a href="#" className="hover:text-primary transition-colors duration-200">
                    How It Works
                  </a>
                </motion.li>
                <motion.li 
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <a href="#" className="hover:text-primary transition-colors duration-200">
                    Privacy Policy
                  </a>
                </motion.li>
                <motion.li 
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <a href="#" className="hover:text-primary transition-colors duration-200">
                    Terms of Service
                  </a>
                </motion.li>
                <motion.li 
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <a href="#" className="hover:text-primary transition-colors duration-200">
                    Contact Support
                  </a>
                </motion.li>
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <h4 className="font-semibold mb-6 text-lg">Connect</h4>
              <div className="flex space-x-4">
                {[
                  { name: "Twitter", path: "M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" },
                  { name: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                  { name: "Pinterest", path: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.219-.359-1.219c0-1.142.662-1.995 1.488-1.995.703 0 1.042.527 1.042 1.16 0 .705-.449 1.759-.681 2.735-.194.824.412 1.496 1.224 1.496 1.47 0 2.458-1.724 2.458-3.946 0-1.642-1.107-2.878-3.119-2.878-2.261 0-3.666 1.668-3.666 3.53 0 .647.19 1.109.48 1.466.13.155.149.219.101.4-.035.132-.117.48-.149.615-.044.184-.179.224-.412.134-1.149-.466-1.668-1.724-1.668-3.13 0-2.267 1.914-4.99 5.705-4.99 3.064 0 5.088 2.184 5.088 4.524 0 3.107-1.731 5.403-4.283 5.403-.861 0-1.669-.461-1.945-1.019l-.449 1.82c-.199.8-.629 1.569-.985 2.15.808.241 1.649.369 2.529.369 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z" }
                ].map((social, index) => (
                  <motion.a 
                    key={social.name}
                    href="#" 
                    className="text-muted-foreground hover:text-primary transition-colors duration-200"
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d={social.path}/>
                    </svg>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.3 }}
          >
            <p>&copy; 2024 CrowdCare. All rights reserved. Built for better communities.</p>
          </motion.div>
        </div>
      </motion.footer>
    </motion.div>
  );
}
