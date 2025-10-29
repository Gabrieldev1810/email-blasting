import { useEffect, useState } from 'react';

declare global {
  interface Window {
    ApexCharts: any;
  }
}

interface LeadData {
  day: string;
  date: string;
  email_campaigns: number;
  organic_leads: number;
}

interface LeadMetrics {
  total_leads: number;
  email_leads: number;
  organic_leads: number;
  conversion_rate: number;
  growth_rate: number;
  avg_daily_leads: number;
}

interface LeadGenerationChartProps {
  // Remove the old prop since we'll fetch data internally
}

export const LeadGenerationChart = () => {
  const [leadData, setLeadData] = useState<LeadData[]>([]);
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          // Production: Error handled silently
          return;
        }
        
        const response = await fetch('http://localhost:5001/api/dashboard/lead-generation', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Production: console.log removed
        const result = await response.json();
        // Production: console.log removed
        if (result.success && result.data) {
          setLeadData(result.data.weekly_data || []);
          // Merge totals and metrics for comprehensive metrics
          const metricsData = {
            ...result.data.totals,
            ...result.data.metrics
          };
          setMetrics(metricsData);
        } else {
          // Production: Error handled silently
          // Set default values on error
          setLeadData([]);
          setMetrics({
            total_leads: 0,
            email_leads: 0,
            organic_leads: 0,
            conversion_rate: 0,
            growth_rate: 0,
            avg_daily_leads: 0
          });
        }
      } catch (error) {
        // Production: Error handled silently
        // Set default values on error
        setLeadData([]);
        setMetrics({
          total_leads: 0,
          email_leads: 0,
          organic_leads: 0,
          conversion_rate: 0,
          growth_rate: 0,
          avg_daily_leads: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadData();
  }, [selectedPeriod]);
  useEffect(() => {
    // Load ApexCharts if not already loaded
    if (typeof window.ApexCharts === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/apexcharts@latest';
      script.onload = () => renderChart();
      document.head.appendChild(script);
    } else {
      renderChart();
    }

    function renderChart() {
      // Use only real data from API, no fallback mock data
      const data = leadData.length > 0 ? leadData : [];

      // Get theme-aware colors
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue('--primary').trim() || '#3B82F6';
      const chartColor2 = '#10B981'; // Secondary chart color
      
      const options = {
        colors: [primaryColor, chartColor2],
        series: [
          {
            name: "Email Campaigns",
            color: primaryColor,
            data: data.map(item => ({ x: item.day, y: item.email_campaigns })),
          },
          {
            name: "Organic Leads",
            color: chartColor2,
            data: data.map(item => ({ x: item.day, y: item.organic_leads })),
          },
        ],
        chart: {
          type: "bar",
          height: "280px",
          fontFamily: "Inter, sans-serif",
          toolbar: {
            show: false,
          },
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "65%",
            borderRadiusApplication: "end",
            borderRadius: 6,
          },
        },
        tooltip: {
          shared: true,
          intersect: false,
          style: {
            fontFamily: "Inter, sans-serif",
          },
        },
        states: {
          hover: {
            filter: {
              type: "lighten",
              value: 0.1,
            },
          },
        },
        stroke: {
          show: true,
          width: 0,
          colors: ["transparent"],
        },
        grid: {
          show: true,
          strokeDashArray: 4,
          borderColor: computedStyle.getPropertyValue('--border').trim() || '#e2e8f0',
          padding: {
            left: 2,
            right: 2,
            top: -14
          },
        },
        dataLabels: {
          enabled: false,
        },
        legend: {
          show: true,
          position: "top",
          horizontalAlign: 'left',
          fontFamily: "Inter, sans-serif",
          fontSize: '14px',
          labels: {
            colors: computedStyle.getPropertyValue('--foreground').trim() || '#0f172a'
          },
          markers: {
            radius: 4,
          },
        },
        xaxis: {
          floating: false,
          labels: {
            show: true,
            style: {
              fontFamily: "Inter, sans-serif",
              fontSize: '12px',
              colors: computedStyle.getPropertyValue('--muted-foreground').trim() || '#64748b'
            }
          },
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
        },
        yaxis: {
          show: true,
          labels: {
            style: {
              fontFamily: "Inter, sans-serif",
              fontSize: '12px',
              colors: computedStyle.getPropertyValue('--muted-foreground').trim() || '#64748b'
            }
          },
        },
        fill: {
          opacity: 1,
        },
      };

      const chartElement = document.getElementById("leads-column-chart");
      if (chartElement && window.ApexCharts) {
        // Clear any existing chart
        chartElement.innerHTML = '';
        const chart = new window.ApexCharts(chartElement, options);
        chart.render();
      }
    }

    return () => {
      const chartElement = document.getElementById("leads-column-chart");
      if (chartElement) {
        chartElement.innerHTML = '';
      }
    };
  }, [leadData, isLoading]);

  return (
    <div className="bg-card rounded-xl border border-border p-6 hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Lead Generation</h3>
            <p className="text-sm text-muted-foreground">Weekly performance tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
          +42.5%
        </div>
      </div>

      <div className="mb-6">
        <div className="text-2xl font-bold text-foreground mb-1">
          {isLoading ? "..." : (metrics && metrics.total_leads !== undefined) ? metrics.total_leads.toLocaleString() : "0"}
        </div>
        <div className="text-sm text-muted-foreground">Total leads this week</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted rounded-lg">
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">Conversion Rate</div>
          <div className="text-lg font-semibold text-foreground">
            {isLoading ? "..." : (metrics && metrics.conversion_rate !== undefined) ? `${metrics.conversion_rate}%` : "0%"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">Growth Rate</div>
          <div className={`text-lg font-semibold ${(metrics && metrics.growth_rate !== undefined && metrics.growth_rate >= 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isLoading ? "..." : (metrics && metrics.growth_rate !== undefined) ? `${metrics.growth_rate > 0 ? '+' : ''}${metrics.growth_rate}%` : "0%"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 rounded-lg">
        <div className="flex-1">
          <div className="text-xs text-primary uppercase font-medium">Lead Sources</div>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
              <span className="text-xs text-muted-foreground">Email: {isLoading ? "..." : (metrics && metrics.email_leads !== undefined) ? metrics.email_leads : 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
              <span className="text-xs text-muted-foreground">Organic: {isLoading ? "..." : (metrics && metrics.organic_leads !== undefined) ? metrics.organic_leads : 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div id="leads-column-chart" className="mb-4"></div>
      
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          {isLoading && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-3 h-3 border border-border border-t-primary rounded-full animate-spin"></div>
              Loading...
            </div>
          )}
        </div>
        
        <button 
          onClick={() => window.open('/contacts', '_blank')}
          className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
        >
          Manage Leads
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  );
};