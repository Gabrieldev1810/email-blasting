import { useState, useEffect } from 'react';
import { ConnectionStatus, StatusIndicator, BadgeIndicator } from '@/components/ui/status-indicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogIn, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ConnectionMonitorProps {
  compact?: boolean;
  showRefresh?: boolean;
  className?: string;
}

export function ConnectionMonitor({ compact = false, showRefresh = true, className }: ConnectionMonitorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      // Check backend health
      const healthResponse = await fetch('http://localhost:5001/api/auth/health');
      const backendConnected = healthResponse.ok;
      setIsConnected(backendConnected);

      if (backendConnected) {
        // Check authentication
        const token = localStorage.getItem('access_token');
        if (token) {
          try {
            const authResponse = await fetch('http://localhost:5001/api/dashboard/stats', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (authResponse.status === 401) {
              setIsAuthenticated(false);
              setErrorCount(prev => prev + 1);
            } else {
              setIsAuthenticated(true);
              setErrorCount(0);
            }
          } catch {
            setIsAuthenticated(false);
            setErrorCount(prev => prev + 1);
          }
        } else {
          setIsAuthenticated(false);
          setErrorCount(prev => prev + 1);
        }
      } else {
        setIsAuthenticated(false);
        setErrorCount(prev => prev + 1);
      }
      
      setLastChecked(new Date());
    } catch (error) {
      // Production: Error handled silently
      setIsConnected(false);
      setIsAuthenticated(false);
      setErrorCount(prev => prev + 1);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRefresh = async () => {
    await checkConnection();
    toast({
      title: "Status Updated",
      description: "Connection status has been refreshed.",
    });
  };

  if (compact) {
    return (
      <div className={`relative inline-flex items-center gap-2 ${className}`}>
        <ConnectionStatus 
          isConnected={isConnected} 
          isAuthenticated={isAuthenticated} 
          lastChecked={lastChecked || undefined}
        />
        {errorCount > 0 && <BadgeIndicator count={errorCount} />}
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isChecking}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            System Status
            {errorCount > 0 && <BadgeIndicator count={errorCount} />}
          </span>
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''} mr-2`} />
              Refresh
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Backend Connection</span>
            <StatusIndicator 
              status={isConnected ? 'online' : 'offline'} 
              showLabel 
              label={isConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Authentication</span>
            <div className="flex items-center gap-2">
              <StatusIndicator 
                status={isAuthenticated ? 'authenticated' : 'error'} 
                showLabel 
                label={isAuthenticated ? 'Authenticated' : 'Login Required'}
              />
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogin}
                  className="h-7 px-2 text-xs"
                >
                  <LogIn className="h-3 w-3 mr-1" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>

        {lastChecked && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}

        {!isAuthenticated && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Authentication Required</p>
              <p className="text-xs mt-1">
                Dashboard data cannot load without authentication. Please login to continue.
              </p>
            </div>
          </div>
        )}

        {errorCount > 5 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Multiple Connection Errors</p>
              <p className="text-xs mt-1">
                {errorCount} errors detected. Check if backend server is running on port 5001.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}