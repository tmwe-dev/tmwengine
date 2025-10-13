import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileText, Archive, Settings, Activity, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function DatabaseSettings() {
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
        {menuItems.map((item) => (
          <Link key={item.href} to={item.href}>
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
        ))}
      </div>
    </div>
  );
}
