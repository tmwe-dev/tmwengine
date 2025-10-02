import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

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
  const bgColor = isOverdue 
    ? 'bg-gradient-to-bl from-red-800/10 from-20% to-black/20 to-60% dark:from-red-900/10 dark:to-black/30 border-red-700 dark:border-red-800' 
    : isOpen 
    ? 'bg-gradient-to-bl from-green-800/10 from-20% to-black/20 to-60% dark:from-green-900/10 dark:to-black/30 border-green-700 dark:border-green-800'
    : '';

  return (
    <Card className={`border-card shadow-soft ${bgColor} relative overflow-hidden ${className}`}>
      <div 
        className="absolute inset-0 opacity-20" 
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
        }} 
      />
      <CardContent className="p-4 relative z-10">
        {children}
      </CardContent>
    </Card>
  );
}
