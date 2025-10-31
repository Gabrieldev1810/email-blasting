import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Eye, Plus, RefreshCw, Loader2, Trash2, Edit, Users, AlertTriangle, Download, BarChart3, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { campaignsAPI, Campaign } from "@/lib/api";
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
import ExportReport from "@/components/ExportReport";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configure dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

interface Contact {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company: string | null;
  status: string;
  created_at: string;
}

export default function CampaignsList() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignContacts, setCampaignContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmationData, setDeleteConfirmationData] = useState<{
    campaign: Campaign;
    emailLogCount: number;
  } | null>(null);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignsAPI.getCampaigns();
      
      if (response.success) {
        setCampaigns(response.campaigns);
      } else {
        throw new Error('Failed to fetch campaigns');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Load Campaigns",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCampaign = async (campaign: Campaign, force: boolean = false) => {
    setDeletingCampaign(true);
    try {
      const token = localStorage.getItem('access_token');
      const url = `http://localhost:5001/api/campaigns/${campaign.id}${force ? '?force=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Campaign Deleted",
          description: result.message,
        });
        
        // Remove from local state
        setCampaigns(campaigns.filter(c => c.id !== campaign.id));
        setDeleteDialogOpen(false);
        setCampaignToDelete(null);
        setDeleteConfirmationData(null);
        
        // Close detail modal if it was the deleted campaign
        if (selectedCampaign?.id === campaign.id) {
          setSelectedCampaign(null);
        }
      } else if (result.requires_confirmation && result.email_log_count) {
        // Show confirmation dialog for campaigns with tracking data
        setDeleteDialogOpen(false);
        setCampaignToDelete(null);
        setDeleteConfirmationData({
          campaign: campaign,
          emailLogCount: result.email_log_count
        });
      } else {
        throw new Error(result.error || 'Failed to delete campaign');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Delete Campaign",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setDeletingCampaign(false);
    }
  };

  const fetchCampaignContacts = async (campaignId: number) => {
    setLoadingContacts(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      // Production: console.log removed
      if (result.success) {
        // Production: console.log removed
        setCampaignContacts(result.contacts);
      } else {
        // Production: Error handled silently
        throw new Error(result.error || 'Failed to fetch campaign contacts');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Load Contacts",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleViewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    fetchCampaignContacts(campaign.id);
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    // For now, redirect to campaign creation page with edit mode
    // In the future, this could open an edit modal
    window.location.href = `/campaigns?edit=${campaign.id}`;
  };

  const handleStartCampaign = async (campaign: Campaign) => {
    if (campaign.status !== 'draft') {
      toast({
        title: "Cannot Start Campaign",
        description: "Only draft campaigns can be started.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Immediately update the campaign status to "sending" in local state
    setCampaigns(prevCampaigns => 
      prevCampaigns.map(c => 
        c.id === campaign.id 
          ? { ...c, status: 'sending' }
          : c
      )
    );

    // Show initial "starting" message
    toast({
      title: "Starting Campaign... ⏳",
      description: `Campaign "${campaign.name}" is being launched.`,
    });

    try {
      const result = await campaignsAPI.sendCampaign(campaign.id);
      
      if (result.success) {
        // Update local state based on send results
        const finalStatus = result.sent_count > 0 ? 'sent' : 'failed';
        
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(c => 
            c.id === campaign.id 
              ? { 
                  ...c, 
                  status: finalStatus,
                  emails_sent: result.sent_count || 0,
                  total_recipients: result.total_recipients || 0
                }
              : c
          )
        );

        if (finalStatus === 'sent') {
          toast({
            title: "Campaign Completed! ✅",
            description: `Successfully sent to ${result.sent_count} of ${result.total_recipients} recipients.`,
          });
        } else {
          toast({
            title: "Campaign Failed ❌",
            description: `Campaign failed to send. ${result.failed_count || 0} emails failed.`,
            variant: "destructive",
          });
        }
      } else {
        // Update local state to failed
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(c => 
            c.id === campaign.id 
              ? { ...c, status: 'failed' }
              : c
          )
        );

        throw new Error(result.message || 'Failed to start campaign');
      }
    } catch (error) {
      // Update local state to failed on error
      setCampaigns(prevCampaigns => 
        prevCampaigns.map(c => 
          c.id === campaign.id 
            ? { ...c, status: 'failed' }
            : c
        )
      );

      toast({
        title: "Campaign Failed ❌",
        description: error instanceof Error ? error.message : 'Failed to start campaign',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Refresh the full list from server to get accurate data
      setTimeout(() => {
        fetchCampaigns();
      }, 1000);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'draft':
        return 'bg-gray-500/10 text-gray-600 border-gray-200';
      case 'sending':
        return 'bg-blue-500/10 text-blue-600 border-blue-200 animate-pulse';
      case 'scheduled':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'failed':
        return 'bg-red-500/10 text-red-600 border-red-200';
      case 'paused':
        return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return '✅';
      case 'draft':
        return '📝';
      case 'sending':
        return '⏳';
      case 'scheduled':
        return '📅';
      case 'failed':
        return '❌';
      case 'paused':
        return '⏸️';
      case 'cancelled':
        return '🚫';
      default:
        return '📧';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date in Manila timezone using dayjs
  const formatManilaDate = (dateString: string) => {
    const manilaDate = dayjs.utc(dateString).tz('Asia/Manila');
    return manilaDate.format('MMM D, YYYY, h:mm A') + ' (Manila)';
  };

  // Get the appropriate date to display for a campaign
  const getCampaignDate = (campaign: Campaign) => {
    if (campaign.status === 'scheduled' && campaign.scheduled_at) {
      return campaign.scheduled_at;
    }
    return campaign.created_at;
  };

  // Get the appropriate label for the date column
  const getDateLabel = (campaign: Campaign) => {
    if (campaign.status === 'scheduled' && campaign.scheduled_at) {
      return 'Scheduled';
    }
    return 'Created';
  };

  const calculateOpenRate = (opened: number, sent: number) => {
    if (sent === 0) return '0%';
    return `${Math.round((opened / sent) * 100)}%`;
  };

  const calculateClickRate = (clicked: number, sent: number) => {
    if (sent === 0) return '0%';
    return `${Math.round((clicked / sent) * 100)}%`;
  };

  const handleQuickExport = async () => {
    // Quick export with default filters
    const defaultFilters = {
      dateRange: { from: null, to: null },
      campaignName: '',
      status: 'all',
      format: 'csv'
    };
    await handleExport(defaultFilters);
  };

  const handleExport = async (filters: any) => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const queryParams = new URLSearchParams();
      
      if (filters.dateRange.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        queryParams.append('date_from', fromDate.toISOString());
      }
      if (filters.dateRange.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        queryParams.append('date_to', toDate.toISOString());
      }
      if (filters.campaignName?.trim()) {
        queryParams.append('campaign_name', filters.campaignName.trim());
      }
      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }
      queryParams.append('format', filters.format || 'csv');

      const response = await fetch(`http://localhost:5001/api/campaigns/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => null);
        throw new Error(errorResult?.error || 'Failed to export campaigns');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                       new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const extension = filters.format === 'excel' ? 'xlsx' : 'csv';
      a.download = `campaigns_report_${timestamp}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `Campaigns report has been downloaded as ${extension.toUpperCase()} file.`,
      });

    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : 'Failed to export report',
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading campaigns...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">View and manage your email campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampaigns}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => window.location.href = '/campaigns'}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No campaigns yet</h3>
                <p className="text-muted-foreground">Create your first email campaign to get started</p>
              </div>
              <Button onClick={() => window.location.href = '/campaigns'}>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold">{campaigns.length}</div>
                  <div className="text-sm text-muted-foreground">Total Campaigns</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold">
                    {campaigns.reduce((sum, c) => sum + c.emails_sent, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Emails Sent</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-yellow-600">
                    {campaigns.reduce((sum, c) => sum + c.emails_opened, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Opens</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-orange-600">
                    {campaigns.reduce((sum, c) => sum + c.emails_clicked, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Clicks</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-red-600">
                    {campaigns.reduce((sum, c) => sum + (c.emails_bounced || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Bounces</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Campaigns</CardTitle>
                  <CardDescription>View performance metrics for all your campaigns</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchCampaigns()}
                    disabled={isLoading}
                    size="sm"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickExport()}
                    disabled={isExporting}
                    size="sm"
                  >
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Quick Export
                  </Button>
                  <ExportReport
                    onExport={handleExport}
                    isExporting={isExporting}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-yellow-600">Open Rate</TableHead>
                    <TableHead className="text-orange-600">Click Rate</TableHead>
                    <TableHead className="text-red-600">Bounce Rate</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground">{campaign.subject}</div>
                          {campaign.status === 'sending' && (
                            <div className="mt-1">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '45%' }}></div>
                              </div>
                              <div className="text-xs text-blue-600 mt-1">Sending in progress...</div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(campaign.status)}>
                          <span className="mr-1">{getStatusIcon(campaign.status)}</span>
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.total_recipients || 0}</TableCell>
                      <TableCell>{campaign.emails_sent || 0}</TableCell>
                      <TableCell className="text-yellow-700 font-medium">
                        {campaign.open_rate ? `${campaign.open_rate}%` : `${calculateOpenRate(campaign.emails_opened, campaign.emails_sent)}`}
                        <div className="text-xs text-gray-500">{campaign.emails_opened || 0} opened</div>
                      </TableCell>
                      <TableCell className="text-orange-700 font-medium">
                        {campaign.click_rate ? `${campaign.click_rate}%` : `${calculateClickRate(campaign.emails_clicked, campaign.emails_sent)}`}
                        <div className="text-xs text-gray-500">{campaign.emails_clicked || 0} clicked</div>
                      </TableCell>
                      <TableCell className="text-red-700 font-medium">
                        {campaign.bounce_rate ? `${campaign.bounce_rate}%` : '0%'}
                        <div className="text-xs text-gray-500">{campaign.emails_bounced || 0} bounced</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatManilaDate(getCampaignDate(campaign))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getDateLabel(campaign)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {campaign.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleStartCampaign(campaign)}
                              disabled={isLoading}
                              title="Start Campaign"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            </Button>
                          )}
                          {campaign.status === 'sending' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled
                              title="Campaign is sending..."
                              className="text-blue-600 cursor-not-allowed"
                            >
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </Button>
                          )}
                          {campaign.status === 'sent' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled
                              title="Campaign completed"
                              className="text-green-600 cursor-not-allowed"
                            >
                              ✅
                            </Button>
                          )}
                          {campaign.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleStartCampaign(campaign)}
                              title="Retry Campaign"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCampaign(campaign)}
                            disabled={campaign.status === 'sent' || campaign.status === 'sending'}
                            title="Edit Campaign"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewCampaign(campaign)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteClick(campaign)}
                            disabled={campaign.status === 'sending'}
                            title="Delete Campaign"
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedCampaign.name}</CardTitle>
                  <CardDescription>{selectedCampaign.subject}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCampaign(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedCampaign.status)}>
                    <span className="mr-1">{getStatusIcon(selectedCampaign.status)}</span>
                    {selectedCampaign.status.charAt(0).toUpperCase() + selectedCampaign.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{getDateLabel(selectedCampaign)}</p>
                  <p className="text-sm font-medium">{formatManilaDate(getCampaignDate(selectedCampaign))}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Recipients</p>
                  <p className="text-lg font-bold">{selectedCampaign.total_recipients || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="text-lg font-bold">{selectedCampaign.emails_sent || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opens</p>
                  <p className="text-lg font-bold">{selectedCampaign.emails_opened || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                  <p className="text-lg font-bold">{selectedCampaign.emails_clicked || 0}</p>
                </div>
              </div>

              {/* Recipients List */}
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" />
                  <h3 className="text-lg font-semibold">Recipients</h3>
                  {loadingContacts && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                
                {loadingContacts ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Loading contacts...</p>
                  </div>
                ) : campaignContacts.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignContacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell>
                              {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || '-'}
                            </TableCell>
                            <TableCell>{contact.email}</TableCell>
                            <TableCell>{contact.company || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                contact.status === 'active' ? 'border-green-200 text-green-700' : 
                                contact.status === 'unsubscribed' ? 'border-red-200 text-red-700' : 
                                'border-yellow-200 text-yellow-700'
                              }>
                                {contact.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active contacts found</p>
                    <p className="text-sm">Add contacts to see them here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Campaign
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the campaign "<strong>{campaignToDelete?.name}</strong>"? 
              This action cannot be undone and will permanently remove all campaign data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCampaign}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => campaignToDelete && deleteCampaign(campaignToDelete)}
              disabled={deletingCampaign}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingCampaign ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Campaign
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tracking Data Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmationData} onOpenChange={() => setDeleteConfirmationData(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Campaign Deletion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>
                  Campaign "<strong>{deleteConfirmationData?.campaign.name}</strong>" has{' '}
                  <strong>{deleteConfirmationData?.emailLogCount}</strong> email tracking records.
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium text-amber-800 mb-1">Warning: Analytics Data Loss</div>
                      <div className="text-amber-700">
                        Deleting will permanently remove all email engagement data (opens, clicks, bounces) 
                        for this campaign. This cannot be undone.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  Are you sure you want to proceed with deletion?
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCampaign}>
              Keep Campaign
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmationData && deleteCampaign(deleteConfirmationData.campaign, true)}
              disabled={deletingCampaign}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingCampaign ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Anyway
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}