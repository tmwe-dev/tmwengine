import React, { useState } from 'react';
import { Plus, Search, Filter, Calendar, DollarSign, Target, Play, Pause, CheckCircle, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CampaignForm } from '@/components/campagne/CampaignForm';
import { CampaignFilters } from '@/components/campagne/CampaignFilters';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { AIChatPopup } from '@/components/ai/AIChatPopup';
import { PagePromptManager } from '@/components/ai/PagePromptManager';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Campaign {
  id: string;
  nome: string;
  obiettivo?: string;
  inizio?: string;
  fine?: string;
  budget?: number;
  stato: 'attiva' | 'pausa' | 'completata';
  max_email_giorno: number;
  created_at: string;
}

const STATO_LABELS = {
  attiva: 'Attiva',
  pausa: 'In Pausa',
  completata: 'Completata'
};

export default function Campagne() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [filters, setFilters] = useState({
    stato: '',
    periodo: '',
    hasNotes: false
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.obiettivo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilters = 
      (!filters.stato || campaign.stato === filters.stato) &&
      (!filters.periodo || checkPeriodoFilter(campaign, filters.periodo));

    return matchesSearch && matchesFilters;
  });

  const checkPeriodoFilter = (campaign: Campaign, filter: string) => {
    const today = new Date();
    
    switch (filter) {
      case 'correnti':
        return (!campaign.inizio || new Date(campaign.inizio) <= today) &&
               (!campaign.fine || new Date(campaign.fine) >= today);
      case 'future':
        return campaign.inizio && new Date(campaign.inizio) > today;
      case 'passate':
        return campaign.fine && new Date(campaign.fine) < today;
      default:
        return true;
    }
  };

  const handleAddCampaign = (campaignData: Omit<Campaign, 'id' | 'created_at'>) => {
    const newCampaign: Campaign = {
      ...campaignData,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    
    setCampaigns(prev => [newCampaign, ...prev]);
    setIsFormOpen(false);
    toast({
      title: "Campagna creata",
      description: "La campagna è stata creata con successo."
    });
  };

  const handleEditCampaign = (campaignData: Omit<Campaign, 'id' | 'created_at'>) => {
    if (!selectedCampaign) return;

    setCampaigns(prev => prev.map(campaign => 
      campaign.id === selectedCampaign.id 
        ? { ...campaign, ...campaignData }
        : campaign
    ));
    setSelectedCampaign(null);
    setIsFormOpen(false);
    toast({
      title: "Campagna modificata",
      description: "Le modifiche sono state salvate con successo."
    });
  };

  const handleDeleteCampaign = (campaignId: string) => {
    setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
    toast({
      title: "Campagna eliminata",
      description: "La campagna è stata rimossa."
    });
  };

  const handleStatusChange = (campaignId: string, newStatus: Campaign['stato']) => {
    setCampaigns(prev => prev.map(campaign => 
      campaign.id === campaignId 
        ? { ...campaign, stato: newStatus }
        : campaign
    ));
    toast({
      title: "Stato aggiornato",
      description: `La campagna è ora ${STATO_LABELS[newStatus].toLowerCase()}.`
    });
  };

  const openEditForm = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setSelectedCampaign(null);
    setIsFormOpen(true);
  };

  const getStatoBadgeVariant = (stato: Campaign['stato']) => {
    switch (stato) {
      case 'attiva': return 'default';
      case 'pausa': return 'secondary';
      case 'completata': return 'outline';
      default: return 'outline';
    }
  };

  const getStatoIcon = (stato: Campaign['stato']) => {
    switch (stato) {
      case 'attiva': return Play;
      case 'pausa': return Pause;
      case 'completata': return CheckCircle;
      default: return Play;
    }
  };

  const calculateProgress = (campaign: Campaign) => {
    if (!campaign.inizio || !campaign.fine) return 0;
    
    const start = new Date(campaign.inizio).getTime();
    const end = new Date(campaign.fine).getTime();
    const now = new Date().getTime();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const getStatsData = () => {
    const today = new Date();
    return {
      totali: campaigns.length,
      attive: campaigns.filter(c => c.stato === 'attiva').length,
      in_pausa: campaigns.filter(c => c.stato === 'pausa').length,
      completate: campaigns.filter(c => c.stato === 'completata').length,
      budget_totale: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0)
    };
  };

  const stats = getStatsData();

  return (
    <div 
      className="space-y-6"
      style={{
        backgroundImage: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(192, 132, 252, 0.05) 100%)'
      }}
    >
      {/* Header */}
      {isHeaderVisible && (
        <div className="animate-accordion-down space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-heading-1 font-bold text-text-primary">Campagne</h1>
              <p className="text-body text-text-secondary">
                Gestisci e monitora le tue campagne marketing
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddForm} size="icon" className="shadow-soft">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedCampaign ? 'Modifica Campagna' : 'Nuova Campagna'}
                    </DialogTitle>
                  </DialogHeader>
                  <CampaignForm
                    campaign={selectedCampaign}
                    onSubmit={selectedCampaign ? handleEditCampaign : handleAddCampaign}
                    onCancel={() => setIsFormOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Search className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cerca in CRM..." 
                        className="pl-10"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Filtri Avanzati</DialogTitle>
                    </DialogHeader>
                    <CampaignFilters
                      filters={filters}
                      onFiltersChange={setFilters}
                      onClose={() => setIsFiltersOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHeaderVisible(!isHeaderVisible)}
                  className="h-8 w-8"
                >
                  {isHeaderVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                <PagePromptManager pageRoute="/campagne" />
                <AIChatPopup pageRoute="/campagne" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="bg-card-transparent border-card shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    placeholder="Cerca per nome o obiettivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Campaigns List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCampaigns.length === 0 ? (
          <Card className="col-span-full bg-card-transparent border-card shadow-soft">
            <CardContent className="p-12 text-center">
              <div className="text-text-secondary mb-4">
                {campaigns.length === 0 ? (
                  <>
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-heading-3 font-semibold mb-2">Nessuna campagna</h3>
                    <p className="text-body mb-4">
                      Inizia creando la tua prima campagna marketing
                    </p>
                    <Button onClick={openAddForm}>
                      <Plus className="h-4 w-4" />
                      Crea Prima Campagna
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-heading-3 font-semibold mb-2">Nessun risultato</h3>
                    <p className="text-body">
                      Prova a modificare i termini di ricerca o i filtri
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => {
            const StatoIcon = getStatoIcon(campaign.stato);
            const progress = calculateProgress(campaign);
            
            return (
              <Card key={campaign.id} className="bg-card-transparent border-card shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatoIcon className="h-5 w-5 text-text-secondary" />
                        <CardTitle className="text-heading-4 font-semibold text-text-primary">
                          {campaign.nome}
                        </CardTitle>
                      </div>
                      
                      <Badge variant={getStatoBadgeVariant(campaign.stato)}>
                        {STATO_LABELS[campaign.stato]}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      {campaign.stato === 'attiva' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'pausa')}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {campaign.stato === 'pausa' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'attiva')}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditForm(campaign)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {campaign.obiettivo && (
                    <div className="flex items-center gap-2 text-body text-text-secondary">
                      <Target className="h-4 w-4" />
                      <span className="line-clamp-2">{campaign.obiettivo}</span>
                    </div>
                  )}

                  {(campaign.inizio || campaign.fine) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-body text-text-secondary">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {campaign.inizio && new Date(campaign.inizio).toLocaleDateString('it-IT')}
                          {campaign.inizio && campaign.fine && ' - '}
                          {campaign.fine && new Date(campaign.fine).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                      
                      {campaign.inizio && campaign.fine && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-small text-text-secondary">
                            <span>Progresso</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  )}

                  {campaign.budget && (
                    <div className="flex items-center gap-2 text-body text-text-secondary">
                      <DollarSign className="h-4 w-4" />
                      <span>Budget: €{campaign.budget.toLocaleString('it-IT')}</span>
                    </div>
                  )}

                  <div className="text-small text-text-secondary">
                    Max email/giorno: {campaign.max_email_giorno}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}