import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";

interface StepperStep {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface StepperIndicatorProps {
  steps: StepperStep[];
  currentStepId: string;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function StepperIndicator({ 
  steps, 
  currentStepId, 
  className, 
  orientation = 'horizontal' 
}: StepperIndicatorProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  
  return (
    <ol className={cn(
      "flex items-center",
      orientation === 'vertical' ? 'flex-col space-y-4' : 'space-x-4',
      className
    )}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStepId;
        const isUpcoming = index > currentIndex;
        
        return (
          <li key={step.id} className={cn(
            "relative",
            orientation === 'horizontal' && index < steps.length - 1 ? "flex-1" : "",
            orientation === 'vertical' ? "w-full" : ""
          )}>
            <div className="flex items-center">
              {/* Step Circle */}
              <div className={cn(
                "z-10 flex items-center justify-center w-8 h-8 rounded-full ring-0 ring-white shrink-0",
                isCompleted && "bg-blue-600 text-white",
                isCurrent && "bg-blue-600 text-white",
                isUpcoming && "bg-gray-200 text-gray-600"
              )}>
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              {/* Connection Line */}
              {orientation === 'horizontal' && index < steps.length - 1 && (
                <div className={cn(
                  "flex w-full h-0.5 ml-4",
                  isCompleted ? "bg-blue-600" : "bg-gray-200"
                )} />
              )}
            </div>
            
            {/* Step Content */}
            <div className={cn(
              "mt-3",
              orientation === 'vertical' && index < steps.length - 1 ? "pb-4" : ""
            )}>
              <h3 className={cn(
                "font-medium text-sm",
                isCurrent ? "text-blue-900" : 
                isCompleted ? "text-gray-900" : 
                "text-gray-500"
              )}>
                {step.title}
              </h3>
              {step.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {step.description}
                </p>
              )}
            </div>
            
            {/* Vertical Connection Line */}
            {orientation === 'vertical' && index < steps.length - 1 && (
              <div className={cn(
                "absolute left-4 top-8 w-0.5 h-6",
                isCompleted ? "bg-blue-600" : "bg-gray-200"
              )} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Simple dot stepper for minimal space
interface DotStepperProps {
  totalSteps: number;
  currentStep: number;
  className?: string;
}

export function DotStepper({ totalSteps, currentStep, className }: DotStepperProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            index < currentStep ? "bg-blue-600" :
            index === currentStep ? "bg-blue-600" :
            "bg-gray-300"
          )}
        />
      ))}
    </div>
  );
}

// Progress stepper with percentage
interface ProgressStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function ProgressStepper({ steps, currentStep, className }: ProgressStepperProps) {
  const progressPercentage = ((currentStep) / (steps.length - 1)) * 100;
  
  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar */}
      <div className="relative mb-6">
        <div className="w-full h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Step markers */}
        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 border-white -mt-3 relative z-10",
                index <= currentStep ? "bg-blue-600" : "bg-gray-200"
              )} />
              <span className={cn(
                "text-xs mt-2 text-center max-w-[60px]",
                index <= currentStep ? "text-blue-900 font-medium" : "text-gray-500"
              )}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}