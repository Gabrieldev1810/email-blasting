import { useEffect, useState } from 'react';

declare global {
  interface Window {
    ApexCharts: any;
  }
}

interface EmailStats {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
}

interface EmailAnalyticsData {
  totals: EmailStats;
  metrics: {
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
  };
}

export const EmailStatusDonutChart = () => {
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmailAnalytics = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          // Production: Error handled silently
          return;
        }
        
        const response = await fetch('http://localhost:5001/api/dashboard/email-analytics', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Production: console.log removed
        const result = await response.json();
        // Production: console.log removed
        if (result.success && result.data) {
          const analyticsData = result.data;
          
          // Set email stats from the API response
          setEmailStats({
            sent: analyticsData.totals?.total_sent || 0,
            opened: analyticsData.totals?.total_opens || 0,
            clicked: analyticsData.totals?.total_clicks || 0,
            bounced: 0 // Will need to add bounced data to backend if needed
          });
          
          setMetrics({
            ...analyticsData.metrics,
            ...analyticsData.totals
          });
        } else {
          // Production: Error handled silently
          // Set default data
          setEmailStats({
            sent: 0,
            opened: 0,
            clicked: 0,
            bounced: 0
          });
        }
      } catch (error) {
        // Production: Error handled silently
        // Set default data
        setEmailStats({
          sent: 0,
          opened: 0,
          clicked: 0,
          bounced: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmailAnalytics();
  }, []);

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
      if (!emailStats) return;

      const stats = emailStats;
      
      const getChartOptions = () => {
        return {
          series: [stats.sent, stats.opened, stats.clicked, stats.bounced],
          colors: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
          chart: {
            height: 280,
            width: "100%",
            type: "donut",
          },
          stroke: {
            colors: ["transparent"],
            lineCap: "",
          },
          plotOptions: {
            pie: {
              donut: {
                labels: {
                  show: true,
                  name: {
                    show: true,
                    fontFamily: "Inter, sans-serif",
                    offsetY: 20,
                  },
                  total: {
                    showAlways: true,
                    show: true,
                    label: "Total Emails",
                    fontFamily: "Inter, sans-serif",
                    formatter: function (w: any) {
                      const sum = w.globals.seriesTotals.reduce((a: number, b: number) => {
                        return a + b
                      }, 0)
                      return Math.round(sum).toString()
                    },
                  },
                  value: {
                    show: true,
                    fontFamily: "Inter, sans-serif",
                    offsetY: -20,
                    formatter: function (value: string) {
                      return Math.round(parseFloat(value)).toString()
                    },
                  },
                },
                size: "80%",
              },
            },
          },
          grid: {
            padding: {
              top: -2,
            },
          },
          labels: ["Sent", "Opened", "Clicked", "Bounced"],
          dataLabels: {
            enabled: false,
          },
          legend: {
            position: "bottom",
            fontFamily: "Inter, sans-serif",
          },
          yaxis: {
            labels: {
              formatter: function (value: number) {
                return Math.round(value).toString()
              },
            },
          },
          xaxis: {
            labels: {
              formatter: function (value: number) {
                return Math.round(value).toString()
              },
            },
            axisTicks: {
              show: false,
            },
            axisBorder: {
              show: false,
            },
          },
        }
      }

      const chartElement = document.getElementById("email-donut-chart");
      if (chartElement && window.ApexCharts) {
        // Clear any existing chart
        chartElement.innerHTML = '';
        const chart = new window.ApexCharts(chartElement, getChartOptions());
        chart.render();

        // Handle checkbox changes for filtering
        const checkboxes = document.querySelectorAll('#email-filters input[type="checkbox"]');
        
        function handleCheckboxChange(event: Event) {
          const checkbox = event.target as HTMLInputElement;
          if (checkbox.checked) {
            switch(checkbox.value) {
              case 'sent':
                chart.updateSeries([stats.sent + 10, stats.opened, stats.clicked, stats.bounced]);
                break;
              case 'opened':
                chart.updateSeries([stats.sent, stats.opened + 5, stats.clicked, stats.bounced]);
                break;
              case 'clicked':
                chart.updateSeries([stats.sent, stats.opened, stats.clicked + 2, stats.bounced]);
                break;
              default:
                chart.updateSeries([stats.sent, stats.opened, stats.clicked, stats.bounced]);
            }
          } else {
            chart.updateSeries([stats.sent, stats.opened, stats.clicked, stats.bounced]);
          }
        }

        checkboxes.forEach((checkbox) => {
          checkbox.addEventListener('change', handleCheckboxChange);
        });
      }
    }

    return () => {
      const chartElement = document.getElementById("email-donut-chart");
      if (chartElement) {
        chartElement.innerHTML = '';
      }
    };
  }, [emailStats]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-200 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Analytics</h3>
            <p className="text-sm text-gray-500">Campaign performance overview</p>
          </div>
        </div>
        <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-4" id="email-filters">
          <label className="flex items-center gap-2 cursor-pointer">
            <input id="sent" type="checkbox" value="sent" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"/>
            <span className="text-sm text-gray-600">Sent</span>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input id="opened" type="checkbox" value="opened" className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"/>
            <span className="text-sm text-gray-600">Opened</span>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input id="clicked" type="checkbox" value="clicked" className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"/>
            <span className="text-sm text-gray-600">Clicked</span>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input id="bounced" type="checkbox" value="bounced" className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"/>
            <span className="text-sm text-gray-600">Bounced</span>
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          </label>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {isLoading ? "..." : emailStats ? emailStats.sent.toLocaleString() : "0"}
          </div>
          <div className="text-xs text-gray-500">Sent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {isLoading ? "..." : emailStats ? emailStats.opened.toLocaleString() : "0"}
          </div>
          <div className="text-xs text-gray-500">Opened</div>
          {metrics && metrics.open_rate && (
            <div className="text-xs text-green-600">{metrics.open_rate.toFixed(1)}%</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600 mb-1">
            {isLoading ? "..." : emailStats ? emailStats.clicked.toLocaleString() : "0"}
          </div>
          <div className="text-xs text-gray-500">Clicked</div>
          {metrics && metrics.click_rate && (
            <div className="text-xs text-yellow-600">{metrics.click_rate.toFixed(1)}%</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-1">
            {isLoading ? "..." : emailStats ? emailStats.bounced.toLocaleString() : "0"}
          </div>
          <div className="text-xs text-gray-500">Bounced</div>
        </div>
      </div>

      {/* Donut Chart */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div id="email-donut-chart" className="mb-4"></div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          Last 7 days
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
          View Report
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
};