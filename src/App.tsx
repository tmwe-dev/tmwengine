import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<CRMLayout><Dashboard /></CRMLayout>} />
          <Route path="/settings" element={<CRMLayout><Settings /></CRMLayout>} />
          <Route path="/rubrica" element={<CRMLayout><Rubrica /></CRMLayout>} />
          <Route path="/rubrica-avanzata" element={<CRMLayout><RubricaAvanzata /></CRMLayout>} />
          <Route path="/attivita" element={<CRMLayout><Attivita /></CRMLayout>} />
          <Route path="/campagne" element={<CRMLayout><Campagne /></CRMLayout>} />
          <Route path="/email" element={<CRMLayout><Email /></CRMLayout>} />
          <Route path="/chat" element={<CRMLayout><Chat /></CRMLayout>} />
          <Route path="/import-templates" element={<CRMLayout><ImportTemplates /></CRMLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
