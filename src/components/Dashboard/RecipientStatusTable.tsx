import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Eye, 
  MousePointer, 
  AlertTriangle, 
  Mail, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  X,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailLog {
  id: number;
  campaign_id: number;
  campaign_name: string;
  recipient_email: string;
  recipient_name: string;
  status: 'sent' | 'opened' | 'clicked' | 'bounced';
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  bounce_type?: 'hard' | 'soft';
  bounce_reason?: string;
  click_count: number;
}

interface FilterOptions {
  status: string;
  campaign_id: string;
  search_email: string;
  date_from: string;
  date_to: string;
}

interface RecipientStatusTableProps {
  campaignId?: number;
  title?: string;
  showCampaignColumn?: boolean;
}

export function RecipientStatusTable({ 
  campaignId, 
  title = "Email Recipient Status", 
  showCampaignColumn = true 
}: RecipientStatusTableProps) {
  const { toast } = useToast();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    campaign_id: campaignId ? campaignId.toString() : 'all',
    search_email: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    fetchEmailLogs();
    if (showCampaignColumn) {
      fetchCampaigns();
    }
  }, [filters, currentPage, campaignId]);

  const fetchEmailLogs = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        per_page: pageSize.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v && v !== 'all'))
      });

      if (campaignId) {
        queryParams.set('campaign_id', campaignId.toString());
      }

      const response = await fetch(`http://localhost:5001/api/dashboard/email-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setEmailLogs(result.data.logs);
        setTotalCount(result.data.total);
      } else {
        throw new Error(result.error || 'Failed to fetch email logs');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Failed to Load Email Status",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/campaigns', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setCampaigns(result.campaigns.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      // Production: Error handled silently
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const queryParams = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v && v !== 'all')),
        format: 'csv'
      });

      if (campaignId) {
        queryParams.set('campaign_id', campaignId.toString());
      }

      const response = await fetch(`http://localhost:5001/api/dashboard/email-logs/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `email_recipients_${campaignId || 'all'}_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Email recipient data has been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export recipient data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string, bounceType?: string) => {
    const baseClasses = "text-xs font-medium";
    
    switch (status) {
      case 'sent':
        return <Badge className={`bg-gray-100 text-gray-700 ${baseClasses}`}>
          <Mail className="w-3 h-3 mr-1" />
          Sent
        </Badge>;
      case 'opened':
        return <Badge className={`bg-yellow-100 text-yellow-700 ${baseClasses}`}>
          <Eye className="w-3 h-3 mr-1" />
          Opened
        </Badge>;
      case 'clicked':
        return <Badge className={`bg-orange-100 text-orange-700 ${baseClasses}`}>
          <MousePointer className="w-3 h-3 mr-1" />
          Clicked
        </Badge>;
      case 'bounced':
        return <Badge className={`bg-red-100 text-red-700 ${baseClasses}`}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          {bounceType === 'hard' ? 'Hard Bounce' : 'Soft Bounce'}
        </Badge>;
      default:
        return <Badge className={`bg-gray-100 text-gray-700 ${baseClasses}`}>
          {status}
        </Badge>;
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      campaign_id: campaignId ? campaignId.toString() : 'all',
      search_email: '',
      date_from: '',
      date_to: ''
    });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track individual recipient engagement and delivery status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEmailLogs()}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || emailLogs.length === 0}
            >
              {isExporting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 p-4 bg-muted rounded-lg">
          <div>
            <Label htmlFor="status-filter" className="text-sm font-medium">Status</Label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, status: value }));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCampaignColumn && (
            <div>
              <Label htmlFor="campaign-filter" className="text-sm font-medium">Campaign</Label>
              <Select 
                value={filters.campaign_id} 
                onValueChange={(value) => {
                  setFilters(prev => ({ ...prev, campaign_id: value }));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="email-search" className="text-sm font-medium">Search Email</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email-search"
                placeholder="Enter email address"
                value={filters.search_email}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, search_email: e.target.value }));
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading recipient data...</span>
          </div>
        ) : emailLogs.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recipient data found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or check back after sending campaigns
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    {showCampaignColumn && <TableHead>Campaign</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Clicked</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Bounce Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.recipient_email}</div>
                          {log.recipient_name && (
                            <div className="text-sm text-gray-500">{log.recipient_name}</div>
                          )}
                        </div>
                      </TableCell>
                      {showCampaignColumn && (
                        <TableCell className="text-sm text-gray-600">
                          {log.campaign_name}
                        </TableCell>
                      )}
                      <TableCell>
                        {getStatusBadge(log.status, log.bounce_type)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(log.sent_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(log.opened_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(log.clicked_at)}
                      </TableCell>
                      <TableCell>
                        {log.click_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {log.click_count} {log.click_count === 1 ? 'click' : 'clicks'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.bounce_reason && (
                          <div className="max-w-32 truncate text-red-600" title={log.bounce_reason}>
                            {log.bounce_reason}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}