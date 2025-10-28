import { Card } from 'flowbite-react';
import { LucideIcon } from "lucide-react";

interface FlowbiteStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  iconBgColor?: string;
  iconTextColor?: string;
}

export function FlowbiteStatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className = "",
  iconBgColor = "bg-primary-100 dark:bg-primary-900/20",
  iconTextColor = "text-primary-600 dark:text-primary-400"
}: FlowbiteStatsCardProps) {
  return (
    <Card className={`w-full border-0 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              {trend && (
                <div className="flex items-center gap-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    trend.isPositive 
                      ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400" 
                      : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                  }`}>
                    {trend.isPositive ? "↗" : "↘"} {trend.value}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-lg ${iconBgColor}`}>
              <Icon className={`h-5 w-5 ${iconTextColor}`} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}