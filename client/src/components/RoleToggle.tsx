import { Button } from "@/components/ui/button";
import { User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleToggleProps {
  currentRole: 'citizen' | 'admin';
  onRoleChange: (role: 'citizen' | 'admin') => void;
  className?: string;
}

export function RoleToggle({ currentRole, onRoleChange, className }: RoleToggleProps) {
  return (
    <div className={cn("bg-muted rounded-lg p-1 flex", className)}>
      <Button
        variant={currentRole === 'citizen' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onRoleChange('citizen')}
        className={cn(
          "transition-colors",
          currentRole === 'citizen' 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
        data-testid="button-citizen-toggle"
      >
        <User className="w-4 h-4 mr-2" />
        Citizen
      </Button>
      <Button
        variant={currentRole === 'admin' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onRoleChange('admin')}
        className={cn(
          "transition-colors",
          currentRole === 'admin' 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
        data-testid="button-admin-toggle"
      >
        <Settings className="w-4 h-4 mr-2" />
        Admin
      </Button>
    </div>
  );
}
