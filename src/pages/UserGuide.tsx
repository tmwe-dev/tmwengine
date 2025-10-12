import { useState, useEffect } from "react";
import { GuideNavigation } from "@/components/user-guide/GuideNavigation";
import { GuideSection } from "@/components/user-guide/GuideSection";
import { GuideSearchBar } from "@/components/user-guide/GuideSearchBar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ArrowUp, BookOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import guideContent from "@/data/user-guide/guide-content-it.json";

export default function UserGuide() {
  const [currentSection, setCurrentSection] = useState<string | null>("rubrica");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSectionClick = (sectionId: string) => {
    setCurrentSection(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentContent = currentSection ? (guideContent as any)[currentSection] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <GuideNavigation
                  currentSection={currentSection}
                  onSectionClick={handleSectionClick}
                />
              </SheetContent>
            </Sheet>
          )}

          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Guida Utente CRM</h1>
          </div>

          <div className="flex-1 max-w-md ml-auto">
            <GuideSearchBar onResultClick={handleSectionClick} />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="container flex gap-6 px-4 py-6">
        {/* Sidebar - Desktop Only */}
        {!isMobile && (
          <aside className="w-[280px] shrink-0 sticky top-20 h-[calc(100vh-6rem)]">
            <GuideNavigation
              currentSection={currentSection}
              onSectionClick={handleSectionClick}
            />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {currentSection === "home" || !currentSection ? (
            <div className="max-w-4xl mx-auto p-6 space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Benvenuto nella Guida CRM
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Manuale completo per utilizzare tutte le funzionalità del sistema CRM.
                  Seleziona una sezione dalla navigazione per iniziare.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-12">
                <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSectionClick("rubrica")}>
                  <h3 className="text-lg font-semibold mb-2">🏢 Inizia con la Rubrica</h3>
                  <p className="text-sm text-muted-foreground">
                    Gestisci i tuoi contatti, aggiungi clienti e organizza la tua rete commerciale.
                  </p>
                </div>

                <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSectionClick("attivita")}>
                  <h3 className="text-lg font-semibold mb-2">✅ Gestione Attività</h3>
                  <p className="text-sm text-muted-foreground">
                    Crea, organizza e monitora tutte le tue attività commerciali.
                  </p>
                </div>

                <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSectionClick("chat-laboratory")}>
                  <h3 className="text-lg font-semibold mb-2">🧪 Chat Laboratory</h3>
                  <p className="text-sm text-muted-foreground">
                    Conversazioni multi-agente con AI avanzata per analisi complesse.
                  </p>
                </div>

                <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSectionClick("import-templates")}>
                  <h3 className="text-lg font-semibold mb-2">📤 Import Dati</h3>
                  <p className="text-sm text-muted-foreground">
                    Importa contatti da file Excel/CSV con validazione AI intelligente.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <GuideSection sectionId={currentSection} content={currentContent} />
          )}
        </main>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 rounded-full shadow-lg z-50"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
