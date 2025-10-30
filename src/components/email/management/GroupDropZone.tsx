/**
 * Drop zone gruppo mittenti - Sistema isolato FunEmail
 */

import { useDroppable } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Trash2, AlertCircle, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EmailSenderGroup, EmailSenderRule } from '@/types/email-management';

interface FunEmailGroupDropZoneProps {
  group: EmailSenderGroup;
  onRefresh: () => void;
  onEditGroup?: (group: EmailSenderGroup) => void;
}

export function GroupDropZone({ group, onRefresh, onEditGroup }: FunEmailGroupDropZoneProps) {
  const [rules, setRules] = useState<(EmailSenderRule & { sender_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const { setNodeRef, isOver } = useDroppable({
    id: group.id,
  });

  useEffect(() => {
    loadRules();
  }, [group.id]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_sender_rules')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const rulesWithNames = data?.map(rule => ({
        ...rule,
        sender_name: funEmailExtractCompanyName(rule.sender_email),
      })) || [];
      
      setRules(rulesWithNames);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('email_sender_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
      
      loadRules();
      onRefresh();
    } catch (error) {
      console.error('Error removing rule:', error);
    }
  };

  function funEmailExtractCompanyName(email: string): string {
    const match = email.match(/@([^.]+)\./);
    if (!match) return email;
    const domain = match[1];
    return domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase();
  }

  return (
    <div ref={setNodeRef} className="h-[20vh] w-[15vw] min-w-[280px] max-w-[380px]">
      <Card 
        className={cn(
          "h-full transition-all border-2 flex flex-col overflow-hidden",
          isOver && "border-primary bg-primary/5 shadow-2xl scale-105 ring-4 ring-primary/20"
        )}
        style={{ 
          borderColor: isOver ? group.colore : undefined,
          backgroundColor: isOver ? `${group.colore}15` : undefined,
        }}
      >
        <CardHeader 
          className="pb-3 border-b flex-shrink-0 relative bg-gradient-to-r" 
          style={{ 
            backgroundImage: `linear-gradient(to right, ${group.colore}59, ${group.colore}00)` 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{group.icon || '📁'}</span>
              <div>
                <CardTitle className="text-base">{group.nome_gruppo}</CardTitle>
                {group.descrizione && (
                  <CardDescription className="text-xs mt-1">
                    {group.descrizione}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span className="text-2xl">{group.icon || '📁'}</span>
                      {group.nome_gruppo}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 mt-4">
                    {rules.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Nessun mittente classificato</p>
                    ) : (
                      rules.map(rule => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-3 bg-muted/40 rounded-md hover:bg-muted/60 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-base">{rule.sender_name}</div>
                            <div className="text-sm text-muted-foreground">{rule.sender_email}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              {onEditGroup && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => onEditGroup(group)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className="absolute top-3 left-3 h-8 w-8 flex items-center justify-center rounded-md font-bold text-white"
            style={{ backgroundColor: group.colore }}
          >
            {rules.length}
          </Badge>
        </CardHeader>

        <CardContent className="pt-4 flex-1 overflow-hidden flex flex-col">
          {isOver && rules.length === 0 && (
            <div className="text-center py-12 animate-pulse">
              <div className="text-5xl mb-3">👇</div>
              <p className="text-sm font-medium text-primary">
                Rilascia qui per classificare
              </p>
            </div>
          )}

          {!isOver && rules.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col items-center justify-center">
              <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">Nessun mittente classificato</p>
              <p className="text-xs mt-1">Trascina qui le email</p>
            </div>
          )}

          {rules.length > 0 && (
            <div className="space-y-2 overflow-y-auto flex-1">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-2 bg-muted/40 rounded-md text-sm hover:bg-muted/60 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{rule.sender_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {rule.sender_email}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveRule(rule.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
