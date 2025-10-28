import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = "",
  title,
  description,
  actions
}) => {
  return (
    <div className={cn("min-h-full bg-background", className)}>
      {(title || description || actions) && (
        <div className="border-b border-border bg-background">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {title && (
                  <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};