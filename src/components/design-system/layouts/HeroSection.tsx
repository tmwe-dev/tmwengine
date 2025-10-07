import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GradientBackground } from '../effects/GradientBackground';
import { FadeIn } from '../animations/FadeIn';

/**
 * HeroSection - Sezione hero per landing pages
 * 
 * @example
 * ```tsx
 * <HeroSection
 *   title="Benvenuto"
 *   subtitle="La tua piattaforma CRM"
 *   primaryAction={{ label: 'Inizia', onClick: () => {} }}
 *   secondaryAction={{ label: 'Scopri', onClick: () => {} }}
 * />
 * ```
 */

interface HeroAction {
  label: string;
  onClick: () => void;
}

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  image?: React.ReactNode;
  className?: string;
  gradient?: boolean;
  centered?: boolean;
}

export function HeroSection({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryAction,
  image,
  className,
  gradient = true,
  centered = true
}: HeroSectionProps) {
  const content = (
    <section
      className={cn(
        'relative overflow-hidden py-20 lg:py-32',
        className
      )}
    >
      <div className="container">
        <div
          className={cn(
            'grid gap-12 lg:grid-cols-2 lg:gap-16',
            centered && 'items-center'
          )}
        >
          <FadeIn direction="right">
            <div className={cn('space-y-6', centered && 'text-center lg:text-left')}>
              {subtitle && (
                <p className="text-sm font-medium text-primary uppercase tracking-wider">
                  {subtitle}
                </p>
              )}
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              {description && (
                <p className="text-lg text-muted-foreground max-w-2xl">
                  {description}
                </p>
              )}
              {(primaryAction || secondaryAction) && (
                <div className="flex gap-4 flex-wrap justify-center lg:justify-start">
                  {primaryAction && (
                    <Button size="lg" onClick={primaryAction.onClick}>
                      {primaryAction.label}
                    </Button>
                  )}
                  {secondaryAction && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={secondaryAction.onClick}
                    >
                      {secondaryAction.label}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </FadeIn>

          {image && (
            <FadeIn delay={0.2} direction="left">
              <div className="relative">{image}</div>
            </FadeIn>
          )}
        </div>
      </div>
    </section>
  );

  if (gradient) {
    return (
      <GradientBackground variant="multi" intensity="medium">
        {content}
      </GradientBackground>
    );
  }

  return content;
}
