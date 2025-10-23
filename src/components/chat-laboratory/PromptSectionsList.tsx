import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Save, Trash, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DynamicDropdown, DropdownItem } from '@/components/design-system/menus/DynamicDropdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || '');
  const [editContent, setEditContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const { toast } = useToast();

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  // Aggiorna editContent quando cambia la sezione selezionata
  const handleSectionChange = (sectionId: string) => {
    if (hasChanges && !confirm('Hai modifiche non salvate. Vuoi scartarle?')) {
      return;
    }
    setSelectedSectionId(sectionId);
    const newSection = sections.find(s => s.id === sectionId);
    setEditContent(newSection?.content || '');
    setHasChanges(false);
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setHasChanges(value !== selectedSection?.content);
  };

  const handleSave = async () => {
    if (!selectedSection) return;
    
    if (!editContent.trim()) {
      toast({
        title: 'Errore',
        description: 'Il contenuto non può essere vuoto',
        variant: 'destructive'
      });
      return;
    }

    try {
      await onUpdate(selectedSection.id, editContent);
      setHasChanges(false);
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

  const handleDelete = async () => {
    if (!selectedSection) return;
    
    if (!confirm(`Eliminare definitivamente la sezione "${selectedSection.section_name}"?`)) {
      return;
    }

    try {
      await onDelete(selectedSection.id);
      const remainingSections = sections.filter(s => s.id !== selectedSection.id);
      setSelectedSectionId(remainingSections[0]?.id || '');
      setEditContent(remainingSections[0]?.content || '');
      setHasChanges(false);
      toast({
        title: 'Eliminata',
        description: `Sezione "${selectedSection.section_name}" eliminata`
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la sezione',
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
      setShowCreateDialog(false);
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

  // Prepara dropdown items
  const dropdownItems: DropdownItem[] = sections.map(section => ({
    type: 'item',
    label: section.section_name + (!section.is_active ? ' ⏸️' : ''),
    onClick: () => handleSectionChange(section.id)
  }));

  // Se non ci sono sezioni
  if (sections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">
            Nessuna sezione {sectionTypeLabel} presente
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crea Prima Sezione
          </Button>
        </div>

        {/* Dialog Creazione */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuova Sezione {sectionTypeLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder={`Nome sezione (es. 'professionale_formale')`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Textarea
                placeholder="Contenuto della sezione..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateNew}>
                <Save className="h-4 w-4 mr-2" />
                Crea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Dropdown Prompt Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Seleziona Prompt:</span>
        <DynamicDropdown
          trigger={
            <Button variant="outline" className="w-full justify-between">
              {selectedSection?.section_name || 'Seleziona...'}
            </Button>
          }
          items={dropdownItems}
          align="start"
          className="w-full"
        />
      </div>

      {/* Textarea Contenuto */}
      {selectedSection && (
        <>
          <Textarea
            value={editContent || selectedSection.content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="flex-1 font-mono text-sm resize-none min-h-[calc(100vh-450px)]"
            placeholder="Inserisci il contenuto della sezione..."
          />

          {/* Action Bar */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Switch
                checked={selectedSection.is_active}
                onCheckedChange={(val) => onToggle(selectedSection.id, val)}
              />
              <span className="text-sm font-medium">
                {selectedSection.is_active ? '✅ Attiva' : '⏸️ Disattivata'}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                Salva
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Dialog Creazione Nuova Sezione */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Sezione {sectionTypeLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={`Nome sezione (es. 'professionale_formale')`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Textarea
              placeholder="Contenuto della sezione..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateNew}>
              <Save className="h-4 w-4 mr-2" />
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
