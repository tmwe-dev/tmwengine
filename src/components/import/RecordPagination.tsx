import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Pickaxe, Database } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RecordPaginationProps {
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  selectedCount: number;
  onCreateMultiple?: () => void;
  onImportToRubrica?: () => void;
  isMobile?: boolean;
}

export function RecordPagination({
  currentPage,
  totalPages,
  filteredCount,
  totalCount,
  onPageChange,
  selectedCount,
  onCreateMultiple,
  onImportToRubrica,
  isMobile = false
}: RecordPaginationProps) {
  if (isMobile) {
    return (
      <div className="flex items-center justify-between w-full border-t pt-2 mt-2">
        <div className="flex items-center gap-2 flex-1">
          <Button
            size="sm"
            variant="ghost"
            className="px-[15px] hover:bg-transparent"
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-10 w-10" />
          </Button>
          
          {selectedCount > 0 && onCreateMultiple && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCreateMultiple}
                    className="p-2 absolute left-0"
                  >
                    <Pickaxe className="h-4 w-4 text-blue-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Crea attività multiple</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <span className="text-sm px-3 py-1">
            {currentPage + 1} di {totalPages}
          </span>
          
          <Button
            size="sm"
            variant="ghost"
            className="px-[15px] hover:bg-transparent"
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight className="h-10 w-10" />
          </Button>
        </div>
        
        {selectedCount > 0 && onImportToRubrica && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onImportToRubrica}
                  className="p-2 absolute right-0"
                >
                  <Database className="h-4 w-4 text-green-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Importa in rubrica</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between w-full max-w-2xl mx-auto">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
      >
        <ChevronLeft className="h-4 w-4" />
        Precedente
      </Button>
      
      <div className="flex flex-col items-center">
        <span className="text-sm px-3 py-1">
          Pagina {currentPage + 1} di {totalPages}
        </span>
        {filteredCount !== totalCount && (
          <span className="text-xs text-red-500 font-medium mt-[25px]">
            {filteredCount} records
          </span>
        )}
      </div>
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage >= totalPages - 1}
      >
        Successivo
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
