import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import EmailDashboard from "./pages/EmailDashboard";
import EmailSyncTest from "./pages/EmailSyncTest";
import TMWEApiComparison from "./pages/TMWEApiComparison";
import RadioChat from "./pages/RadioChat";
import DesignLab from "./pages/DesignLab";
import DesignLabDashboard from "./pages/DesignLabDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<ProtectedRoute><EmailDashboard /></ProtectedRoute>} />
          <Route path="/email-sync-test" element={<ProtectedRoute><EmailSyncTest /></ProtectedRoute>} />
          <Route path="/api-comparison" element={<ProtectedRoute><TMWEApiComparison /></ProtectedRoute>} />
          <Route path="/radio-chat" element={<ProtectedRoute><RadioChat /></ProtectedRoute>} />
          <Route path="/design-lab" element={<ProtectedRoute><DesignLabDashboard /></ProtectedRoute>} />
          <Route path="/design-lab/:pageId" element={<ProtectedRoute><DesignLab /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
