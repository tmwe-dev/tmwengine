import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getActivityStyles } from '@/lib/activityStyles';

interface ActivityCardProps {
  isOverdue: boolean;
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * ActivityCard con gradiente diagonale e retino trasparente
 * - Verde scuro per attività aperte
 * - Rosso scuro per attività scadute
 * - Gradiente a 45° dall'alto-destra verso basso-sinistra
 * - Retino diagonale trasparente al 20%
 */
export function ActivityCard({ isOverdue, isOpen, children, className = '' }: ActivityCardProps) {
  const { bgColor, combinedStyle } = getActivityStyles({ isOverdue, isOpen });

  return (
    <Card 
      className={`border-card shadow-soft ${bgColor} relative overflow-hidden ${className}`}
      style={combinedStyle}
    >
      <CardContent className="p-4 relative z-10">
        {children}
      </CardContent>
    </Card>
  );
}
