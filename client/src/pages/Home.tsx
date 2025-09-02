import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleToggle } from "@/components/RoleToggle";
import { CitizenPanel } from "@/components/CitizenPanel";
import { AdminPanel } from "@/components/AdminPanel";
import { useAuth } from "@/hooks/useAuth";
import { HandHeart, LogOut } from "lucide-react";

type UserRole = 'citizen' | 'admin';

export default function Home() {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('citizen');

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <HandHeart className="text-primary-foreground text-sm" />
              </div>
              <h1 className="text-xl font-bold text-primary">CrowdCare</h1>
            </div>
            
            {/* User Info & Controls */}
            <div className="flex items-center space-x-4">
              {/* Role Toggle */}
              <RoleToggle
                currentRole={currentRole}
                onRoleChange={setCurrentRole}
                data-testid="role-toggle"
              />
              
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                {user?.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                    data-testid="img-user-avatar"
                  />
                )}
                <div className="hidden sm:block text-sm">
                  <div className="font-medium text-foreground" data-testid="text-user-name">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-muted-foreground" data-testid="text-user-role">
                    {user?.role === 'citizen' ? 'Community Member' : 'Admin'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentRole === 'citizen' ? <CitizenPanel /> : <AdminPanel />}
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <HandHeart className="text-primary-foreground text-sm" />
                </div>
                <h3 className="font-bold text-primary">CrowdCare</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Empowering communities to improve their neighborhoods through collaborative issue reporting and resolution.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.219-.359-1.219c0-1.142.662-1.995 1.488-1.995.703 0 1.042.527 1.042 1.16 0 .705-.449 1.759-.681 2.735-.194.824.412 1.496 1.224 1.496 1.47 0 2.458-1.724 2.458-3.946 0-1.642-1.107-2.878-3.119-2.878-2.261 0-3.666 1.668-3.666 3.53 0 .647.19 1.109.48 1.466.13.155.149.219.101.4-.035.132-.117.48-.149.615-.044.184-.179.224-.412.134-1.149-.466-1.668-1.724-1.668-3.13 0-2.267 1.914-4.99 5.705-4.99 3.064 0 5.088 2.184 5.088 4.524 0 3.107-1.731 5.403-4.283 5.403-.861 0-1.669-.461-1.945-1.019l-.449 1.82c-.199.8-.629 1.569-.985 2.15.808.241 1.649.369 2.529.369 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 CrowdCare. All rights reserved. Built for better communities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
