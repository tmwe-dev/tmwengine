import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedBook } from '@/components/ui/animated-book';
import { Trash2, Pickaxe, Database, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportedContact {
  [key: string]: any;
}

interface RecordImportedFooterProps {
  isMobile: boolean;
  selectedRecords: Set<string>;
  setSelectedRecords: (records: Set<string>) => void;
  toggleSelectAll: () => void;
  viewingRecords: ImportedContact[];
  filteredRecords: ImportedContact[];
  allRecords: ImportedContact[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  recordsPerPage: number;
  deleteSelectedRecords: () => void;
  importSelectedRecords: () => void;
  setShowMultipleActivityDialog: (show: boolean) => void;
}

export const RecordImportedFooter: React.FC<RecordImportedFooterProps> = ({
  isMobile,
  selectedRecords,
  setSelectedRecords,
  toggleSelectAll,
  viewingRecords,
  filteredRecords,
  allRecords,
  currentPage,
  setCurrentPage,
  recordsPerPage,
  deleteSelectedRecords,
  importSelectedRecords,
  setShowMultipleActivityDialog,
}) => {
  return (
    <div className={cn(
      "pt-4 border-t flex-shrink-0",
      isMobile ? "space-y-3" : "flex justify-between items-center"
    )}>
      {isMobile ? (
        /* Mobile Pagination - Footer */
        <div className="flex flex-col items-center relative">
          {/* Cestino - allineato a destra */}
          {selectedRecords.size > 0 && (
            <div className="absolute -top-[15px] right-0 z-10">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deleteSelectedRecords}
                      className="p-2"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Elimina selezionati</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          
          {/* Animated Book */}
          <AnimatedBook currentPage={currentPage} className="w-full -mb-[41px] pointer-events-none" />
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-[15px] relative w-full">
            {/* File Icon - a sinistra del badge */}
            {filteredRecords.length > 0 && (
              <div className="absolute left-0 -top-[90px] flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="p-2 hover:bg-transparent"
                  aria-label="Seleziona tutti della pagina"
                >
                  <FileText 
                    className={(() => {
                      const currentPageIds = viewingRecords.filter(r => r?.id).map(r => r.id);
                      const isAllSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedRecords.has(id));
                      return isAllSelected ? "h-5 w-5 text-green-500" : "h-5 w-5 text-blue-500";
                    })()}
                  />
                </Button>
                {(() => {
                  const currentPageIds = viewingRecords.filter(r => r?.id).map(r => r.id);
                  const isAllSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedRecords.has(id));
                  return isAllSelected ? (
                    <span className="text-xs text-green-500 font-medium">full page</span>
                  ) : null;
                })()}
              </div>
            )}
            
            {/* Selected Records Badge - Centered */}
            {selectedRecords.size > 0 && (
              <span 
                key={selectedRecords.size}
                className="text-xs font-medium text-white bg-gradient-to-l from-purple-500/30 via-purple-500/15 via-35% to-purple-500/10 border border-purple-500/20 px-2 py-1 rounded cursor-pointer hover:from-purple-500/40 hover:via-purple-500/25 hover:to-purple-500/20 absolute left-1/2 -translate-x-1/2 -top-[90px] animate-[heartbeat_0.6s_ease-in-out_2]"
                onClick={() => setSelectedRecords(new Set())}
              >
                {selectedRecords.size}
              </span>
            )}
            
            {/* Centered controls */}
            <div className="flex items-center gap-[15px]">
              <Button
                size="sm"
                variant="ghost"
                className="px-[15px] hover:bg-transparent"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-10 w-10" />
              </Button>
              
              {/* Azioni multiple - a sinistra */}
              {selectedRecords.size > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowMultipleActivityDialog(true)}
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
                {currentPage + 1} di {Math.ceil(filteredRecords.length / recordsPerPage)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="px-[15px] hover:bg-transparent"
                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredRecords.length / recordsPerPage) - 1, currentPage + 1))}
                disabled={currentPage >= Math.ceil(filteredRecords.length / recordsPerPage) - 1}
              >
                <ChevronRight className="h-10 w-10" />
              </Button>
            </div>
            
            {/* Salva in rubrica - a destra della freccia, allineato a destra */}
            {selectedRecords.size > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={importSelectedRecords}
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
        </div>
      ) : (
        /* Desktop Pagination */
        <div className="flex items-start justify-between w-full max-w-2xl mx-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Precedente
          </Button>
          <div className="flex flex-col items-center">
            <span className="text-sm px-3 py-1">
              Pagina {currentPage + 1} di {Math.ceil(filteredRecords.length / recordsPerPage)}
            </span>
            {filteredRecords.length !== allRecords.length && (
              <span className="text-xs text-red-500 font-medium mt-[25px]">
                {filteredRecords.length} records
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage(Math.min(Math.ceil(filteredRecords.length / recordsPerPage) - 1, currentPage + 1))}
            disabled={currentPage >= Math.ceil(filteredRecords.length / recordsPerPage) - 1}
          >
            Successivo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
