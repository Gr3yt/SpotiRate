const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const code = event.queryStringParameters?.code;
  if (!code) {
    return { statusCode: 302, headers: { Location: '/?error=no_code' } };
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;

    const token = data.session.access_token;
    const refresh = data.session.refresh_token;

    // Redirect to home with tokens in URL fragment so JS can pick them up
    return {
      statusCode: 302,
      headers: {
        Location: `/auth/callback#access_token=${token}&refresh_token=${refresh}&type=recovery`
      }
    };
  } catch (err) {
    console.error('Auth error:', err);
    return { statusCode: 302, headers: { Location: '/?error=auth_failed' } };
  }
};