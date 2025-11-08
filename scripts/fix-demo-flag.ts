#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDemoFlag() {
  console.log('🔧 Updating is_demo_content flag for Whop videos...\n');

  const { data, error } = await supabase
    .from('videos')
    .update({ is_demo_content: true })
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .ilike('title', '%Whop%')
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Updated ${data.length} videos to is_demo_content = true\n`);

  data.forEach((v: any) => {
    console.log(`- ${v.title}`);
  });
}

fixDemoFlag();
