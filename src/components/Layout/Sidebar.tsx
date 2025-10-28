import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Send, Users, Settings, Mail, List, Shield, LogOut, User, FileBarChart, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BadgeIndicator, StatusIndicator } from "@/components/ui/status-indicator";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useState, useEffect } from "react";
import { authUtils } from "@/lib/api";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Create Campaign", href: "/campaigns", icon: Send },
  { name: "View Campaigns", href: "/campaigns/list", icon: List },
  { name: "Reports", href: "/reports", icon: FileBarChart },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Admin Panel", href: "/admin", icon: Shield },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMinimized, toggleSidebar } = useSidebarContext();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Get current user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (error) {
        // Production: Error handled silently
      }
    }
  }, []);

  const handleLogout = () => {
    authUtils.logout();
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    navigate('/login');
  };

  // Filter navigation items based on user role
  const getFilteredNavigation = () => {
    if (!currentUser) return navigation;
    
    // Show admin panel and settings only for admins
    return navigation.filter(item => {
      if (item.href === '/admin' || item.href === '/settings') {
        return currentUser.is_admin;
      }
      return true;
    });
  };

  return (
    <div className={cn(
      "fixed left-0 top-0 z-50 hidden md:flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
      isMinimized ? "w-16" : "w-64"
    )}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        <div className="flex items-center gap-2">
          <Mail className="h-8 w-8 text-primary flex-shrink-0" />
          {!isMinimized && (
            <span className="text-xl font-bold text-sidebar-foreground truncate">
              JDGKEmailBlast
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && <ThemeToggle />}
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
        {getFilteredNavigation().map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary",
                isMinimized && "justify-center px-2"
              )
            }
            title={isMinimized ? item.name : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isMinimized && (
              <>
                <span className="flex-1 truncate">{item.name}</span>
                
                {/* Add status indicators and notification badges */}
                {item.href === "/" && (
                  <StatusIndicator 
                    status={localStorage.getItem('access_token') ? 'online' : 'offline'} 
                    size="sm" 
                  />
                )}
                
                {item.href === "/campaigns" && (
                  <BadgeIndicator count={0} className="relative -top-0 -right-0" />
                )}
                
                {item.href === "/admin" && currentUser?.is_admin && (
                  <StatusIndicator status="authenticated" size="sm" />
                )}
              </>
            )}
            
            {/* Tooltip for minimized state */}
            {isMinimized && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-sidebar-accent text-sidebar-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {item.name}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
      
      <div className="shrink-0 border-t border-sidebar-border p-3 space-y-3">
        {/* User Info */}
        {currentUser && (
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50 group relative",
            isMinimized && "justify-center p-2"
          )}>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            {!isMinimized && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {currentUser.full_name || currentUser.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {currentUser.role?.toLowerCase()}
                </p>
              </div>
            )}
            
            {/* Tooltip for minimized state */}
            {isMinimized && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-sidebar-accent text-sidebar-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {currentUser.full_name || currentUser.email}
              </div>
            )}
          </div>
        )}

        {/* Connection Status */}
        {!isMinimized && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-sidebar-muted/30">
            <StatusIndicator 
              status={localStorage.getItem('access_token') ? 'authenticated' : 'error'} 
              size="sm" 
            />
            <span className="text-xs text-muted-foreground">
              {localStorage.getItem('access_token') ? 'Connected' : 'Authentication Required'}
            </span>
          </div>
        )}
        
        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full text-sidebar-foreground hover:bg-sidebar-accent/50 group relative",
            isMinimized ? "justify-center px-2" : "justify-start"
          )}
          title={isMinimized ? "Log Out" : undefined}
        >
          <LogOut className={cn("h-4 w-4", isMinimized ? "" : "mr-3")} />
          {!isMinimized && "Log Out"}
          
          {/* Tooltip for minimized state */}
          {isMinimized && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-sidebar-accent text-sidebar-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Log Out
            </div>
          )}
        </Button>
        
        {/* Help Section - Hidden when minimized */}
        {!isMinimized && (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs font-medium text-sidebar-foreground">Need Help?</p>
            <p className="mt-1 text-xs text-muted-foreground">Check our documentation</p>
          </div>
        )}
      </div>
    </div>
  );
}
