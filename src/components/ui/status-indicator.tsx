import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'connecting' | 'authenticated' | 'error';
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig = {
  online: {
    color: 'bg-green-500',
    label: 'Online',
    badge: 'bg-green-100 text-green-800 border-green-200',
    pulse: true
  },
  offline: {
    color: 'bg-red-500',
    label: 'Offline',
    badge: 'bg-red-100 text-red-800 border-red-200',
    pulse: false
  },
  connecting: {
    color: 'bg-yellow-500',
    label: 'Connecting',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    pulse: true
  },
  authenticated: {
    color: 'bg-blue-500',
    label: 'Authenticated',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    pulse: false
  },
  error: {
    color: 'bg-red-600',
    label: 'Error',
    badge: 'bg-red-100 text-red-800 border-red-200',
    pulse: true
  }
};

const sizeConfig = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
};

export function StatusIndicator({ 
  status, 
  label, 
  showLabel = false, 
  size = 'md',
  className 
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  
  if (showLabel || label) {
    return (
      <span className={cn(
        "inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border",
        config.badge,
        className
      )}>
        <span className={cn(
          "rounded-full me-1.5 shrink-0",
          config.color,
          sizeConfig[size],
          config.pulse && "animate-pulse"
        )}></span>
        {label || config.label}
      </span>
    );
  }

  return (
    <span className={cn(
      "flex rounded-full",
      config.color,
      sizeConfig[size],
      config.pulse && "animate-pulse",
      className
    )}></span>
  );
}

// Badge with count indicator (like notification badges)
interface BadgeIndicatorProps {
  count: number;
  maxCount?: number;
  className?: string;
}

export function BadgeIndicator({ count, maxCount = 99, className }: BadgeIndicatorProps) {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  if (count === 0) return null;
  
  return (
    <div className={cn(
      "absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full -top-2 -end-2",
      className
    )}>
      {displayCount}
    </div>
  );
}

// Connection status component for API endpoints
interface ConnectionStatusProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  lastChecked?: Date;
  className?: string;
}

export function ConnectionStatus({ 
  isConnected, 
  isAuthenticated, 
  lastChecked,
  className 
}: ConnectionStatusProps) {
  const getStatus = () => {
    if (!isConnected) return 'offline';
    if (!isAuthenticated) return 'error';
    return 'authenticated';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Backend Disconnected';
    if (!isAuthenticated) return 'Authentication Required';
    return 'Connected & Authenticated';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StatusIndicator status={getStatus()} showLabel label={getStatusText()} />
      {lastChecked && (
        <span className="text-xs text-gray-500">
          Last checked: {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// Legend indicators for charts (like the Flowbite examples)
interface LegendIndicatorProps {
  color: string;
  label: string;
  value?: string | number;
  className?: string;
}

export function LegendIndicator({ color, label, value, className }: LegendIndicatorProps) {
  return (
    <span className={cn("flex items-center text-sm font-medium text-gray-900 me-3", className)}>
      <span 
        className="flex w-2.5 h-2.5 rounded-full me-1.5 shrink-0"
        style={{ backgroundColor: color }}
      ></span>
      {label}
      {value && <span className="ml-1 text-gray-600">({value})</span>}
    </span>
  );
}