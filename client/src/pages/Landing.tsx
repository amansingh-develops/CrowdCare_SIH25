import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HandHeart, Camera, Map, Users, Shield, BarChart3, ArrowRight } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-primary-foreground rounded-2xl flex items-center justify-center mr-4">
                <HandHeart className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-5xl font-bold text-primary-foreground">CrowdCare</h1>
            </div>
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto">
              Empowering communities to improve their neighborhoods through collaborative 
              issue reporting and resolution. Connect citizens with local government for faster, 
              more effective civic engagement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 py-3"
                onClick={handleLogin}
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary font-semibold px-8 py-3"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            How CrowdCare Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A simple, effective platform that connects community members with local 
            government to identify, report, and resolve civic issues together.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Citizen Features */}
          <Card className="card-hover">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-xl">Report Issues</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Take photos, add descriptions, and automatically capture GPS location 
                to report civic issues in your community with just a few taps.
              </p>
              <div className="space-y-2">
                <Badge variant="secondary" className="mr-2">Photo Upload</Badge>
                <Badge variant="secondary" className="mr-2">GPS Location</Badge>
                <Badge variant="secondary">Voice Notes</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-xl">Track Progress</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                View issues on an interactive map, track resolution progress, 
                and stay updated on community improvements in real-time.
              </p>
              <div className="space-y-2">
                <Badge variant="secondary" className="mr-2">Live Updates</Badge>
                <Badge variant="secondary" className="mr-2">Status Tracking</Badge>
                <Badge variant="secondary">Community Map</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Build Community</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Support issues with upvotes, contribute to discussions, 
                and earn badges for making your neighborhood better.
              </p>
              <div className="space-y-2">
                <Badge variant="secondary" className="mr-2">Upvoting</Badge>
                <Badge variant="secondary" className="mr-2">Comments</Badge>
                <Badge variant="secondary">Badges</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Features */}
        <div className="bg-muted/30 rounded-2xl p-8 mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              For Municipal Departments
            </h3>
            <p className="text-muted-foreground">
              Powerful tools to manage, prioritize, and resolve community issues efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">
                  Department Management
                </h4>
                <p className="text-muted-foreground text-sm">
                  Role-based access control, automatic routing, and SLA tracking 
                  to ensure issues reach the right department quickly.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">
                  Analytics & Insights
                </h4>
                <p className="text-muted-foreground text-sm">
                  Comprehensive dashboards, performance metrics, and data export 
                  capabilities to improve service delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-2">24/7</div>
            <div className="text-sm text-muted-foreground">Issue Reporting</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-secondary mb-2">AI</div>
            <div className="text-sm text-muted-foreground">Smart Categorization</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-accent mb-2">PWA</div>
            <div className="text-sm text-muted-foreground">Mobile Optimized</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">Open</div>
            <div className="text-sm text-muted-foreground">Data Transparency</div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Improve Your Community?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of citizens and municipal workers making their neighborhoods better, 
            one issue at a time.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3"
            onClick={handleLogin}
            data-testid="button-start-reporting"
          >
            Start Reporting Issues
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <HandHeart className="text-primary-foreground text-sm" />
                </div>
                <h3 className="font-bold text-primary">CrowdCare</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Empowering communities to improve their neighborhoods through 
                collaborative issue reporting and resolution.
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
