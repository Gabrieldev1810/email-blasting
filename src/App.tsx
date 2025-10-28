import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider } from "@/hooks/use-theme";
import { NotificationProvider } from "@/hooks/use-notifications";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";
import { authUtils } from "@/lib/api";
import { Sidebar } from "./components/Layout/Sidebar";
import { Header } from "./components/Layout/Header";
import { cn } from "@/lib/utils";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignsList from "./pages/CampaignsList";
import Reports from "./pages/Reports";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      try {
        // Try to make a simple API call to verify token validity
        const response = await fetch('http://localhost:5001/api/auth/health', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear it
          authUtils.logout();
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Network error or token invalid
        authUtils.logout();
        setIsAuthenticated(false);
      }
      
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin Only Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (!userStr) {
    return <Navigate to="/" replace />;
  }
  
  try {
    const user = JSON.parse(userStr);
    if (!user.is_admin) {
      return <Navigate to="/" replace />;
    }
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Layout content that uses sidebar context
const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { isMinimized } = useSidebarContext();
  
  return (
    <div className="min-h-screen w-full">
      <Sidebar />
      <div className={cn(
        "min-h-screen flex flex-col bg-background transition-all duration-300 ease-in-out",
        "ml-0", // Mobile: no margin
        isMinimized 
          ? "md:ml-16" // Desktop: small margin when minimized
          : "md:ml-64"  // Desktop: full margin when expanded
      )}>
        <Header className="sticky top-0 z-40" />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// Layout with Sidebar Provider
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <AppLayoutContent>{children}</AppLayoutContent>
  </SidebarProvider>
);

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="beacon-blast-theme">
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/campaigns" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Campaigns />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/campaigns/list" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CampaignsList />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Reports />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/contacts" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Contacts />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <Admin />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <Settings />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                } />
                <Route path="*" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NotFound />
                    </AppLayout>
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
