import React from 'react';
import { Label } from '@/components/ui/label';

interface FieldRendererProps {
  field: string;
  value: any;
  formatCellValue: (value: any, fieldKey?: string) => string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function FieldRenderer({ 
  field, 
  value, 
  formatCellValue, 
  className = "",
  labelClassName = "",
  valueClassName = ""
}: FieldRendererProps) {
  return (
    <div className={`${className}`}>
      <Label variant="field" className={labelClassName}>
        {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Label>
      <div className={`p-2 bg-muted/50 rounded-md min-h-[36px] flex items-center ${valueClassName}`}>
        <span className="text-sm break-words">
          {formatCellValue(value, field)}
        </span>
      </div>
    </div>
  );
}