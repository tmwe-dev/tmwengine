import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SuggestionRequest {
  currentComponents: Array<{
    component_type: string;
    ui_category?: string;
    tags?: string[];
    complexity_level?: string;
  }>;
  pageContext: {
    page_name: string;
    description?: string;
    total_components: number;
  };
  userIntent?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentComponents, pageContext, userIntent }: SuggestionRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context analysis
    const componentTypes = currentComponents.map(c => c.component_type).join(", ");
    const uiCategories = [...new Set(currentComponents.map(c => c.ui_category).filter(Boolean))].join(", ");
    const allTags = [...new Set(currentComponents.flatMap(c => c.tags || []))].join(", ");
    
    const complexityDistribution = currentComponents.reduce((acc, c) => {
      const level = c.complexity_level || 'medium';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // System prompt with intelligence
    const systemPrompt = `You are an expert UI/UX designer assistant for a visual design lab tool.
Your role is to analyze the current page composition and suggest 3-5 complementary components that would enhance the user experience.

ANALYSIS CONTEXT:
- Page: ${pageContext.page_name} ${pageContext.description ? `(${pageContext.description})` : ''}
- Current components: ${pageContext.total_components}
- Component types present: ${componentTypes || 'none'}
- UI categories: ${uiCategories || 'none'}
- Tags: ${allTags || 'none'}
- Complexity distribution: ${JSON.stringify(complexityDistribution)}

SUGGESTION CRITERIA:
1. Suggest components that complement existing ones
2. Fill functional gaps (e.g., if there are inputs but no submit button)
3. Improve UX (e.g., add loading states, error messages, confirmations)
4. Follow design patterns (e.g., forms need validation feedback)
5. Consider accessibility (labels, aria attributes, keyboard navigation)
6. Balance complexity (don't suggest only complex components)

RESPONSE FORMAT:
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "suggestions": [
    {
      "component_name": "string (descriptive name)",
      "component_type": "string (technical type like button, input, card)",
      "ui_category": "string (input|button|card|layout|data-display|interactive)",
      "reason": "string (why this component would help)",
      "priority": "high|medium|low",
      "tags": ["array", "of", "relevant", "tags"],
      "estimated_complexity": "low|medium|high"
    }
  ],
  "rationale": "string (brief explanation of the overall suggestion strategy)"
}`;

    const userPrompt = userIntent 
      ? `User intent: "${userIntent}"\n\nBased on the current page state and user's intent, what components should be added?`
      : "Based on the current page state, what components would enhance this design?";

    // Call Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_components",
              description: "Suggest 3-5 components to add to the design lab page",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        component_name: { type: "string" },
                        component_type: { type: "string" },
                        ui_category: { 
                          type: "string",
                          enum: ["input", "button", "card", "layout", "data-display", "interactive"]
                        },
                        reason: { type: "string" },
                        priority: { 
                          type: "string",
                          enum: ["high", "medium", "low"]
                        },
                        tags: { 
                          type: "array",
                          items: { type: "string" }
                        },
                        estimated_complexity: {
                          type: "string",
                          enum: ["low", "medium", "high"]
                        }
                      },
                      required: ["component_name", "component_type", "ui_category", "reason", "priority"],
                      additionalProperties: false
                    },
                    minItems: 3,
                    maxItems: 5
                  },
                  rationale: { type: "string" }
                },
                required: ["suggestions", "rationale"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_components" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("design-lab-suggestions error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestions: [],
        rationale: "Error generating suggestions"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
