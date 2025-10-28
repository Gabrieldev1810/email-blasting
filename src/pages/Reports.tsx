import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Download, 
  Calendar as CalendarIcon, 
  Filter, 
  Search,
  FileText,
  FileSpreadsheet,
  Eye,
  MousePointer,
  Mail,
  AlertTriangle,
  TrendingUp,
  Target,
  Users,
  Activity
} from "lucide-react";
import { format as formatDate, subDays, startOfDay, endOfDay } from "date-fns";

interface Campaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
  emails_failed: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  created_at: string;
  scheduled_at: string | null;
}

interface ReportFilters {
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  campaignIds: number[];
  statuses: string[];
  metrics: string[];
  searchTerm: string;
}

interface MetricSummary {
  total_campaigns: number;
  total_recipients: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_failed: number;
  avg_open_rate: number;
  avg_click_rate: number;
  avg_bounce_rate: number;
}

const availableStatuses = [
  { value: 'sent', label: 'Sent', color: 'bg-green-500' },
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500' },
  { value: 'failed', label: 'Failed', color: 'bg-red-500' },
  { value: 'sending', label: 'Sending', color: 'bg-yellow-500' },
  { value: 'paused', label: 'Paused', color: 'bg-orange-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-600' }
];

const availableMetrics = [
  { key: 'emails_sent', label: 'Emails Sent', icon: Mail },
  { key: 'emails_opened', label: 'Emails Opened', icon: Eye },
  { key: 'emails_clicked', label: 'Emails Clicked', icon: MousePointer },
  { key: 'emails_bounced', label: 'Emails Bounced', icon: AlertTriangle },
  { key: 'emails_failed', label: 'Emails Failed', icon: AlertTriangle },
  { key: 'open_rate', label: 'Open Rate %', icon: TrendingUp },
  { key: 'click_rate', label: 'Click Rate %', icon: Target },
  { key: 'bounce_rate', label: 'Bounce Rate %', icon: Activity }
];

export default function Reports() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [metricSummary, setMetricSummary] = useState<MetricSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    },
    campaignIds: [],
    statuses: [],
    metrics: ['emails_sent', 'emails_opened', 'emails_clicked', 'open_rate', 'click_rate', 'bounce_rate'],
    searchTerm: ''
  });

  // UI state
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [campaigns, filters]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view reports",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('http://localhost:5001/api/campaigns', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      } else {
        throw new Error(data.error || 'Failed to fetch campaigns');
      }
    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Error",
        description: "Failed to fetch campaign data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...campaigns];

    // Date range filter
    if (filters.dateRange.from && filters.dateRange.to) {
      const fromDate = startOfDay(filters.dateRange.from);
      const toDate = endOfDay(filters.dateRange.to);
      
      filtered = filtered.filter(campaign => {
        const campaignDate = new Date(campaign.created_at);
        return campaignDate >= fromDate && campaignDate <= toDate;
      });
    }

    // Campaign IDs filter
    if (filters.campaignIds.length > 0) {
      filtered = filtered.filter(campaign => filters.campaignIds.includes(campaign.id));
    }

    // Status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(campaign => filters.statuses.includes(campaign.status));
    }

    // Search term filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(campaign => 
        campaign.name.toLowerCase().includes(searchLower) ||
        campaign.subject.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCampaigns(filtered);
    
    // Calculate summary metrics
    const summary: MetricSummary = {
      total_campaigns: filtered.length,
      total_recipients: filtered.reduce((sum, c) => sum + (c.total_recipients || 0), 0),
      total_sent: filtered.reduce((sum, c) => sum + (c.emails_sent || 0), 0),
      total_opened: filtered.reduce((sum, c) => sum + (c.emails_opened || 0), 0),
      total_clicked: filtered.reduce((sum, c) => sum + (c.emails_clicked || 0), 0),
      total_bounced: filtered.reduce((sum, c) => sum + (c.emails_bounced || 0), 0),
      total_failed: filtered.reduce((sum, c) => sum + (c.emails_failed || 0), 0),
      avg_open_rate: 0,
      avg_click_rate: 0,
      avg_bounce_rate: 0
    };

    // Calculate average rates
    if (summary.total_sent > 0) {
      summary.avg_open_rate = Number(((summary.total_opened / summary.total_sent) * 100).toFixed(2));
      summary.avg_click_rate = Number(((summary.total_clicked / summary.total_sent) * 100).toFixed(2));
      summary.avg_bounce_rate = Number(((summary.total_bounced / summary.total_sent) * 100).toFixed(2));
    }

    setMetricSummary(summary);
  };

  const handleExport = async (exportFormat: 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('access_token');

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to export reports",
          variant: "destructive"
        });
        return;
      }

      // Prepare query parameters
      const params = new URLSearchParams();
      
      if (filters.dateRange.from) {
        params.append('date_from', formatDate(filters.dateRange.from, 'yyyy-MM-dd'));
      }
      if (filters.dateRange.to) {
        params.append('date_to', formatDate(filters.dateRange.to, 'yyyy-MM-dd'));
      }
      if (filters.statuses.length > 0) {
        params.append('status', filters.statuses.join(','));
      }
      if (filters.searchTerm) {
        params.append('search', filters.searchTerm);
      }
      
      params.append('format', exportFormat);

      const response = await fetch(`http://localhost:5001/api/campaigns/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      // Handle file download
      const contentType = response.headers.get('content-type');
      const contentDisposition = response.headers.get('content-disposition');
      
      let filename = `campaign_report_${formatDate(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.${exportFormat}`;
      if (contentDisposition) {
        const filenamePart = contentDisposition.split('filename=')[1];
        if (filenamePart) {
          filename = filenamePart.replace(/"/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful! 📊",
        description: `Report exported as ${exportFormat.toUpperCase()} - ${filteredCampaigns.length} campaigns included`
      });

    } catch (error) {
      // Production: Error handled silently
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date()
      },
      campaignIds: [],
      statuses: [],
      metrics: ['emails_sent', 'emails_opened', 'emails_clicked', 'open_rate', 'click_rate', 'bounce_rate'],
      searchTerm: ''
    });
  };

  const formatDateString = (dateString: string) => {
    return formatDate(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = availableStatuses.find(s => s.value === status);
    return (
      <Badge className={`${statusConfig?.color} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaign Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate detailed reports with filters and export capabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting || filteredCampaigns.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('excel')}
            disabled={isExporting || filteredCampaigns.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Report Filters
          </CardTitle>
          <CardDescription>
            Customize your report by selecting date range, campaigns, and metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.dateRange.from ? formatDate(filters.dateRange.from, 'MMM dd') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from || undefined}
                      onSelect={(date) => handleFilterChange('dateRange', { 
                        ...filters.dateRange, 
                        from: date || null 
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.dateRange.to ? formatDate(filters.dateRange.to, 'MMM dd') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to || undefined}
                      onSelect={(date) => handleFilterChange('dateRange', { 
                        ...filters.dateRange, 
                        to: date || null 
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Campaign Status</Label>
              <Select
                value={filters.statuses.length === 1 ? filters.statuses[0] : ''}
                onValueChange={(value) => {
                  if (value === 'all') {
                    handleFilterChange('statuses', []);
                  } else {
                    handleFilterChange('statuses', [value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {availableStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label>Search Campaigns</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Campaign name or subject..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('dateRange', {
                from: subDays(new Date(), 7),
                to: new Date()
              })}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('dateRange', {
                from: subDays(new Date(), 30),
                to: new Date()
              })}
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('dateRange', {
                from: subDays(new Date(), 90),
                to: new Date()
              })}
            >
              Last 90 Days
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Report</TabsTrigger>
          <TabsTrigger value="metrics">Metrics Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {metricSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Total Campaigns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metricSummary.total_campaigns}</div>
                  <p className="text-xs text-muted-foreground">
                    {campaigns.length > 0 && `${Math.round((metricSummary.total_campaigns / campaigns.length) * 100)}% of all campaigns`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-green-500" />
                    Total Emails Sent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metricSummary.total_sent.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {metricSummary.total_recipients > 0 && 
                      `${Math.round((metricSummary.total_sent / metricSummary.total_recipients) * 100)}% delivery rate`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4 text-yellow-500" />
                    Average Open Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metricSummary.avg_open_rate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {metricSummary.total_opened.toLocaleString()} total opens
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-orange-500" />
                    Average Click Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metricSummary.avg_click_rate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {metricSummary.total_clicked.toLocaleString()} total clicks
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary Stats */}
          {metricSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Key metrics for {filteredCampaigns.length} campaigns in selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">Recipients</div>
                    <div className="text-lg font-semibold">{metricSummary.total_recipients.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Bounced</div>
                    <div className="text-lg font-semibold text-red-600">
                      {metricSummary.total_bounced.toLocaleString()} 
                      <span className="text-sm ml-1">({metricSummary.avg_bounce_rate}%)</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Failed</div>
                    <div className="text-lg font-semibold text-red-700">{metricSummary.total_failed.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Success Rate</div>
                    <div className="text-lg font-semibold text-green-600">
                      {metricSummary.total_recipients > 0 
                        ? Math.round(((metricSummary.total_sent) / metricSummary.total_recipients) * 100)
                        : 0
                      }%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Detailed Report Tab */}
        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Showing {filteredCampaigns.length} campaigns matching your filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading campaigns...</div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No campaigns found matching your filters
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Clicked</TableHead>
                        <TableHead>Bounced</TableHead>
                        <TableHead>Open Rate</TableHead>
                        <TableHead>Click Rate</TableHead>
                        <TableHead>Bounce Rate</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {campaign.subject}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                          <TableCell>{campaign.total_recipients || 0}</TableCell>
                          <TableCell>{campaign.emails_sent || 0}</TableCell>
                          <TableCell className="text-yellow-700">
                            {campaign.emails_opened || 0}
                          </TableCell>
                          <TableCell className="text-orange-700">
                            {campaign.emails_clicked || 0}
                          </TableCell>
                          <TableCell className="text-red-700">
                            {campaign.emails_bounced || 0}
                          </TableCell>
                          <TableCell className="font-medium">
                            {campaign.open_rate ? `${campaign.open_rate}%` : '0%'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {campaign.click_rate ? `${campaign.click_rate}%` : '0%'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {campaign.bounce_rate ? `${campaign.bounce_rate}%` : '0%'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateString(campaign.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Analysis Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Performing Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Top Open Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredCampaigns
                    .sort((a, b) => (b.open_rate || 0) - (a.open_rate || 0))
                    .slice(0, 5)
                    .map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {campaign.emails_opened || 0} opens
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {campaign.open_rate || 0}%
                        </Badge>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>

            {/* Top Click Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  Top Click Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredCampaigns
                    .sort((a, b) => (b.click_rate || 0) - (a.click_rate || 0))
                    .slice(0, 5)
                    .map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {campaign.emails_clicked || 0} clicks
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {campaign.click_rate || 0}%
                        </Badge>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>

            {/* Campaign Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableStatuses.map(status => {
                    const count = filteredCampaigns.filter(c => c.status === status.value).length;
                    const percentage = filteredCampaigns.length > 0 
                      ? Math.round((count / filteredCampaigns.length) * 100) 
                      : 0;
                    
                    return count > 0 ? (
                      <div key={status.value} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                          <span className="text-sm">{status.label}</span>
                        </div>
                        <div className="text-sm font-medium">
                          {count} ({percentage}%)
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Problem Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredCampaigns
                    .sort((a, b) => (b.bounce_rate || 0) - (a.bounce_rate || 0))
                    .slice(0, 5)
                    .filter(c => (c.bounce_rate || 0) > 0)
                    .map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {campaign.emails_bounced || 0} bounces
                          </div>
                        </div>
                        <Badge variant="destructive">
                          {campaign.bounce_rate || 0}%
                        </Badge>
                      </div>
                    ))
                  }
                  {filteredCampaigns.filter(c => (c.bounce_rate || 0) > 0).length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No significant bounce issues detected! 🎉
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}