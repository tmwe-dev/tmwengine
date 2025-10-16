import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, AlertTriangle, Trash2 } from "lucide-react";

const TMWEApiComparison = () => {
  const comparisonData = [
    {
      category: "Email Account",
      endpoint: "/email_account",
      specs: [
        { handler: "test_connection", implemented: "testConnection()", status: "implemented" },
        { handler: "get_account_info", implemented: "getAccountInfo()", status: "implemented" },
        { handler: "get_quota", implemented: "getQuota()", status: "implemented" },
        { handler: "save_account", implemented: "-", status: "missing" },
        { handler: "delete_account", implemented: "-", status: "missing" },
      ]
    },
    {
      category: "Email Sync",
      endpoint: "/email_sync",
      specs: [
        { handler: "full_sync", implemented: "fullSync() [DEPRECATO]", status: "deprecated" },
        { handler: "incremental_sync", implemented: "incrementalSync() [DEPRECATO]", status: "deprecated" },
        { handler: "sync_folder", implemented: "syncFolder() [DEPRECATO]", status: "deprecated" },
        { handler: "get_sync_status", implemented: "getSyncStatus()", status: "implemented" },
        { handler: "cancel_sync", implemented: "cancelSync()", status: "implemented" },
        { handler: "-", implemented: "syncEmailsToDatabase() [NUOVO]", status: "custom" },
      ]
    },
    {
      category: "Email Message",
      endpoint: "/email_message",
      specs: [
        { handler: "get_messages", implemented: "getMessages()", status: "implemented" },
        { handler: "get_message", implemented: "getMessage()", status: "implemented" },
        { handler: "search_messages", implemented: "searchMessages()", status: "implemented" },
        { handler: "send_message", implemented: "sendMessage()", status: "implemented" },
        { handler: "reply_message", implemented: "replyMessage()", status: "implemented" },
        { handler: "forward_message", implemented: "forwardMessage()", status: "implemented" },
        { handler: "delete_email", implemented: "deleteEmail()", status: "implemented" },
        { handler: "move_to_trash", implemented: "moveToTrash()", status: "implemented" },
        { handler: "delete_messages", implemented: "deleteMessages()", status: "implemented" },
        { handler: "move_messages_to_trash", implemented: "moveMessagesToTrash()", status: "implemented" },
        { handler: "move_messages", implemented: "moveMessages()", status: "implemented" },
        { handler: "mark_messages", implemented: "markAsRead() + markAsUnread() + setFlag()", status: "implemented" },
      ]
    },
    {
      category: "Email Folder",
      endpoint: "/email_folder",
      specs: [
        { handler: "get_folders", implemented: "getFolders()", status: "implemented" },
        { handler: "get_folder_info", implemented: "getFolderInfo()", status: "implemented" },
        { handler: "create_folder", implemented: "createFolder()", status: "implemented" },
        { handler: "delete_folder", implemented: "deleteFolder()", status: "implemented" },
        { handler: "rename_folder", implemented: "renameFolder()", status: "implemented" },
      ]
    },
  ];

  const edgeFunctions = [
    {
      name: "tmwe-api-proxy",
      purpose: "Proxy per tutte le chiamate API TMWE",
      handles: "Auth (JWT/OAuth2), CORS, Batch Operations",
      endpoints: "/email_account, /email_sync, /email_message, /email_folder",
      notes: "Gestisce token refresh automatico"
    },
    {
      name: "tmwe-email-sync-master",
      purpose: "Sincronizzazione email automatica",
      handles: "Batch sync con chunking (max 10 email per batch)",
      endpoints: "/email_message (handler: get_messages)",
      notes: "Salva email nel database Supabase"
    },
    {
      name: "tmwe-oauth-callback",
      purpose: "OAuth2 callback handler",
      handles: "Authorization code flow",
      endpoints: "/token",
      notes: "Scambia authorization code per access token"
    },
  ];

  const issues = [
    {
      severity: "error",
      message: "/email_account: save_account NON implementato",
      impact: "Impossibile salvare configurazioni account via API"
    },
    {
      severity: "error",
      message: "/email_account: delete_account NON implementato",
      impact: "Impossibile eliminare account via API"
    },
    {
      severity: "warning",
      message: "tmwe-api-proxy: Risolto double JSON.stringify()",
      impact: "Causava errori di parsing nel client - ORA FIXATO"
    },
    {
      severity: "warning",
      message: "EmailImportTester: Usava data?.data invece di data?.folders",
      impact: "Non mostrava cartelle - ORA FIXATO"
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "implemented":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "missing":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "deprecated":
        return <Trash2 className="h-4 w-4 text-orange-500" />;
      case "custom":
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "destructive" | "outline" | "secondary", label: string }> = {
      implemented: { variant: "default", label: "✅ OK" },
      missing: { variant: "destructive", label: "❌ MANCANTE" },
      deprecated: { variant: "outline", label: "🗑️ DEPRECATO" },
      custom: { variant: "secondary", label: "🔧 CUSTOM" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-success" />;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">📊 TMWE API Comparison & Diagnostics</h1>
        <p className="text-muted-foreground">
          Confronto tra specifiche API TMWE (email-api-3.yaml) e implementazione reale nel progetto
        </p>
      </div>

      {/* API Endpoints Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints: Spec vs Implementazione</CardTitle>
          <CardDescription>
            Colonna SX: Handlers ufficiali da email-api-3.yaml | Colonna DX: Metodi implementati in tmwe-api-integrated.ts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-6">
              {comparisonData.map((category) => (
                <div key={category.category} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-semibold">{category.category}</h3>
                    <code className="text-sm bg-secondary px-2 py-1 rounded">{category.endpoint}</code>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Handler (API Spec)</th>
                          <th className="text-left p-2 font-medium">Implementazione (Codice)</th>
                          <th className="text-center p-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.specs.map((spec, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="p-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {spec.handler}
                              </code>
                            </td>
                            <td className="p-2">
                              <code className="text-sm bg-primary/10 px-2 py-1 rounded">
                                {spec.implemented}
                              </code>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {getStatusIcon(spec.status)}
                                {getStatusBadge(spec.status)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edge Functions */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Edge Functions</CardTitle>
          <CardDescription>
            Funzioni serverless che gestiscono le chiamate API e la sincronizzazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {edgeFunctions.map((fn) => (
              <div key={fn.name} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{fn.name}</h3>
                  <Badge variant="outline">{fn.purpose}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Gestisce:</span>
                    <p className="mt-1">{fn.handles}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Endpoints:</span>
                    <p className="mt-1"><code className="text-xs bg-muted px-2 py-1 rounded">{fn.endpoints}</code></p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-muted-foreground">Note:</span>
                    <p className="mt-1 text-muted-foreground">{fn.notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Problemi Rilevati</CardTitle>
          <CardDescription>
            Problemi noti e soluzioni applicate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <p className="font-medium">{issue.message}</p>
                  <p className="text-sm text-muted-foreground mt-1">{issue.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>📖 Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Implementato</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Mancante</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Deprecato</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Custom</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TMWEApiComparison;
