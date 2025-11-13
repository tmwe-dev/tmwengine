import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from '@/components/ui/carousel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Mail, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import Autoplay from 'embla-carousel-autoplay';

interface Email {
  id: string;
  subject: string;
  from_email: string;
  data_ricezione: string;
  cartella: string;
  body_text: string;
}

interface LiveEmailCarouselProps {
  userEmail: string;
  isRunning: boolean;
  importedCount: number;
}

export function LiveEmailCarousel({ userEmail, isRunning, importedCount }: LiveEmailCarouselProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    const fetchLatestEmails = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('email_messages')
          .select('id, subject, from_email, data_ricezione, cartella, body_text')
          .order('data_ricezione', { ascending: false })
          .limit(7);

        if (!error && data) {
          setEmails(data);
        }
      } catch (err) {
        console.error('Error fetching emails:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestEmails();
  }, [userEmail, importedCount]);

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nessuna email scaricata
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full relative">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          watchDrag: true
        }}
        plugins={[
          Autoplay({
            delay: 3000,
            stopOnInteraction: false,
            stopOnMouseEnter: true
          })
        ]}
        className="w-full h-full"
      >
        <CarouselContent className="h-full">
          {emails.map((email) => (
            <CarouselItem key={email.id} className="h-full">
              <Card className="h-full bg-background shadow-xl border-2 animate-fade-in">
                <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-background pb-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-xl font-bold leading-tight line-clamp-2 flex-1">
                        {email.subject || '(Nessun oggetto)'}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {email.cartella}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="font-medium truncate">{email.from_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>{format(new Date(email.data_ricezione), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="py-6 px-6">
                  <ScrollArea className="h-[300px] w-full">
                    <div 
                      className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed pr-4"
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.6'
                      }}
                    >
                      {email.body_text?.substring(0, 800) || '(Corpo email vuoto)'}
                      {email.body_text && email.body_text.length > 800 && '...'}
                    </div>
                  </ScrollArea>
                </CardContent>

                {isRunning && (
                  <div className="border-t bg-primary/10 py-2 px-6">
                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Download in corso...</span>
                    </div>
                  </div>
                )}
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Arrows */}
        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
      </Carousel>

      {/* Email Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border rounded-full px-3 py-1 text-xs font-medium shadow-lg">
        {emails.length} email{emails.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
