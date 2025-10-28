import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  color?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className, color }: StatsCardProps) {
  // Determine icon container styling based on the color prop or default to primary
  const getIconContainerClass = () => {
    if (color === "bg-gray-50 text-gray-700") {
      return "p-3 bg-muted rounded-lg";
    } else if (color === "bg-yellow-50 text-yellow-700") {
      return "p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg";
    } else if (color === "bg-orange-50 text-orange-700") {
      return "p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg";
    } else if (color === "bg-red-50 text-red-700") {
      return "p-3 bg-red-50 dark:bg-red-900/20 rounded-lg";
    } else {
      return "p-3 bg-primary/10 rounded-lg";
    }
  };

  const getIconClass = () => {
    if (color === "bg-gray-50 text-gray-700") {
      return "h-5 w-5 text-muted-foreground";
    } else if (color === "bg-yellow-50 text-yellow-700") {
      return "h-5 w-5 text-yellow-600 dark:text-yellow-400";
    } else if (color === "bg-orange-50 text-orange-700") {
      return "h-5 w-5 text-orange-600 dark:text-orange-400";
    } else if (color === "bg-red-50 text-red-700") {
      return "h-5 w-5 text-red-600 dark:text-red-400";
    } else {
      return "h-5 w-5 text-primary";
    }
  };

  return (
    <Card className={cn("border-0 shadow-sm hover:shadow-md transition-all duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              {trend && (
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    trend.isPositive 
                      ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400" 
                      : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                  )}>
                    {trend.isPositive ? "↗" : "↘"} {trend.value}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className={getIconContainerClass()}>
              <Icon className={getIconClass()} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
