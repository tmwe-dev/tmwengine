import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractionResult {
  nodes: Array<{
    type: 'Topic' | 'Claim' | 'Evidence' | 'Decision' | 'Action';
    text: string;
    confidence: number;
  }>;
  edges: Array<{
    sourceText: string;
    targetText: string;
    type: 'supports' | 'disputes' | 'relates_to' | 'derives' | 'duplicates';
    weight: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, conversationId, messageContent } = await req.json();

    if (!messageId || !conversationId || !messageContent) {
      throw new Error('messageId, conversationId, and messageContent are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract knowledge using LLM
    console.log('🧠 Extracting knowledge from message...');
    const extractionPrompt = `Analyze the following message and extract knowledge graph elements.

MESSAGE:
${messageContent}

Extract:
1. **Topics**: Main subjects discussed
2. **Claims**: Assertions or statements made
3. **Evidence**: Supporting facts or data
4. **Decisions**: Conclusions or resolutions
5. **Actions**: Proposed or required actions

For each node, provide:
- type: Topic/Claim/Evidence/Decision/Action
- text: concise description (max 100 chars)
- confidence: 0.0-1.0 (how certain you are)

Also identify relationships between nodes:
- supports: node A supports node B
- disputes: node A contradicts node B
- relates_to: general connection
- derives: node B is derived from node A
- duplicates: nodes refer to same concept

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {"type": "Claim", "text": "Short description", "confidence": 0.9}
  ],
  "edges": [
    {"sourceText": "text of source node", "targetText": "text of target node", "type": "supports", "weight": 0.8}
  ]
}`;

    const llmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledge graph extraction expert. Extract structured information and return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.2
      })
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const llmText = llmData.choices?.[0]?.message?.content?.trim() || '{}';
    
    // Parse LLM response
    let extraction: ExtractionResult;
    try {
      // Remove markdown code blocks if present
      const cleanedText = llmText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      extraction = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', llmText);
      extraction = { nodes: [], edges: [] };
    }

    console.log(`📊 Extracted ${extraction.nodes.length} nodes, ${extraction.edges.length} edges`);

    // Generate embeddings for nodes
    const nodesWithEmbeddings = await Promise.all(
      extraction.nodes.map(async (node) => {
        try {
          const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: node.text
            })
          });

          if (embeddingResponse.ok) {
            const embData = await embeddingResponse.json();
            const embedding = embData.data?.[0]?.embedding || null;
            return { ...node, embedding };
          }
        } catch (error) {
          console.error('Embedding error:', error);
        }
        return { ...node, embedding: null };
      })
    );

    // Insert nodes
    const insertedNodes: Record<string, string> = {}; // text -> id mapping
    
    for (const node of nodesWithEmbeddings) {
      // Check for duplicates by semantic similarity
      if (node.embedding) {
        const { data: similarNodes } = await supabase.rpc('match_knowledge_nodes', {
          query_embedding: node.embedding,
          match_threshold: 0.92,
          match_count: 1,
          p_conversation_id: conversationId
        });

        if (similarNodes && similarNodes.length > 0) {
          console.log(`♻️ Duplicate detected: "${node.text}" matches existing node`);
          insertedNodes[node.text] = similarNodes[0].id;
          continue;
        }
      }

      // Insert new node
      const { data: insertedNode, error } = await supabase
        .from('knowledge_nodes')
        .insert({
          conversation_id: conversationId,
          node_type: node.type,
          text: node.text,
          source_msg_id: messageId,
          embedding: node.embedding,
          confidence: node.confidence,
          metadata: { extracted_at: new Date().toISOString() }
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error inserting node:', error);
        continue;
      }

      insertedNodes[node.text] = insertedNode.id;
    }

    // Insert edges
    const insertedEdges = [];
    for (const edge of extraction.edges) {
      const sourceId = insertedNodes[edge.sourceText];
      const targetId = insertedNodes[edge.targetText];

      if (!sourceId || !targetId) {
        console.warn(`Skipping edge: missing node for "${edge.sourceText}" -> "${edge.targetText}"`);
        continue;
      }

      const { data: insertedEdge, error } = await supabase
        .from('knowledge_edges')
        .insert({
          conversation_id: conversationId,
          source_node_id: sourceId,
          target_node_id: targetId,
          edge_type: edge.type,
          weight: edge.weight,
          metadata: { extracted_at: new Date().toISOString() }
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting edge:', error);
        continue;
      }

      insertedEdges.push(insertedEdge);
    }

    console.log(`✅ Inserted ${Object.keys(insertedNodes).length} nodes, ${insertedEdges.length} edges`);

    return new Response(
      JSON.stringify({
        success: true,
        nodesInserted: Object.keys(insertedNodes).length,
        edgesInserted: insertedEdges.length,
        extraction
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting knowledge graph:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to create (will be added as DB function)
// This is referenced above but needs to be created in a separate migration