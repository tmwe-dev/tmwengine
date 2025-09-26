import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CRMLayout from "./components/layout/CRMLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Rubrica from "./pages/Rubrica";
import Attivita from "./pages/Attivita";
import Campagne from "./pages/Campagne";
import Email from "./pages/Email";
import Chat from "./pages/Chat";
import ImportTemplates from "./pages/ImportTemplates";

const queryClient = new QueryClient();

const App = () => {
  // Global swipe navigation prevention
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    const preventSwipeNavigation = (e: WheelEvent) => {
      // Prevent horizontal scrolling that triggers browser navigation
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    };

    const preventTouchNavigation = (e: TouchEvent) => {
      // Prevent swipe navigation on touch devices
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        
        // If it's a horizontal swipe near the edge, prevent it
        if (startX < 50 || startX > window.innerWidth - 50) {
          e.preventDefault();
        }
      }
    };

    // Add event listeners to prevent swipe navigation
    window.addEventListener('wheel', preventSwipeNavigation, { passive: false });
    window.addEventListener('touchstart', preventTouchNavigation, { passive: false });
    window.addEventListener('touchmove', preventDefault, { passive: false });
    
    // Prevent browser navigation via history API
    const preventPopstate = () => {
      // This doesn't prevent the event but ensures we handle it properly
      // The CSS overscroll-behavior-x: none should handle most cases
    };
    
    window.addEventListener('popstate', preventPopstate);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('wheel', preventSwipeNavigation);
      window.removeEventListener('touchstart', preventTouchNavigation);
      window.removeEventListener('touchmove', preventDefault);
      window.removeEventListener('popstate', preventPopstate);
    };
  }, []);

  return (
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
};

export default App;
