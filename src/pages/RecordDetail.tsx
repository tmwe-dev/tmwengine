import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, ChevronLeft, ChevronRight, Edit, Save, X, User, Building, MapPin, Phone, Mail, Calendar, Flag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface ImportedContact {
  [key: string]: any;
}

export default function RecordDetail() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importLogId = searchParams.get('importLogId');
  
  const [record, setRecord] = useState<ImportedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedRecord, setEditedRecord] = useState<ImportedContact>({});
  const [saving, setSaving] = useState(false);
  const [navigationInfo, setNavigationInfo] = useState<{
    currentIndex: number;
    totalRecords: number;
    nextRecordId: string | null;
    prevRecordId: string | null;
  } | null>(null);

  useEffect(() => {
    if (recordId && importLogId) {
      loadRecord();
      loadNavigationInfo();
    }
  }, [recordId, importLogId]);

  const loadRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('imported_contacts')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) throw error;
      setRecord(data);
      setEditedRecord(data);
    } catch (error) {
      console.error('Errore nel caricamento record:', error);
      toast.error('Errore nel caricamento del record');
    } finally {
      setLoading(false);
    }
  };

  const loadNavigationInfo = async () => {
    try {
      // Get all record IDs for this import ordered by row_number
      const { data: allRecords, error } = await supabase
        .from('imported_contacts')
        .select('id, row_number')
        .eq('import_log_id', importLogId)
        .order('row_number', { ascending: true });

      if (error) throw error;

      const currentIndex = allRecords.findIndex(r => r.id === recordId);
      if (currentIndex >= 0) {
        setNavigationInfo({
          currentIndex: currentIndex + 1,
          totalRecords: allRecords.length,
          nextRecordId: currentIndex < allRecords.length - 1 ? allRecords[currentIndex + 1].id : null,
          prevRecordId: currentIndex > 0 ? allRecords[currentIndex - 1].id : null
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento navigazione:', error);
    }
  };

  const saveRecord = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('imported_contacts')
        .update(editedRecord)
        .eq('id', recordId);

      if (error) throw error;

      setRecord(editedRecord);
      setEditing(false);
      toast.success('Record aggiornato con successo');
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      toast.error('Errore nel salvataggio del record');
    } finally {
      setSaving(false);
    }
  };

  const navigateToRecord = (newRecordId: string) => {
    navigate(`/record/${newRecordId}?importLogId=${importLogId}`);
  };

  const renderField = (key: string, value: any, label: string, type: 'text' | 'boolean' | 'date' | 'textarea' = 'text') => {
    if (key === 'id' || key === 'import_log_id' || key === 'created_at' || key === 'updated_at') {
      return null;
    }

    const handleChange = (newValue: any) => {
      setEditedRecord(prev => ({ ...prev, [key]: newValue }));
    };

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key} className="text-sm font-medium text-gray-700">{label}</Label>
        {editing ? (
          type === 'boolean' ? (
            <div className="flex items-center space-x-2">
              <Switch
                id={key}
                checked={editedRecord[key] || false}
                onCheckedChange={handleChange}
              />
              <span className="text-sm">{editedRecord[key] ? 'Sì' : 'No'}</span>
            </div>
          ) : type === 'textarea' ? (
            <Textarea
              id={key}
              value={editedRecord[key] || ''}
              onChange={(e) => handleChange(e.target.value)}
              rows={3}
            />
          ) : type === 'date' ? (
            <Input
              id={key}
              type="date"
              value={editedRecord[key] || ''}
              onChange={(e) => handleChange(e.target.value)}
            />
          ) : (
            <Input
              id={key}
              value={editedRecord[key] || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={`Inserisci ${label.toLowerCase()}`}
            />
          )
        ) : (
          <div className="p-2 bg-gray-50 rounded border min-h-[40px] flex items-center">
            {type === 'boolean' ? (
              <Badge variant={value ? 'default' : 'secondary'}>
                {value ? 'Sì' : 'No'}
              </Badge>
            ) : (
              <span className="text-gray-900">{value || '-'}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Caricamento record...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Record non trovato</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header con navigazione */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/import-templates')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla gestione import
          </Button>
          
          {navigationInfo && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigationInfo.prevRecordId && navigateToRecord(navigationInfo.prevRecordId)}
                disabled={!navigationInfo.prevRecordId}
              >
                <ChevronLeft className="h-4 w-4" />
                Precedente
              </Button>
              
              <span className="text-sm text-muted-foreground px-3">
                {navigationInfo.currentIndex} di {navigationInfo.totalRecords}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigationInfo.nextRecordId && navigateToRecord(navigationInfo.nextRecordId)}
                disabled={!navigationInfo.nextRecordId}
              >
                Successivo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setEditedRecord(record);
                }}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button
                onClick={saveRecord}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvataggio...' : 'Salva'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </Button>
          )}
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dati Personali */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dati Personali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField('name', record.name, 'Nome Completo')}
            {renderField('alias', record.alias, 'Alias')}
            {renderField('position', record.position, 'Posizione')}
            {renderField('title', record.title, 'Titolo')}
            {renderField('note', record.note, 'Note', 'textarea')}
          </CardContent>
        </Card>

        {/* Dati Azienda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Dati Azienda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField('company_name', record.company_name, 'Nome Azienda')}
            {renderField('company_alias', record.company_alias, 'Alias Azienda')}
            {renderField('commercial_anagrafiche_id', record.commercial_anagrafiche_id, 'ID Anagrafica')}
            {renderField('client_code', record.client_code, 'Codice Cliente')}
          </CardContent>
        </Card>

        {/* Contatti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Informazioni di Contatto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField('email', record.email, 'Email')}
            {renderField('phone', record.phone, 'Telefono')}
            {renderField('cell', record.cell, 'Cellulare')}
          </CardContent>
        </Card>

        {/* Indirizzo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Indirizzo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField('address', record.address, 'Indirizzo')}
            {renderField('city', record.city, 'Città')}
            {renderField('zip_code', record.zip_code, 'CAP')}
            {renderField('country', record.country, 'Paese')}
          </CardContent>
        </Card>

        {/* Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Importanti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField('last_contact', record.last_contact, 'Ultimo Contatto', 'date')}
            {renderField('scheduled_contact', record.scheduled_contact, 'Contatto Programmato', 'date')}
            {renderField('next_contact_date', record.next_contact_date, 'Prossimo Contatto', 'date')}
          </CardContent>
        </Card>

        {/* Meta Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Caratteristiche e Stati
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {renderField('meta_client', record.meta_client, 'Cliente', 'boolean')}
              {renderField('meta_express', record.meta_express, 'Express', 'boolean')}
              {renderField('meta_sea_freight', record.meta_sea_freight, 'Marittimo', 'boolean')}
              {renderField('meta_air_freight', record.meta_air_freight, 'Aereo', 'boolean')}
              {renderField('meta_interested', record.meta_interested, 'Interessato', 'boolean')}
              {renderField('meta_presentation', record.meta_presentation, 'Presentazione', 'boolean')}
              {renderField('meta_exworks', record.meta_exworks, 'Ex Works', 'boolean')}
              {renderField('meta_hight_value_customer', record.meta_hight_value_customer, 'Cliente Alto Valore', 'boolean')}
              {renderField('meta_tutorial', record.meta_tutorial, 'Tutorial', 'boolean')}
              {renderField('meta_rejected', record.meta_rejected, 'Rifiutato', 'boolean')}
              {renderField('meta_wca', record.meta_wca, 'WCA', 'boolean')}
              {renderField('meta_exclient', record.meta_exclient, 'Ex Cliente', 'boolean')}
              {renderField('completed', record.completed, 'Completato', 'boolean')}
              {renderField('archiviata', record.archiviata, 'Archiviato', 'boolean')}
              {renderField('has_actions', record.has_actions, 'Ha Azioni', 'boolean')}
            </div>
          </CardContent>
        </Card>

        {/* Metadati */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Metadati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderField('original_id', record.original_id, 'ID Originale')}
              {renderField('row_number', record.row_number, 'Numero Riga')}
              {renderField('stato', record.stato, 'Stato')}
              {renderField('origin', record.origin, 'Origine')}
              {renderField('created_by', record.created_by, 'Creato da')}
              {renderField('agent_id', record.agent_id, 'ID Agente')}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Importato in Rubrica</Label>
                <div className="p-2 bg-gray-50 rounded border min-h-[40px] flex items-center">
                  <Badge variant={record.is_imported_to_rubrica ? 'default' : 'secondary'}>
                    {record.is_imported_to_rubrica ? 'Sì' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}