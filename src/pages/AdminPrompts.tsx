import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, ArrowLeft, FileText, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PromptSection {
  id: string;
  section_type: 'base' | 'agent_personality' | 'topic_objective' | 'kb_context';
  section_name: string;
  content: string;
  topic_tags: string[];
  is_active: boolean;
  order_priority: number;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_TOPICS = [
  'logistica', 'trasporti', 'medico', 'medicina', 'clinica',
  'fiscale', 'tributario', 'fisco', 'ingegneria', 'informatica',
  'consulenza', 'ristorazione', 'strategia', 'filosofia'
];

const SECTION_TYPE_LABELS = {
  base: '🎯 Prompt Base Sala',
  agent_personality: '🎭 Personalità Agente',
  topic_objective: '📋 Obiettivo Topic',
  kb_context: '📚 Contesto KB'
};

const CONTEXT_LABELS = {
  base: '🎯 Tavola Rotonda (Base)',
  agent_personality: '🎭 Tavola Rotonda (Agente)',
  topic_objective: '📋 Tavola Rotonda (Topic)',
  kb_context: '📚 Tavola Rotonda (KB)'
};

const getCharacterBadgeVariant = (length: number) => {
  if (length < 500) return 'default'; // Green
  if (length <= 1500) return 'secondary'; // Yellow
  return 'destructive'; // Red
};

const getCharacterBadgeColor = (length: number) => {
  if (length < 500) return 'text-green-600 dark:text-green-400';
  if (length <= 1500) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export default function AdminPrompts() {
  const [prompts, setPrompts] = useState<PromptSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptSection | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');

  const [formData, setFormData] = useState<{
    section_type: 'base' | 'agent_personality' | 'topic_objective' | 'kb_context';
    section_name: string;
    content: string;
    topic_tags: string[];
    is_active: boolean;
    order_priority: number;
  }>({
    section_type: 'topic_objective',
    section_name: '',
    content: '',
    topic_tags: [],
    is_active: true,
    order_priority: 10
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('*')
        .order('order_priority', { ascending: true });

      if (error) throw error;
      setPrompts(data as PromptSection[] || []);
    } catch (error) {
      console.error('Errore caricamento prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i prompt",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingPrompt) {
        // Update
        const { error } = await supabase
          .from('chat_laboratory_prompt_sections')
          .update(formData)
          .eq('id', editingPrompt.id);

        if (error) throw error;
        toast({ title: "Prompt aggiornato!" });
      } else {
        // Insert
        const { error } = await supabase
          .from('chat_laboratory_prompt_sections')
          .insert(formData);

        if (error) throw error;
        toast({ title: "Prompt creato!" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadPrompts();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo prompt?')) return;

    try {
      const { error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Prompt eliminato" });
      loadPrompts();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (prompt: PromptSection) => {
    setEditingPrompt(prompt);
    setFormData({
      section_type: prompt.section_type,
      section_name: prompt.section_name,
      content: prompt.content,
      topic_tags: prompt.topic_tags || [],
      is_active: prompt.is_active,
      order_priority: prompt.order_priority
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPrompt(null);
    setFormData({
      section_type: 'topic_objective' as const,
      section_name: '',
      content: '',
      topic_tags: [],
      is_active: true,
      order_priority: 10
    });
  };

  const toggleTopicTag = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      topic_tags: prev.topic_tags.includes(topic)
        ? prev.topic_tags.filter(t => t !== topic)
        : [...prev.topic_tags, topic]
    }));
  };

  const filteredPrompts = prompts.filter(p => {
    if (filterType !== 'all' && p.section_type !== filterType) return false;
    if (filterTopic !== 'all' && !p.topic_tags.includes(filterTopic)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900/20 via-background to-violet-900/20 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/chat-laboratory')} variant="outline" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Gestione Prompt Modulari
              </h1>
              <p className="text-muted-foreground">Amministra i prompt per agenti e topic</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuovo Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPrompt ? 'Modifica Prompt' : 'Nuovo Prompt'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Tipo */}
                <div>
                  <Label>Tipo Sezione</Label>
                  <Select
                    value={formData.section_type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, section_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">🎯 Prompt Base Sala</SelectItem>
                      <SelectItem value="agent_personality">🎭 Personalità Agente</SelectItem>
                      <SelectItem value="topic_objective">📋 Obiettivo Topic</SelectItem>
                      <SelectItem value="kb_context">📚 Contesto KB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Nome */}
                <div>
                  <Label>Nome Sezione</Label>
                  <Input
                    value={formData.section_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, section_name: e.target.value }))}
                    placeholder="es. Renny - Esperto Logistica"
                  />
                </div>

                {/* Contenuto */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Contenuto Prompt</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={getCharacterBadgeVariant(formData.content.length)}>
                        {formData.content.length} caratteri
                      </Badge>
                      {formData.content.length > 1500 && (
                        <span className="text-xs text-destructive">⚠️ Troppo lungo</span>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={12}
                    placeholder="Inserisci il contenuto del prompt..."
                    className="font-mono text-sm"
                  />
                  {formData.content.length > 1500 && (
                    <p className="text-xs text-destructive mt-1">
                      💡 Suggerimento: Riduci il prompt a max 1000-1500 caratteri per ottimizzare i token
                    </p>
                  )}
                </div>

                {/* Topic Tags */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4" />
                    Topic Tags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TOPICS.map(topic => (
                      <Badge
                        key={topic}
                        variant={formData.topic_tags.includes(topic) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleTopicTag(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Priorità */}
                <div>
                  <Label>Priorità Ordine</Label>
                  <Input
                    type="number"
                    value={formData.order_priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_priority: parseInt(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ordine di composizione (0 = prima, 100 = dopo)
                  </p>
                </div>

                {/* Attivo */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Attivo</Label>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingPrompt ? 'Aggiorna' : 'Crea'} Prompt
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtri */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label>Filtra per Tipo</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="base">Base Sala</SelectItem>
                    <SelectItem value="agent_personality">Personalità Agente</SelectItem>
                    <SelectItem value="topic_objective">Obiettivo Topic</SelectItem>
                    <SelectItem value="kb_context">Contesto KB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label>Filtra per Topic</Label>
                <Select value={filterTopic} onValueChange={setFilterTopic}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i topic</SelectItem>
                    {AVAILABLE_TOPICS.map(topic => (
                      <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabella Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prompt Configurati ({filteredPrompts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : filteredPrompts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun prompt trovato
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Caratteri</TableHead>
                    <TableHead>Contesto</TableHead>
                    <TableHead>Associato a</TableHead>
                    <TableHead>Topic Tags</TableHead>
                    <TableHead className="text-center">Priorità</TableHead>
                    <TableHead className="text-center">Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrompts.map(prompt => {
                    const charLength = prompt.content.length;
                    const associatedTo = prompt.section_type === 'agent_personality' 
                      ? prompt.section_name 
                      : prompt.topic_tags.length > 0 
                        ? prompt.topic_tags.join(', ')
                        : 'Generico';
                    
                    return (
                      <TableRow key={prompt.id}>
                        <TableCell className="font-medium">{prompt.section_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {SECTION_TYPE_LABELS[prompt.section_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getCharacterBadgeVariant(charLength)}
                            className={getCharacterBadgeColor(charLength)}
                          >
                            {charLength}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {CONTEXT_LABELS[prompt.section_type]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {associatedTo}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {prompt.topic_tags.length === 0 ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : (
                              prompt.topic_tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            )}
                            {prompt.topic_tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{prompt.topic_tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{prompt.order_priority}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                            {prompt.is_active ? '✓ Attivo' : '✗ Inattivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleEdit(prompt)}
                              variant="outline"
                              size="icon"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(prompt.id)}
                              variant="outline"
                              size="icon"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
