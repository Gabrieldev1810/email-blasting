import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Plus, Edit, Trash2, TestTube, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Type definitions
interface SMTPAccount {
  id: number;
  name: string;
  description?: string;
  provider: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: string;
  from_name: string;
  from_email: string;
  reply_to_email?: string;
  is_active: boolean;
  is_verified: boolean;
  last_tested_at?: string;
  last_used_at?: string;
  daily_limit?: number;
  emails_sent_today: number;
  total_emails_sent: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface SMTPAssignment {
  user_id: number;
  smtp_account_id: number;
  assigned_at: string;
}

const smtpProviders = [
  { value: "gmail", label: "Gmail", host: "smtp.gmail.com", port: 587, encryption: "tls" },
  { value: "outlook", label: "Outlook", host: "smtp-mail.outlook.com", port: 587, encryption: "tls" },
  { value: "yahoo", label: "Yahoo", host: "smtp.mail.yahoo.com", port: 587, encryption: "tls" },
  { value: "sendgrid", label: "SendGrid", host: "smtp.sendgrid.net", port: 587, encryption: "tls" },
  { value: "mailgun", label: "Mailgun", host: "smtp.mailgun.org", port: 587, encryption: "tls" },
  { value: "ses", label: "Amazon SES", host: "email-smtp.us-east-1.amazonaws.com", port: 587, encryption: "tls" },
  { value: "custom", label: "Custom SMTP", host: "", port: 587, encryption: "tls" },
];

interface SMTPManagementProps {
  onAssignmentChange?: () => void;
}

export default function SMTPManagement({ onAssignmentChange }: SMTPManagementProps) {
  const { toast } = useToast();
  const [smtpAccounts, setSMTPAccounts] = useState<SMTPAccount[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSMTP, setSelectedSMTP] = useState<SMTPAccount | null>(null);
  const [testing, setTesting] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    provider: "gmail",
    host: "smtp.gmail.com",
    port: "587",
    username: "",
    password: "",
    encryption: "tls",
    from_name: "",
    from_email: "",
    reply_to_email: "",
    is_active: true,
    daily_limit: "",
  });

  const [assignmentData, setAssignmentData] = useState({
    selectedUserId: "",
    assignedUsers: [] as number[],
  });

  useEffect(() => {
    fetchSMTPAccounts();
    fetchUsers();
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchSMTPAccounts = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/admin/smtp-accounts', {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      if (data.success) {
        setSMTPAccounts(data.smtp_accounts || []);
      } else {
        console.error('Failed to fetch SMTP accounts:', data.error);
        setSMTPAccounts([]);
        toast({
          title: "Error",
          description: data.error || "Failed to load SMTP accounts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching SMTP accounts:', error);
      setSMTPAccounts([]);
      toast({
        title: "Error",
        description: "Failed to load SMTP accounts",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/admin/users', {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      console.log('Fetched users:', data);
      if (data.success) {
        setUsers(data.users || []);
        console.log('Users set:', data.users?.length || 0);
      } else {
        console.error('Failed to fetch users:', data.error);
        toast({
          title: "Error",
          description: data.error || "Failed to load users",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const handleProviderChange = (provider: string) => {
    const providerConfig = smtpProviders.find(p => p.value === provider);
    if (providerConfig) {
      setFormData(prev => ({
        ...prev,
        provider,
        host: providerConfig.host,
        port: providerConfig.port.toString(),
        encryption: providerConfig.encryption,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      provider: "gmail",
      host: "smtp.gmail.com",
      port: "587",
      username: "",
      password: "",
      encryption: "tls",
      from_name: "",
      from_email: "",
      reply_to_email: "",
      is_active: true,
      daily_limit: "",
    });
    setShowPassword(false);
  };

  const handleAddSMTP = async () => {
    if (!formData.name || !formData.host || !formData.username || !formData.password || !formData.from_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        provider: formData.provider,
        host: formData.host,
        port: parseInt(formData.port),
        username: formData.username,
        password: formData.password,
        encryption: formData.encryption,
        from_name: formData.from_name,
        from_email: formData.from_email,
        reply_to_email: formData.reply_to_email || null,
        is_active: formData.is_active,
        daily_limit: formData.daily_limit ? parseInt(formData.daily_limit) : null,
      };

      const response = await fetch('http://localhost:5001/api/admin/smtp-accounts', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "SMTP Account Created",
          description: "SMTP account has been added successfully",
        });
        setIsAddDialogOpen(false);
        resetForm();
        fetchSMTPAccounts();
      } else {
        throw new Error(data.error || 'Failed to create SMTP account');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create SMTP account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSMTP = async () => {
    if (!selectedSMTP) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        provider: formData.provider,
        host: formData.host,
        port: parseInt(formData.port),
        username: formData.username,
        password: formData.password || undefined,
        encryption: formData.encryption,
        from_name: formData.from_name,
        from_email: formData.from_email,
        reply_to_email: formData.reply_to_email || null,
        is_active: formData.is_active,
        daily_limit: formData.daily_limit ? parseInt(formData.daily_limit) : null,
      };

      const response = await fetch(`http://localhost:5001/api/admin/smtp-accounts/${selectedSMTP.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "SMTP Account Updated",
          description: "SMTP account has been updated successfully",
        });
        setIsEditDialogOpen(false);
        resetForm();
        setSelectedSMTP(null);
        fetchSMTPAccounts();
      } else {
        throw new Error(data.error || 'Failed to update SMTP account');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update SMTP account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSMTP = async (smtp: SMTPAccount) => {
    if (!confirm(`Are you sure you want to delete "${smtp.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/admin/smtp-accounts/${smtp.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "SMTP Account Deleted",
          description: "SMTP account has been deleted successfully",
        });
        fetchSMTPAccounts();
      } else {
        throw new Error(data.error || 'Failed to delete SMTP account');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete SMTP account",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async (smtp: SMTPAccount) => {
    setTesting(smtp.id);
    try {
      const response = await fetch(`http://localhost:5001/api/admin/smtp-accounts/${smtp.id}/test`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: data.message || "SMTP connection is working correctly",
        });
        fetchSMTPAccounts();
      } else {
        throw new Error(data.error || 'Connection test failed');
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to SMTP server",
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const openEditDialog = (smtp: SMTPAccount) => {
    setSelectedSMTP(smtp);
    setFormData({
      name: smtp.name,
      description: smtp.description || "",
      provider: smtp.provider,
      host: smtp.host,
      port: smtp.port.toString(),
      username: smtp.username,
      password: "", // Don't show existing password
      encryption: smtp.encryption,
      from_name: smtp.from_name,
      from_email: smtp.from_email,
      reply_to_email: smtp.reply_to_email || "",
      is_active: smtp.is_active,
      daily_limit: smtp.daily_limit?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const openAssignDialog = async (smtp: SMTPAccount) => {
    console.log('Opening assign dialog for SMTP:', smtp.name, 'Available users:', users.length);
    setSelectedSMTP(smtp);
    
    // Fetch current assignments for this SMTP
    try {
      const assignedUserIds: number[] = [];
      for (const user of users) {
        const response = await fetch(`http://localhost:5001/api/admin/users/${user.id}/smtp-accounts`, {
          headers: getAuthHeader(),
        });
        const data = await response.json();
        console.log(`User ${user.email} assignments:`, data);
        if (data.success && data.smtp_accounts?.some((s: SMTPAccount) => s.id === smtp.id)) {
          assignedUserIds.push(user.id);
        }
      }
      console.log('Assigned user IDs:', assignedUserIds);
      setAssignmentData({
        selectedUserId: "",
        assignedUsers: assignedUserIds,
      });
      setIsAssignDialogOpen(true);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setIsAssignDialogOpen(true);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedSMTP || !assignmentData.selectedUserId) {
      console.log('Cannot assign - missing data:', { smtp: selectedSMTP?.name, userId: assignmentData.selectedUserId });
      return;
    }

    console.log('Assigning SMTP', selectedSMTP.name, 'to user', assignmentData.selectedUserId);

    try {
      const response = await fetch(`http://localhost:5001/api/admin/users/${assignmentData.selectedUserId}/smtp-accounts`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ smtp_account_id: selectedSMTP.id }),
      });

      const data = await response.json();
      console.log('Assignment response:', data);
      
      if (data.success) {
        toast({
          title: "User Assigned",
          description: "SMTP account assigned successfully",
        });
        setAssignmentData(prev => ({
          ...prev,
          assignedUsers: [...prev.assignedUsers, parseInt(assignmentData.selectedUserId)],
          selectedUserId: "",
        }));
        // Notify parent component of assignment change
        onAssignmentChange?.();
      } else {
        throw new Error(data.error || 'Failed to assign SMTP account');
      }
    } catch (error: any) {
      console.error('Assignment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign SMTP account",
        variant: "destructive",
      });
    }
  };

  const handleUnassignUser = async (userId: number) => {
    if (!selectedSMTP) return;

    try {
      const response = await fetch(`http://localhost:5001/api/admin/users/${userId}/smtp-accounts/${selectedSMTP.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "User Unassigned",
          description: "SMTP account unassigned successfully",
        });
        setAssignmentData(prev => ({
          ...prev,
          assignedUsers: prev.assignedUsers.filter(id => id !== userId),
        }));
        // Notify parent component of assignment change
        onAssignmentChange?.();
      } else {
        throw new Error(data.error || 'Failed to unassign SMTP account');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unassign SMTP account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMTP Account Management</h2>
          <p className="text-muted-foreground">
            Manage SMTP accounts and assign them to users
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add SMTP Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              SMTP Accounts
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchSMTPAccounts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <CardDescription>
            {smtpAccounts?.length || 0} SMTP account{(smtpAccounts?.length || 0) !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!smtpAccounts || smtpAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No SMTP accounts configured yet</p>
              <p className="text-sm">Add your first SMTP account to get started</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>From Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Last Tested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smtpAccounts?.map((smtp) => (
                    <TableRow key={smtp.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{smtp.name}</div>
                          {smtp.description && (
                            <div className="text-sm text-muted-foreground">{smtp.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{smtp.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{smtp.from_email}</div>
                          <div className="text-xs text-muted-foreground">{smtp.from_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={smtp.is_active ? "default" : "secondary"}>
                            {smtp.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant={smtp.is_verified ? "default" : "destructive"}>
                            {smtp.is_verified ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Unverified</>
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Today: {smtp.emails_sent_today}</div>
                          <div className="text-muted-foreground">Total: {smtp.total_emails_sent}</div>
                          {smtp.daily_limit && (
                            <div className="text-xs text-muted-foreground">Limit: {smtp.daily_limit}/day</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {smtp.last_tested_at ? new Date(smtp.last_tested_at).toLocaleString() : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(smtp)}
                            disabled={testing === smtp.id}
                          >
                            {testing === smtp.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignDialog(smtp)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(smtp)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSMTP(smtp)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add SMTP Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add SMTP Account</DialogTitle>
            <DialogDescription>
              Configure a new SMTP account for sending emails
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Primary Gmail Account"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="provider">Provider *</Label>
                <Select value={formData.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {smtpProviders.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="encryption">Encryption *</Label>
                <Select value={formData.encryption} onValueChange={(value) => setFormData(prev => ({ ...prev, encryption: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="host">SMTP Host *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="smtp.example.com"
                  disabled={formData.provider !== "custom"}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="your-email@example.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="from_name">From Name *</Label>
                <Input
                  id="from_name"
                  value={formData.from_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, from_name: e.target.value }))}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="from_email">From Email *</Label>
                <Input
                  id="from_email"
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
                  placeholder="noreply@example.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reply_to_email">Reply-To Email</Label>
              <Input
                id="reply_to_email"
                type="email"
                value={formData.reply_to_email}
                onChange={(e) => setFormData(prev => ({ ...prev, reply_to_email: e.target.value }))}
                placeholder="support@example.com (optional)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="daily_limit">Daily Email Limit</Label>
              <Input
                id="daily_limit"
                type="number"
                value={formData.daily_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, daily_limit: e.target.value }))}
                placeholder="e.g., 500 (optional)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Account Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSMTP} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add SMTP Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit SMTP Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit SMTP Account</DialogTitle>
            <DialogDescription>
              Update SMTP account configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Same form fields as Add dialog */}
            <div className="grid gap-2">
              <Label htmlFor="edit_name">Account Name *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Primary Gmail Account"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_description">Description</Label>
              <Input
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit_provider">Provider *</Label>
                <Select value={formData.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {smtpProviders.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_encryption">Encryption *</Label>
                <Select value={formData.encryption} onValueChange={(value) => setFormData(prev => ({ ...prev, encryption: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit_host">SMTP Host *</Label>
                <Input
                  id="edit_host"
                  value={formData.host}
                  onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="smtp.example.com"
                  disabled={formData.provider !== "custom"}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_port">Port *</Label>
                <Input
                  id="edit_port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit_username">Username *</Label>
                <Input
                  id="edit_username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="your-email@example.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_password">Password (leave blank to keep current)</Label>
                <div className="relative">
                  <Input
                    id="edit_password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit_from_name">From Name *</Label>
                <Input
                  id="edit_from_name"
                  value={formData.from_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, from_name: e.target.value }))}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_from_email">From Email *</Label>
                <Input
                  id="edit_from_email"
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
                  placeholder="noreply@example.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_reply_to_email">Reply-To Email</Label>
              <Input
                id="edit_reply_to_email"
                type="email"
                value={formData.reply_to_email}
                onChange={(e) => setFormData(prev => ({ ...prev, reply_to_email: e.target.value }))}
                placeholder="support@example.com (optional)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_daily_limit">Daily Email Limit</Label>
              <Input
                id="edit_daily_limit"
                type="number"
                value={formData.daily_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, daily_limit: e.target.value }))}
                placeholder="e.g., 500 (optional)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="edit_is_active">Account Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSMTP} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit className="h-4 w-4 mr-2" />}
              Update SMTP Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Users Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign SMTP Account</DialogTitle>
            <DialogDescription>
              Assign "{selectedSMTP?.name}" to users
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Add User</Label>
              <div className="flex gap-2">
                <Select 
                  value={assignmentData.selectedUserId} 
                  onValueChange={(value) => setAssignmentData(prev => ({ ...prev, selectedUserId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(user => !assignmentData.assignedUsers.includes(user.id))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.full_name || user.email} ({user.email}) - {user.role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssignUser} disabled={!assignmentData.selectedUserId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Assigned Users ({assignmentData.assignedUsers.length})</h4>
              {assignmentData.assignedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users assigned yet</p>
              ) : (
                <div className="space-y-2">
                  {assignmentData.assignedUsers.map(userId => {
                    const user = users.find(u => u.id === userId);
                    if (!user) return null;
                    return (
                      <div key={userId} className="flex items-center justify-between p-2 bg-secondary rounded">
                        <div>
                          <div className="font-medium text-sm">{user.full_name || user.email}</div>
                          <div className="text-xs text-muted-foreground">{user.email} - {user.role}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnassignUser(userId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsAssignDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
