const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Invalid token');

    const body = JSON.parse(event.body);

    const { data, error } = await supabase
      .from('ratings')
      .upsert({
        user_id:     user.id,
        album_id:    body.album_id,
        album_name:  body.album_name,
        artist_name: body.artist_name,
        album_img:   body.album_img,
        avg_score:   body.avg_score,
        ratings:     body.ratings,
        track_tags:  body.track_tags,
        favourites:  body.favourites,
        review:      body.review,
        reviewer_name: body.reviewer_name,
        theme:       body.theme,
      }, { onConflict: 'user_id,album_id' })
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: data.id }),
    };
  } catch (err) {
    console.error('Save rating error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};