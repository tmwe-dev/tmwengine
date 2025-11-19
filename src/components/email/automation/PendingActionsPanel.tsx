import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePendingActions } from '@/hooks/usePendingActions';
import { AIActionFeedback } from './AIActionFeedback';
import { Clock, CheckCircle, XCircle, Mail, ArrowRight, Archive, Trash, ListTodo } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const actionIcons = {
  reply: Mail,
  forward: ArrowRight,
  archive: Archive,
  delete: Trash,
  create_task: ListTodo,
  nothing: Clock,
};

const actionLabels = {
  reply: 'Rispondere',
  forward: 'Inoltrare',
  archive: 'Archiviare',
  delete: 'Eliminare',
  create_task: 'Creare Task',
  nothing: 'Nessuna azione',
};

const actionColors = {
  reply: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  forward: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  archive: 'bg-green-500/10 text-green-700 dark:text-green-300',
  delete: 'bg-red-500/10 text-red-700 dark:text-red-300',
  create_task: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  nothing: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
};

export const PendingActionsPanel = () => {
  const {
    pendingActions,
    isLoading,
    approveAction,
    rejectAction,
    updateResponse,
    isApproving,
    isRejecting,
    isUpdating,
  } = usePendingActions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedResponse, setEditedResponse] = useState('');

  const handleStartEdit = (actionId: string, currentResponse: string) => {
    setEditingId(actionId);
    setEditedResponse(currentResponse || '');
  };

  const handleSaveEdit = (actionId: string) => {
    updateResponse({ actionId, newResponse: editedResponse });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedResponse('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (pendingActions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nessuna azione in attesa di approvazione
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Le azioni proposte da AI appariranno qui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Azioni Pending</h3>
          <p className="text-sm text-muted-foreground">
            {pendingActions.length} {pendingActions.length === 1 ? 'azione' : 'azioni'} in attesa di approvazione
          </p>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4">
          {pendingActions.map((action) => {
            const ActionIcon = actionIcons[action.action_type];
            const isEditing = editingId === action.id;

            return (
              <Card key={action.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "p-2 rounded-lg",
                        actionColors[action.action_type]
                      )}>
                        <ActionIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {actionLabels[action.action_type]}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Da: <span className="font-medium">{action.sender_email}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={action.confidence > 0.8 ? 'default' : 'secondary'}>
                      {Math.round(action.confidence * 100)}% sicuro
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Reasoning */}
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">💭 Ragionamento AI:</p>
                    <p className="text-sm text-muted-foreground">{action.reasoning}</p>
                  </div>

                  {/* Suggested Response (if reply action) */}
                  {action.action_type === 'reply' && action.suggested_response && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">📝 Risposta Suggerita:</p>
                      {isEditing ? (
                        <>
                          <Textarea
                            value={editedResponse}
                            onChange={(e) => setEditedResponse(e.target.value)}
                            rows={6}
                            className="font-mono text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(action.id)}
                              disabled={isUpdating}
                            >
                              💾 Salva Modifiche
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                            >
                              Annulla
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-background border rounded-md">
                            <p className="text-sm whitespace-pre-wrap">{action.suggested_response}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(action.id, action.suggested_response || '')}
                          >
                            ✏️ Modifica Risposta
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Payload (if present) */}
                  {action.action_payload && Object.keys(action.action_payload).length > 0 && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">🎯 Dettagli Azione:</p>
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(action.action_payload, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => approveAction(action.id)}
                      disabled={isApproving || isRejecting}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approva
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => rejectAction({ actionId: action.id })}
                      disabled={isApproving || isRejecting}
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rifiuta
                    </Button>
                  </div>

                  {/* INCREMENTO 10: AI Feedback UI */}
                  <div className="pt-3 border-t">
                    <AIActionFeedback
                      emailId={action.email_id}
                      aiSuggestion={`${actionLabels[action.action_type]}: ${action.reasoning}`}
                      actionType="action_decision"
                      confidenceScore={action.confidence}
                      senderEmail={action.sender_email}
                    />
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground">
                    Creato: {new Date(action.created_at).toLocaleString('it-IT')}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
