import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  UserPlus, 
  Mail,
  Shield,
  AlertTriangle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authUtils } from "@/lib/api";
import SMTPManagement from "./SMTPManagement";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
  smtp_settings_id: number | null;
  smtp_settings: SMTPSettings | null;
  created_at: string;
  total_campaigns: number;
  total_contacts: number;
}

interface SMTPSettings {
  id: number;
  provider: string;
  host: string;
  username: string;
  sender_name: string;
  sender_email: string;
}

interface SMTPAccount {
  id: number;
  name: string;
  provider: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
  is_verified: boolean;
}

interface UserSMTPAssignments {
  [userId: number]: SMTPAccount[];
}

export default function Admin() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [smtpSettings, setSMTPSettings] = useState<SMTPSettings[]>([]);
  const [smtpAccounts, setSMTPAccounts] = useState<SMTPAccount[]>([]);
  const [userAssignments, setUserAssignments] = useState<UserSMTPAssignments>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [updatingUserRole, setUpdatingUserRole] = useState<number | null>(null);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    userId: number | null;
    newRole: string | null;
    userName: string | null;
  }>({ open: false, userId: null, newRole: null, userName: null });
  const [profileRequests, setProfileRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'MANAGER',
    smtp_settings_id: 'none',
    smtp_account_ids: [] as number[]
  });

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access the admin panel.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }
      
      try {
        const userData = JSON.parse(user);
        if (!userData.is_admin) {
          toast({
            title: "Access Denied",
            description: "Admin privileges required to access this page.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
      } catch (error) {
        // Production: Error handled silently
        navigate('/login');
        return;
      }
      
      setIsAuthenticated(true);
      // Now fetch data after authentication is confirmed
      await fetchUsers();
      await fetchSMTPSettings();
      await fetchSMTPAccounts();
      await fetchProfileRequests();
    };

    checkAuth();
  }, [navigate, toast]);

  // Fetch user assignments when users change
  useEffect(() => {
    if (users.length > 0) {
      const userIds = users.map(u => u.id);
      fetchUserAssignments(userIds);
    }
  }, [users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        authUtils.logout();
        navigate('/login');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.users);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Load Users",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSMTPSettings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/admin/smtp-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        toast({
          title: "Session Expired", 
          description: "Please log in again.",
          variant: "destructive",
        });
        authUtils.logout();
        navigate('/login');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSMTPSettings(result.smtp_settings);
      } else {
        throw new Error(result.error || 'Failed to fetch SMTP settings');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Load SMTP Settings",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    }
  };

  const fetchSMTPAccounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/admin/smtp-accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSMTPAccounts(result.smtp_accounts || []);
      }
    } catch (error) {
      console.error('Error fetching SMTP accounts:', error);
    }
  };

  const fetchProfileRequests = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/notifications?type=profile_update_request&per_page=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setProfileRequests(result.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching profile requests:', error);
    }
  };

  const fetchUserAssignments = async (userIds: number[]) => {
    try {
      const token = localStorage.getItem('access_token');
      const assignments: UserSMTPAssignments = {};
      
      for (const userId of userIds) {
        const response = await fetch(`http://localhost:5001/api/admin/users/${userId}/smtp-accounts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          assignments[userId] = result.smtp_accounts || [];
        }
      }
      
      setUserAssignments(assignments);
    } catch (error) {
      console.error('Error fetching user assignments:', error);
    }
  };

  const createUser = async () => {
    try {
      const userData = {
        ...newUser,
        smtp_settings_id: (newUser.smtp_settings_id && newUser.smtp_settings_id !== "none") ? parseInt(newUser.smtp_settings_id) : null
      };
      
      const response = await fetch('http://localhost:5001/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (result.success) {
        const userId = result.user.id;
        
        // Assign SMTP accounts if selected
        if (newUser.smtp_account_ids.length > 0) {
          for (const smtpId of newUser.smtp_account_ids) {
            try {
              await fetch(`http://localhost:5001/api/admin/users/${userId}/smtp-accounts`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ smtp_account_id: smtpId })
              });
            } catch (error) {
              console.error(`Failed to assign SMTP ${smtpId}:`, error);
            }
          }
        }
        
        toast({
          title: "User Created",
          description: `${result.user.first_name} ${result.user.last_name} has been created successfully.`,
        });
        
        setCreateUserOpen(false);
        setNewUser({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          role: 'MANAGER',
          smtp_settings_id: 'none',
          smtp_account_ids: []
        });
        
        await fetchUsers();
        await fetchUserAssignments([userId]);
      } else {
        throw new Error(result.error || 'Failed to create user');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Create User",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (user: User) => {
    setDeletingUser(true);
    try {
      const response = await fetch(`http://localhost:5001/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "User Deleted",
          description: result.message,
        });

        setUsers(users.filter(u => u.id !== user.id));
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } else {
        throw new Error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Delete User",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const assignSMTP = async (userId: number, smtpSettingsId: number | null) => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/users/${userId}/smtp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ smtp_settings_id: smtpSettingsId }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "SMTP Assignment Updated",
          description: "SMTP configuration has been updated for the user.",
        });
        
        await fetchUsers();
      } else {
        throw new Error(result.error || 'Failed to assign SMTP');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Assign SMTP",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Show confirmation dialog for admin role changes
    if (newRole === 'ADMIN' || user.role === 'ADMIN') {
      setRoleChangeDialog({
        open: true,
        userId,
        newRole,
        userName: user.full_name
      });
    } else {
      // Direct update for non-admin role changes
      updateUserRole(userId, newRole);
    }
  };

  const confirmRoleChange = () => {
    if (roleChangeDialog.userId && roleChangeDialog.newRole) {
      updateUserRole(roleChangeDialog.userId, roleChangeDialog.newRole);
      setRoleChangeDialog({ open: false, userId: null, newRole: null, userName: null });
    }
  };

  const updateUserRole = async (userId: number, newRole: string) => {
    // Get current user info
    const currentUserStr = localStorage.getItem('user');
    let currentUser = null;
    if (currentUserStr) {
      try {
        currentUser = JSON.parse(currentUserStr);
      } catch (error) {
        // Production: Error handled silently
      }
    }

    // Safety check: Prevent admin from removing their own admin role
    if (currentUser && currentUser.id === userId && currentUser.role === 'ADMIN' && newRole !== 'ADMIN') {
      toast({
        title: "Action Not Allowed",
        description: "You cannot remove your own admin privileges.",
        variant: "destructive",
      });
      return;
    }

    // Safety check: Ensure at least one admin exists
    if (newRole !== 'ADMIN') {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser && targetUser.role === 'ADMIN') {
        const adminCount = users.filter(u => u.role === 'ADMIN').length;
        if (adminCount <= 1) {
          toast({
            title: "Action Not Allowed",
            description: "At least one admin must exist in the system.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    setUpdatingUserRole(userId);
    try {
      const response = await fetch(`http://localhost:5001/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ role: newRole }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Role Updated",
          description: `User role has been updated to ${newRole}.`,
        });
        
        await fetchUsers();
      } else {
        throw new Error(result.error || 'Failed to update user role');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Update Role",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setUpdatingUserRole(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/10 text-red-600 border-red-200';
      case 'MANAGER':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'USER':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'VIEWER':
        return 'bg-gray-500/10 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  // Show loading spinner while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage users, roles, and SMTP assignments</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="profile-requests" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Profile Requests
            {profileRequests.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {profileRequests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            SMTP Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              fetchUsers();
              fetchSMTPSettings();
              fetchSMTPAccounts();
            }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => setCreateUserOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.role === 'ADMIN').length}
                </div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.role === 'MANAGER').length}
                </div>
                <div className="text-sm text-muted-foreground">Managers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{smtpSettings.length}</div>
                <div className="text-sm text-muted-foreground">SMTP Configs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user accounts, assign roles, and configure SMTP settings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>SMTP Config</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={updatingUserRole === user.id}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {updatingUserRole === user.id && <Loader2 className="h-3 w-3 animate-spin" />}
                                <Badge className={getRoleBadge(user.role)} variant="outline">
                                  {user.role}
                                </Badge>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIEWER">
                              <div className="flex items-center gap-2">
                                <Badge className={getRoleBadge('VIEWER')} variant="outline">VIEWER</Badge>
                                <span className="text-xs text-muted-foreground">- View only access</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="USER">
                              <div className="flex items-center gap-2">
                                <Badge className={getRoleBadge('USER')} variant="outline">USER</Badge>
                                <span className="text-xs text-muted-foreground">- Create campaigns</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="MANAGER">
                              <div className="flex items-center gap-2">
                                <Badge className={getRoleBadge('MANAGER')} variant="outline">MANAGER</Badge>
                                <span className="text-xs text-muted-foreground">- Manage teams</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="ADMIN">
                              <div className="flex items-center gap-2">
                                <Badge className={getRoleBadge('ADMIN')} variant="outline">ADMIN</Badge>
                                <span className="text-xs text-muted-foreground">- Full access</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {/* New SMTP Accounts (from SMTP Management) */}
                        {userAssignments[user.id]?.length > 0 ? (
                          <div className="space-y-1">
                            {userAssignments[user.id].map((smtp) => (
                              <div key={smtp.id} className="flex items-center gap-2">
                                <Badge variant="default" className="text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {smtp.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {smtp.from_email}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.smtp_settings_id?.toString() || "none"}
                              onValueChange={(value) => assignSMTP(user.id, value === "none" ? null : parseInt(value))}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="No SMTP assigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No SMTP (Legacy)</SelectItem>
                                {smtpSettings.map((smtp) => (
                                  <SelectItem key={smtp.id} value={smtp.id.toString()}>
                                    {smtp.sender_email} ({smtp.provider})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {userAssignments[user.id]?.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Managed via SMTP Accounts tab
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.total_campaigns}</TableCell>
                    <TableCell>{user.total_contacts}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {setUserToDelete(user); setDeleteDialogOpen(true);}}
                          disabled={user.role === 'ADMIN'}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new manager or user account with SMTP configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadge('VIEWER')} variant="outline">VIEWER</Badge>
                      <span className="text-xs text-muted-foreground">- View only access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="USER">
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadge('USER')} variant="outline">USER</Badge>
                      <span className="text-xs text-muted-foreground">- Create campaigns</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MANAGER">
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadge('MANAGER')} variant="outline">MANAGER</Badge>
                      <span className="text-xs text-muted-foreground">- Manage teams</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadge('ADMIN')} variant="outline">ADMIN</Badge>
                      <span className="text-xs text-muted-foreground">- Full access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="smtp_accounts">Assign SMTP Accounts</Label>
              <Select 
                value={newUser.smtp_account_ids.length > 0 ? "selected" : "none"} 
                onValueChange={(value) => {
                  // This is just for display purposes, actual selection done via checkboxes in dropdown
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {newUser.smtp_account_ids.length === 0 
                      ? "Select SMTP accounts..." 
                      : `${newUser.smtp_account_ids.length} account${newUser.smtp_account_ids.length !== 1 ? 's' : ''} selected`
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {smtpAccounts.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No SMTP accounts available
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto p-2">
                      {smtpAccounts
                        .filter(smtp => smtp.is_active && smtp.is_verified)
                        .map((smtp) => (
                          <label 
                            key={smtp.id} 
                            className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={newUser.smtp_account_ids.includes(smtp.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewUser({
                                    ...newUser, 
                                    smtp_account_ids: [...newUser.smtp_account_ids, smtp.id]
                                  });
                                } else {
                                  setNewUser({
                                    ...newUser, 
                                    smtp_account_ids: newUser.smtp_account_ids.filter(id => id !== smtp.id)
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-sm font-medium">{smtp.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {smtp.provider}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{smtp.from_email}</span>
                              </div>
                            </div>
                          </label>
                        ))
                      }
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select SMTP accounts this user can use for campaigns
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{userToDelete?.full_name}" ({userToDelete?.email})? 
              This will also delete all their campaigns and contacts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUser(userToDelete)}
              disabled={deletingUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={roleChangeDialog.open} onOpenChange={(open) => 
        setRoleChangeDialog({ open, userId: null, newRole: null, userName: null })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              {roleChangeDialog.newRole === 'ADMIN' ? 'Grant Admin Access' : 'Revoke Admin Access'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleChangeDialog.newRole === 'ADMIN' ? (
                <>
                  You are about to grant <strong>{roleChangeDialog.userName}</strong> admin privileges. 
                  Admin users have full access to all system functions including user management, 
                  role assignments, and system configuration.
                </>
              ) : (
                <>
                  You are about to change <strong>{roleChangeDialog.userName}</strong>'s role from 
                  ADMIN to <strong>{roleChangeDialog.newRole}</strong>. They will lose admin privileges 
                  and access to the admin panel.
                </>
              )}
              <br /><br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              className={roleChangeDialog.newRole === 'ADMIN' 
                ? "bg-orange-600 hover:bg-orange-700" 
                : "bg-red-600 hover:bg-red-700"
              }
            >
              <Shield className="mr-2 h-4 w-4" />
              {roleChangeDialog.newRole === 'ADMIN' ? 'Grant Admin Access' : 'Revoke Admin Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        <TabsContent value="profile-requests" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Profile Update Requests</h3>
              <p className="text-sm text-muted-foreground">Review and process user profile update requests</p>
            </div>
            <Button variant="outline" onClick={fetchProfileRequests}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profileRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No profile update requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    profileRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">{request.title?.replace('Profile Update Request from ', '')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md truncate text-sm text-muted-foreground">
                            {request.message?.split('\n')[0]}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={request.status === 'pending' ? 'default' : 'secondary'}
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setUpdateDialogOpen(true);
                            }}
                            disabled={request.status !== 'pending'}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp">
          <SMTPManagement 
            onAssignmentChange={() => {
              // Refresh user assignments when SMTP assignments change
              if (users.length > 0) {
                const userIds = users.map(u => u.id);
                fetchUserAssignments(userIds);
                toast({
                  title: "Assignments Updated",
                  description: "User Management table has been refreshed",
                });
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Profile Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Profile Update Request</DialogTitle>
            <DialogDescription>
              Review the user's request and update their profile information.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-4 py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="font-medium">Request Details:</p>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.message}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Update User Profile:</p>
                <p className="text-xs text-muted-foreground">
                  You'll need to manually update the user's profile from the User Management tab after reviewing this request.
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">Quick Actions:</p>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('access_token');
                        await fetch(`http://localhost:5001/api/notifications/${selectedRequest.id}/read`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          }
                        });
                        
                        setProfileRequests(prev => 
                          prev.map(r => r.id === selectedRequest.id ? { ...r, status: 'completed' } : r)
                        );
                        
                        toast({
                          title: "Request Marked Complete",
                          description: "The profile update request has been marked as complete.",
                        });
                        
                        setUpdateDialogOpen(false);
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to mark request as complete",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Mark as Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUpdateDialogOpen(false);
                      // Switch to users tab
                      const usersTab = document.querySelector('[value="users"]') as HTMLElement;
                      usersTab?.click();
                    }}
                  >
                    Go to User Management
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}