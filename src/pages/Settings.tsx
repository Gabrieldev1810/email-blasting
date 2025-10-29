import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, TestTube, Eye, EyeOff, Shield, Mail, User, Bell, Sun, Moon, Loader2, Settings as SettingsIcon, RefreshCw, FolderOpen, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { settingsAPI, authAPI, SMTPSettings, SMTPSettingsInput } from "@/lib/api";
import UploadHistory from "@/components/UploadHistory";

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoReports, setAutoReports] = useState(false);
  const [testEmailMode, setTestEmailMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Admin SMTP Selection State
  const [availableSmtpSettings, setAvailableSmtpSettings] = useState<SMTPSettings[]>([]);
  const [adminSmtpPreference, setAdminSmtpPreference] = useState<string>('none');
  const [updatingAdminSmtp, setUpdatingAdminSmtp] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [smtpConfig, setSmtpConfig] = useState<SMTPSettingsInput>({
    provider: "gmail",
    host: "smtp.gmail.com",
    port: "587",
    username: "",
    password: "",
    encryption: "tls",
    sender_name: "",
    sender_email: "",
  });

  // Load SMTP settings on component mount
  useEffect(() => {
    loadSMTPSettings();
    checkSMTPStatus();
    
    // Load admin SMTP data if user is admin
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
        if (userData.is_admin) {
          fetchAvailableSmtpSettings();
          fetchAdminSmtpPreference();
        }
      } catch (error) {
        // Production: Error handled silently
      }
    }
  }, []);

  const loadSMTPSettings = async () => {
    try {
      const settings = await settingsAPI.getSMTPSettings();
      setSmtpConfig({
        provider: settings.provider,
        host: settings.host,
        port: settings.port.toString(),
        username: settings.username,
        password: settings.password === '••••••••' ? '' : settings.password,
        encryption: settings.encryption,
        sender_name: settings.sender_name,
        sender_email: settings.sender_email,
      });
      setConfigured(settings.is_configured);
    } catch (error) {
      // Production: Error handled silently
    }
  };

  const checkSMTPStatus = async () => {
    try {
      const status = await settingsAPI.getSMTPStatus();
      setConfigured(status.is_configured);
    } catch (error) {
      // Production: Error handled silently
    }
  };

  // Admin SMTP Management Functions
  const fetchAvailableSmtpSettings = async () => {
    try {
      // Production: console.log removed
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/admin/smtp-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Production: console.log removed
      if (response.ok) {
        const result = await response.json();
        // Production: console.log removed
        if (result.success) {
          setAvailableSmtpSettings(result.smtp_settings || []);
          // Production: console.log removed
        }
      } else {
        // Production: Error handled silently
        setAvailableSmtpSettings([]);
      }
    } catch (error) {
      // Production: Error handled silently
      setAvailableSmtpSettings([]);
    }
  };

  const fetchAdminSmtpPreference = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');
      // Production: console.log removed
      if (user) {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
        // Production: console.log removed
        const response = await fetch(`http://localhost:5001/api/admin/users/${userData.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Production: console.log removed
        if (response.ok) {
          const result = await response.json();
          // Production: console.log removed
          if (result.success) {
            if (result.user.smtp_settings_id) {
              setAdminSmtpPreference(result.user.smtp_settings_id.toString());
              // Production: console.log removed
            } else {
              setAdminSmtpPreference('none');
              // Production: console.log removed
            }
          }
        } else {
          // Production: Error handled silently
          setAdminSmtpPreference('none');
        }
      }
    } catch (error) {
      // Production: Error handled silently
      setAdminSmtpPreference('none');
    }
  };

  const updateAdminSmtpPreference = async (smtpSettingsId: string) => {
    setUpdatingAdminSmtp(true);
    try {
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');
      if (!user) return;
      
      const userData = JSON.parse(user);
      const response = await fetch(`http://localhost:5001/api/admin/users/${userData.id}/smtp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          smtp_settings_id: smtpSettingsId === 'none' ? null : parseInt(smtpSettingsId)
        })
      });

      const result = await response.json();
      if (result.success) {
        setAdminSmtpPreference(smtpSettingsId);
        toast({
          title: "Admin SMTP Updated",
          description: smtpSettingsId === 'none' 
            ? "Admin SMTP preference cleared" 
            : "Admin SMTP preference updated successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to update admin SMTP preference');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update admin SMTP preference',
        variant: "destructive",
      });
    } finally {
      setUpdatingAdminSmtp(false);
    }
  };

  const smtpProviders = [
    { value: "gmail", label: "Gmail", host: "smtp.gmail.com", port: "587" },
    { value: "outlook", label: "Outlook", host: "smtp-mail.outlook.com", port: "587" },
    { value: "yahoo", label: "Yahoo", host: "smtp.mail.yahoo.com", port: "587" },
    { value: "custom", label: "Custom SMTP", host: "", port: "587" },
  ];

  const handleProviderChange = (provider: string) => {
    const selectedProvider = smtpProviders.find(p => p.value === provider);
    if (selectedProvider) {
      setSmtpConfig(prev => ({
        ...prev,
        provider,
        host: selectedProvider.host,
        port: selectedProvider.port,
      }));
    }
  };

  const handleTestConnection = async () => {
    if (!smtpConfig.username || !smtpConfig.password) {
      toast({
        title: "Missing Credentials",
        description: "Please enter your SMTP username and password.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    toast({
      title: "Testing Connection...",
      description: "Verifying SMTP settings, please wait.",
    });

    try {
      const result = await settingsAPI.testSMTPConnection(smtpConfig);
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message || "SMTP configuration is working correctly.",
        });
        setConfigured(true);
        
        // Refresh admin SMTP settings list if user is admin and test was successful
        if (currentUser?.is_admin) {
          // Production: console.log removed
          await fetchAvailableSmtpSettings();
        }
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Unable to connect to SMTP server.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to test SMTP connection.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    const requiredFields = ['provider', 'host', 'port', 'username', 'password', 'encryption'];
    const missingFields = requiredFields.filter(field => !smtpConfig[field as keyof SMTPSettingsInput]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in all required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await settingsAPI.saveSMTPSettings(smtpConfig);
      toast({
        title: "Settings Saved",
        description: "Your SMTP settings have been saved successfully.",
      });
      setConfigured(true);
      
      // Refresh admin SMTP settings list if user is admin
      if (currentUser?.is_admin) {
        // Production: console.log removed
        await fetchAvailableSmtpSettings();
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Unable to save SMTP settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete the current SMTP configuration? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    
    try {
      await settingsAPI.deleteSMTPSettings();
      
      // Reset the form to default values
      setSmtpConfig({
        provider: "gmail",
        host: "smtp.gmail.com",
        port: "587",
        username: "",
        password: "",
        encryption: "tls",
        sender_name: "",
        sender_email: "",
      });
      
      setConfigured(false);
      
      toast({
        title: "SMTP Settings Deleted",
        description: "SMTP configuration has been successfully deleted.",
      });

      // Refresh admin SMTP settings if user is admin
      if (currentUser?.role === 'admin') {
        await fetchAvailableSmtpSettings();
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Unable to delete SMTP settings.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your email configuration and preferences</p>
      </div>

      <Tabs defaultValue="smtp" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            File Management
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* SMTP Configuration */}
        <TabsContent value="smtp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure your email sending server to deliver campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider">Email Provider</Label>
                  <Select value={smtpConfig.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
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
                <div className="space-y-2">
                  <Label htmlFor="encryption">Encryption</Label>
                  <Select value={smtpConfig.encryption} onValueChange={(value) => setSmtpConfig(prev => ({ ...prev, encryption: value }))}>
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
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">
                    SMTP Host <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="smtpHost"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="smtp.example.com"
                    disabled={smtpConfig.provider !== "custom"}
                    className={!smtpConfig.host ? "border-red-300 focus:border-red-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">
                    Port <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="smtpPort"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: e.target.value }))}
                    placeholder="587"
                    className={!smtpConfig.port ? "border-red-300 focus:border-red-500" : ""}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name</Label>
                  <Input
                    id="senderName"
                    value={smtpConfig.sender_name}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, sender_name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Sender Email</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={smtpConfig.sender_email}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, sender_email: e.target.value }))}
                    placeholder="noreply@yourcompany.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="smtpUser"
                    value={smtpConfig.username}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="your-email@example.com"
                    className={!smtpConfig.username ? "border-red-300 focus:border-red-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">
                    Password / App Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="smtpPassword"
                      type={showPassword ? "text" : "password"}
                      value={smtpConfig.password}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••••••••••"
                      className={!smtpConfig.password ? "border-red-300 focus:border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Admin SMTP Selection Section - Only show for admin users */}
              {currentUser?.is_admin && (
                <div className="border-t pt-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Admin SMTP Selection</h3>
                        <Badge variant="secondary">Admin Only</Badge>
                        {!availableSmtpSettings && (
                          <Badge variant="outline">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Loading...
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAvailableSmtpSettings}
                        disabled={!availableSmtpSettings}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Choose which SMTP configuration to use for admin operations like system notifications and password resets.
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <Label htmlFor="admin-smtp-select" className="font-medium min-w-[140px]">
                        Admin SMTP Account:
                      </Label>
                      <Select
                        value={adminSmtpPreference}
                        onValueChange={updateAdminSmtpPreference}
                        disabled={updatingAdminSmtp || !availableSmtpSettings}
                      >
                        <SelectTrigger className="w-[300px]">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              {updatingAdminSmtp && <Loader2 className="h-3 w-3 animate-spin" />}
                              {adminSmtpPreference === 'none' ? (
                                <span className="text-muted-foreground">No SMTP Selected</span>
                              ) : (
                                (availableSmtpSettings || []).find(s => s.id.toString() === adminSmtpPreference)?.sender_email || 'Loading SMTP...'
                              )}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                              <span>No SMTP Account</span>
                            </div>
                          </SelectItem>
                          {(availableSmtpSettings || []).map((smtp) => (
                            <SelectItem key={smtp.id} value={smtp.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <div>
                                  <div className="font-medium">{smtp.sender_email}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {smtp.provider} - {smtp.sender_name}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">Current Status:</span>
                      </div>
                      {adminSmtpPreference === 'none' ? (
                        <span>No SMTP account selected for admin operations</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>
                            Using <strong>{(availableSmtpSettings || []).find(s => s.id.toString() === adminSmtpPreference)?.sender_email || 'Loading...'}</strong> for admin emails
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={handleSave}
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save SMTP Settings"}
                </Button>
                <Button 
                  onClick={handleTestConnection} 
                  variant="outline"
                  disabled={testing || !smtpConfig.username || !smtpConfig.password}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
                {configured && (
                  <>
                    <Button 
                      onClick={() => {
                        setSmtpConfig({
                          provider: "gmail",
                          host: "smtp.gmail.com",
                          port: "587",
                          username: "",
                          password: "",
                          encryption: "tls",
                          sender_name: "",
                          sender_email: "",
                        });
                        setConfigured(false);
                        toast({
                          title: "Form Cleared",
                          description: "You can now add a new SMTP configuration.",
                        });
                      }} 
                      variant="outline"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Add New SMTP
                    </Button>
                    <Button 
                      onClick={handleDelete} 
                      variant="destructive"
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting ? "Deleting..." : "Delete Current SMTP"}
                    </Button>
                  </>
                )}
                <Badge variant={configured ? "default" : "secondary"}>
                  {configured ? "Configured" : "Not Configured"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Management */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                File Management & Upload History
              </CardTitle>
              <CardDescription>
                View and manage your uploaded files, track upload history, and download original files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadHistory />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage security preferences and email safety settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Test Email Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Send test emails only (prevents accidental mass sends)
                  </p>
                </div>
                <Switch checked={testEmailMode} onCheckedChange={setTestEmailMode} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>DKIM Signing</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable DKIM for better deliverability
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SPF Validation</Label>
                  <p className="text-sm text-muted-foreground">
                    Validate SPF records before sending
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize your interface theme and display preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Theme Preference</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-colors ${
                        theme === "light" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="mx-auto mb-2 h-6 w-6" />
                      <p className="text-sm font-medium">Light</p>
                      <p className="text-xs text-muted-foreground">Clean and bright</p>
                    </div>
                    
                    <div 
                      className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-colors ${
                        theme === "dark" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="mx-auto mb-2 h-6 w-6" />
                      <p className="text-sm font-medium">Dark</p>
                      <p className="text-xs text-muted-foreground">Easy on the eyes</p>
                    </div>
                    
                    <div 
                      className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-colors ${
                        theme === "system" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setTheme("system")}
                    >
                      <div className="mx-auto mb-2 h-6 w-6 rounded-full bg-gradient-to-r from-orange-400 to-blue-500"></div>
                      <p className="text-sm font-medium">System</p>
                      <p className="text-xs text-muted-foreground">Matches OS setting</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label>Quick Toggle</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark modes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Keyboard shortcut: <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+Shift+T</kbd>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <Switch 
                      checked={theme === "dark"} 
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
                    />
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Control notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive campaign updates</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-send Reports</Label>
                    <p className="text-sm text-muted-foreground">Daily campaign summaries</p>
                  </div>
                  <Switch checked={autoReports} onCheckedChange={setAutoReports} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Manage your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Your Company Inc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">EST</SelectItem>
                    <SelectItem value="pst">PST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          size="lg" 
          className="w-full md:w-auto"
          disabled={loading || !smtpConfig.username || !smtpConfig.password || !smtpConfig.host || !smtpConfig.port}
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
