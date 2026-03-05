import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Plus, X, MessageSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface ConversationSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (r: DateRange | undefined) => void;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  filteredCount: number;
  onNewConversation: () => void;
  onCloseSidebar?: () => void;
}

export const ConversationSearchBar = ({
  searchQuery, setSearchQuery,
  dateRange, setDateRange,
  showDatePicker, setShowDatePicker,
  filteredCount,
  onNewConversation, onCloseSidebar
}: ConversationSearchBarProps) => {
  return (
    <div className="p-3 border-b border-border/40">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* Search Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:animate-wiggle transition-all" title="Cerca conversazioni">
                <Search className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 pointer-events-auto" align="start">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per titolo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                    autoFocus
                  />
                  {searchQuery && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery("")}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Filter */}
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:animate-wiggle transition-all" title="Filtra per data">
                <Calendar className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Seleziona periodo</span>
                  {(dateRange?.from || dateRange?.to) && (
                    <Button variant="ghost" size="sm" onClick={() => { setDateRange(undefined); setShowDatePicker(false); }} className="h-7 px-2 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      Rimuovi
                    </Button>
                  )}
                </div>
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) setShowDatePicker(false);
                  }}
                  className="pointer-events-auto"
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* New Conversation */}
          <Button
            onClick={() => {
              setSearchQuery("");
              setDateRange(undefined);
              onNewConversation();
              onCloseSidebar?.();
            }}
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:animate-wiggle transition-all"
            title="Nuova conversazione"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Badge
          variant="secondary"
          className="h-9 px-3 text-base font-semibold flex items-center gap-2 bg-transparent border border-border hover:bg-transparent transition-colors"
        >
          <MessageSquare className="h-5 w-5" />
          {filteredCount}
        </Badge>
      </div>
    </div>
  );
};
