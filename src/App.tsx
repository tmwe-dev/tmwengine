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
  // Global swipe navigation prevention (only browser navigation, not internal scrolling)
  useEffect(() => {
    const preventBrowserNavigation = (e: WheelEvent) => {
      // Only prevent if it's a strong horizontal gesture near the edges
      // and we're at the scroll boundary
      const isNearLeftEdge = e.clientX < 50;
      const isNearRightEdge = e.clientX > window.innerWidth - 50;
      const isHorizontalGesture = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 3;
      const isStrongGesture = Math.abs(e.deltaX) > 80;
      
      if ((isNearLeftEdge || isNearRightEdge) && isHorizontalGesture && isStrongGesture) {
        // Check if we're at the scroll boundary
        const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        
        // Prevent only if we're at the scroll boundary and gesture could trigger navigation
        if ((scrollLeft <= 0 && e.deltaX < 0 && isNearLeftEdge) || 
            (scrollLeft + clientWidth >= scrollWidth && e.deltaX > 0 && isNearRightEdge)) {
          e.preventDefault();
        }
      }
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const currentX = touch.clientX;
        
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 3;
        const isStrongSwipe = Math.abs(deltaX) > 100;
        const isFastSwipe = (Date.now() - touchStartTime) < 300;
        
        // Only prevent if:
        // 1. Started very close to edge (< 20px)
        // 2. Current position is still very close to edge (< 30px) 
        // 3. It's a strong horizontal swipe
        // 4. We're at scroll boundary
        const startedAtEdge = touchStartX < 20 || touchStartX > window.innerWidth - 20;
        const stillAtEdge = currentX < 30 || currentX > window.innerWidth - 30;
        
        if (startedAtEdge && stillAtEdge && isHorizontalSwipe && isStrongSwipe && isFastSwipe) {
          // Additional check: only prevent if we're at document scroll boundary
          const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = document.documentElement.clientWidth;
          
          const atLeftBoundary = scrollLeft <= 0 && deltaX > 0;
          const atRightBoundary = scrollLeft + clientWidth >= scrollWidth && deltaX < 0;
          
          if (atLeftBoundary || atRightBoundary) {
            e.preventDefault();
          }
        }
      }
    };

    // Add event listeners with more specific targeting
    window.addEventListener('wheel', preventBrowserNavigation, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Cleanup event listeners
    return () => {
      window.removeEventListener('wheel', preventBrowserNavigation);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
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
