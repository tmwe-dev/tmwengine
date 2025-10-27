/**
 * ============ AUDIO GENERATOR ============
 * Handles parallel TTS generation with ElevenLabs
 */

import { fetchWithTimeout } from './utils.ts';

export interface AudioGenerationParams {
  supabaseClient: any;
  conversationId: string;
  responses: Array<{
    agentName: string;
    content: string;
    messageId: string;
  }>;
  elevenLabsApiKey: string;
  activeVoiceAgents: Array<{ name: string; voice_id: string }>;
}

/**
 * Generate audio for a single response immediately
 */
export async function generateAudioForSingleResponse(params: {
  supabaseClient: any;
  conversationId: string;
  messageId: string;
  content: string;
  voiceId: string;
  elevenLabsApiKey: string;
}): Promise<string | null> {
  const { supabaseClient, conversationId, messageId, content, voiceId, elevenLabsApiKey } = params;
  
  try {
    // ✅ Rimosso limite 500 caratteri - invia testo completo a ElevenLabs
    const ttsText = content;
    
    // Call ElevenLabs API
    const ttsResponse = await fetchWithTimeout(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: ttsText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      },
      15000
    );
    
    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      throw new Error(`TTS error ${ttsResponse.status}: ${errorText}`);
    }
    
    const audioBlob = await ttsResponse.blob();
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioFile = new File([audioArrayBuffer], `${messageId}.mp3`, { type: 'audio/mpeg' });
    
    // Upload to Supabase Storage
    const storagePath = `${conversationId}/${messageId}.mp3`;
    const { error: uploadError } = await supabaseClient.storage
      .from('audio-responses')
      .upload(storagePath, audioFile, { contentType: 'audio/mpeg', upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabaseClient.storage
      .from('audio-responses')
      .getPublicUrl(storagePath);
    
    const audioUrl = urlData.publicUrl;
    
    // Update DB
    await supabaseClient
      .from('chat_laboratory_messages')
      .update({ audio_url: audioUrl })
      .eq('id', messageId);
    
    console.log(`✅ [IMMEDIATO] Audio generato per ${messageId.substring(0, 8)}: ${audioUrl.substring(0, 60)}...`);
    return audioUrl;
  } catch (error: any) {
    console.error(`⚠️ TTS fallito:`, error.message);
    return null;
  }
}

/**
 * Generate audio for all responses in parallel
 */
export async function generateAudioForResponses(params: AudioGenerationParams): Promise<void> {
  const { supabaseClient, conversationId, responses, elevenLabsApiKey, activeVoiceAgents } = params;
  
  console.log(`🎵 Avvio generazione TTS per ${responses.length} messaggi in parallelo...`);
  
  const ttsPromises = responses.map(async (response) => {
    try {
      const agentVoice = activeVoiceAgents.find(
        (v: any) => v.name.toLowerCase().includes(response.agentName.toLowerCase())
      ) || activeVoiceAgents[0];
      
      const voiceId = agentVoice.voice_id;
      // ✅ Rimosso limite 500 caratteri - invia testo completo a ElevenLabs
      const ttsText = response.content;
      
      // Call ElevenLabs API
      const ttsResponse = await fetchWithTimeout(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: ttsText,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          })
        },
        15000
      );
      
      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        throw new Error(`TTS error ${ttsResponse.status}: ${errorText}`);
      }
      
      const audioBlob = await ttsResponse.blob();
      const audioArrayBuffer = await audioBlob.arrayBuffer();
      const audioFile = new File([audioArrayBuffer], `${response.messageId}.mp3`, { type: 'audio/mpeg' });
      
      // Upload to Supabase Storage
      const storagePath = `${conversationId}/${response.messageId}.mp3`;
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('audio-responses')
        .upload(storagePath, audioFile, { contentType: 'audio/mpeg', upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabaseClient.storage
        .from('audio-responses')
        .getPublicUrl(storagePath);
      
      const audioUrl = urlData.publicUrl;
      
      // Update DB
      await supabaseClient
        .from('chat_laboratory_messages')
        .update({ audio_url: audioUrl })
        .eq('id', response.messageId);
      
      console.log(`✅ Audio ${response.agentName}: ${audioUrl.substring(0, 60)}...`);
      return { messageId: response.messageId, audioUrl };
      
    } catch (error: any) {
      console.error(`⚠️ TTS fallito per ${response.agentName}:`, error.message);
      return { messageId: response.messageId, audioUrl: null };
    }
  });
  
  const ttsResults = await Promise.allSettled(ttsPromises);
  
  // Update responses with audio URLs
  ttsResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.audioUrl) {
      responses[index].audioUrl = result.value.audioUrl;
    }
  });
  
  const successCount = ttsResults.filter(r => r.status === 'fulfilled' && r.value.audioUrl).length;
  console.log(`✅ TTS completato: ${successCount}/${responses.length} successi`);
}
