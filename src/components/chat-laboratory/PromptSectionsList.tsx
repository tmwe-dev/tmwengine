import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, Trash, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PromptSection {
  id: string;
  section_type: string;
  section_name: string;
  content: string;
  is_active: boolean;
  order_priority: number;
}

interface PromptSectionsListProps {
  sections: PromptSection[];
  onUpdate: (id: string, content: string) => Promise<void>;
  onCreate: (name: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  sectionType: string;
  sectionTypeLabel: string;
}

export function PromptSectionsList({
  sections,
  onUpdate,
  onCreate,
  onDelete,
  onToggle,
  sectionType,
  sectionTypeLabel
}: PromptSectionsListProps) {
  const [activeTab, setActiveTab] = useState<string>(sections[0]?.id || '__create__');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const { toast } = useToast();

  const handleStartEdit = (section: PromptSection) => {
    setEditingId(section.id);
    setEditContent(section.content);
  };

  const handleSaveEdit = async (sectionId: string) => {
    if (!editContent.trim()) {
      toast({
        title: 'Errore',
        description: 'Il contenuto non può essere vuoto',
        variant: 'destructive'
      });
      return;
    }

    try {
      await onUpdate(sectionId, editContent);
      setEditingId(null);
      toast({
        title: 'Salvato',
        description: 'Sezione aggiornata con successo'
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare le modifiche',
        variant: 'destructive'
      });
    }
  };

  const handleCreateNew = async () => {
    if (!newName.trim() || !newContent.trim()) {
      toast({
        title: 'Errore',
        description: 'Nome e contenuto sono obbligatori',
        variant: 'destructive'
      });
      return;
    }

    try {
      await onCreate(newName, newContent);
      setNewName('');
      setNewContent('');
      setIsCreating(false);
      setActiveTab(sections[0]?.id || '__create__');
      toast({
        title: 'Creata',
        description: `Sezione "${newName}" creata con successo`
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile creare la sezione',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSection = async (sectionId: string, sectionName: string) => {
    if (!confirm(`Eliminare definitivamente la sezione "${sectionName}"?`)) {
      return;
    }

    try {
      await onDelete(sectionId);
      const remainingSections = sections.filter(s => s.id !== sectionId);
      setActiveTab(remainingSections[0]?.id || '__create__');
      toast({
        title: 'Eliminata',
        description: `Sezione "${sectionName}" eliminata`
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la sezione',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Tabs orizzontali */}
        <TabsList className="w-full justify-start overflow-x-auto flex-shrink-0 h-auto flex-wrap">
          {sections.map(section => (
            <TabsTrigger 
              key={section.id}
              value={section.id} 
              className="relative gap-2"
            >
              <span className="truncate max-w-[150px]">{section.section_name}</span>
              {!section.is_active && (
                <span className="text-xs opacity-50" title="Sezione disattivata">⏸️</span>
              )}
            </TabsTrigger>
          ))}
          <TabsTrigger 
            value="__create__" 
            className="text-primary gap-1"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Nuova</span>
          </TabsTrigger>
        </TabsList>

        {/* Content per ogni sezione esistente */}
        {sections.map(section => (
          <TabsContent 
            key={section.id}
            value={section.id} 
            className="flex-1 flex flex-col gap-3 mt-4"
          >
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {/* Textarea espansa */}
              <Textarea
                value={editingId === section.id ? editContent : section.content}
                onChange={(e) => {
                  if (editingId !== section.id) {
                    handleStartEdit(section);
                  }
                  setEditContent(e.target.value);
                }}
                className="flex-1 font-mono text-sm resize-none min-h-[calc(100vh-450px)]"
                placeholder="Inserisci il contenuto della sezione..."
              />

              {/* Action Bar */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={section.is_active}
                    onCheckedChange={(val) => onToggle(section.id, val)}
                  />
                  <span className="text-sm font-medium">
                    {section.is_active ? '✅ Attiva' : '⏸️ Disattivata'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(section.id)}
                    disabled={editingId !== section.id}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salva
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSection(section.id, section.section_name)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}

        {/* Tab per creare nuova sezione */}
        <TabsContent value="__create__" className="flex-1 mt-4">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <Input
                placeholder={`Nome sezione ${sectionType.toLowerCase()} (es. 'professionale_formale')`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="font-medium"
              />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
              <Textarea
                placeholder={`Contenuto della sezione ${sectionTypeLabel}...`}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="flex-1 font-mono text-sm resize-none min-h-[calc(100vh-550px)]"
              />
              <div className="flex gap-2 justify-end flex-shrink-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveTab(sections[0]?.id || '__create__');
                    setIsCreating(false);
                    setNewName('');
                    setNewContent('');
                  }}
                >
                  Annulla
                </Button>
                <Button onClick={handleCreateNew}>
                  <Save className="h-4 w-4 mr-2" />
                  Crea Sezione
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {sections.length === 0 && !isCreating && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              Nessuna sezione {sectionTypeLabel} presente
            </p>
            <Button onClick={() => {
              setActiveTab('__create__');
              setIsCreating(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Crea Prima Sezione
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
