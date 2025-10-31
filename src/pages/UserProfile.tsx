import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Briefcase, Mail, Lock, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import api from "@/lib/api";

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  role: string;
  is_admin: boolean;
}

export default function UserProfile() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updateRequest, setUpdateRequest] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: 0,
    email: "",
    first_name: "",
    last_name: "",
    department: "",
    position: "",
    role: "",
    is_admin: false
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const result: any = await api("/auth/me");
      if (result.success) {
        setProfile(result.user);
        setIsAdmin(result.user.is_admin || false);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestUpdate = () => {
    setIsDialogOpen(true);
  };

  const handleSendRequest = async () => {
    if (!updateRequest.trim()) {
      toast({
        title: "Error",
        description: "Please describe what you'd like to update.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingRequest(true);
    try {
      await api("/auth/profile/request-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: updateRequest,
          current_profile: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            department: profile.department,
            position: profile.position,
          },
        }),
      });

      toast({
        title: "Request Sent",
        description: "Your profile update request has been sent to the administrator.",
      });

      setIsDialogOpen(false);
      setUpdateRequest("");
    } catch (error) {
      console.error("Error sending update request:", error);
      toast({
        title: "Error",
        description: "Failed to send update request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
      const result: any = await api("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          department: profile.department,
          position: profile.position
        })
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully"
        });
        // Update local storage user data
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          localStorage.setItem('user', JSON.stringify({
            ...userData,
            first_name: profile.first_name,
            last_name: profile.last_name,
            department: profile.department,
            position: profile.position
          }));
        }
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwords.new_password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const result: any = await api("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          current_password: passwords.current_password,
          new_password: passwords.new_password
        })
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Password changed successfully"
        });
        setPasswords({
          current_password: "",
          new_password: "",
          confirm_password: ""
        });
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            User Profile
            {isAdmin && (
              <Badge variant="default" className="ml-2">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage your account information" : "View your account information"}
          </p>
        </div>
      </div>

      {/* Info Banner for Non-Admin Users */}
      {!isAdmin && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Profile Update Request Required
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  To update your profile information, please contact your administrator or request an update through the admin panel.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={profile.first_name || ""}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                placeholder="Enter first name"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={profile.last_name || ""}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                placeholder="Enter last name"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Department
              </Label>
              <Input
                id="department"
                value={profile.department || ""}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                placeholder="e.g., Marketing, Sales, IT"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
            <div>
              <Label htmlFor="position" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Position / Role
              </Label>
              <Input
                id="position"
                value={profile.position || ""}
                onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                placeholder="e.g., Marketing Manager, Developer"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {!isAdmin && (
              <Button onClick={handleRequestUpdate} variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Request Update from Admin
              </Button>
            )}
            {isAdmin && (
              <Button onClick={handleProfileUpdate} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={handlePasswordChange} 
              disabled={isSaving || !passwords.current_password || !passwords.new_password}
              variant="secondary"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Update Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Request Profile Update</DialogTitle>
            <DialogDescription>
              Describe what information you'd like to update in your profile. An administrator will review and process your request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="update-request">What would you like to update?</Label>
              <Textarea
                id="update-request"
                placeholder="Example: I'd like to update my department from Marketing to Sales, and my position to Senior Marketing Manager."
                value={updateRequest}
                onChange={(e) => setUpdateRequest(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Current Profile:</p>
              <p>Name: {profile.first_name} {profile.last_name}</p>
              <p>Department: {profile.department || "Not set"}</p>
              <p>Position: {profile.position || "Not set"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setUpdateRequest("");
              }}
              disabled={isSendingRequest}
            >
              Cancel
            </Button>
            <Button onClick={handleSendRequest} disabled={isSendingRequest}>
              {isSendingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
