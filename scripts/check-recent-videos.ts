#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data } = await supabase
  .from('videos')
  .select('id, title, is_demo_content, created_at')
  .eq('creator_id', '00000000-0000-0000-0000-000000000001')
  .order('created_at', { ascending: false })
  .limit(10);

console.log(`\n📹 Last 10 videos:\n`);
data?.forEach((v: any, i: number) => {
  console.log(`${i + 1}. [${v.is_demo_content ? 'DEMO✅' : 'TEST❌'}] ${v.title}`);
});

// Count total with demo flag
const { count } = await supabase
  .from('videos')
  .select('*', { count: 'exact', head: true })
  .eq('creator_id', '00000000-0000-0000-0000-000000000001')
  .eq('is_demo_content', true);

console.log(`\n✅ Total demo videos: ${count || 0}\n`);
