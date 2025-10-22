import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Send, Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Campaigns() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    campaignName: "",
    subject: "",
    senderEmail: "",
    recipientList: "",
    emailBody: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Campaign Created!",
      description: "Your email campaign has been scheduled successfully.",
    });
  };

  const handleTestEmail = () => {
    toast({
      title: "Test Email Sent",
      description: "A test email has been sent to your address.",
    });
  };

  return (
    <div className="space-y-6 p-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
        <p className="text-muted-foreground">Design and launch your email campaign</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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

                <div className="space-y-2">
                  <Label htmlFor="recipientList">Recipients</Label>
                  <div className="flex gap-2">
                    <Input
                      id="recipientList"
                      placeholder="Upload CSV or enter emails"
                      value={formData.recipientList}
                      onChange={(e) => setFormData({ ...formData, recipientList: e.target.value })}
                    />
                    <Button type="button" variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailBody">Email Body</Label>
                  <Textarea
                    id="emailBody"
                    placeholder="Write your email content here..."
                    rows={10}
                    value={formData.emailBody}
                    onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    <Send className="mr-2 h-4 w-4" />
                    Launch Campaign
                  </Button>
                  <Button type="button" variant="outline" onClick={handleTestEmail}>
                    <Eye className="mr-2 h-4 w-4" />
                    Test Email
                  </Button>
                  <Button type="button" variant="secondary">
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>See how your email will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-background p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-sm font-medium">{formData.senderEmail || "sender@example.com"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium">{formData.subject || "Your subject line"}</p>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm whitespace-pre-wrap">{formData.emailBody || "Your email content will appear here..."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
