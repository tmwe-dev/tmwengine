import { useState } from "react";
import { ChevronDown, ChevronRight, Home } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import guideStructure from "@/data/user-guide/guide-structure.json";

interface GuideNavigationProps {
  currentSection: string | null;
  onSectionClick: (sectionId: string) => void;
  className?: string;
}

export function GuideNavigation({ currentSection, onSectionClick, className }: GuideNavigationProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-4 h-4" /> : null;
  };

  return (
    <div className={cn("w-full h-full flex flex-col bg-background border-r", className)}>
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => onSectionClick("home")}
        >
          <Home className="w-4 h-4" />
          <span className="font-semibold">Guida Utente</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {guideStructure.sections.map((section) => {
            const isExpanded = expandedSections.includes(section.id);
            const hasSubsections = section.subsections && section.subsections.length > 0;

            return (
              <div key={section.id} className="space-y-1">
                <Button
                  variant={currentSection === section.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    currentSection === section.id && "bg-accent"
                  )}
                  onClick={() => {
                    if (hasSubsections) {
                      toggleSection(section.id);
                    } else {
                      onSectionClick(section.id);
                    }
                  }}
                >
                  {hasSubsections ? (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )
                  ) : null}
                  {getIcon(section.icon)}
                  <span className="text-sm">{section.title}</span>
                </Button>

                {hasSubsections && isExpanded && (
                  <div className="ml-6 space-y-1">
                    {section.subsections.map((subsection) => (
                      <Button
                        key={subsection.id}
                        variant={currentSection === subsection.id ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2 text-sm",
                          currentSection === subsection.id && "bg-accent"
                        )}
                        onClick={() => onSectionClick(subsection.id)}
                      >
                        {getIcon(subsection.icon)}
                        <span>{subsection.title}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
