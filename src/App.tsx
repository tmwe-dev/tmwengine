import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GlobalAICanvasProvider } from "@/contexts/GlobalAICanvasContext";
import { AIAgentProvider } from "@/contexts/AIAgentContext";
import { AISidebarSliderUnified } from "@/components/ai/AISidebarSliderUnified";
import { AISidebarTrigger } from "@/components/ai/AISidebarTrigger";
import { useGlobalAICanvas } from "@/hooks/useGlobalAICanvas";
import { TMWEAuthProvider } from "@/hooks/useTMWEAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { GlobalCallHandler } from "@/components/GlobalCallHandler";
import { GlobalVideoCallHandler } from "@/components/GlobalVideoCallHandler";
import { CRMLayoutProvider } from "@/contexts/CRMLayoutContext";
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
import ChatLaboratoryCalibration from "./pages/ChatLaboratoryCalibration";
import RadioChat from "./pages/RadioChat";
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
import OAuthCallback from "./pages/OAuthCallback";
import EmailSenders from "./pages/EmailSenders";
import Intranet from "./pages/Intranet";
import IntranetAdmin from "./pages/IntranetAdmin";
import CallMetrics from "./pages/CallMetrics"; // FASE 3: Dashboard metriche
import ImportErrorsMonitor from "./pages/ImportErrorsMonitor";
import TemplateAlias from "./pages/TemplateAlias";
import LanguageManager from "./pages/LanguageManager";
import UserGuide from "./pages/UserGuide";
import EdgeFunctionVersions from "./pages/EdgeFunctionVersions";
import DatabaseSettings from "./pages/DatabaseSettings";
import CallRoom from "./pages/CallRoom";
import EmailRules from "./pages/EmailRules";
import CodeScreen from "./pages/admin/CodeScreen";
import TMWEApiTester from "./pages/TMWEApiTester";
import CodeReview from "./pages/CodeReview";
import NotificationSettings from "./pages/NotificationSettings";
import { IntegratedAuthGuard } from "./components/tmwe/IntegratedAuthGuard";
import DesignLab from "./pages/DesignLab";
import DesignLabDashboard from "./pages/DesignLabDashboard";
import DesignLabScanner from "./pages/DesignLabScanner";
import SiteMap from "./pages/SiteMap";
import PromptSystemManager from "./pages/PromptSystemManager";
import FunEmail from "./pages/FunEmail";
import ApiFunctionsReference from "./pages/ApiFunctionsReference";
import { SingleMailImporter } from "./components/email/SingleMailImporter";
import SingleFast from "./pages/SingleFast";
import DualDownload from "./pages/DualDownload";
import EmailDebugTester from "./pages/EmailDebugTester";
import AICommunicationHub from "./pages/AICommunicationHub";

const queryClient = new QueryClient();

// Blocca navigazione trackpad a livello browser
const usePreventTrackpadNavigation = () => {
  useEffect(() => {
  // 🔒 BLOCCO 1: Eventi wheel (trackpad swipe) - soglia abbassata per bloccare anche swipe leggeri
  const preventNavigation = (e: WheelEvent) => {
    const HORIZONTAL_THRESHOLD = 15; // Ridotto da 50 a 15 per intercettare anche swipe leggeri
    // Blocca SOLO swipe orizzontale forte (back/forward browser)
    if (Math.abs(e.deltaX) > HORIZONTAL_THRESHOLD && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🚫 Browser navigation blocked (strong horizontal swipe):', e.deltaX);
    }
    // ✅ Permetti scroll verticale e orizzontale leggero
  };

    // 🔒 BLOCCO 2: Eventi touch (gesti multi-touch)
    const preventTouchNavigation = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 🔒 BLOCCO 3: Eventi gesti (Safari specifico)
    const preventGesture = (e: Event) => {
      e.preventDefault();
      console.log('🚫 Gesture navigation blocked');
    };

    // 🔒 BLOCCO 4: Popstate (back/forward browser)
    const preventPopState = (e: PopStateEvent) => {
      console.log('⚠️ PopState intercepted, preventing...');
      window.history.pushState(null, '', window.location.href);
    };

    // Attach listeners - NON usare capture per permettere scroll nei componenti figli
    window.addEventListener('wheel', preventNavigation, { passive: false });
    window.addEventListener('touchmove', preventTouchNavigation, { passive: false, capture: true });
    window.addEventListener('touchstart', preventTouchNavigation, { passive: false, capture: true });
    
    // Safari gesture events
    window.addEventListener('gesturestart', preventGesture, { passive: false, capture: true });
    window.addEventListener('gesturechange', preventGesture, { passive: false, capture: true });
    window.addEventListener('gestureend', preventGesture, { passive: false, capture: true });
    
    // Browser navigation
    window.addEventListener('popstate', preventPopState);

    // Override browser navigation
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      console.log('📍 History push intercepted');
      return originalPushState.apply(window.history, args);
    };

    console.log('✅ 🔐 NAVIGAZIONE TRACKPAD COMPLETAMENTE BLOCCATA 🔐');

    return () => {
      window.removeEventListener('wheel', preventNavigation);
      window.removeEventListener('touchmove', preventTouchNavigation);
      window.removeEventListener('touchstart', preventTouchNavigation);
      window.removeEventListener('gesturestart', preventGesture);
      window.removeEventListener('gesturechange', preventGesture);
      window.removeEventListener('gestureend', preventGesture);
      window.removeEventListener('popstate', preventPopState);
      
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      
      console.log('🔴 Listener navigazione trackpad rimossi');
    };
  }, []);
};

const App = () => {
  usePreventTrackpadNavigation();
  return (
    <QueryClientProvider client={queryClient}>
      <TMWEAuthProvider>
        <GlobalAICanvasProvider>
          <AIAgentProvider>
            <CRMLayoutProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <GlobalCallHandler>
                <GlobalVideoCallHandler />
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
            <Route path="/radio-chat" element={
              <ProtectedRoute>
                <CRMLayout><RadioChat /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat-laboratory/analytics/:conversationId" element={
              <ProtectedRoute>
                <CRMLayout><ChatLaboratoryTechnicalAnalytics /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat-laboratory/calibration" element={
              <ProtectedRoute>
                <ChatLaboratoryCalibration />
              </ProtectedRoute>
            } />
            <Route path="/ai-communication-hub" element={
              <ProtectedRoute>
                <CRMLayout><AICommunicationHub /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/prompts" element={
              <ProtectedRoute>
                <AdminPrompts />
              </ProtectedRoute>
            } />
            <Route path="/admin/codescreen" element={
              <ProtectedRoute>
                <CodeScreen />
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
            <Route path="/call-metrics" element={
              <ProtectedRoute>
                <CRMLayout><CallMetrics /></CRMLayout>
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
            <Route path="/tmwe/callback" element={<OAuthCallback />} />
            <Route path="/email-manager" element={
              <ProtectedRoute>
                <IntegratedAuthGuard>
                  <CRMLayout>
                    <TMWEEmailDashboard />
                  </CRMLayout>
                </IntegratedAuthGuard>
              </ProtectedRoute>
            } />
            <Route path="/funnemail" element={
              <ProtectedRoute>
                <CRMLayout>
                  <FunEmail />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/single-mail" element={
              <ProtectedRoute>
                <CRMLayout>
                  <SingleMailImporter />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/single-fast" element={
              <ProtectedRoute>
                <CRMLayout>
                  <SingleFast />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/dual-download" element={
              <ProtectedRoute>
                <CRMLayout>
                  <DualDownload />
                </CRMLayout>
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
            <Route path="/tmwe-api-tester" element={
              <ProtectedRoute>
                <IntegratedAuthGuard>
                  <CRMLayout>
                    <TMWEApiTester />
                  </CRMLayout>
                </IntegratedAuthGuard>
              </ProtectedRoute>
            } />
            <Route path="/code-review" element={
              <ProtectedRoute>
                <CRMLayout>
                  <CodeReview />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/notification-settings" element={
              <ProtectedRoute>
                <CRMLayout>
                  <NotificationSettings />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/design-lab" element={
              <ProtectedRoute>
                <CRMLayout>
                  <DesignLabDashboard />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/design-lab/:pageId" element={
              <ProtectedRoute>
                <CRMLayout>
                  <DesignLab />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/design-lab-scanner" element={
              <ProtectedRoute>
                <CRMLayout>
                  <DesignLabScanner />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/prompt-system-manager" element={
              <ProtectedRoute>
                <CRMLayout>
                  <PromptSystemManager />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/api-functions" element={
              <ProtectedRoute>
                <CRMLayout>
                  <ApiFunctionsReference />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/email-debug-tester" element={
              <ProtectedRoute>
                <CRMLayout>
                  <EmailDebugTester />
                </CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/site-map" element={
              <ProtectedRoute>
                <CRMLayout>
                  <SiteMap />
                </CRMLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </GlobalCallHandler>
          </BrowserRouter>
            </TooltipProvider>
            </CRMLayoutProvider>
          </AIAgentProvider>
        </GlobalAICanvasProvider>
      </TMWEAuthProvider>
    </QueryClientProvider>
  );
};

export default App;
