import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://findair.it/erp/tmwe_json';

// Valid endpoints according to OpenAPI spec
const VALID_ENDPOINTS = [
  '/email_account',
  '/email_sync', 
  '/email_message',
  '/email_folder'
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

    // Validate data object and handler (400 - Bad Request)
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

    // 📤 LOG COMPLETO DE LA SOLICITUD
    console.log('═══════════════════════════════════════════════════════');
    console.log('📤 SOLICITUD AL API TMWE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🔗 URL:', url);
    console.log('📍 Endpoint:', endpoint);
    console.log('🎯 Handler:', data.handler);
    console.log('📋 Headers:', {
      'Content-Type': requestHeaders['Content-Type'],
      'Authorization': `Bearer ${bearerToken.substring(0, 20)}...`,
      'Accept': requestHeaders['Accept'],
      'User-Agent': requestHeaders['User-Agent']
    });
    
    // Log del body completo (excluyendo contenido grande de adjuntos)
    const dataForLog = { ...data };
    if (dataForLog.attachments && Array.isArray(dataForLog.attachments)) {
      dataForLog.attachments = dataForLog.attachments.map((att: any) => ({
        filename: att.filename,
        content_type: att.content_type,
        content_length: att.content ? att.content.length : 0,
        content_preview: att.content ? att.content.substring(0, 100) + '...' : null
      }));
      console.log('📎 ATTACHMENTS:', dataForLog.attachments);
    }
    
    console.log('📦 Request Body:', JSON.stringify(dataForLog, null, 2));
    console.log('📏 Body Size:', JSON.stringify(data).length, 'bytes');
    console.log('═══════════════════════════════════════════════════════');

    // Retry mechanism for inconsistent API responses
    let response: Response | undefined;
    let responseText: string = '';
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(data),
      });

      responseText = await response.text();
      
      // If we got a valid structured response, break
      if (responseText && responseText !== '[]' && responseText.includes('{')) {
        break;
      }
      
      // If we got an empty array on get_folders, retry
      if (data.handler === 'get_folders' && responseText === '[]') {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`⚠️ Got empty response, retrying (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // Exponential backoff
          continue;
        }
      }
      
      break;
    }

    // Ensure we have a response
    if (!response) {
      throw new Error('No response received from API');
    }

    // 📥 LOG COMPLETO DE LA RESPUESTA
    console.log('═══════════════════════════════════════════════════════');
    console.log('📥 RESPUESTA DEL API TMWE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🔗 URL:', url);
    console.log('📍 Endpoint:', endpoint);
    console.log('🎯 Handler:', data.handler);
    console.log('🔢 HTTP Status Code:', response.status);
    console.log('📝 HTTP Status Text:', response.statusText);
    console.log('✅ Response OK:', response.ok);
    console.log('📏 Response Size:', responseText.length, 'bytes');
    console.log('🔄 Retries:', retryCount);
    console.log('📦 Response Headers:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
    });
    console.log('📄 Response Body (raw):', responseText);
    console.log('═══════════════════════════════════════════════════════');

    // Handle different error status codes according to OpenAPI spec
    if (!response.ok) {
      let errorData;
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }

      console.log('═══════════════════════════════════════════════════════');
      console.error('❌ ERROR EN RESPUESTA DEL API TMWE');
      console.log('═══════════════════════════════════════════════════════');
      console.error('🔢 HTTP Status:', response.status);
      console.error('📝 Status Text:', response.statusText);
      console.error('⚠️ Error Data:', errorData);
      console.error('📄 Full Response:', responseText);
      console.log('═══════════════════════════════════════════════════════');

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
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ RESPUESTA EXITOSA DEL API TMWE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📍 Endpoint:', endpoint);
    console.log('🎯 Handler:', data.handler);
    console.log('🔢 HTTP Status:', response.status);
    console.log('📦 Parsed Response:', JSON.stringify(responseData, null, 2));
    console.log('═══════════════════════════════════════════════════════');

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
