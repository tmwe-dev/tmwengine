import { Crown, Sparkles, Star, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const LuxuryDemo = () => {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-purple-900/20 via-black/40 to-amber-900/20 p-8 backdrop-blur-xl shadow-2xl shadow-amber-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-12 w-12 text-amber-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              Luxury Edition
            </h1>
          </div>
          <p className="text-lg text-amber-100/80 max-w-2xl">
            Benvenuto nell'esperienza premium del tuo CRM. Design elegante, funzionalità avanzate e un'interfaccia che riflette l'eccellenza del tuo business.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-amber-500/10 to-purple-500/10 border-amber-500/30 backdrop-blur-xl shadow-xl shadow-amber-500/10 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-amber-400" />
              <span className="text-amber-100">Design Premium</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Interfaccia raffinata con effetti glassmorphism, gradienti eleganti e animazioni fluide.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 backdrop-blur-xl shadow-xl shadow-purple-500/10 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Star className="h-6 w-6 text-purple-400" />
              <span className="text-purple-100">Esperienza Esclusiva</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ogni dettaglio è stato curato per offrire un'esperienza utente di livello superiore.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30 backdrop-blur-xl shadow-xl shadow-emerald-500/10 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Award className="h-6 w-6 text-emerald-400" />
              <span className="text-emerald-100">Qualità Premium</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Componenti di alta qualità, ottimizzati per performance e bellezza estetica.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Clienti Attivi', value: '1,234', gradient: 'from-amber-400 to-yellow-500' },
          { label: 'Attività Completate', value: '5,678', gradient: 'from-purple-400 to-pink-500' },
          { label: 'Email Gestite', value: '12,345', gradient: 'from-emerald-400 to-teal-500' },
          { label: 'Tasso Successo', value: '98%', gradient: 'from-rose-400 to-orange-500' }
        ].map((stat, i) => (
          <Card key={i} className="bg-black/40 border-white/10 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-pink-500/20 border-amber-500/30 backdrop-blur-xl shadow-2xl shadow-amber-500/20">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold text-amber-100 mb-4">
            Scopri tutte le funzionalità Premium
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Il template Luxury offre un'esperienza visiva superiore mantenendo tutte le funzionalità del tuo CRM.
          </p>
          <div className="flex gap-4 justify-center">
            <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg shadow-amber-500/30">
              <Crown className="h-4 w-4 mr-2" />
              Esplora Features
            </Button>
            <Button variant="outline" className="border-amber-500/30 hover:bg-amber-500/10">
              Guida Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LuxuryDemo;
