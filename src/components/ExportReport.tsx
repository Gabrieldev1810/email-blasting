import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Download, Filter, Loader2, FileText, X } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ExportFilters {
  dateRange: {
    from?: Date;
    to?: Date;
  };
  campaignName: string;
  status: string;
}

interface ExportReportProps {
  onExport?: (filters: ExportFilters) => void;
  isExporting?: boolean;
}

export default function ExportReport({ onExport, isExporting = false }: ExportReportProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    dateRange: {},
    campaignName: '',
    status: 'all'
  });

  const handleDateSelect = (field: 'from' | 'to') => (date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: date
      }
    }));
  };

  const clearDateRange = () => {
    setFilters(prev => ({
      ...prev,
      dateRange: {}
    }));
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const exportFilters = { ...filters, format };
      
      if (onExport) {
        await onExport(exportFilters);
      } else {
        // Default export logic
        await performExport(exportFilters);
      }
      
      setIsDialogOpen(false);
      
      toast({
        title: "Export Started",
        description: `Your campaigns report is being prepared in ${format.toUpperCase()} format.`,
      });
      
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : 'Failed to export report',
        variant: "destructive",
      });
    }
  };

  const performExport = async (exportFilters: ExportFilters & { format: string }) => {
    const token = localStorage.getItem('access_token');
    const queryParams = new URLSearchParams();
    
    if (exportFilters.dateRange.from) {
      queryParams.append('date_from', startOfDay(exportFilters.dateRange.from).toISOString());
    }
    if (exportFilters.dateRange.to) {
      queryParams.append('date_to', endOfDay(exportFilters.dateRange.to).toISOString());
    }
    if (exportFilters.campaignName.trim()) {
      queryParams.append('campaign_name', exportFilters.campaignName.trim());
    }
    if (exportFilters.status && exportFilters.status !== 'all') {
      queryParams.append('status', exportFilters.status);
    }
    queryParams.append('format', exportFilters.format);

    const response = await fetch(`/api/campaigns/export?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export campaigns');
    }

    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    a.download = `campaigns_report_${timestamp}.${exportFilters.format === 'excel' ? 'xlsx' : 'csv'}`;
    
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const hasActiveFilters = () => {
    return filters.dateRange.from || 
           filters.dateRange.to || 
           filters.campaignName.trim() || 
           (filters.status && filters.status !== 'all');
  };

  const getFilterCount = () => {
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.campaignName.trim()) count++;
    if (filters.status && filters.status !== 'all') count++;
    return count;
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Download className="mr-2 h-4 w-4" />
          Export Report
          {hasActiveFilters() && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {getFilterCount()}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Campaigns Report
          </DialogTitle>
          <DialogDescription>
            Configure filters and export your campaigns data including recipient lists for each campaign.
            Each campaign row includes all recipients (emails, names, delivery status) in organized columns.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? format(filters.dateRange.from, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.from}
                    onSelect={handleDateSelect('from')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.to}
                    onSelect={handleDateSelect('to')}
                    disabled={(date) => 
                      filters.dateRange.from ? date < filters.dateRange.from : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {(filters.dateRange.from || filters.dateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateRange}
                  className="h-9 w-9 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Campaign Name Filter */}
          <div className="space-y-2">
            <Label htmlFor="campaignName" className="text-sm font-medium">
              Campaign Name
            </Label>
            <Input
              id="campaignName"
              placeholder="Search by campaign name..."
              value={filters.campaignName}
              onChange={(e) => setFilters(prev => ({ ...prev, campaignName: e.target.value }))}
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sending">Sending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters() && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Active Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {(filters.dateRange.from || filters.dateRange.to) && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Date: {filters.dateRange.from ? format(filters.dateRange.from, "MMM d") : "Start"} 
                      {" - "}
                      {filters.dateRange.to ? format(filters.dateRange.to, "MMM d, yyyy") : "End"}
                    </Badge>
                  </div>
                )}
                {filters.campaignName.trim() && (
                  <Badge variant="outline" className="text-xs">
                    Name: "{filters.campaignName}"
                  </Badge>
                )}
                {filters.status && filters.status !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}