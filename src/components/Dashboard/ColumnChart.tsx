import { useEffect, useRef } from 'react';
import { Card } from 'flowbite-react';
import { TrendingUp } from 'lucide-react';

// Since Flowbite doesn't include ApexCharts by default, we'll create a simple CSS-based column chart
interface ColumnChartData {
  label: string;
  value: number;
  color?: string;
}

interface ColumnChartProps {
  title: string;
  subtitle?: string;
  data: ColumnChartData[];
  className?: string;
}

export function ColumnChart({ title, subtitle, data, className = "" }: ColumnChartProps) {
  const maxValue = Math.max(...data.map(item => item.value), 1); // Ensure minimum of 1 to avoid division by zero
  
  console.log('ColumnChart - Component rendered!');
  console.log('ColumnChart - Data received:', data);
  console.log('ColumnChart - Max value:', maxValue);
  console.log('ColumnChart - Data length:', data.length);
  
  return (
    <Card className={`w-full ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center text-green-500">
            <TrendingUp className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">+15% Growth</span>
          </div>
        </div>
        
        {/* Chart Container */}
        <div className="relative h-72">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
            </div>
          ) : (
            <>
          {/* Y-axis labels */}
          <div className="absolute left-0 h-full flex flex-col justify-between py-2 text-xs text-gray-500 dark:text-gray-400 w-12">
            <span>{maxValue.toLocaleString()}</span>
            <span>{Math.floor(maxValue * 0.75).toLocaleString()}</span>
            <span>{Math.floor(maxValue * 0.5).toLocaleString()}</span>
            <span>{Math.floor(maxValue * 0.25).toLocaleString()}</span>
            <span>0</span>
          </div>
          
          {/* Grid lines */}
          <div className="absolute left-12 right-0 h-full">
            {[0, 25, 50, 75, 100].map((percent) => (
              <div
                key={percent}
                className="absolute w-full border-t border-gray-200 dark:border-gray-700"
                style={{ bottom: `${percent}%` }}
              />
            ))}
          </div>
          
          {/* Chart bars */}
          <div className="ml-12 flex items-end justify-between h-full space-x-3 px-4">
            {data.map((item, index) => {
              // Better height calculation with proper scaling
              const baseHeight = maxValue > 0 ? (item.value / maxValue) * 85 : 0; // Use 85% of container height
              const height = Math.max(baseHeight, item.value > 0 ? 10 : 0); // Minimum 10% if value > 0
              const color = item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`;
              
              console.log(`Bar ${item.label}: value=${item.value}, baseHeight=${baseHeight.toFixed(2)}%, finalHeight=${height.toFixed(2)}%, maxValue=${maxValue}`);
              
              return (
                <div key={item.label} className="flex flex-col items-center flex-1 group relative">
                  {/* Value Label on Hover */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded shadow-lg">
                      {item.value.toLocaleString()}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-white rotate-45 -mt-1"></div>
                    </div>
                  </div>
                  
                  {/* Column Bar */}
                  <div 
                    className="w-full rounded-t-lg transition-all duration-700 ease-out hover:brightness-110 cursor-pointer shadow-sm"
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: color,
                      backgroundImage: `linear-gradient(180deg, ${color} 0%, ${color}CC 100%)`,
                      minHeight: item.value > 0 ? '20px' : '0px' // Ensure bars are always visible
                    }}
                  />
                  
                  {/* Label */}
                  <div className="mt-3 text-center">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          {data.map((item, index) => {
            const color = item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`;
            return (
              <div key={item.label} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.label}: {item.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}