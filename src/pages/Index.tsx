// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Users, Mail, Calendar } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-2xl mx-auto px-6">
        <div className="mb-8">
          <div className="h-16 w-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-foreground font-bold text-2xl">CRM</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-foreground">Sistema CRM Aziendale</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gestisci contatti, attività, campagne email e classificazione AI automatica
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 border border-border rounded-lg">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <span className="text-sm font-medium">Rubrica</span>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
            <span className="text-sm font-medium">Attività</span>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
            <span className="text-sm font-medium">Email</span>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
            <span className="text-sm font-medium">Campagne</span>
          </div>
        </div>

        <Link to="/dashboard">
          <Button size="lg" className="gap-2">
            Accedi al CRM
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
