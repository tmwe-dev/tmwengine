import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FunctionCard } from '@/components/email/FunctionCard';
import { 
  EMAIL_MESSAGE_HANDLERS, 
  EMAIL_FOLDER_HANDLERS, 
  EMAIL_RULES_HANDLERS,
  EMAIL_API_YAML_CONTENT,
  EMAIL_RULES_YAML_CONTENT
} from '@/lib/tmwe-api-functions-data';
import { FileCode, Mail, FolderOpen, Filter, FileText } from 'lucide-react';

const ApiFunctionsReference = () => {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <FileCode className="w-8 h-8 text-primary" />
          TMWE Email API Functions Reference
        </h1>
        <p className="text-muted-foreground">
          Complete reference for all TMWE Email API endpoints and functions. 
          Copy-paste ready examples for integration.
        </p>
        <div className="flex gap-2 mt-3">
          <Badge variant="outline">OAuth2 Required</Badge>
          <Badge variant="outline">Base URL: findair.it/erp/tmwe_json</Badge>
          <Badge variant="secondary">13 Message Handlers</Badge>
          <Badge variant="secondary">5 Folder Handlers</Badge>
          <Badge variant="secondary">6 Rule Handlers</Badge>
        </div>
      </div>

      <Tabs defaultValue="email-messages" className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-6">
          <TabsTrigger value="email-messages" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Messages
          </TabsTrigger>
          <TabsTrigger value="email-folders" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Email Folders
          </TabsTrigger>
          <TabsTrigger value="email-rules" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Email Rules
          </TabsTrigger>
          <TabsTrigger value="raw-docs" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            📄 Raw API Docs
          </TabsTrigger>
        </TabsList>

        {/* EMAIL MESSAGES TAB */}
        <TabsContent value="email-messages">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Email Message Operations (13 handlers)</CardTitle>
              <CardDescription>
                Perform operations on email messages: read, send, search, delete, move, and mark.
                All handlers use endpoint <code className="text-xs bg-muted px-1 py-0.5 rounded">/email_message</code>
              </CardDescription>
            </CardHeader>
          </Card>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {EMAIL_MESSAGE_HANDLERS.map((handler) => (
              <FunctionCard key={handler.name} {...handler} />
            ))}
          </ScrollArea>
        </TabsContent>

        {/* EMAIL FOLDERS TAB */}
        <TabsContent value="email-folders">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Email Folder Management (5 handlers)</CardTitle>
              <CardDescription>
                Manage email folders: list, create, delete, rename, and get folder information.
                All handlers use endpoint <code className="text-xs bg-muted px-1 py-0.5 rounded">/email_folder</code>
              </CardDescription>
            </CardHeader>
          </Card>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {EMAIL_FOLDER_HANDLERS.map((handler) => (
              <FunctionCard key={handler.name} {...handler} />
            ))}
          </ScrollArea>
        </TabsContent>

        {/* EMAIL RULES TAB */}
        <TabsContent value="email-rules">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Email Rules & Automation (6 handlers)</CardTitle>
              <CardDescription>
                Create and manage email rules for automated email processing.
                Includes bulk creation endpoint for atomic rule+components+actions creation.
              </CardDescription>
            </CardHeader>
          </Card>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {EMAIL_RULES_HANDLERS.map((handler) => (
              <FunctionCard key={handler.name} {...handler} />
            ))}
          </ScrollArea>
        </TabsContent>

        {/* RAW DOCS TAB */}
        <TabsContent value="raw-docs">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Complete OpenAPI Specifications</CardTitle>
              <CardDescription>
                Full YAML documentation for analysis with AI tools or OpenAPI generators.
                These are the source-of-truth API specifications.
              </CardDescription>
            </CardHeader>
          </Card>
          <ScrollArea className="h-[calc(100vh-300px)]">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="email-api">
                <AccordionTrigger className="text-lg font-semibold">
                  📧 Email API (email-api-3.yaml)
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="whitespace-pre-wrap bg-slate-950 text-green-300 p-6 rounded-lg overflow-x-auto text-xs leading-relaxed">
                    {EMAIL_API_YAML_CONTENT}
                  </pre>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="rules-api">
                <AccordionTrigger className="text-lg font-semibold">
                  📋 Email Rules API (email-rule.yaml)
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="whitespace-pre-wrap bg-slate-950 text-blue-300 p-6 rounded-lg overflow-x-auto text-xs leading-relaxed">
                    {EMAIL_RULES_YAML_CONTENT}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiFunctionsReference;
