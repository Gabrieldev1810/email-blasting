import { StatsCard } from "@/components/Dashboard/StatsCard";
import { FlowbiteStatsCard } from "@/components/Dashboard/FlowbiteStatsCard";
import { ColumnChart } from "@/components/Dashboard/ColumnChart";
import { Mail, Send, TrendingUp, Eye, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { dashboardAPI } from "@/lib/api";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await dashboardAPI.getStats();
      console.log('Dashboard API Response:', response);
      console.log('Dashboard Data:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);
  // Calculate dynamic trend for Total Sent Emails
  const calculateEmailTrend = (data: any) => {
    if (!data) return null;
    
    const deliveryRate = 100 - data.email_bounce_rate;
    const openRate = data.email_open_rate;
    
    // Calculate overall performance score (combination of delivery and engagement)
    const performanceScore = (deliveryRate * 0.6) + (openRate * 0.4);
    
    // Determine trend based on performance
    let trendText = "";
    let isPositive = true;
    
    if (performanceScore >= 80) {
      trendText = "Excellent performance";
      isPositive = true;
    } else if (performanceScore >= 60) {
      trendText = "Good engagement";
      isPositive = true;
    } else if (performanceScore >= 40) {
      trendText = "Moderate performance";
      isPositive = false;
    } else {
      trendText = "Needs improvement";
      isPositive = false;
    }
    
    return { value: trendText, isPositive };
  };

  // Always use test data for Total Sent Emails for debugging
  const totalSentEmailsData = {
    title: "Total Sent Emails",
    value: "1,250",
    icon: Mail,
    trend: { value: "+25% this month", isPositive: true },
  };
  
  console.log('Total Sent Emails Data:', totalSentEmailsData);

  // Always use test data for now to debug chart rendering
  const columnChartData = [
    { label: "Sent", value: 100, color: "#3b82f6" },
    { label: "Delivered", value: 85, color: "#10b981" },
    { label: "Opened", value: 60, color: "#f59e0b" },
    { label: "Clicked", value: 25, color: "#8b5cf6" },
    { label: "Bounced", value: 15, color: "#ef4444" },
  ];
  
  console.log('Dashboard Data Available:', !!dashboardData);
  console.log('Column Chart Data:', columnChartData);
  




  // Always use test data for debugging
  const stats = [
    {
      title: "Active Campaigns",
      value: "5",
      icon: Send,
      trend: { value: "+2 this week", isPositive: true },
    },
    {
      title: "Delivery Rate",
      value: "94.2%",
      icon: TrendingUp,
      trend: { value: "+3.1% vs last month", isPositive: true },
    },
    {
      title: "Open Rate", 
      value: "31.8%",
      icon: Eye,
      trend: { value: "+5.2% improvement", isPositive: true },
    },
  ];
  
  console.log('Stats array:', stats);

  const recentCampaigns = dashboardData?.recent_campaigns || [];

  // Error state
  if (error) {
    return (
      <div className="space-y-6 p-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your email campaign overview.
          </p>
        </div>
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Dashboard</h3>
            <p className="text-muted-foreground mb-4 text-center">{error}</p>
            <Button onClick={fetchDashboardData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Loading your email campaign overview...
          </p>
        </div>
        
        {/* Featured Section Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <Card className="lg:col-span-2 animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-48"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Regular Stats Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your real-time email campaign overview.
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          Refresh Data
        </Button>
      </div>

      {/* Featured Section - Column Chart and Total Sent Emails */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Featured Column Chart */}
        <div className="lg:col-span-2 animate-slide-in">
          <ColumnChart 
            title="Email Campaign Analytics" 
            subtitle="Performance overview across all campaigns"
            data={columnChartData}
          />
        </div>
        
        {/* Featured Total Sent Emails Card */}
        <div className="animate-slide-in" style={{ animationDelay: '100ms' }}>
          {totalSentEmailsData && (
            <FlowbiteStatsCard 
              {...totalSentEmailsData}
              iconBgColor="bg-blue-100 dark:bg-blue-900"
              iconTextColor="text-blue-600 dark:text-blue-400"
              className="h-full"
            />
          )}
        </div>
      </div>

      {/* Regular Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <div key={stat.title} style={{ animationDelay: `${(index + 2) * 100}ms` }} className="animate-slide-in">
            <StatsCard {...stat} />
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">Create your first email campaign to see it here.</p>
              <Button onClick={() => window.location.href = '/campaigns'}>
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Campaign Name</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Sent</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Opened</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Clicked</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.map((campaign, index) => (
                    <tr key={campaign.id || index} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-4 font-medium">{campaign.name}</td>
                      <td className="py-4 text-muted-foreground">{campaign.emails_sent?.toLocaleString() || '0'}</td>
                      <td className="py-4 text-muted-foreground">{campaign.emails_opened?.toLocaleString() || '0'}</td>
                      <td className="py-4 text-muted-foreground">{campaign.emails_clicked?.toLocaleString() || '0'}</td>
                      <td className="py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          campaign.status === "sent" ? "bg-green-100 text-green-800" :
                          campaign.status === "sending" ? "bg-blue-100 text-blue-800" :
                          campaign.status === "scheduled" ? "bg-yellow-100 text-yellow-800" :
                          campaign.status === "draft" ? "bg-gray-100 text-gray-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {campaign.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
