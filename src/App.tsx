import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CRMLayout from "./components/layout/CRMLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Rubrica from "./pages/Rubrica";
import RubricaAvanzata from "./pages/RubricaAvanzata";
import Attivita from "./pages/Attivita";
import Campagne from "./pages/Campagne";
import Email from "./pages/Email";
import Chat from "./pages/Chat";
import ImportTemplates from "./pages/ImportTemplates";
import GestisciImport from "./pages/GestisciImport";
import Archivio from "./pages/Archivio";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <CRMLayout><Dashboard /></CRMLayout>
              </ProtectedRoute>
            } />
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
            <Route path="/email" element={
              <ProtectedRoute>
                <CRMLayout><Email /></CRMLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <CRMLayout><Chat /></CRMLayout>
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
            <Route path="/archivio" element={
              <ProtectedRoute>
                <CRMLayout><Archivio /></CRMLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
