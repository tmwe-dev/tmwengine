import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CampaignSchedulerProps {
  onRefresh: () => void;
}

export function CampaignScheduler({ onRefresh }: CampaignSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("14:00");
  const [intervalMinutes, setIntervalMinutes] = useState<string>("2");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Configurazione Pianificazione
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selettore Data */}
          <div className="space-y-2">
            <Label>Data Inizio Programmata</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: it }) : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Selettore Ora */}
          <div className="space-y-2">
            <Label htmlFor="time">Ora Inizio</Label>
            <input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Intervallo tra invii */}
        <div className="space-y-2">
          <Label>Intervallo tra Invii</Label>
          <RadioGroup value={intervalMinutes} onValueChange={setIntervalMinutes}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="interval-2" />
              <Label htmlFor="interval-2" className="font-normal cursor-pointer">
                2 minuti (consigliato)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="5" id="interval-5" />
              <Label htmlFor="interval-5" className="font-normal cursor-pointer">
                5 minuti
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="10" id="interval-10" />
              <Label htmlFor="interval-10" className="font-normal cursor-pointer">
                10 minuti
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            ℹ️ Le impostazioni di pianificazione vengono applicate quando crei una nuova campagna 
            dalla pagina "Template Email". Lo scheduler automatico gestirà l'invio secondo queste configurazioni.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
