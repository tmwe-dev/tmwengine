import React from 'react';
import { LucideIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ProgressSteps - Stepper per processi multi-step
 * 
 * @example
 * ```tsx
 * <ProgressSteps
 *   steps={[
 *     { label: 'Dati', icon: FileText },
 *     { label: 'Verifica', icon: CheckCircle },
 *     { label: 'Completa', icon: Flag }
 *   ]}
 *   currentStep={1}
 * />
 * ```
 */

export interface Step {
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

export function ProgressSteps({
  steps,
  currentStep,
  className,
  variant = 'horizontal'
}: ProgressStepsProps) {
  const isVertical = variant === 'vertical';

  return (
    <div
      className={cn(
        'flex',
        isVertical ? 'flex-col space-y-4' : 'items-center justify-between',
        className
      )}
    >
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <React.Fragment key={index}>
            <div
              className={cn(
                'flex items-center',
                isVertical ? 'w-full' : 'flex-col text-center',
                isVertical && 'space-x-3'
              )}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                  isCompleted && 'border-primary bg-primary text-white',
                  isCurrent && 'border-primary bg-background text-primary',
                  isUpcoming && 'border-muted bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : Icon ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>

              {/* Step info */}
              <div className={cn(!isVertical && 'mt-2')}>
                <p
                  className={cn(
                    'text-sm font-medium',
                    (isCompleted || isCurrent) && 'text-foreground',
                    isUpcoming && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                {step.description && isVertical && (
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'transition-colors',
                  isVertical
                    ? 'ml-5 h-8 w-0.5'
                    : 'h-0.5 flex-1 mx-2',
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
