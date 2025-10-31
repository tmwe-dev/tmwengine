import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartInboxHeader } from './SmartInboxHeader';
import { SmartEmailList } from './SmartEmailList';
import { SmartEmailDetail } from './SmartEmailDetail';
import { useSmartClassification } from '@/hooks/useSmartClassification';
import { CATEGORIES } from '@/lib/smart-inbox-utils';
import { ClassifiedEmail, CategoryStats } from '@/types/smart-inbox';
import { toast } from 'sonner';

export const SmartInboxTab = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<ClassifiedEmail | null>(null);
  const { classifyEmails, isClassifying, progress } = useSmartClassification();

  // Fetch user email
  const { data: userData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      return { userEmail: profile?.tmwe_email || user.email };
    }
  });

  // Fetch classified emails
  const { data: classifiedEmails, isLoading, refetch } = useQuery({
    queryKey: ['smart-inbox-emails', selectedCategory, userData?.userEmail],
    enabled: !!userData?.userEmail,
    queryFn: async () => {
      let query = supabase
        .from('email_ai_classifications')
        .select(`
          *,
          email:email_messages!inner(
            id,
            subject,
            from,
            to,
            body_text,
            body_html,
            data_ricezione,
            read,
            has_attachments
          )
        `)
        .eq('user_email', userData!.userEmail)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        classification: {
          id: item.id,
          email_message_id: item.email_message_id,
          user_email: item.user_email,
          category: item.category,
          confidence: item.confidence,
          ai_summary: item.ai_summary,
          keywords: item.keywords,
          sender_email: item.sender_email,
          sender_domain: item.sender_domain,
          sender_logo_url: item.sender_logo_url,
          created_at: item.created_at,
          updated_at: item.updated_at
        },
        email: Array.isArray(item.email) ? item.email[0] : item.email
      })) as ClassifiedEmail[];
    }
  });

  // Calculate category stats
  const categoryStats: CategoryStats[] = useMemo(() => {
    if (!classifiedEmails) return CATEGORIES.map(cat => ({ ...cat, count: 0 }));
    
    const counts: Record<string, number> = {};
    classifiedEmails.forEach(item => {
      counts[item.classification.category] = (counts[item.classification.category] || 0) + 1;
    });
    
    return CATEGORIES.map(cat => ({
      ...cat,
      count: counts[cat.id] || 0
    }));
  }, [classifiedEmails]);

  const handleClassifyNew = async () => {
    if (!userData?.userEmail) {
      toast.error('Email utente non trovata');
      return;
    }

    // Fetch unclassified emails
    const { data: allEmails } = await supabase
      .from('email_messages')
      .select('id')
      .eq('user_email', userData.userEmail)
      .order('data_ricezione', { ascending: false })
      .limit(50);
    
    if (!allEmails || allEmails.length === 0) {
      toast.info('Nessuna nuova email da classificare');
      return;
    }

    const { data: classified } = await supabase
      .from('email_ai_classifications')
      .select('email_message_id')
      .eq('user_email', userData.userEmail);
    
    const classifiedIds = new Set(classified?.map(c => c.email_message_id) || []);
    const unclassifiedIds = allEmails
      .filter(e => !classifiedIds.has(e.id))
      .map(e => e.id);
    
    if (unclassifiedIds.length === 0) {
      toast.info('Tutte le email sono già classificate');
      return;
    }

    await classifyEmails(unclassifiedIds, userData.userEmail);
    refetch();
  };

  return (
    <div className="h-full flex flex-col">
      <SmartInboxHeader
        categories={categoryStats}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onClassifyNew={handleClassifyNew}
        isClassifying={isClassifying}
        classificationProgress={progress.total > 0 ? progress : undefined}
      />
      
      <SmartEmailList
        emails={classifiedEmails || []}
        onEmailClick={setSelectedEmail}
        isLoading={isLoading}
      />
      
      <SmartEmailDetail
        classifiedEmail={selectedEmail}
        open={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />
    </div>
  );
};