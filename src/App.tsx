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
import Attivita from "./pages/Attivita";
import Campagne from "./pages/Campagne";
import Email from "./pages/Email";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<CRMLayout />}>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/settings" element={<CRMLayout />}>
            <Route index element={<Settings />} />
          </Route>
          <Route path="/rubrica" element={<CRMLayout />}>
            <Route index element={<Rubrica />} />
          </Route>
          <Route path="/attivita" element={<CRMLayout />}>
            <Route index element={<Attivita />} />
          </Route>
          <Route path="/campagne" element={<CRMLayout />}>
            <Route index element={<Campagne />} />
          </Route>
          <Route path="/email" element={<CRMLayout />}>
            <Route index element={<Email />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
