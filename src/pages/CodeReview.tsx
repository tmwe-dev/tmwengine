import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Code, AlertTriangle, FileCode, Clock } from 'lucide-react';
import { CodeDiffViewer } from '@/components/code-assistant/CodeDiffViewer';

export default function CodeReview() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadProposals();
  }, []);
  
  const loadProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('code_change_proposals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Errore caricamento proposte');
    } else {
      setProposals(data || []);
    }
    setLoading(false);
  };
  
  const handleApprove = async (proposalId: string) => {
    const { error } = await supabase
      .from('code_change_proposals')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', proposalId);
    
    if (error) {
      toast.error('Errore approvazione');
    } else {
      toast.success('Proposta approvata! Applica manualmente il codice.');
      loadProposals();
    }
  };
  
  const handleReject = async (proposalId: string, reason: string) => {
    const { error } = await supabase
      .from('code_change_proposals')
      .update({ 
        status: 'rejected', 
        rejection_reason: reason,
        reviewed_at: new Date().toISOString() 
      })
      .eq('id', proposalId);
    
    if (error) {
      toast.error('Errore rigetto');
    } else {
      toast.success('Proposta rigettata');
      loadProposals();
    }
  };
  
  const getImpactColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'breaking': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const renderProposalsList = (status: string) => {
    const filtered = proposals.filter(p => p.status === status);
    
    if (filtered.length === 0) {
      return <div className="text-center text-muted-foreground py-8">Nessuna proposta {status}</div>;
    }
    
    return (
      <ScrollArea className="h-[600px]">
        {filtered.map(proposal => (
          <Card key={proposal.id} className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  <span className="font-mono text-sm">{proposal.file_path}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getImpactColor(proposal.impact_level)}>
                    {proposal.impact_level}
                  </Badge>
                  <Badge variant="outline">{proposal.change_type}</Badge>
                  {!proposal.syntax_valid && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Syntax Issue
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Reason:</h4>
                <p className="text-sm text-muted-foreground">{proposal.reason}</p>
              </div>
              
              <CodeDiffViewer 
                original={proposal.original_code || ''} 
                proposed={proposal.proposed_code}
                language="typescript"
              />
              
              {status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={() => handleApprove(proposal.id)}
                    variant="default"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleReject(proposal.id, 'Not suitable')}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
              
              {status === 'rejected' && proposal.rejection_reason && (
                <div className="mt-4 p-3 bg-destructive/10 rounded">
                  <p className="text-sm text-destructive">
                    <strong>Rejection reason:</strong> {proposal.rejection_reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </ScrollArea>
    );
  };
  
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-6 w-6" />
            Code Review Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                <Clock className="h-4 w-4 mr-2" />
                Pending ({proposals.filter(p => p.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approved ({proposals.filter(p => p.status === 'approved').length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                <XCircle className="h-4 w-4 mr-2" />
                Rejected ({proposals.filter(p => p.status === 'rejected').length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              {renderProposalsList('pending')}
            </TabsContent>
            
            <TabsContent value="approved">
              {renderProposalsList('approved')}
            </TabsContent>
            
            <TabsContent value="rejected">
              {renderProposalsList('rejected')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
