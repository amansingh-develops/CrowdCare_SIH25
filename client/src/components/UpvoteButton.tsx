import { Button } from "@/components/ui/button";
import { ArrowBigUp } from "lucide-react";

interface UpvoteButtonProps {
  count: number;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function UpvoteButton({ count, active, onToggle, disabled }: UpvoteButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`text-muted-foreground hover:text-accent flex items-center space-x-1 ${active ? 'text-blue-600' : ''}`}
      aria-pressed={active}
      disabled={disabled}
    >
      <ArrowBigUp className={`w-4 h-4 ${active ? 'fill-blue-600 stroke-blue-600' : ''}`} />
      <span>{count}</span>
    </Button>
  );
}


