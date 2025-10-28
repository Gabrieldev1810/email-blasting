import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Simple donut chart component using CSS and SVG
function DonutChart({ data, colors, total }: { 
  data: { label: string; value: number; color: string }[];
  colors: string[];
  total: number;
}) {
  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  let accumulatedPercentage = 0;
  
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((segment, index) => {
          const percentage = total > 0 ? (segment.value / total) : 0;
          const strokeDasharray = `${percentage * circumference} ${circumference}`;
          const strokeDashoffset = -accumulatedPercentage * circumference;
          
          const result = (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          );
          
          accumulatedPercentage += percentage;
          return result;
        })}
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-foreground">{total.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">Total Sent</div>
      </div>
    </div>
  );
}

interface EmailEngagementData {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
}

export function EmailEngagementChart() {
  const [engagementData, setEngagementData] = useState<EmailEngagementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEngagementData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch("http://localhost:5001/api/dashboard/email-engagement", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();
        if (result.success && result.data.overview) {
          setEngagementData(result.data.overview);
        }
      } catch (err) {
        // Production: Error handled silently
      } finally {
        setIsLoading(false);
      }
    };

    fetchEngagementData();
  }, []);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Email Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-muted-foreground">Loading engagement data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!engagementData || engagementData.total_sent === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Email Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-sm text-muted-foreground">
              <p>No email data available</p>
              <p className="mt-1">Send some campaigns to see engagement metrics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate remaining sent emails (not opened, clicked, or bounced)
  const remainingSent = engagementData.total_sent - engagementData.total_opened - engagementData.total_clicked - engagementData.total_bounced;

  const chartData = [
    { label: 'Opened', value: engagementData.total_opened, color: '#FFD600' },
    { label: 'Clicked', value: engagementData.total_clicked, color: '#FFA726' },
    { label: 'Bounced', value: engagementData.total_bounced, color: '#FF5722' },
    { label: 'Sent Only', value: Math.max(0, remainingSent), color: '#9E9E9E' }
  ].filter(item => item.value > 0); // Only show segments with data

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Email Engagement</CardTitle>
          <Badge variant="secondary">
            {engagementData.total_sent.toLocaleString()} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Donut Chart */}
          <div className="flex justify-center">
            <DonutChart 
              data={chartData}
              colors={['#FFD600', '#FFA726', '#FF5722', '#9E9E9E']}
              total={engagementData.total_sent}
            />
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.label} ({item.value.toLocaleString()})
                </span>
              </div>
            ))}
          </div>
          
          {/* Engagement Rates */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {engagementData.open_rate}%
              </div>
              <div className="text-xs text-muted-foreground">Open Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {engagementData.click_rate}%
              </div>
              <div className="text-xs text-muted-foreground">Click Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                {engagementData.bounce_rate}%
              </div>
              <div className="text-xs text-muted-foreground">Bounce Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}