const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zxojoaxkceyqaopdvflc.supabase.co';
const supabaseAnonKey = 'sb_publishable_4tmHUjZKzzel8KDZ9bpjIQ_8Iu06IBH';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'test1@gmail.com')
      .single();

    if (profileError) {
      console.error('Profile Error:', profileError);
      return;
    }

    console.log('Profile Data:');
    console.log(JSON.stringify(profile, null, 2));

    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false });

    if (actError) {
      console.error('Activities Error:', actError);
      return;
    }

    console.log('Last 5 Activities:');
    console.log(JSON.stringify(activities.slice(0, 5), null, 2));

    const { data: usages, error: usagesError } = await supabase
      .from('streak_freeze_usages')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false });

    if (usagesError) {
      console.error('Usages Error:', usagesError);
      return;
    }

    console.log('Streak Freeze Usages:');
    console.log(JSON.stringify(usages, null, 2));

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

inspect();
