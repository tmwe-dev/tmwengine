import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEBUG_MODE = Deno.env.get('DEBUG_MODE') === 'true';
const API_BASE_URL = 'https://findair.it/erp/tmwe_json';

// Valid endpoints according to OpenAPI spec
const VALID_ENDPOINTS = [
  '/email_account',
  '/email_sync', 
  '/email_message',
  '/email_folder',
  '/get_my_profile'
];

// Error response helper following OpenAPI spec
const createErrorResponse = (error: string, message: string, status: number, details?: any) => {
  return new Response(
    JSON.stringify({ error, message, details }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { endpoint, data, bearerToken } = requestBody;

    // Validate bearer token (401 - Unauthorized)
    if (!bearerToken) {
      console.error('❌ No bearer token provided');
      return createErrorResponse(
        'unauthorized',
        'Authentication required. Please provide a valid access token.',
        401
      );
    }

    // Validate endpoint (400 - Bad Request)
    if (!endpoint || !VALID_ENDPOINTS.includes(endpoint)) {
      console.error('❌ Invalid endpoint:', endpoint);
      return createErrorResponse(
        'bad_request',
        'Invalid endpoint. Must be one of: ' + VALID_ENDPOINTS.join(', '),
        400,
        { provided_endpoint: endpoint, valid_endpoints: VALID_ENDPOINTS }
      );
    }

    // Special handling for /get_my_profile (GET method, no body required)
    if (endpoint === '/get_my_profile') {
      const url = `${API_BASE_URL}${endpoint}`;
      
      const requestHeaders = {
        'Authorization': `Bearer ${bearerToken}`,
        'Accept': 'application/json',
        'User-Agent': 'Deno/1.0',
      };

      if (DEBUG_MODE) {
        console.log('📤 GET REQUEST:', endpoint);
        console.log('URL:', url);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
      });

      const responseText = await response.text();

      if (DEBUG_MODE) {
        console.log('📥 GET RESPONSE:', response.status, responseText.substring(0, 200));
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { raw: responseText };
        }

        return createErrorResponse(
          response.status === 401 ? 'unauthorized' : 'internal_error',
          response.status === 401 ? 'Authentication failed' : 'Request failed',
          response.status,
          errorData
        );
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      return new Response(
        JSON.stringify(responseData),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate data object and handler for POST endpoints
    if (!data || typeof data !== 'object') {
      console.error('❌ Invalid data object');
      return createErrorResponse(
        'bad_request',
        'Invalid or missing data object',
        400
      );
    }

    if (!data.handler || typeof data.handler !== 'string') {
      console.error('❌ Missing or invalid handler');
      return createErrorResponse(
        'bad_request',
        'Invalid or missing required parameter: handler',
        400,
        { received_data: data }
      );
    }

    const url = `${API_BASE_URL}${endpoint}`;
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json',
      'User-Agent': 'Deno/1.0',
    };

    if (DEBUG_MODE) {
      console.log('📤 POST REQUEST:', endpoint, '/', data.handler);
      console.log('URL:', url);
      console.log('Body size:', JSON.stringify(data).length, 'bytes');
    }

    // Retry mechanism for inconsistent API responses
    let response: Response | undefined;
    let responseText: string = '';
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      const requestStartTime = Date.now();
      
      if (DEBUG_MODE) console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries}`);
      
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(data),
        });

        const requestDuration = Date.now() - requestStartTime;
        if (DEBUG_MODE) console.log(`⏱️ Request: ${requestDuration}ms`);

        responseText = await response.text();
        
        if (DEBUG_MODE && (responseText === '[]' || responseText === '')) {
          console.log('⚠️ Empty response:', data.handler);
        }
        
        // If we got a valid structured response, break
        if (responseText && responseText !== '[]' && responseText.includes('{')) {
          if (DEBUG_MODE) console.log('✅ Valid response received');
          break;
        }
        
        // If we got an empty array on handlers that should return data, retry
        const handlersToRetry = ['get_folders', 'get_messages', 'get_message'];
        if (handlersToRetry.includes(data.handler) && responseText === '[]') {
          retryCount++;
          if (retryCount < maxRetries) {
            const backoffDelay = 500 * retryCount;
            if (DEBUG_MODE) console.log(`⚠️ Retry ${retryCount}/${maxRetries} after ${backoffDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          } else {
            console.log(`Max retries (${maxRetries}) reached for ${data.handler}`);
          }
        }
        
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError.message);
        
        if (retryCount < maxRetries - 1) {
          const backoffDelay = 1000 * (retryCount + 1);
          if (DEBUG_MODE) console.log(`Retrying after ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          retryCount++;
          continue;
        }
        throw fetchError;
      }
      
      break;
    }

    // Ensure we have a response
    if (!response) {
      throw new Error('No response received from API');
    }

    if (DEBUG_MODE) {
      console.log('📥 RESPONSE:', endpoint, '/', data.handler);
      console.log('Status:', response.status);
      console.log('Size:', responseText.length, 'bytes');
      console.log('Retries:', retryCount);
    }

    // Handle different error status codes according to OpenAPI spec
    if (!response.ok) {
      let errorData;
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }

      if (DEBUG_MODE) {
        console.error('❌ API ERROR:', response.status, errorData);
      }

      // Map TMWE API errors to OpenAPI error responses
      switch (response.status) {
        case 400:
          return createErrorResponse(
            'bad_request',
            'Invalid or missing required parameters',
            400,
            errorData
          );
        case 401:
          return createErrorResponse(
            'unauthorized',
            'Authentication required or failed. Please check your access token.',
            401,
            errorData
          );
        case 404:
          return createErrorResponse(
            'not_found',
            'The requested resource was not found',
            404,
            errorData
          );
        default:
          return createErrorResponse(
            'internal_error',
            'An error occurred while processing your request',
            response.status,
            errorData
          );
      }
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }
    
    if (DEBUG_MODE) {
      console.log('✅ SUCCESS:', endpoint, '/', data.handler, response.status);
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.log('═══════════════════════════════════════════════════════');
    console.error('🔥 ERROR EN EDGE FUNCTION');
    console.log('═══════════════════════════════════════════════════════');
    console.error('⚠️ Error Message:', error.message);
    console.error('📚 Stack Trace:', error.stack);
    console.log('═══════════════════════════════════════════════════════');
    return createErrorResponse(
      'internal_error',
      error.message || 'An internal server error occurred',
      500,
      { stack: error.stack }
    );
  }
});
