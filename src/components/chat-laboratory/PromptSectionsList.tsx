import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Plus, Trash, Save } from 'lucide-react';
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

  const handleSaveEdit = async (id: string) => {
    await onUpdate(id, editContent);
    setEditingId(null);
    setEditContent('');
  };

  const handleCreateNew = async () => {
    if (!newName.trim() || !newContent.trim()) {
      toast({
        title: "Attenzione",
        description: "Nome e contenuto sono obbligatori",
        variant: "destructive"
      });
      return;
    }
    
    await onCreate(newName, newContent);
    setIsCreating(false);
    setNewName('');
    setNewContent('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{sectionTypeLabel}</h3>
        <Button
          size="sm"
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi {sectionTypeLabel}
        </Button>
      </div>

      {/* Creazione nuova sezione */}
      {isCreating && (
        <Card className="border-primary">
          <CardHeader>
            <Input
              placeholder="Nome sezione (es. 'formale_accademico')"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              placeholder="Contenuto della sezione..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setNewName('');
                  setNewContent('');
                }}
              >
                Annulla
              </Button>
              <Button size="sm" onClick={handleCreateNew}>
                <Save className="h-4 w-4 mr-2" />
                Crea
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista sezioni esistenti */}
      {sections.map((section) => (
        <Card key={section.id} className={!section.is_active ? 'opacity-50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={section.is_active}
                  onCheckedChange={(val) => onToggle(section.id, val)}
                />
                <h4 className="font-medium">{section.section_name}</h4>
              </div>
              <div className="flex gap-2">
                {editingId === section.id ? (
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(section.id)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salva
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartEdit(section)}
                  >
                    Modifica
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Eliminare "${section.section_name}"?`)) {
                      onDelete(section.id);
                    }
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editingId === section.id ? editContent : section.content}
              onChange={(e) => setEditContent(e.target.value)}
              disabled={editingId !== section.id}
              rows={8}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      ))}

      {sections.length === 0 && !isCreating && (
        <div className="text-center py-8 text-muted-foreground">
          Nessuna sezione {sectionTypeLabel.toLowerCase()} presente.
          Clicca "Aggiungi" per crearne una.
        </div>
      )}
    </div>
  );
}
