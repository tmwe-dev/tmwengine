import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserAvailabilityBadge } from "./UserAvailabilityBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown } from "lucide-react";

interface UserAvailabilitySelectorProps {
  currentStatus: 'online' | 'busy' | 'dnd' | 'offline';
  currentEmoji?: string;
  currentColor?: string;
  currentMessage?: string;
}

export const UserAvailabilitySelector = ({
  currentStatus,
  currentEmoji,
  currentColor,
  currentMessage
}: UserAvailabilitySelectorProps) => {
  const [status, setStatus] = useState(currentStatus);
  const [emoji, setEmoji] = useState(currentEmoji || '');
  const [color, setColor] = useState(currentColor || '#10b981');
  const [message, setMessage] = useState(currentMessage || '');
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          availability_status: status,
          status_emoji: emoji || null,
          status_color: color,
          status_message: message || null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Stato aggiornato",
        description: "Il tuo stato di disponibilità è stato aggiornato"
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive"
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <UserAvailabilityBadge 
            status={status} 
            emoji={currentEmoji} 
            color={currentColor}
          />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Stato</Label>
            <RadioGroup value={status} onValueChange={(v: any) => setStatus(v)}>
              {(['online', 'busy', 'dnd', 'offline'] as const).map((s) => (
                <div key={s} className="flex items-center space-x-2">
                  <RadioGroupItem value={s} id={s} />
                  <Label htmlFor={s} className="flex items-center gap-2 cursor-pointer">
                    <UserAvailabilityBadge status={s} showLabel />
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emoji">Emoji personalizzata (opzionale)</Label>
            <Input
              id="emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🎯"
              maxLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Colore personalizzato</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#10b981"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Messaggio stato (opzionale)</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="In riunione fino alle 15:00"
              maxLength={50}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Salva
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
