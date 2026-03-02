import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileText, Archive, Settings, Activity, AlertCircle, Brain, Download, FileDown, TableProperties } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { exportAllPromptsToTxt, downloadTxtFile } from "@/lib/promptExporter";
import { useState } from "react";
import { useExportImportedData } from "@/hooks/useExportImportedData";

export default function DatabaseSettings() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const { download_original_file, download_imported_contacts, exporting_original, exporting_contacts } = useExportImportedData();

  const handleExportPrompts = async () => {
    setExporting(true);
    try {
      const txtContent = await exportAllPromptsToTxt();
      downloadTxtFile(txtContent);
      
      toast({
        title: "✅ Export completato",
        description: "File scaricato con successo"
      });
    } catch (error) {
      toast({
        title: "❌ Errore",
        description: "Impossibile esportare i prompt",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const menuItems = [
    {
      title: "Tabelle Database",
      description: "Visualizza tutte le tabelle e i loro contenuti",
      icon: Database,
      href: "/tables",
      color: "text-primary"
    },
    {
      title: "Documentazione Schema",
      description: "Guida completa dello schema database",
      icon: FileText,
      href: "/database-settings/schema",
      color: "text-blue-500"
    },
    {
      title: "Backup Pre-Migrazione",
      description: "Storico dei backup prima delle migrazioni",
      icon: Archive,
      href: "/database-settings/backups",
      color: "text-green-500"
    },
    {
      title: "Funzioni & Trigger SQL",
      description: "Elenco di tutte le funzioni e trigger database",
      icon: Settings,
      href: "/database-settings/functions",
      color: "text-orange-500"
    },
    {
      title: "Gestione Prompt Sistema",
      description: "Configura prompt globali, personalità, stili e compositore avanzato",
      icon: Brain,
      href: "/prompt-system-manager",
      color: "text-cyan-500"
    },
    {
      title: "Esporta Prompt Sistema",
      description: "Scarica tutti i prompt attivi in formato TXT strutturato",
      icon: Download,
      href: "#",
      color: "text-purple-500",
      onClick: handleExportPrompts
    },
    {
      title: "Analytics Laboratorio",
      description: "Statistiche tecniche del chat laboratory",
      icon: Activity,
      href: "/chat-laboratory-analytics",
      color: "text-purple-500"
    },
    {
      title: "Monitor Errori Import",
      description: "Log degli errori di importazione",
      icon: AlertCircle,
      href: "/import-errors",
      color: "text-red-500"
    },
    {
      title: "Scarica File Originale (13K)",
      description: "Download del CSV originale caricato (13,034 righe)",
      icon: FileDown,
      href: "#",
      color: "text-emerald-500",
      onClick: download_original_file
    },
    {
      title: "Esporta Contatti Importati (8K)",
      description: "Export CSV dei record elaborati dalla tabella imported_contacts",
      icon: TableProperties,
      href: "#",
      color: "text-teal-500",
      onClick: download_imported_contacts
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Impostazioni Database</h1>
        <p className="text-muted-foreground">
          Centro di gestione e monitoraggio del database
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => {
          if (item.onClick) {
            return (
              <button
                key={item.title}
                onClick={item.onClick}
                disabled={exporting || exporting_original || exporting_contacts}
                type="button"
                className="w-full text-left"
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors`}>
                        <item.icon className={`h-6 w-6 ${item.color}`} />
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              </button>
            );
          }

          return (
            <Link key={item.title} to={item.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors`}>
                      <item.icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
