import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";

interface Notification {
  id: number;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
  campaign_id?: number;
  campaign_name?: string;
  status?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "created_at" | "is_read">) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      // Check if user is authenticated before fetching
      const token = localStorage.getItem('access_token');
      if (!token) {
        return;
      }
      
      const response: any = await api("/notifications?per_page=10");
      setNotifications(response.notifications || []);
    } catch (error) {
      // Silently handle auth errors - user will be redirected by api helper
      if (error instanceof Error && 
          (error.message.includes('Session expired') || 
           error.message.includes('Rate limit') ||
           error.message.includes('429'))) {
        return;
      }
      console.error("Failed to fetch notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      // Check if user is authenticated before fetching
      const token = localStorage.getItem('access_token');
      if (!token) {
        return;
      }
      
      const response: any = await api("/notifications/unread-count");
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      // Silently handle auth errors - user will be redirected by api helper
      if (error instanceof Error && 
          (error.message.includes('Session expired') || 
           error.message.includes('Rate limit') ||
           error.message.includes('429'))) {
        return;
      }
      console.error("Failed to fetch unread count:", error);
    }
  };

  useEffect(() => {
    // Only fetch if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      // Clear notifications if not authenticated
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 2 minutes to avoid rate limits
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('access_token');
      if (currentToken) {
        fetchNotifications();
        fetchUnreadCount();
      } else {
        // Clear notifications if token is removed
        setNotifications([]);
        setUnreadCount(0);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  const addNotification = (notification: Omit<Notification, "id" | "created_at" | "is_read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now(),
      created_at: new Date().toISOString(),
      is_read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = async (id: number) => {
    try {
      await api(`/notifications/${id}/read`, {
        method: 'POST'
      });
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api("/notifications/mark-all-read", {
        method: 'POST'
      });
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const refreshNotifications = () => {
    fetchNotifications();
    fetchUnreadCount();
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      unreadCount,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};