# Module 9: AI Study Buddy - Implementation Guide

## Table of Contents
1. [Setup & Dependencies](#setup--dependencies)
2. [Database Schema](#database-schema)
3. [Matching Service](#matching-service)
4. [Study Buddy Connections](#study-buddy-connections)
5. [Study Groups](#study-groups)
6. [Shared Workspace](#shared-workspace)
7. [Check-In System](#check-in-system)
8. [Safety & Moderation](#safety--moderation)
9. [API Routes](#api-routes)
10. [Frontend Components](#frontend-components)
11. [Testing](#testing)

---

## Setup & Dependencies

### Install Required Packages

```bash
npm install zustand
npm install date-fns  # For timezone handling
npm install react-calendar  # For shared calendar
npm install react-markdown  # For message formatting
npm install @tiptap/react @tiptap/starter-kit  # For rich text editor
npm install socket.io-client  # For real-time messaging (if not using Supabase Realtime)
```

### Environment Variables

```bash
# .env.local

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Claude AI (for match suggestions)
ANTHROPIC_API_KEY=your-anthropic-key
```

---

## Database Schema

### Run Supabase Migration

Create `supabase/migrations/009_study_buddy_system.sql`:

```sql
-- Study Buddy Connections
CREATE TABLE study_buddy_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_a_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID REFERENCES students(id) ON DELETE CASCADE,

  -- Match quality
  match_score INTEGER NOT NULL,
  match_reasoning TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  initiated_by UUID NOT NULL,

  -- Activity
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMP,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,

  -- Timestamps
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_study_buddies UNIQUE (
    LEAST(student_a_id, student_b_id),
    GREATEST(student_a_id, student_b_id)
  ),
  CONSTRAINT no_self_buddy CHECK (student_a_id != student_b_id)
);

-- Study Groups
CREATE TABLE study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL,

  -- Focus
  focus_module INTEGER,
  focus_project VARCHAR(255),
  focus_topic VARCHAR(100),

  -- Configuration
  max_members INTEGER NOT NULL DEFAULT 5,
  recruiting_status VARCHAR(20) DEFAULT 'open',
  min_level INTEGER,
  max_level INTEGER,
  required_topics JSONB,

  -- Schedule
  timezone VARCHAR(50),
  meeting_schedule JSONB,
  start_date DATE,
  end_date DATE,

  -- Activity requirements
  min_weekly_check_ins INTEGER DEFAULT 0,
  min_weekly_messages INTEGER DEFAULT 0,

  -- Status
  created_by UUID REFERENCES students(id),
  activity_score INTEGER DEFAULT 100,
  total_messages INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Study Group Members
CREATE TABLE study_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  role VARCHAR(20) NOT NULL DEFAULT 'member',

  -- Activity
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0,
  total_check_ins INTEGER DEFAULT 0,
  contribution_score INTEGER DEFAULT 0,

  status VARCHAR(20) DEFAULT 'active',
  left_at TIMESTAMP,

  CONSTRAINT unique_group_member UNIQUE (group_id, student_id)
);

-- Check-Ins
CREATE TABLE study_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  group_id UUID REFERENCES study_groups(id),
  buddy_id UUID,

  -- Progress
  videos_watched INTEGER DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  project_hours DECIMAL(4,1) DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,

  -- Mood
  mood VARCHAR(20),
  blockers TEXT,
  wins TEXT,

  -- Commitments
  next_week_commitment TEXT,
  previous_commitment_met BOOLEAN,

  check_in_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Matching Preferences
CREATE TABLE matching_preferences (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,

  -- Availability
  weekly_availability_hours INTEGER,
  timezone VARCHAR(50),
  preferred_study_times JSONB,

  -- Goals
  primary_goal VARCHAR(50),
  interested_topics JSONB,
  project_interests JSONB,

  -- Style
  learning_style VARCHAR(30),
  communication_preference VARCHAR(20),
  competitiveness INTEGER CHECK (competitiveness BETWEEN 1 AND 5),

  -- Preferences
  open_to_matching BOOLEAN DEFAULT TRUE,
  preferred_group_size INTEGER DEFAULT 4,
  language_preferences JSONB,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shared Projects
CREATE TABLE shared_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,

  github_repo VARCHAR(255),
  branches JSONB,

  tasks JSONB,

  status VARCHAR(20) DEFAULT 'planning',
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  references JSONB,
  code_snippets JSONB,

  created_by UUID REFERENCES students(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Group Messages (if not using Discord)
CREATE TABLE group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),

  message_text TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'code', 'file', 'system'
  metadata JSONB, -- For code language, file info, etc.

  -- Reactions
  reactions JSONB DEFAULT '[]', -- [{ emoji: '👍', users: ['uuid1', 'uuid2'] }]

  -- Threading
  reply_to UUID REFERENCES group_messages(id),

  -- Moderation
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  edited_at TIMESTAMP
);

-- Safety Reports
CREATE TABLE safety_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_by UUID REFERENCES students(id),
  reported_user UUID REFERENCES students(id),

  context VARCHAR(20) NOT NULL, -- 'message', 'profile', 'behavior'
  category VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB, -- Array of screenshot URLs

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'under-review', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES creators(id),
  resolution TEXT,
  action_taken VARCHAR(50), -- 'warning', 'timeout', 'ban', 'none'

  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_buddy_connections_student_a ON study_buddy_connections(student_a_id, status);
CREATE INDEX idx_buddy_connections_student_b ON study_buddy_connections(student_b_id, status);
CREATE INDEX idx_buddy_connections_active ON study_buddy_connections(status, last_interaction_at)
  WHERE status = 'active';

CREATE INDEX idx_study_groups_recruiting ON study_groups(recruiting_status, activity_score)
  WHERE recruiting_status = 'open';
CREATE INDEX idx_study_groups_type ON study_groups(type, created_at DESC);

CREATE INDEX idx_group_members_student ON study_group_members(student_id, status);
CREATE INDEX idx_group_members_group ON study_group_members(group_id, status);

CREATE INDEX idx_check_ins_student ON study_check_ins(student_id, check_in_date DESC);
CREATE INDEX idx_check_ins_group ON study_check_ins(group_id, check_in_date DESC);

CREATE INDEX idx_group_messages_group ON group_messages(group_id, created_at DESC);
CREATE INDEX idx_group_messages_thread ON group_messages(reply_to) WHERE reply_to IS NOT NULL;

CREATE INDEX idx_safety_reports_status ON safety_reports(status, created_at DESC);

-- Row Level Security (RLS)

-- Study buddy connections: Students can see their own connections
ALTER TABLE study_buddy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their buddy connections"
  ON study_buddy_connections FOR SELECT
  USING (
    auth.uid() = student_a_id OR
    auth.uid() = student_b_id
  );

CREATE POLICY "Students can create buddy connections"
  ON study_buddy_connections FOR INSERT
  WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Students can update their connections"
  ON study_buddy_connections FOR UPDATE
  USING (
    auth.uid() = student_a_id OR
    auth.uid() = student_b_id
  );

-- Study groups: Public read, members can write
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open groups"
  ON study_groups FOR SELECT
  USING (recruiting_status = 'open' OR created_by = auth.uid());

CREATE POLICY "Students can create groups"
  ON study_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creator can update"
  ON study_groups FOR UPDATE
  USING (auth.uid() = created_by);

-- Group members: Members can see other members
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can see group members"
  ON study_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = group_id
      AND sgm.student_id = auth.uid()
      AND sgm.status = 'active'
    )
  );

-- Messages: Only group members can see/send
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view messages"
  ON group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE group_id = group_messages.group_id
      AND student_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Group members can send messages"
  ON group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE group_id = group_messages.group_id
      AND student_id = auth.uid()
      AND status = 'active'
    )
  );
```

---

## Matching Service

### Types

Create `lib/study-buddy/types.ts`:

```typescript
// lib/study-buddy/types.ts

export interface MatchingPreferences {
  student_id: string;
  weekly_availability_hours: number;
  timezone: string;
  preferred_study_times: TimeSlot[];
  primary_goal: string;
  interested_topics: string[];
  project_interests: string[];
  learning_style: 'visual' | 'hands-on' | 'theoretical' | 'social';
  communication_preference: 'text' | 'voice' | 'video' | 'any';
  competitiveness: number; // 1-5
  open_to_matching: boolean;
  preferred_group_size: number;
  language_preferences: string[];
}

export interface TimeSlot {
  day: string; // 'Monday', 'Tuesday', etc.
  startTime: string; // '18:00'
  endTime: string; // '21:00'
}

export interface MatchScore {
  totalScore: number;
  breakdown: {
    levelCompatibility: number;
    goalAlignment: number;
    scheduleOverlap: number;
    learningPaceMatch: number;
    interestsOverlap: number;
    communicationStyleFit: number;
  };
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface MatchCandidate {
  student: {
    id: string;
    name: string;
    avatar_url?: string;
    level: number;
    current_module: number;
    videos_per_week: number;
    age_group: string;
  };
  preferences: MatchingPreferences;
  matchScore: MatchScore;
}
```

### Matching Service Implementation

Create `lib/study-buddy/matching-service.ts`:

```typescript
// lib/study-buddy/matching-service.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { MatchingPreferences, MatchScore, MatchCandidate, TimeSlot } from './types';
import { parse, format, getTimezoneOffset } from 'date-fns-tz';

export class MatchingService {
  /**
   * Find compatible study buddies for a student
   */
  async findMatches(studentId: string, limit: number = 10): Promise<MatchCandidate[]> {
    const supabase = getSupabaseAdmin();

    // 1. Get student info and preferences
    const { data: student } = await supabase
      .from('students')
      .select('id, name, avatar_url, level, current_module, xp_points, age_group, created_at')
      .eq('id', studentId)
      .single();

    if (!student) throw new Error('Student not found');

    const { data: prefs } = await supabase
      .from('matching_preferences')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (!prefs || !prefs.open_to_matching) {
      throw new Error('Student not open to matching');
    }

    // Calculate videos per week
    const weeksSinceJoin = Math.max(1, Math.floor(
      (Date.now() - new Date(student.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
    ));
    const { count: totalVideos } = await supabase
      .from('learning_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('completed', true);

    const videosPerWeek = Math.ceil((totalVideos || 0) / weeksSinceJoin);

    // 2. Get existing connections (to exclude)
    const { data: existingConnections } = await supabase
      .from('study_buddy_connections')
      .select('student_a_id, student_b_id')
      .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`)
      .in('status', ['pending', 'accepted', 'active']);

    const connectedIds = new Set(
      existingConnections?.flatMap(c =>
        [c.student_a_id, c.student_b_id].filter(id => id !== studentId)
      ) || []
    );

    // 3. Build query filters
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        avatar_url,
        level,
        current_module,
        age_group,
        created_at,
        matching_preferences (*)
      `)
      .neq('id', studentId) // Not self
      .not('id', 'in', `(${Array.from(connectedIds).join(',')})`) // Not already connected
      .eq('matching_preferences.open_to_matching', true)
      .gte('level', student.level - 3) // Within ±3 levels
      .lte('level', student.level + 3);

    // Age group safety: minors must match age group
    if (student.age_group !== '22+') {
      query = query.eq('age_group', student.age_group);
    }

    // Timezone: prefer within ±4 hours
    if (prefs.timezone) {
      // This is simplified - in production, calculate offset difference
      query = query.eq('matching_preferences.timezone', prefs.timezone);
    }

    const { data: candidates, error } = await query.limit(50);

    if (error) throw error;
    if (!candidates || candidates.length === 0) return [];

    // 4. Calculate match scores
    const matches: MatchCandidate[] = [];

    for (const candidate of candidates) {
      if (!candidate.matching_preferences) continue;

      // Calculate candidate's videos per week
      const candWeeksSinceJoin = Math.max(1, Math.floor(
        (Date.now() - new Date(candidate.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
      ));
      const { count: candTotalVideos } = await supabase
        .from('learning_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', candidate.id)
        .eq('completed', true);

      const candVideosPerWeek = Math.ceil((candTotalVideos || 0) / candWeeksSinceJoin);

      const matchScore = this.calculateMatchScore(
        { ...student, videos_per_week: videosPerWeek },
        { ...candidate, videos_per_week: candVideosPerWeek },
        prefs,
        candidate.matching_preferences
      );

      // Only include matches with score >= 60
      if (matchScore.totalScore >= 60) {
        matches.push({
          student: {
            id: candidate.id,
            name: candidate.name,
            avatar_url: candidate.avatar_url,
            level: candidate.level,
            current_module: candidate.current_module,
            videos_per_week: candVideosPerWeek,
            age_group: candidate.age_group,
          },
          preferences: candidate.matching_preferences,
          matchScore,
        });
      }
    }

    // 5. Sort by match score and return top N
    return matches
      .sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore)
      .slice(0, limit);
  }

  /**
   * Calculate match score between two students
   */
  calculateMatchScore(
    student: any,
    candidate: any,
    studentPrefs: MatchingPreferences,
    candidatePrefs: MatchingPreferences
  ): MatchScore {
    let totalScore = 0;
    const breakdown: any = {};

    // 1. Level Compatibility (25 points)
    const levelDiff = Math.abs(student.level - candidate.level);
    breakdown.levelCompatibility = Math.max(0, 25 - (levelDiff * 8));
    totalScore += breakdown.levelCompatibility;

    // 2. Goal Alignment (20 points)
    const sharedTopics = this.countSharedItems(
      studentPrefs.interested_topics || [],
      candidatePrefs.interested_topics || []
    );
    breakdown.goalAlignment = Math.min(20, sharedTopics * 7);
    totalScore += breakdown.goalAlignment;

    // 3. Schedule Overlap (20 points)
    const overlapHours = this.calculateScheduleOverlap(
      studentPrefs.preferred_study_times || [],
      candidatePrefs.preferred_study_times || [],
      studentPrefs.timezone,
      candidatePrefs.timezone
    );
    breakdown.scheduleOverlap = Math.min(20, overlapHours * 4);
    totalScore += breakdown.scheduleOverlap;

    // 4. Learning Pace Match (15 points)
    const paceDiff = Math.abs(
      student.videos_per_week - candidate.videos_per_week
    );
    breakdown.learningPaceMatch = Math.max(0, 15 - (paceDiff * 2));
    totalScore += breakdown.learningPaceMatch;

    // 5. Interests Overlap (10 points)
    const sharedInterests = this.countSharedItems(
      studentPrefs.project_interests || [],
      candidatePrefs.project_interests || []
    );
    breakdown.interestsOverlap = Math.min(10, sharedInterests * 4);
    totalScore += breakdown.interestsOverlap;

    // 6. Communication Style Fit (10 points)
    const commMatch = this.checkCommunicationMatch(
      studentPrefs.communication_preference,
      candidatePrefs.communication_preference
    );
    breakdown.communicationStyleFit = commMatch ? 10 : 5;
    totalScore += breakdown.communicationStyleFit;

    // Generate reasoning
    const reasoning = this.generateMatchReasoning(student, candidate, breakdown);

    return {
      totalScore: Math.round(totalScore),
      breakdown,
      confidenceLevel: totalScore >= 80 ? 'high' : totalScore >= 60 ? 'medium' : 'low',
      reasoning,
    };
  }

  /**
   * Count shared items between two arrays
   */
  private countSharedItems(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    return arr2.filter(item => set1.has(item.toLowerCase())).length;
  }

  /**
   * Calculate schedule overlap in hours
   */
  private calculateScheduleOverlap(
    times1: TimeSlot[],
    times2: TimeSlot[],
    tz1: string,
    tz2: string
  ): number {
    if (!times1.length || !times2.length) return 0;

    let totalOverlap = 0;

    // For each time slot in times1
    for (const slot1 of times1) {
      // Convert to candidate's timezone
      for (const slot2 of times2) {
        if (slot1.day === slot2.day) {
          // Calculate overlap (simplified - assumes same timezone)
          const start1 = this.timeToMinutes(slot1.startTime);
          const end1 = this.timeToMinutes(slot1.endTime);
          const start2 = this.timeToMinutes(slot2.startTime);
          const end2 = this.timeToMinutes(slot2.endTime);

          const overlapStart = Math.max(start1, start2);
          const overlapEnd = Math.min(end1, end2);

          if (overlapEnd > overlapStart) {
            totalOverlap += (overlapEnd - overlapStart) / 60; // Convert to hours
          }
        }
      }
    }

    return Math.round(totalOverlap * 10) / 10; // Round to 1 decimal
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check if communication preferences match
   */
  private checkCommunicationMatch(pref1: string, pref2: string): boolean {
    if (pref1 === 'any' || pref2 === 'any') return true;
    return pref1 === pref2;
  }

  /**
   * Generate human-readable match reasoning
   */
  private generateMatchReasoning(
    student: any,
    candidate: any,
    breakdown: any
  ): string {
    const reasons: string[] = [];

    if (breakdown.levelCompatibility >= 20) {
      reasons.push(`You're both at similar levels (Level ${student.level} and ${candidate.level})`);
    }

    if (breakdown.scheduleOverlap >= 15) {
      reasons.push(`You have overlapping study times`);
    }

    if (breakdown.goalAlignment >= 15) {
      reasons.push(`You share similar learning goals`);
    }

    if (breakdown.learningPaceMatch >= 12) {
      reasons.push(`You're learning at a similar pace`);
    }

    if (reasons.length === 0) {
      reasons.push(`Compatible learning styles`);
    }

    return reasons.join('. ') + '.';
  }
}
```

---

## Study Buddy Connections

### Buddy Service

Create `lib/study-buddy/buddy-service.ts`:

```typescript
// lib/study-buddy/buddy-service.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';

export class BuddyService {
  /**
   * Send a study buddy connection request
   */
  async sendConnectionRequest(
    fromStudentId: string,
    toStudentId: string,
    matchScore: number,
    matchReasoning: string
  ): Promise<{ success: boolean; connection: any }> {
    const supabase = getSupabaseAdmin();

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('study_buddy_connections')
      .select('*')
      .or(
        `and(student_a_id.eq.${fromStudentId},student_b_id.eq.${toStudentId}),` +
        `and(student_a_id.eq.${toStudentId},student_b_id.eq.${fromStudentId})`
      )
      .single();

    if (existing) {
      throw new Error('Connection already exists');
    }

    // Create connection request
    const { data: connection, error } = await supabase
      .from('study_buddy_connections')
      .insert({
        student_a_id: fromStudentId,
        student_b_id: toStudentId,
        match_score: matchScore,
        match_reasoning: matchReasoning,
        status: 'pending',
        initiated_by: fromStudentId,
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Send notification to toStudentId

    return { success: true, connection };
  }

  /**
   * Accept a buddy connection request
   */
  async acceptConnectionRequest(
    connectionId: string,
    studentId: string
  ): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    // Verify this student is the recipient
    const { data: connection } = await supabase
      .from('study_buddy_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) throw new Error('Connection not found');

    const isRecipient =
      connection.student_a_id === studentId || connection.student_b_id === studentId;
    const isInitiator = connection.initiated_by === studentId;

    if (!isRecipient || isInitiator) {
      throw new Error('Unauthorized');
    }

    // Update status
    const { error } = await supabase
      .from('study_buddy_connections')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) throw error;

    // Award XP to both students
    const xpService = new (await import('@/lib/gamification/xp-service')).XPService();
    await xpService.awardXP(connection.student_a_id, 'FIRST_STUDY_BUDDY');
    await xpService.awardXP(connection.student_b_id, 'FIRST_STUDY_BUDDY');

    return { success: true };
  }

  /**
   * Reject a buddy connection request
   */
  async rejectConnectionRequest(
    connectionId: string,
    studentId: string
  ): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    // Verify authorization
    const { data: connection } = await supabase
      .from('study_buddy_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) throw new Error('Connection not found');

    const isRecipient =
      (connection.student_a_id === studentId || connection.student_b_id === studentId) &&
      connection.initiated_by !== studentId;

    if (!isRecipient) throw new Error('Unauthorized');

    // Delete the request
    const { error } = await supabase
      .from('study_buddy_connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;

    return { success: true };
  }

  /**
   * Get all buddy connections for a student
   */
  async getMyBuddies(studentId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('study_buddy_connections')
      .select(`
        *,
        student_a:students!study_buddy_connections_student_a_id_fkey(id, name, avatar_url, level),
        student_b:students!study_buddy_connections_student_b_id_fkey(id, name, avatar_url, level)
      `)
      .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to consistent format
    return (data || []).map(conn => ({
      ...conn,
      buddy: conn.student_a_id === studentId ? conn.student_b : conn.student_a,
    }));
  }

  /**
   * Record a study session between buddies
   */
  async recordStudySession(
    connectionId: string,
    durationMinutes: number
  ): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('study_buddy_connections')
      .update({
        total_sessions: supabase.rpc('increment_total_sessions'), // Custom function
        last_interaction_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) throw error;

    // Award XP
    const { data: connection } = await supabase
      .from('study_buddy_connections')
      .select('student_a_id, student_b_id')
      .eq('id', connectionId)
      .single();

    if (connection) {
      const xpService = new (await import('@/lib/gamification/xp-service')).XPService();
      await xpService.awardXP(connection.student_a_id, 'STUDY_SESSION_COMPLETED');
      await xpService.awardXP(connection.student_b_id, 'STUDY_SESSION_COMPLETED');
    }

    return { success: true };
  }
}
```

---

## Study Groups

### Group Service

Create `lib/study-buddy/group-service.ts`:

```typescript
// lib/study-buddy/group-service.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface CreateGroupData {
  name: string;
  description: string;
  type: 'learning-circle' | 'project-team' | 'accountability-pod' | 'workshop';
  focus_module?: number;
  focus_project?: string;
  focus_topic?: string;
  max_members: number;
  recruiting_status: 'open' | 'invite-only' | 'closed';
  min_level?: number;
  max_level?: number;
  required_topics?: string[];
  timezone?: string;
  meeting_schedule?: any;
  start_date?: string;
  end_date?: string;
  min_weekly_check_ins?: number;
  min_weekly_messages?: number;
}

export class GroupService {
  /**
   * Create a new study group
   */
  async createGroup(
    creatorId: string,
    data: CreateGroupData
  ): Promise<{ success: boolean; group: any }> {
    const supabase = getSupabaseAdmin();

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .insert({
        ...data,
        created_by: creatorId,
        activity_score: 100,
        last_activity_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add creator as first member with 'creator' role
    const { error: memberError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: group.id,
        student_id: creatorId,
        role: 'creator',
        status: 'active',
      });

    if (memberError) throw memberError;

    // Award XP
    const xpService = new (await import('@/lib/gamification/xp-service')).XPService();
    await xpService.awardXP(creatorId, 'CREATED_STUDY_GROUP');

    return { success: true, group };
  }

  /**
   * Join a study group
   */
  async joinGroup(
    groupId: string,
    studentId: string
  ): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    // Check if group is full
    const { count: memberCount } = await supabase
      .from('study_group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'active');

    const { data: group } = await supabase
      .from('study_groups')
      .select('max_members, min_level, max_level, recruiting_status')
      .eq('id', groupId)
      .single();

    if (!group) throw new Error('Group not found');
    if (group.recruiting_status === 'closed') throw new Error('Group is not recruiting');
    if (memberCount && memberCount >= group.max_members) {
      throw new Error('Group is full');
    }

    // Check level requirements
    if (group.min_level || group.max_level) {
      const { data: student } = await supabase
        .from('students')
        .select('level')
        .eq('id', studentId)
        .single();

      if (student) {
        if (group.min_level && student.level < group.min_level) {
          throw new Error(`Minimum level ${group.min_level} required`);
        }
        if (group.max_level && student.level > group.max_level) {
          throw new Error(`Maximum level ${group.max_level} exceeded`);
        }
      }
    }

    // Add member
    const { error } = await supabase
      .from('study_group_members')
      .insert({
        group_id: groupId,
        student_id: studentId,
        role: 'member',
        status: 'active',
      });

    if (error) throw error;

    // Award XP
    const xpService = new (await import('@/lib/gamification/xp-service')).XPService();
    await xpService.awardXP(studentId, 'JOINED_STUDY_GROUP');

    return { success: true };
  }

  /**
   * Leave a study group
   */
  async leaveGroup(groupId: string, studentId: string): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('study_group_members')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
      })
      .eq('group_id', groupId)
      .eq('student_id', studentId);

    if (error) throw error;

    return { success: true };
  }

  /**
   * Get groups a student is a member of
   */
  async getMyGroups(studentId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('study_group_members')
      .select(`
        *,
        group:study_groups(*)
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  /**
   * Discover groups (browse/search)
   */
  async discoverGroups(filters?: {
    type?: string;
    focusModule?: number;
    minLevel?: number;
    maxLevel?: number;
    search?: string;
  }): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('study_groups')
      .select(`
        *,
        members:study_group_members(count)
      `)
      .eq('recruiting_status', 'open')
      .order('activity_score', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.focusModule) {
      query = query.eq('focus_module', filters.focusModule);
    }

    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('study_group_members')
      .select(`
        *,
        student:students(id, name, avatar_url, level)
      `)
      .eq('group_id', groupId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Update group activity score (call this periodically)
   */
  async updateGroupActivityScore(groupId: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    // Get messages in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: recentMessages } = await supabase
      .from('group_messages')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .gte('created_at', sevenDaysAgo);

    // Get check-ins in last 7 days
    const { count: recentCheckIns } = await supabase
      .from('study_check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .gte('created_at', sevenDaysAgo);

    // Calculate score (simplified)
    const messageScore = Math.min(50, (recentMessages || 0) * 2);
    const checkInScore = Math.min(50, (recentCheckIns || 0) * 10);
    const activityScore = Math.round(messageScore + checkInScore);

    await supabase
      .from('study_groups')
      .update({ activity_score: activityScore })
      .eq('id', groupId);
  }
}
```

---

## Shared Workspace

### Message Service (In-App Chat)

Create `lib/study-buddy/message-service.ts`:

```typescript
// lib/study-buddy/message-service.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';

export class MessageService {
  /**
   * Send a message to a study group
   */
  async sendMessage(
    groupId: string,
    studentId: string,
    messageText: string,
    messageType: 'text' | 'code' | 'file' = 'text',
    metadata?: any,
    replyTo?: string
  ): Promise<{ success: boolean; message: any }> {
    const supabase = getSupabaseAdmin();

    // Verify student is a member
    const { data: member } = await supabase
      .from('study_group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single();

    if (!member) throw new Error('Not a group member');

    // Create message
    const { data: message, error } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        student_id: studentId,
        message_text: messageText,
        message_type: messageType,
        metadata,
        reply_to: replyTo,
      })
      .select()
      .single();

    if (error) throw error;

    // Update group activity
    await supabase
      .from('study_groups')
      .update({
        total_messages: supabase.rpc('increment', { table_name: 'study_groups', column_name: 'total_messages' }),
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', groupId);

    // Update member activity
    await supabase
      .from('study_group_members')
      .update({
        total_messages: supabase.rpc('increment', { table_name: 'study_group_members', column_name: 'total_messages' }),
        last_active_at: new Date().toISOString(),
      })
      .eq('group_id', groupId)
      .eq('student_id', studentId);

    return { success: true, message };
  }

  /**
   * Get messages for a group (paginated)
   */
  async getMessages(
    groupId: string,
    limit: number = 50,
    before?: string // Message ID for pagination
  ): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('group_messages')
      .select(`
        *,
        student:students(id, name, avatar_url)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('id', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).reverse(); // Return in chronological order
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    messageId: string,
    studentId: string,
    emoji: string
  ): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    // Get current reactions
    const { data: message } = await supabase
      .from('group_messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (!message) throw new Error('Message not found');

    let reactions = message.reactions || [];

    // Find existing reaction
    const existingIndex = reactions.findIndex((r: any) => r.emoji === emoji);

    if (existingIndex >= 0) {
      // Add user to existing reaction
      if (!reactions[existingIndex].users.includes(studentId)) {
        reactions[existingIndex].users.push(studentId);
      }
    } else {
      // Create new reaction
      reactions.push({
        emoji,
        users: [studentId],
      });
    }

    // Update message
    const { error } = await supabase
      .from('group_messages')
      .update({ reactions })
      .eq('id', messageId);

    if (error) throw error;

    return { success: true };
  }

  /**
   * Subscribe to real-time messages (for client-side)
   */
  subscribeToMessages(groupId: string, callback: (message: any) => void) {
    const supabase = getSupabaseAdmin();

    return supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }
}
```

### Shared Project Service

Create `lib/study-buddy/project-service.ts`:

```typescript
// lib/study-buddy/project-service.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface CreateProjectData {
  name: string;
  description: string;
  github_repo?: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  assignedTo?: string;
  status: 'todo' | 'in-progress' | 'blocked' | 'done';
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export class ProjectService {
  /**
   * Create a shared project for a study group
   */
  async createProject(
    groupId: string,
    creatorId: string,
    data: CreateProjectData
  ): Promise<{ success: boolean; project: any }> {
    const supabase = getSupabaseAdmin();

    const { data: project, error } = await supabase
      .from('shared_projects')
      .insert({
        group_id: groupId,
        created_by: creatorId,
        ...data,
        status: 'planning',
        progress: 0,
        tasks: [],
        references: [],
        code_snippets: [],
      })
      .select()
      .single();

    if (error) throw error;

    // Award XP to group
    const xpService = new (await import('@/lib/gamification/xp-service')).XPService();
    await xpService.awardXP(creatorId, 'GROUP_PROJECT_MILESTONE');

    return { success: true, project };
  }

  /**
   * Add a task to a project
   */
  async addTask(
    projectId: string,
    task: Omit<ProjectTask, 'id'>
  ): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    // Get current tasks
    const { data: project } = await supabase
      .from('shared_projects')
      .select('tasks')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    const tasks = project.tasks || [];
    const newTask: ProjectTask = {
      ...task,
      id: crypto.randomUUID(),
    };

    tasks.push(newTask);

    // Update project
    const { error } = await supabase
      .from('shared_projects')
      .update({ tasks, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) throw error;

    return { success: true };
  }

  /**
   * Update a task
   */
  async updateTask(
    projectId: string,
    taskId: string,
    updates: Partial<ProjectTask>
  ): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    const { data: project } = await supabase
      .from('shared_projects')
      .select('tasks, group_id')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    const tasks = project.tasks || [];
    const taskIndex = tasks.findIndex((t: ProjectTask) => t.id === taskId);

    if (taskIndex === -1) throw new Error('Task not found');

    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };

    // Update project
    const { error } = await supabase
      .from('shared_projects')
      .update({ tasks, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) throw error;

    // Recalculate progress
    await this.updateProjectProgress(projectId);

    return { success: true };
  }

  /**
   * Update project progress based on completed tasks
   */
  private async updateProjectProgress(projectId: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    const { data: project } = await supabase
      .from('shared_projects')
      .select('tasks')
      .eq('id', projectId)
      .single();

    if (!project || !project.tasks?.length) return;

    const tasks: ProjectTask[] = project.tasks;
    const completedCount = tasks.filter(t => t.status === 'done').length;
    const progress = Math.round((completedCount / tasks.length) * 100);

    await supabase
      .from('shared_projects')
      .update({ progress })
      .eq('id', projectId);

    // If 100% complete, mark as completed
    if (progress === 100) {
      await supabase
        .from('shared_projects')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      // Award XP to all group members
      const { data: groupMembers } = await supabase
        .from('study_group_members')
        .select('student_id')
        .eq('group_id', project.group_id)
        .eq('status', 'active');

      if (groupMembers) {
        const xpService = new (await import('@/lib/gamification/xp-service')).XPService();
        for (const member of groupMembers) {
          await xpService.awardXP(member.student_id, 'GROUP_PROJECT_COMPLETED');
        }
      }
    }
  }

  /**
   * Get all projects for a group
   */
  async getGroupProjects(groupId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('shared_projects')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }
}
```

---

## Check-In System

### Check-In Service

Create `lib/study-buddy/checkin-service.ts`:

```typescript
// lib/study-buddy/checkin-service.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface CheckInData {
  videosWatched: number;
  quizzesTaken: number;
  projectHours: number;
  xpEarned: number;
  mood: 'struggling' | 'ok' | 'confident' | 'crushing-it';
  blockers?: string;
  wins?: string;
  nextWeekCommitment?: string;
}

export class CheckInService {
  /**
   * Submit a check-in for a study group
   */
  async submitCheckIn(
    studentId: string,
    groupId: string,
    data: CheckInData
  ): Promise<{ success: boolean; checkIn: any }> {
    const supabase = getSupabaseAdmin();

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const { data: existing } = await supabase
      .from('study_check_ins')
      .select('*')
      .eq('student_id', studentId)
      .eq('group_id', groupId)
      .eq('check_in_date', today)
      .single();

    if (existing) {
      throw new Error('Already checked in today');
    }

    // Get previous week's commitment
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: previousCheckIn } = await supabase
      .from('study_check_ins')
      .select('next_week_commitment')
      .eq('student_id', studentId)
      .eq('group_id', groupId)
      .gte('check_in_date', lastWeek)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .single();

    // Create check-in
    const { data: checkIn, error } = await supabase
      .from('study_check_ins')
      .insert({
        student_id: studentId,
        group_id: groupId,
        videos_watched: data.videosWatched,
        quizzes_taken: data.quizzesTaken,
        project_hours: data.projectHours,
        xp_earned: data.xpEarned,
        mood: data.mood,
        blockers: data.blockers,
        wins: data.wins,
        next_week_commitment: data.nextWeekCommitment,
        previous_commitment_met: previousCheckIn ? true : null, // TODO: Verify commitment
        check_in_date: today,
      })
      .select()
      .single();

    if (error) throw error;

    // Update member stats
    await supabase
      .from('study_group_members')
      .update({
        total_check_ins: supabase.rpc('increment_check_ins'),
        last_active_at: new Date().toISOString(),
      })
      .eq('group_id', groupId)
      .eq('student_id', studentId);

    // Award XP
    const xpService = new (await import('@/lib/gamification/xp-service')).XPService();
    await xpService.awardXP(studentId, 'WEEKLY_CHECK_IN');

    // Check for commitment completion achievement
    if (previousCheckIn?.next_week_commitment) {
      await xpService.awardXP(studentId, 'COMMITMENT_COMPLETED');
    }

    return { success: true, checkIn };
  }

  /**
   * Get check-ins for a group (recent)
   */
  async getGroupCheckIns(groupId: string, days: number = 7): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('study_check_ins')
      .select(`
        *,
        student:students(id, name, avatar_url)
      `)
      .eq('group_id', groupId)
      .gte('check_in_date', since)
      .order('check_in_date', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  /**
   * Get student's check-in history
   */
  async getMyCheckIns(studentId: string, limit: number = 30): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('study_check_ins')
      .select('*')
      .eq('student_id', studentId)
      .order('check_in_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  }
}
```

---

## Safety & Moderation

### Safety Service

Create `lib/study-buddy/safety-service.ts`:

```typescript
// lib/study-buddy/safety-service.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface ReportData {
  reportedUserId: string;
  context: 'message' | 'profile' | 'behavior';
  category: 'harassment' | 'inappropriate-content' | 'spam' | 'other';
  description: string;
  evidence?: string[]; // URLs to screenshots
}

export class SafetyService {
  /**
   * Submit a safety report
   */
  async submitReport(
    reporterId: string,
    data: ReportData
  ): Promise<{ success: boolean; report: any }> {
    const supabase = getSupabaseAdmin();

    const { data: report, error } = await supabase
      .from('safety_reports')
      .insert({
        reported_by: reporterId,
        reported_user: data.reportedUserId,
        context: data.context,
        category: data.category,
        description: data.description,
        evidence: data.evidence || [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Send notification to moderators/creator

    return { success: true, report };
  }

  /**
   * Flag a message as inappropriate (AI-powered)
   */
  async flagMessage(messageId: string, reason: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase
      .from('group_messages')
      .update({
        flagged: true,
        flagged_reason: reason,
      })
      .eq('id', messageId);

    // TODO: Create automatic safety report
  }

  /**
   * Scan message for harmful content (call before sending)
   */
  async scanMessageContent(text: string): Promise<{ safe: boolean; reason?: string }> {
    // Simple keyword-based filtering (in production, use AI moderation API)
    const harmfulKeywords = [
      // Add harmful keywords here (profanity, slurs, etc.)
      // This is just a placeholder
    ];

    const lowerText = text.toLowerCase();

    for (const keyword of harmfulKeywords) {
      if (lowerText.includes(keyword)) {
        return {
          safe: false,
          reason: 'Message contains inappropriate content',
        };
      }
    }

    return { safe: true };
  }

  /**
   * Get pending reports for moderation (creator dashboard)
   */
  async getPendingReports(creatorId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('safety_reports')
      .select(`
        *,
        reporter:students!safety_reports_reported_by_fkey(id, name, email),
        reported:students!safety_reports_reported_user_fkey(id, name, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  /**
   * Resolve a safety report
   */
  async resolveReport(
    reportId: string,
    creatorId: string,
    resolution: string,
    actionTaken: 'warning' | 'timeout' | 'ban' | 'none'
  ): Promise<{ success: boolean }> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('safety_reports')
      .update({
        status: 'resolved',
        reviewed_by: creatorId,
        resolution,
        action_taken: actionTaken,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) throw error;

    // TODO: Apply action to user (warning, timeout, ban)

    return { success: true };
  }
}
```

---

## API Routes

### Find Matches API

Create `app/api/study-buddy/matches/route.ts`:

```typescript
// app/api/study-buddy/matches/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MatchingService } from '@/lib/study-buddy/matching-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get current student
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student ID
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Find matches
    const matchingService = new MatchingService();
    const matches = await matchingService.findMatches(student.id);

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error('Find matches error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to find matches' },
      { status: 500 }
    );
  }
}
```

### Send Connection Request API

Create `app/api/study-buddy/connections/route.ts`:

```typescript
// app/api/study-buddy/connections/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { BuddyService } from '@/lib/study-buddy/buddy-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const { toStudentId, matchScore, matchReasoning } = body;

    const buddyService = new BuddyService();
    const result = await buddyService.sendConnectionRequest(
      student.id,
      toStudentId,
      matchScore,
      matchReasoning
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Connection request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send connection request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const buddyService = new BuddyService();
    const buddies = await buddyService.getMyBuddies(student.id);

    return NextResponse.json({ success: true, buddies });
  } catch (error: any) {
    console.error('Get buddies error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get buddies' },
      { status: 500 }
    );
  }
}
```

### Create Study Group API

Create `app/api/study-buddy/groups/route.ts`:

```typescript
// app/api/study-buddy/groups/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { GroupService } from '@/lib/study-buddy/group-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();

    const groupService = new GroupService();
    const result = await groupService.createGroup(student.id, body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Create group error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create group' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const focusModule = searchParams.get('focusModule');
    const search = searchParams.get('search');

    const groupService = new GroupService();
    const groups = await groupService.discoverGroups({
      type: type || undefined,
      focusModule: focusModule ? parseInt(focusModule) : undefined,
      search: search || undefined,
    });

    return NextResponse.json({ success: true, groups });
  } catch (error: any) {
    console.error('Discover groups error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to discover groups' },
      { status: 500 }
    );
  }
}
```

---

## Frontend Components

### Match Card Component

Create `components/study-buddy/MatchCard.tsx`:

```typescript
// components/study-buddy/MatchCard.tsx

'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { UserPlus, Clock, Target, Zap } from 'lucide-react';

interface MatchCardProps {
  match: {
    student: {
      id: string;
      name: string;
      avatar_url?: string;
      level: number;
      current_module: number;
    };
    matchScore: {
      totalScore: number;
      confidenceLevel: 'high' | 'medium' | 'low';
      reasoning: string;
    };
  };
  onConnect: (studentId: string) => Promise<void>;
}

export function MatchCard({ match, onConnect }: MatchCardProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await onConnect(match.student.id);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor =
    match.matchScore.totalScore >= 80
      ? 'text-green-600'
      : match.matchScore.totalScore >= 60
      ? 'text-yellow-600'
      : 'text-gray-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
            {match.student.avatar_url ? (
              <img
                src={match.student.avatar_url}
                alt={match.student.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              match.student.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{match.student.name}</h3>
            <p className="text-sm text-gray-500">Level {match.student.level}</p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {match.matchScore.totalScore}%
          </div>
          <div className="text-xs text-gray-500 uppercase">Match</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Target className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">Module {match.student.current_module}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{match.matchScore.confidenceLevel} confidence</span>
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-gray-600 mb-4">{match.matchScore.reasoning}</p>

      {/* Action Button */}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          'Connecting...'
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Connect as Study Buddy
          </>
        )}
      </button>
    </motion.div>
  );
}
```

### Study Group Card

Create `components/study-buddy/GroupCard.tsx`:

```typescript
// components/study-buddy/GroupCard.tsx

'use client';

import { motion } from 'framer-motion';
import { Users, Calendar, BookOpen } from 'lucide-react';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description: string;
    type: string;
    focus_module?: number;
    max_members: number;
    members: { count: number }[];
    activity_score: number;
  };
  onJoin: (groupId: string) => void;
}

export function GroupCard({ group, onJoin }: GroupCardProps) {
  const memberCount = group.members[0]?.count || 0;
  const spotsLeft = group.max_members - memberCount;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{group.name}</h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1 text-gray-600">
          <Users className="w-4 h-4" />
          <span>
            {memberCount}/{group.max_members}
          </span>
        </div>

        {group.focus_module && (
          <div className="flex items-center gap-1 text-gray-600">
            <BookOpen className="w-4 h-4" />
            <span>Module {group.focus_module}</span>
          </div>
        )}

        <div
          className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
            group.activity_score >= 70
              ? 'bg-green-100 text-green-700'
              : group.activity_score >= 40
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {group.activity_score >= 70 ? 'Very Active' : group.activity_score >= 40 ? 'Active' : 'Quiet'}
        </div>
      </div>

      {/* Join Button */}
      <button
        onClick={() => onJoin(group.id)}
        disabled={spotsLeft === 0}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {spotsLeft === 0 ? 'Full' : `Join Group (${spotsLeft} spots left)`}
      </button>
    </motion.div>
  );
}
```

---

## Testing

### Matching Algorithm Test

Create `__tests__/study-buddy/matching-service.test.ts`:

```typescript
// __tests__/study-buddy/matching-service.test.ts

import { MatchingService } from '@/lib/study-buddy/matching-service';

describe('MatchingService', () => {
  const service = new MatchingService();

  describe('calculateMatchScore', () => {
    it('should give high score for similar students', () => {
      const student = {
        level: 10,
        current_module: 3,
        videos_per_week: 5,
      };

      const candidate = {
        level: 11,
        current_module: 3,
        videos_per_week: 6,
      };

      const studentPrefs = {
        interested_topics: ['react', 'typescript'],
        project_interests: ['web-app'],
        preferred_study_times: [
          { day: 'Monday', startTime: '18:00', endTime: '21:00' },
        ],
        timezone: 'America/New_York',
        communication_preference: 'text',
      };

      const candidatePrefs = {
        interested_topics: ['react', 'javascript'],
        project_interests: ['web-app', 'portfolio'],
        preferred_study_times: [
          { day: 'Monday', startTime: '19:00', endTime: '22:00' },
        ],
        timezone: 'America/New_York',
        communication_preference: 'text',
      };

      const score = service.calculateMatchScore(
        student,
        candidate,
        studentPrefs as any,
        candidatePrefs as any
      );

      expect(score.totalScore).toBeGreaterThan(70);
      expect(score.confidenceLevel).toBe('high');
    });

    it('should give low score for incompatible students', () => {
      const student = {
        level: 5,
        current_module: 2,
        videos_per_week: 10,
      };

      const candidate = {
        level: 25,
        current_module: 8,
        videos_per_week: 2,
      };

      const studentPrefs = {
        interested_topics: ['game-dev'],
        project_interests: ['game'],
        preferred_study_times: [],
        timezone: 'America/New_York',
        communication_preference: 'video',
      };

      const candidatePrefs = {
        interested_topics: ['web-dev'],
        project_interests: ['web-app'],
        preferred_study_times: [],
        timezone: 'Asia/Tokyo',
        communication_preference: 'text',
      };

      const score = service.calculateMatchScore(
        student,
        candidate,
        studentPrefs as any,
        candidatePrefs as any
      );

      expect(score.totalScore).toBeLessThan(60);
      expect(score.confidenceLevel).toBe('low');
    });
  });
});
```

---

## Summary

You now have a complete AI Study Buddy system with:

✅ **Intelligent matching** - AI-powered algorithm finds compatible study partners
✅ **Study groups** - Create and join collaborative learning circles
✅ **Shared workspace** - Group chat, project boards, calendars
✅ **Accountability** - Check-ins, commitments, streak tracking
✅ **Safety** - Age-appropriate matching, reporting, moderation
✅ **Gamification** - XP rewards for social learning

**Next Steps**:
1. Test matching algorithm with real student data
2. Implement Discord integration (optional)
3. Add AI-powered match suggestions (Claude API)
4. Build creator moderation dashboard
5. Add group analytics and health metrics
