import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Archive, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ArchivedContact {
  id: string;
  record_originale_id: string;
  tipo_origine: string;
  nome: string | null;
  azienda: string | null;
  email: string | null;
  telefono: string | null;
  cellulare: string | null;
  indirizzo: string | null;
  citta: string | null;
  paese: string | null;
  data_archiviazione: string;
  archiviato_da: string | null;
  motivo_archiviazione: string | null;
  position: string | null;
  title: string | null;
}

interface ArchivedActivity {
  id: string;
  tipo: string;
  descrizione: string;
  stato: string;
  scadenza: string | null;
  priorita: string;
  note: string | null;
  data_creazione: string | null;
  data_archiviazione: string;
}

export default function Archivio() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<ArchivedContact | null>(null);
  const [showActivitiesDialog, setShowActivitiesDialog] = useState(false);

  // Carica tutti i contatti archiviati
  const { data: archivedContacts, isLoading } = useQuery({
    queryKey: ["archived-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("archivio_indirizzi")
        .select("*")
        .order("data_archiviazione", { ascending: false });

      if (error) throw error;
      return data as ArchivedContact[];
    },
  });

  // Carica le attività per il contatto selezionato
  const { data: contactActivities } = useQuery({
    queryKey: ["archived-activities", selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];

      const { data, error } = await supabase
        .from("archivio_attivita")
        .select("*")
        .eq("archivio_indirizzo_id", selectedContact.id)
        .order("data_creazione", { ascending: false });

      if (error) throw error;
      return data as ArchivedActivity[];
    },
    enabled: !!selectedContact,
  });

  // Filtra i contatti in base alla ricerca
  const filteredContacts = archivedContacts?.filter((contact) => {
    const query = searchQuery.toLowerCase();
    return (
      contact.azienda?.toLowerCase().includes(query) ||
      contact.nome?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.telefono?.toLowerCase().includes(query)
    );
  });

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case "chiamata":
        return "📞";
      case "email":
        return "📧";
      case "riunione":
        return "👥";
      case "task":
        return "✓";
      default:
        return "📝";
    }
  };

  const getStatoBadgeVariant = (stato: string) => {
    switch (stato) {
      case "completata":
        return "default";
      case "in_corso":
        return "secondary";
      case "aperta":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPrioritaBadgeVariant = (priorita: string) => {
    switch (priorita) {
      case "alta":
        return "destructive";
      case "media":
        return "secondary";
      case "bassa":
        return "outline";
      default:
        return "outline";
    }
  };

  const handleContactClick = (contact: ArchivedContact) => {
    setSelectedContact(contact);
    setShowActivitiesDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Archive className="h-12 w-12 animate-pulse mx-auto mb-4" />
          <p>Caricamento archivio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Archive className="h-8 w-8" />
            Archivio Indirizzi
          </h1>
          <p className="text-muted-foreground mt-1">
            Contatti eliminati con storico attività
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredContacts?.length || 0} contatti archiviati
        </div>
      </div>

      {/* Barra di ricerca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per azienda, nome, email o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista contatti archiviati */}
      <div className="grid gap-4">
        {filteredContacts?.map((contact) => (
          <Card
            key={contact.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleContactClick(contact)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {contact.azienda || "N/A"}
                    <Badge variant="outline" className="text-xs">
                      {contact.tipo_origine === "rubrica" ? "Rubrica" : "Import"}
                    </Badge>
                  </CardTitle>
                  {contact.nome && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {contact.nome}
                      {contact.position && ` - ${contact.position}`}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Vedi attività
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  {contact.email && (
                    <p className="text-muted-foreground">📧 {contact.email}</p>
                  )}
                  {contact.telefono && (
                    <p className="text-muted-foreground">📞 {contact.telefono}</p>
                  )}
                  {contact.cellulare && (
                    <p className="text-muted-foreground">📱 {contact.cellulare}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {(contact.indirizzo || contact.citta || contact.paese) && (
                    <p className="text-muted-foreground">
                      📍 {[contact.indirizzo, contact.citta, contact.paese]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Archiviato il{" "}
                    {format(new Date(contact.data_archiviazione), "dd MMMM yyyy", {
                      locale: it,
                    })}
                  </p>
                  {contact.motivo_archiviazione && (
                    <p className="text-xs text-muted-foreground italic">
                      Motivo: {contact.motivo_archiviazione}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredContacts?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Nessun contatto trovato con i criteri di ricerca"
                  : "Nessun contatto archiviato"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog delle attività */}
      <Dialog open={showActivitiesDialog} onOpenChange={setShowActivitiesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Attività Associate
            </DialogTitle>
            <DialogDescription>
              {selectedContact?.azienda}
              {selectedContact?.nome && ` - ${selectedContact.nome}`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {contactActivities && contactActivities.length > 0 ? (
              <div className="space-y-4">
                {contactActivities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {getActivityIcon(activity.tipo)}
                            </span>
                            <div>
                              <p className="font-semibold capitalize">{activity.tipo}</p>
                              <p className="text-sm text-muted-foreground">
                                {activity.descrizione}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={getStatoBadgeVariant(activity.stato)}>
                              {activity.stato}
                            </Badge>
                            <Badge variant={getPrioritaBadgeVariant(activity.priorita)}>
                              {activity.priorita}
                            </Badge>
                          </div>
                        </div>

                        {activity.note && (
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                            {activity.note}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {activity.data_creazione && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Creata:{" "}
                              {format(new Date(activity.data_creazione), "dd/MM/yyyy")}
                            </span>
                          )}
                          {activity.scadenza && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Scadenza:{" "}
                              {format(new Date(activity.scadenza), "dd/MM/yyyy")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Archive className="h-3 w-3" />
                            Archiviata:{" "}
                            {format(new Date(activity.data_archiviazione), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna attività associata a questo contatto</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
