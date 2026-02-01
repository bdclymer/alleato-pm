const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking test user project membership...\n');

  // Get test user from auth state
  const authState = JSON.parse(fs.readFileSync('tests/.auth/user.json', 'utf8'));
  console.log('Auth state structure:', Object.keys(authState));

  // Try to find user ID
  const origins = authState.origins || [];
  let userId = null;

  for (const origin of origins) {
    if (origin.localStorage) {
      for (const [key, value] of Object.entries(origin.localStorage)) {
        if (key.includes('supabase.auth.token')) {
          try {
            const tokenData = JSON.parse(value);
            userId = tokenData.user?.id || tokenData.currentSession?.user?.id;
            if (userId) {
              console.log('Found user ID:', userId);
              break;
            }
          } catch (e) {
            // Try next key
          }
        }
      }
    }
  }

  if (!userId) {
    console.log('Could not extract user ID from auth state');
    return;
  }

  // Check if user has person record
  const { data: person, error: personError } = await supabase
    .from('people')
    .select('id, first_name, last_name')
    .eq('auth_user_id', userId)
    .single();

  if (personError) {
    console.log('✗ No person record found for user:', personError.message);
    return;
  }

  console.log('✓ Person record found:', person.first_name, person.last_name);
  console.log('  Person ID:', person.id);

  // Check project memberships
  const { data: memberships, error: memberError } = await supabase
    .from('project_directory_memberships')
    .select('project_id, projects(name)')
    .eq('person_id', person.id);

  if (memberError) {
    console.log('✗ Error checking memberships:', memberError.message);
    return;
  }

  console.log('\nProject Memberships:');
  if (memberships.length === 0) {
    console.log('  ✗ NO PROJECT MEMBERSHIPS FOUND');
    console.log('  This is why uploads fail! User has no project access.');
  } else {
    memberships.forEach(m => {
      console.log(`  - Project ${m.project_id}: ${m.projects?.name || 'Unknown'}`);
    });

    const hasProject31 = memberships.some(m => m.project_id === 31);
    if (hasProject31) {
      console.log('\n✓ User HAS access to project 31');
    } else {
      console.log('\n✗ User DOES NOT have access to project 31');
      console.log('  This is why uploads to project 31 fail!');
    }
  }
})();
