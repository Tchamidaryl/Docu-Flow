import { cn } from "@/lib/utils/cn";
import { Flame, ArrowUp, Minus, ArrowDown } from "lucide-react";

const PRIORITY_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  LOW:    { label: "Low",    className: "priority-low",    icon: ArrowDown },
  NORMAL: { label: "Normal", className: "priority-normal", icon: Minus },
  HIGH:   { label: "High",   className: "priority-high",   icon: ArrowUp },
  URGENT: { label: "Urgent", className: "priority-urgent", icon: Flame },
};

export default function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG["NORMAL"];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
