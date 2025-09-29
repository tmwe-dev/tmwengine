import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('User ID is required');
    }

    console.log('Checking if user should become admin:', user_id);

    // Check if there are any existing admin users
    const { data: existingAdmins, error: adminCheckError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (adminCheckError) {
      console.error('Error checking existing admins:', adminCheckError);
      throw adminCheckError;
    }

    // If no admins exist, make this user an admin
    if (!existingAdmins || existingAdmins.length === 0) {
      console.log('No admins found, making user admin:', user_id);
      
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user_id,
          role: 'admin'
        });

      if (insertError) {
        console.error('Error assigning admin role:', insertError);
        throw insertError;
      }

      console.log('Successfully assigned admin role to first user');
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Admin role assigned to first user',
        is_admin: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.log('Admin users already exist, assigning regular user role');
      
      // Check if user already has a role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id)
        .maybeSingle();

      if (roleCheckError && roleCheckError.code !== 'PGRST116') {
        console.error('Error checking existing user role:', roleCheckError);
        throw roleCheckError;
      }

      if (!existingRole) {
        // Assign regular user role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user_id,
            role: 'user'
          });

        if (insertError) {
          console.error('Error assigning user role:', insertError);
          throw insertError;
        }

        console.log('Successfully assigned user role');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'User role assigned',
        is_admin: existingRole?.role === 'admin'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in auto-assign-admin function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});