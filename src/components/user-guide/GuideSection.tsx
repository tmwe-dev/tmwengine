import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, AlertTriangle, Keyboard, HelpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface GuideSectionProps {
  sectionId: string;
  content: any;
}

export function GuideSection({ sectionId, content }: GuideSectionProps) {
  const navigate = useNavigate();

  if (!content) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Seleziona una sezione dalla navigazione.</p>
      </div>
    );
  }

  const renderMarkdown = (text: string) => {
    // Simple markdown parser for bold, italic, lists
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-semibold mt-6 mb-3">{line.replace('## ', '')}</h2>;
      }
      
      // Lists
      if (line.match(/^[\d]+\.\s/)) {
        return <li key={i} className="ml-6 mb-1">{line.replace(/^[\d]+\.\s/, '')}</li>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-6 mb-1 list-disc">{line.replace('- ', '')}</li>;
      }
      
      // Bold
      const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Emojis and special markers
      if (line.startsWith('💡')) {
        return (
          <Alert key={i} className="my-3 border-primary/20 bg-primary/5">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription dangerouslySetInnerHTML={{ __html: boldText.replace('💡 ', '') }} />
          </Alert>
        );
      }
      if (line.startsWith('⚠️')) {
        return (
          <Alert key={i} className="my-3 border-orange-500/20 bg-orange-500/5">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription dangerouslySetInnerHTML={{ __html: boldText.replace('⚠️ ', '') }} />
          </Alert>
        );
      }
      
      // Regular paragraph
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: boldText }} />;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{content.title}</h1>
        {content.overview && (
          <p className="text-lg text-muted-foreground">{content.overview}</p>
        )}
      </div>

      {/* Content Sections */}
      {content.sections && content.sections.length > 0 && (
        <div className="space-y-4">
          {content.sections.map((section: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                {renderMarkdown(section.content)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Shortcuts */}
      {content.shortcuts && content.shortcuts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Scorciatoie Tastiera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {content.shortcuts.map((shortcut: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline">{shortcut.split(':')[0]}</Badge>
                  <span className="text-sm text-muted-foreground">{shortcut.split(':')[1]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ */}
      {content.faq && content.faq.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Domande Frequenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {content.faq.map((item: any, index: number) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Related Pages */}
      {content.related && content.related.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pagine Correlate</CardTitle>
            <CardDescription>Altre sezioni che potrebbero interessarti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {content.related.map((relatedId: string) => (
                <Button
                  key={relatedId}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Scroll to top and navigate
                    window.scrollTo(0, 0);
                    // Trigger section change (parent will handle)
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {relatedId}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
