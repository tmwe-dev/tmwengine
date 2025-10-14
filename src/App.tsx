import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TMWEAuthProvider } from "@/hooks/useTMWEAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { GlobalCallHandler } from "@/components/GlobalCallHandler";
import '@/i18n/config';

import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CRMLayout from "./components/layout/CRMLayout";

import Settings from "./pages/Settings";
import Rubrica from "./pages/Rubrica";
import RubricaAvanzata from "./pages/RubricaAvanzata";
import Attivita from "./pages/Attivita";
import Campagne from "./pages/Campagne";
import EmailCampagne from "./pages/EmailCampagne";

import Chat from "./pages/Chat";
import ChatLaboratory from "./pages/ChatLaboratory";
import ChatLaboratoryTechnicalAnalytics from "./pages/ChatLaboratoryTechnicalAnalytics";
import AdminPrompts from "./pages/AdminPrompts";
import ImportTemplates from "./pages/ImportTemplates";
import GestisciImport from "./pages/GestisciImport";

import AIConfig from "./pages/AIConfig";
import GeneralConfig from "./pages/GeneralConfig";
import RecordImportati from "./pages/RecordImportati";
import Tables from "./pages/Tables";
import TMWEEmailDashboard from "./pages/TMWEEmailDashboard";
import TMWEAuthCallbackIntegrated from "./pages/TMWEAuthCallbackIntegrated";
import TMWEAuthTest from "./pages/TMWEAuthTest";
import EmailSenders from "./pages/EmailSenders";
import Intranet from "./pages/Intranet";
import IntranetAdmin from "./pages/IntranetAdmin";
import ImportErrorsMonitor from "./pages/ImportErrorsMonitor";
import TemplateAlias from "./pages/TemplateAlias";
import LanguageManager from "./pages/LanguageManager";
import UserGuide from "./pages/UserGuide";
import EdgeFunctionVersions from "./pages/EdgeFunctionVersions";
import DatabaseSettings from "./pages/DatabaseSettings";
import CallRoom from "./pages/CallRoom";
import EmailRules from "./pages/EmailRules";
import { IntegratedAuthGuard } from "./components/tmwe/IntegratedAuthGuard";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TMWEAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <GlobalCallHandler>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <CRMLayout><ImportTemplates /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/settings" element={
              <ProtectedRoute>
                <CRMLayout><Settings /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/rubrica" element={
              <ProtectedRoute>
                <CRMLayout><Rubrica /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/rubrica-avanzata" element={
              <ProtectedRoute>
                <CRMLayout><RubricaAvanzata /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/attivita" element={
              <ProtectedRoute>
                <CRMLayout><Attivita /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/campagne" element={
              <ProtectedRoute>
                <CRMLayout><Campagne /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/email-campagne" element={
              <ProtectedRoute>
                <CRMLayout><EmailCampagne /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <CRMLayout><Chat /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat-laboratory" element={
              <ProtectedRoute>
                <CRMLayout><ChatLaboratory /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat-laboratory/analytics/:conversationId" element={
              <ProtectedRoute>
                <CRMLayout><ChatLaboratoryTechnicalAnalytics /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/prompts" element={
              <ProtectedRoute>
                <AdminPrompts />
              </ProtectedRoute>
            } />
            <Route path="/intranet" element={
              <ProtectedRoute>
                <CRMLayout><Intranet /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/intranet-admin" element={
              <ProtectedRoute>
                <CRMLayout><IntranetAdmin /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/import-templates" element={
              <ProtectedRoute>
                <CRMLayout><ImportTemplates /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/gestisci-import" element={
              <ProtectedRoute>
                <CRMLayout><GestisciImport /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/ai-config" element={
              <ProtectedRoute>
                <CRMLayout><AIConfig /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/general-config" element={
              <ProtectedRoute>
                <CRMLayout><GeneralConfig /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/record-importati" element={
              <ProtectedRoute>
                <CRMLayout><RecordImportati /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/tables" element={
              <ProtectedRoute>
                <CRMLayout><Tables /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/tmwe-test" element={
              <ProtectedRoute>
                <TMWEAuthTest />
              </ProtectedRoute>
            } />
            <Route path="/tmwe/callback" element={<TMWEAuthCallbackIntegrated />} />
            <Route path="/email-manager" element={
              <ProtectedRoute>
                <IntegratedAuthGuard>
                  <CRMLayout>
                    <TMWEEmailDashboard />
                  </CRMLayout>
                </IntegratedAuthGuard>
              </ProtectedRoute>
            } />
            <Route path="/email-senders" element={
              <ProtectedRoute>
                <CRMLayout>
                  <EmailSenders />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/import-errors-monitor" element={
              <ProtectedRoute>
                <ImportErrorsMonitor />
              </ProtectedRoute>
            } />
            <Route path="/template-alias" element={
              <ProtectedRoute>
                <CRMLayout><TemplateAlias /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/language-manager" element={
              <ProtectedRoute>
                <CRMLayout><LanguageManager /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/user-guide" element={
              <ProtectedRoute>
                <CRMLayout><UserGuide /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/edge-function-versions" element={
              <ProtectedRoute>
                <CRMLayout><EdgeFunctionVersions /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/database-settings" element={
              <ProtectedRoute>
                <CRMLayout><DatabaseSettings /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/call-room" element={
              <ProtectedRoute>
                <CallRoom />
              </ProtectedRoute>
            } />
            <Route path="/email-rules" element={
              <ProtectedRoute>
                <IntegratedAuthGuard>
                  <CRMLayout>
                    <EmailRules />
                  </CRMLayout>
                </IntegratedAuthGuard>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </GlobalCallHandler>
        </BrowserRouter>
      </TooltipProvider>
    </TMWEAuthProvider>
  </QueryClientProvider>
  );
};

export default App;
