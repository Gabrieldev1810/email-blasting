import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, Trash2, Filter, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import api from "@/lib/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  campaign_id: number | null;
  campaign_name: string | null;
  status: string | null;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const url = filter === 'unread' 
        ? '/notifications?is_read=false'
        : '/notifications';
      
      const result: any = await api(url);
      
      if (result.success) {
        setNotifications(result.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const result: any = await api(`/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      
      if (result.success) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const result: any = await api('/notifications/mark-all-read', {
        method: 'POST'
      });
      
      if (result.success) {
        toast({
          title: "All notifications marked as read",
          description: `${result.count} notifications updated`,
        });
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      const result: any = await api(`/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
        toast({
          title: "Notification deleted",
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'campaign_success':
        return '✅';
      case 'campaign_failed':
        return '❌';
      case 'campaign_scheduled':
        return '📅';
      case 'campaign_sending':
        return '📤';
      case 'campaign_draft':
        return '📝';
      case 'profile_update_request':
        return '👤';
      default:
        return '🔔';
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, string> = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sending: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge className={variants[status] || ''}  variant="outline">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-2">Stay updated with your campaign activities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
          >
            Unread
          </Button>
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {filter === 'unread' ? "You're all caught up!" : "You don't have any notifications yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-950/10 border-blue-200' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base">{notification.title}</h3>
                        {!notification.is_read && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                        {getStatusBadge(notification.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      {notification.campaign_name && (
                        <p className="text-xs text-muted-foreground">
                          Campaign: <span className="font-medium">{notification.campaign_name}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNotification(notification.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
