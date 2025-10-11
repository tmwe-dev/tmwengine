import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableAgent } from '@/components/chat-laboratory/SortableAgent';
import { Info, Bot, Save, Loader2, CheckCircle } from 'lucide-react';

interface BarChatAgentsSectionProps {
  barChatAgents: any[];
  loadingAgents: boolean;
  usageStats: {
    charactersToday: number;
    dailyLimit: number;
    requestsToday: number;
  };
  loadingUsage: boolean;
  newAgent: any;
  setNewAgent: (agent: any) => void;
  previewResponse: string;
  testingConnection: boolean;
  saving: boolean;
  editingAgent: any;
  setEditingAgent: (agent: any) => void;
  handleCreateAgent: () => void;
  handleUpdateAgent: (agentId: string) => void;
  handleDeleteAgent: (agentId: string) => void;
  handleToggleAgent: (agentId: string, currentStatus: boolean) => void;
  handleTestAgent: () => void;
  handlePreviewPersonality: () => void;
  handleDragEnd: (event: any) => void;
  sensors: any;
}

export const BarChatAgentsSection = ({
  barChatAgents,
  loadingAgents,
  usageStats,
  loadingUsage,
  newAgent,
  setNewAgent,
  previewResponse,
  testingConnection,
  saving,
  editingAgent,
  setEditingAgent,
  handleCreateAgent,
  handleUpdateAgent,
  handleDeleteAgent,
  handleToggleAgent,
  handleTestAgent,
  handlePreviewPersonality,
  handleDragEnd,
  sensors
}: BarChatAgentsSectionProps) => {
  return (
    <div className="space-y-4">
      {/* Alert Quote & Limiti */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="flex justify-between items-center flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <strong>Agenti Configurati:</strong> {barChatAgents.length} / 10
            {barChatAgents.length >= 10 && (
              <Badge variant="destructive">Limite Raggiunto</Badge>
            )}
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            {loadingUsage ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                Quota caratteri oggi: {usageStats.charactersToday.toLocaleString()} / {usageStats.dailyLimit.toLocaleString()}
              </>
            )}
          </span>
        </AlertDescription>
      </Alert>

      {/* Card Lista Agenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Agenti Vocali Configurati
            <Badge variant="outline">{barChatAgents.length} agenti</Badge>
          </CardTitle>
          <CardDescription>
            Trascina gli agenti per riordinarli. L'ordine determina la sequenza di attivazione.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAgents ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : barChatAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun agente vocale configurato</p>
              <p className="text-sm">Crea il tuo primo agente per iniziare</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={barChatAgents.map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {barChatAgents.map(agent => (
                    <SortableAgent
                      key={agent.id}
                      agent={agent}
                      onEdit={setEditingAgent}
                      onToggle={handleToggleAgent}
                      onDelete={handleDeleteAgent}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Card Form Creazione */}
      <Card>
        <CardHeader>
          <CardTitle>Crea Nuovo Agente Vocale</CardTitle>
          <CardDescription>
            Configura un nuovo agente per il Chat Laboratory Bar Mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Nome e Agent ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Agente *</Label>
                <Input
                  value={newAgent.name}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Es: Barista Amichevole"
                  disabled={saving}
                />
              </div>

              <div>
                <Label>ElevenLabs Agent ID *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newAgent.elevenlabs_agent_id}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, elevenlabs_agent_id: e.target.value }))}
                    placeholder="agent_xxxxx"
                    className="flex-1"
                    disabled={saving}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleTestAgent}
                    disabled={!newAgent.elevenlabs_agent_id || !newAgent.voice_id || testingConnection || saving}
                    title="Testa connessione"
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Voice ID */}
            <div>
              <Label>Voice ID *</Label>
              <Select
                value={newAgent.voice_id}
                onValueChange={(val) => setNewAgent(prev => ({ ...prev, voice_id: val }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una voce" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9BWtsMINqrJLrRacOk9x">Aria (Femminile, Chiara)</SelectItem>
                  <SelectItem value="EXAVITQu4vr4xnSDxMaL">Sarah (Femminile, Calda)</SelectItem>
                  <SelectItem value="IKne3meq5aSn9XLyUdCD">Charlie (Maschile, Professionale)</SelectItem>
                  <SelectItem value="pFZP5JQG7iQjIQuC4Bku">Lily (Femminile, Giovane)</SelectItem>
                  <SelectItem value="onwK4e9ZLuTAKqWW03F9">Daniel (Maschile, Profondo)</SelectItem>
                  <SelectItem value="CwhRBWXzGAHq8TQ4Fs17">Roger (Maschile, Maturo)</SelectItem>
                  <SelectItem value="JBFqnCBsd6RMkjVDRZzb">George (Maschile, Britannico)</SelectItem>
                  <SelectItem value="N2lVS1w4EtoT3dr4eOWO">Callum (Maschile, Americano)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Vedi lista completa voci nella{' '}
                <a
                  href="https://elevenlabs.io/docs/voices/voice-library/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  documentazione
                </a>
              </p>
            </div>

            {/* Personality Prompt */}
            <div>
              <Label>Prompt Personalità * (min. 50 caratteri)</Label>
              <Textarea
                value={newAgent.personality_prompt}
                onChange={(e) => setNewAgent(prev => ({ ...prev, personality_prompt: e.target.value }))}
                placeholder="Es: Sei un barista esperto e amichevole in un bar italiano. Sei informale, caloroso e ami fare battute leggere mentre prepari drink."
                rows={4}
                disabled={saving}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{newAgent.personality_prompt.length} / 500 caratteri</span>
                {newAgent.personality_prompt.length < 50 && (
                  <span className="text-destructive">Minimo 50 caratteri</span>
                )}
              </div>
            </div>

            {/* Preview Personalità */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Preview Personalità
                </CardTitle>
              </CardHeader>
              <CardContent>
                {previewResponse ? (
                  <div className="space-y-2">
                    <p className="text-sm italic text-muted-foreground">
                      "Ciao! Mi parli del tuo caffè preferito?"
                    </p>
                    <p className="text-sm font-medium border-l-2 border-primary pl-3">
                      "{previewResponse}"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Compila il prompt di personalità e clicca "Genera Preview" per vedere come l'agente risponderebbe
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handlePreviewPersonality}
                  disabled={newAgent.personality_prompt.length < 50 || saving}
                >
                  {saving && !testingConnection ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                  ) : (
                    <>{previewResponse ? "Rigenera Preview" : "Genera Preview"}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Grid Opzioni */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Stile Risposta</Label>
                <Select
                  value={newAgent.response_style}
                  onValueChange={(val) => setNewAgent(prev => ({ ...prev, response_style: val }))}
                  disabled={saving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar_chat">Bar Chat (Informale)</SelectItem>
                    <SelectItem value="formal">Formale (Professionale)</SelectItem>
                    <SelectItem value="technical">Tecnico (Dettagliato)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ritmo Conversazione</Label>
                <Select
                  value={newAgent.speaking_pace}
                  onValueChange={(val) => setNewAgent(prev => ({ ...prev, speaking_pace: val }))}
                  disabled={saving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Lento</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="fast">Veloce</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Stile Interruzione</Label>
                <Select
                  value={newAgent.interruption_style}
                  onValueChange={(val) => setNewAgent(prev => ({ ...prev, interruption_style: val }))}
                  disabled={saving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="polite">Educato (Aspetta pause)</SelectItem>
                    <SelectItem value="assertive">Assertivo (Interrompe se necessario)</SelectItem>
                    <SelectItem value="passive">Passivo (Non interrompe mai)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Slider Max Parole */}
            <div>
              <Label className="flex justify-between">
                <span>Max Parole per Risposta</span>
                <span className="font-mono text-sm">{newAgent.max_words_per_response}</span>
              </Label>
              <Input
                type="range"
                min="20"
                max="150"
                step="10"
                value={newAgent.max_words_per_response}
                onChange={(e) => setNewAgent(prev => ({
                  ...prev,
                  max_words_per_response: parseInt(e.target.value)
                }))}
                className="mt-2"
                disabled={saving}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>20 (Conciso)</span>
                <span>150 (Dettagliato)</span>
              </div>
            </div>

            {/* Pulsante Creazione */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleCreateAgent}
                disabled={
                  barChatAgents.length >= 10 ||
                  !newAgent.name ||
                  !newAgent.elevenlabs_agent_id ||
                  !newAgent.voice_id ||
                  newAgent.personality_prompt.length < 50 ||
                  saving
                }
              >
                {saving && !testingConnection ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creazione...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Crea Agente</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Modifica Agente */}
      {editingAgent && (
        <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Modifica Agente: {editingAgent.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Nome */}
              <div>
                <Label>Nome Agente</Label>
                <Input
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                  disabled={saving}
                />
              </div>

              {/* Agent ID - DISABILITATO */}
              <div>
                <Label>ElevenLabs Agent ID</Label>
                <Input
                  value={editingAgent.elevenlabs_agent_id}
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Non modificabile dopo la creazione
                </p>
              </div>

              {/* Voice ID */}
              <div>
                <Label>Voice ID</Label>
                <Select
                  value={editingAgent.voice_id}
                  onValueChange={(val) => setEditingAgent(prev => ({ ...prev, voice_id: val }))}
                  disabled={saving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9BWtsMINqrJLrRacOk9x">Aria (Femminile, Chiara)</SelectItem>
                    <SelectItem value="EXAVITQu4vr4xnSDxMaL">Sarah (Femminile, Calda)</SelectItem>
                    <SelectItem value="IKne3meq5aSn9XLyUdCD">Charlie (Maschile, Professionale)</SelectItem>
                    <SelectItem value="pFZP5JQG7iQjIQuC4Bku">Lily (Femminile, Giovane)</SelectItem>
                    <SelectItem value="onwK4e9ZLuTAKqWW03F9">Daniel (Maschile, Profondo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Personality Prompt */}
              <div>
                <Label>Prompt Personalità</Label>
                <Textarea
                  value={editingAgent.personality_prompt}
                  onChange={(e) => setEditingAgent(prev => ({ ...prev, personality_prompt: e.target.value }))}
                  rows={4}
                  disabled={saving}
                />
              </div>

              {/* Grid Options */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Stile Risposta</Label>
                  <Select
                    value={editingAgent.response_style}
                    onValueChange={(val) => setEditingAgent(prev => ({ ...prev, response_style: val }))}
                    disabled={saving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar_chat">Bar Chat</SelectItem>
                      <SelectItem value="formal">Formale</SelectItem>
                      <SelectItem value="technical">Tecnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ritmo</Label>
                  <Select
                    value={editingAgent.speaking_pace}
                    onValueChange={(val) => setEditingAgent(prev => ({ ...prev, speaking_pace: val }))}
                    disabled={saving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Lento</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="fast">Veloce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Interruzione</Label>
                  <Select
                    value={editingAgent.interruption_style}
                    onValueChange={(val) => setEditingAgent(prev => ({ ...prev, interruption_style: val }))}
                    disabled={saving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="polite">Educato</SelectItem>
                      <SelectItem value="assertive">Assertivo</SelectItem>
                      <SelectItem value="passive">Passivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Max Words Slider */}
              <div>
                <Label className="flex justify-between">
                  <span>Max Parole</span>
                  <span className="font-mono text-sm">{editingAgent.max_words_per_response}</span>
                </Label>
                <Input
                  type="range"
                  min="20"
                  max="150"
                  step="10"
                  value={editingAgent.max_words_per_response}
                  onChange={(e) => setEditingAgent(prev => ({
                    ...prev,
                    max_words_per_response: parseInt(e.target.value)
                  }))}
                  className="mt-2"
                  disabled={saving}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditingAgent(null)}
                  disabled={saving}
                >
                  Annulla
                </Button>
                <Button
                  onClick={() => handleUpdateAgent(editingAgent.id)}
                  disabled={saving}
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Salva Modifiche</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
