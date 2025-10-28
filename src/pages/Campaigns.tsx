import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Upload, Send, Save, Eye, Loader2, Settings, Info, Clock, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WysiwygEditor from "../components/RichTextEditor/WysiwygEditor";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configure dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

export default function Campaigns() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCampaignId, setEditCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    campaignName: "",
    subject: "",
    senderName: "",
    senderEmail: "",
    recipientList: "",
    emailBody: "",
  });

  // Check for edit mode on component mount
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setIsEditMode(true);
      setEditCampaignId(editId);
      fetchCampaignForEdit(editId);
    } else {
      // Reset form when not in edit mode
      setIsEditMode(false);
      setEditCampaignId(null);
      setIsScheduled(false);
      setScheduledDate("");
      setScheduledTime("");
      setFormData({
        campaignName: "",
        subject: "",
        senderName: "",
        senderEmail: "",
        recipientList: "",
        emailBody: "",
      });
    }
  }, [searchParams]);

  // Fetch campaign data for editing
  const fetchCampaignForEdit = async (campaignId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      const result = await response.json();
      
      if (result.success && result.campaign) {
        const campaign = result.campaign;
        setFormData({
          campaignName: campaign.name || "",
          subject: campaign.subject || "",
          senderName: campaign.sender_name || "",
          senderEmail: campaign.sender_email || "",
          recipientList: "", // Recipients are managed separately in backend
          emailBody: campaign.html_content || campaign.text_content || "",
        });

        // Handle scheduled campaigns
        if (campaign.scheduled_at) {
          console.log('Loading scheduled campaign, scheduled_at (UTC):', campaign.scheduled_at);
          setIsScheduled(true);
          
          // Convert UTC time to Manila timezone using dayjs
          const manilaDateTime = dayjs.utc(campaign.scheduled_at).tz('Asia/Manila');
          console.log('Manila time:', manilaDateTime.format());
          console.log('Manila ISO:', manilaDateTime.toISOString());
          
          // Format for HTML datetime-local input (YYYY-MM-DD and HH:mm)
          const dateStr = manilaDateTime.format('YYYY-MM-DD');
          const timeStr = manilaDateTime.format('HH:mm');
          
          console.log('Setting scheduled date/time (Manila):', { dateStr, timeStr });
          setScheduledDate(dateStr);
          setScheduledTime(timeStr);
        } else {
          // Ensure scheduling is off for non-scheduled campaigns
          setIsScheduled(false);
          setScheduledDate("");
          setScheduledTime("");
        }

        toast({
          title: "Campaign Loaded",
          description: `Editing campaign: ${campaign.name}${campaign.scheduled_at ? ' (Scheduled)' : ''}`,
        });
      } else {
        throw new Error(result.error || 'Failed to load campaign');
      }
    } catch (error) {
      toast({
        title: "Load Failed",
        description: error instanceof Error ? error.message : 'Failed to load campaign for editing',
        variant: "destructive",
      });
      // Redirect back to campaigns list if load fails
      window.location.href = '/campaigns/list';
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.campaignName || !formData.subject || !formData.senderEmail || !formData.emailBody) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate scheduling if enabled
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        toast({
          title: "Scheduling Information Required",
          description: "Please select both date and time for scheduled delivery.",
          variant: "destructive",
        });
        return;
      }

      // Validate scheduled time is in the future (using Manila timezone)
      const scheduledManilaTime = dayjs.tz(`${scheduledDate}T${scheduledTime}`, 'Asia/Manila');
      const nowManila = dayjs().tz('Asia/Manila');
      
      console.log('Validation - Scheduled Manila time:', scheduledManilaTime.format());
      console.log('Validation - Current Manila time:', nowManila.format());
      
      if (scheduledManilaTime.isBefore(nowManila) || scheduledManilaTime.isSame(nowManila)) {
        toast({
          title: "Invalid Schedule Time",
          description: "Scheduled time must be in the future.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      // Prepare scheduled datetime for Manila timezone (UTC+8)
      let scheduledAt = null;
      if (isScheduled) {
        console.log('Preparing scheduled datetime:', { scheduledDate, scheduledTime });
        
        // Use dayjs to create Manila timezone datetime
        const manilaDateTime = dayjs.tz(`${scheduledDate}T${scheduledTime}`, 'Asia/Manila');
        
        console.log('Manila time:', manilaDateTime.format());
        console.log('UTC time:', manilaDateTime.utc().format());
        
        // Convert to UTC ISO string for backend
        scheduledAt = manilaDateTime.utc().toISOString();
        console.log('Scheduled at ISO (UTC):', scheduledAt);
      }

      if (isEditMode && editCampaignId) {
        // Update existing campaign
        const updateResponse = await fetch(`http://localhost:5001/api/campaigns/${editCampaignId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            name: formData.campaignName,
            subject: formData.subject,
            sender_name: formData.senderName,
            sender_email: formData.senderEmail,
            html_content: formData.emailBody,
            recipients: formData.recipientList,
            scheduled_at: scheduledAt,
          }),
        });

        const updateResult = await updateResponse.json();
        
        if (updateResult.success) {
          toast({
            title: "Campaign Updated! ✏️",
            description: `Successfully updated campaign: ${formData.campaignName}`,
          });
          
          // Redirect back to campaigns list
          window.location.href = '/campaigns/list';
        } else {
          throw new Error(updateResult.error || 'Failed to update campaign');
        }
      } else {
        // Create new campaign
        const createResponse = await fetch('http://localhost:5001/api/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            name: formData.campaignName,
            subject: formData.subject,
            sender_name: formData.senderName,
            sender_email: formData.senderEmail,
            email_content: formData.emailBody,
            recipients: formData.recipientList,
            send_immediately: !isScheduled,
            scheduled_at: scheduledAt
          }),
        });

        const createResult = await createResponse.json();
        
        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to create campaign');
        }

        // Only send campaign immediately if not scheduled
        let sendResult: { success: boolean; sent_count: number; failed_count: number; error?: string } = { success: true, sent_count: 0, failed_count: 0 };
        
        if (!isScheduled) {
          // Send campaign immediately
          const sendResponse = await fetch(`http://localhost:5001/api/campaigns/${createResult.campaign_id}/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({}),
          });

          sendResult = await sendResponse.json();
        }
        
        if (sendResult.success || isScheduled) {
          toast({
            title: isScheduled ? "Campaign Scheduled! ⏰" : "Campaign Launched! 🚀",
            description: isScheduled 
              ? `Campaign scheduled for ${scheduledDate} at ${scheduledTime}`
              : `Successfully sent to ${sendResult.sent_count} recipients${sendResult.failed_count > 0 ? ` (${sendResult.failed_count} failed)` : ''}`,
          });
          
          // Reset form
          setFormData({
            campaignName: "",
            subject: "",
            senderName: "",
            senderEmail: "",
            emailBody: "",
            recipientList: "",
          });
          setIsScheduled(false);
          setScheduledDate("");
          setScheduledTime("");
        } else {
          throw new Error(sendResult.error || 'Failed to send campaign');
        }
      }
      
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Campaign Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.campaignName || !formData.subject) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a campaign name and subject to save as draft.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:5001/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name: formData.campaignName,
          subject: formData.subject,
          sender_name: formData.senderName,
          sender_email: formData.senderEmail,
          email_content: formData.emailBody,
          recipients: formData.recipientList,
          send_immediately: false
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Draft Saved! 💾",
          description: "Your campaign has been saved as a draft.",
        });
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
      
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Failed to save draft',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file only.",
        variant: "destructive",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        const lines = csvContent.split('\n');
        
        // Extract emails from CSV (assuming first column is email or looking for email patterns)
        const emails: string[] = [];
        
        for (let i = 1; i < lines.length; i++) { // Skip header row
          const line = lines[i].trim();
          if (line) {
            const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
            
            // Try to find email in any column
            const emailColumn = columns.find(col => 
              col.includes('@') && col.includes('.')
            );
            
            if (emailColumn) {
              emails.push(emailColumn);
            }
          }
        }

        if (emails.length > 0) {
          // Update the recipients field with extracted emails
          const emailList = emails.join(', ');
          setFormData({ ...formData, recipientList: emailList });
          
          toast({
            title: "CSV Uploaded Successfully",
            description: `Found ${emails.length} email addresses in the CSV file.`,
          });
        } else {
          toast({
            title: "No Emails Found",
            description: "No valid email addresses were found in the CSV file.",
            variant: "destructive",
          });
        }
      };

      reader.readAsText(file);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to read the CSV file. Please try again.",
        variant: "destructive",
      });
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{isEditMode ? 'Edit Campaign' : 'Create Campaign'}</h1>
        <p className="text-muted-foreground text-sm md:text-base">Design and launch your email campaign</p>
      </div>

      {/* SMTP Setup Helper */}
      <Alert className="text-sm md:text-base">
        <Info className="h-4 w-4 flex-shrink-0" />
        <AlertDescription className="break-words">
          <strong>Before sending emails:</strong> Make sure your SMTP settings are configured with a Gmail App Password. 
          Having issues? Check your{" "}
          <a href="/settings" className="text-blue-600 hover:text-blue-800 underline">
            Settings page
          </a>{" "}
          or review the Gmail setup guide.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-2 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Fill in the details for your email campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    placeholder="e.g., Summer Sale 2024"
                    value={formData.campaignName}
                    onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    placeholder="Your attention-grabbing subject line"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderName">Sender Name</Label>
                    <Input
                      id="senderName"
                      placeholder="Your Name or Company"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderEmail">Sender Email</Label>
                    <Input
                      id="senderEmail"
                      type="email"
                      placeholder="hello@example.com"
                      value={formData.senderEmail}
                      onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientList">Recipients</Label>
                  <div className="flex gap-2">
                    <Input
                      id="recipientList"
                      placeholder="Upload CSV or enter emails"
                      value={formData.recipientList}
                      onChange={(e) => setFormData({ ...formData, recipientList: e.target.value })}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload CSV file"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                {/* Campaign Scheduling */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-3 mb-4">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <Label htmlFor="schedule-toggle" className="text-sm font-medium text-gray-700">
                      Schedule Campaign
                    </Label>
                    <Switch
                      id="schedule-toggle"
                      checked={isScheduled}
                      onCheckedChange={setIsScheduled}
                    />
                  </div>
                  
                  {isScheduled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </Label>
                        <Input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={(() => {
                            const nowUtc = new Date();
                            const nowManila = new Date(nowUtc.getTime() + (8 * 60 * 60 * 1000));
                            return nowManila.toISOString().split('T')[0];
                          })()}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time
                        </Label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    {isScheduled 
                      ? "Campaign will be sent at the scheduled time. You can modify or cancel before the scheduled time."
                      : "Campaign will be sent immediately after creation."
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailBody">Email Body</Label>
                  <WysiwygEditor
                    value={formData.emailBody}
                    onChange={(value) => setFormData({ ...formData, emailBody: value })}
                    placeholder="Write your email content here..."
                  />
                </div>



                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {isEditMode ? 'Update Campaign' : 'Launch Campaign'}
                  </Button>
                  <Button type="button" variant="secondary" className="sm:w-auto w-full" onClick={handleSaveDraft} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Draft
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
          <Card className="sticky top-8 w-full">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Email Preview</CardTitle>
              <CardDescription className="text-sm">See how your email will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-background p-3 md:p-4 space-y-3 min-h-[200px] md:min-h-[300px]">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-xs md:text-sm font-medium break-words overflow-hidden">
                    {formData.senderName && formData.senderEmail 
                      ? `${formData.senderName} <${formData.senderEmail}>`
                      : formData.senderEmail || "sender@example.com"
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-xs md:text-sm font-medium break-words">{formData.subject || "Your subject line"}</p>
                </div>
                <div className="border-t pt-3">
                  <div 
                    className="text-xs md:text-sm prose prose-sm max-w-none break-words overflow-hidden"
                    dangerouslySetInnerHTML={{ 
                      __html: formData.emailBody || "<p class='text-muted-foreground text-xs md:text-sm'>Your email content will appear here...</p>" 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4 md:mt-6 w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Settings className="h-4 w-4" />
                SMTP Status
              </CardTitle>
              <CardDescription className="text-sm">Check your email sending configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const response = await fetch('http://localhost:5001/api/settings/smtp/test', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                      },
                      body: JSON.stringify({})
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                      toast({
                        title: "SMTP Connection Successful ✅",
                        description: "Your email configuration is working properly.",
                      });
                    } else {
                      throw new Error(result.error || 'SMTP test failed');
                    }
                  } catch (error) {
                    toast({
                      title: "SMTP Connection Failed ❌",
                      description: error instanceof Error ? error.message : 'Failed to test SMTP connection',
                      variant: "destructive",
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                Test SMTP Connection
              </Button>
              
              <div className="text-xs text-muted-foreground">
                <p>💡 <strong>Gmail users:</strong> Use App Passwords, not regular passwords</p>
                <p>⚙️ Configure SMTP in <a href="/settings" className="text-blue-600 hover:underline">Settings</a></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
