# Module 9: AI Study Buddy - Overview

## Executive Summary

The AI Study Buddy system uses intelligent matching algorithms to connect students with compatible learning partners, facilitating collaborative learning through study groups, peer support, and shared projects. By leveraging AI to analyze learning styles, goals, and availability, we create meaningful connections that improve retention, motivation, and success rates.

**Status**: Full Implementation Required
**Priority**: P2 (Enhanced feature for engagement)
**Dependencies**: Progress & Gamification (Module 5 - for matching criteria), RAG Chat (Module 1 - for AI suggestions)

## Problem Statement

### Why Study Partners Matter But Are Hard to Find

**Student Pain Points**:
- ❌ Learning alone feels isolating and demotivating
- ❌ Hard to find peers at the same learning level
- ❌ Don't know who shares similar goals/interests
- ❌ Time zone differences make collaboration difficult
- ❌ Fear of judgment prevents reaching out
- ❌ No structured way to find accountability partners

**Creator Pain Points**:
- ❌ Students drop out due to lack of community
- ❌ Hard to facilitate meaningful connections at scale
- ❌ Manual matchmaking takes too much time
- ❌ Students don't engage with each other organically
- ❌ No visibility into who's struggling alone

### Research-Backed Benefits of Peer Learning

**Statistics**:
- Students who study with peers have **15-20% higher retention** rates
- Collaborative learning improves **problem-solving skills by 25%**
- Study groups increase **course completion by 30%**
- Peer accountability improves **consistent practice by 40%**
- Social learning reduces **dropout rates by 50%**

### What We're Building

An intelligent study buddy system that:
- ✅ **AI-powered matching** based on level, goals, timezone, learning style
- ✅ **Instant connection** - find study partners in <30 seconds
- ✅ **Study group formation** - create or join groups of 3-6 students
- ✅ **Shared workspaces** - collaborative project boards
- ✅ **Accountability features** - check-ins, streaks, commitments
- ✅ **Smart suggestions** - "You might want to study with..."
- ✅ **Safety features** - reporting, moderation, age-appropriate groups

## Success Metrics

| Metric | Target | Industry Avg | Impact |
|--------|--------|--------------|--------|
| **Match Quality Score** | >4.2/5.0 | N/A | High satisfaction |
| **Students with Study Partners** | >60% | <20% | 3x improvement |
| **Active Study Groups** | >40% of students | <10% | 4x engagement |
| **Retention (with vs without buddy)** | +30% | baseline | Massive impact |
| **Messages per Week** | >10 per student | 0 | Active collaboration |
| **Group Project Completion** | >70% | <40% | Better outcomes |
| **Time to First Match** | <60 seconds | N/A | Instant connection |

## Core Features

### 1. AI-Powered Peer Matching

**Matching Algorithm Criteria**:

```typescript
interface MatchingCriteria {
  // Learning factors
  currentLevel: number; // 1-50, must be within ±3 levels
  currentModule: number; // Prefer same or adjacent module
  learningPace: 'slow' | 'moderate' | 'fast'; // Videos per week
  weeklyAvailability: number; // Hours per week

  // Goals and interests
  primaryGoal: string; // 'get-job', 'build-portfolio', 'learn-fundamentals'
  interestedTopics: string[]; // ['game-dev', 'web-dev', 'ai']
  projectInterests: string[]; // Types of projects they want to build

  // Logistics
  timezone: string; // 'America/New_York', 'Europe/London'
  preferredStudyTimes: TimeSlot[]; // When they're available
  languagePreferences: string[]; // ['en', 'es']

  // Personality/style
  learningStyle: 'visual' | 'hands-on' | 'theoretical' | 'social';
  communicationPreference: 'text' | 'voice' | 'video' | 'any';
  competitiveness: 1-5; // 1 = casual, 5 = very competitive

  // Safety
  ageGroup: '13-15' | '16-18' | '19-21' | '22+'; // Must match for minors
}
```

**Matching Score Calculation**:

```typescript
interface MatchScore {
  totalScore: number; // 0-100
  breakdown: {
    levelCompatibility: number; // 25 points - most important
    goalAlignment: number; // 20 points
    scheduleOverlap: number; // 20 points
    learningPaceMatch: number; // 15 points
    interestsOverlap: number; // 10 points
    communicationStyleFit: number; // 10 points
  };
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string; // "You're both learning React and available evenings PST"
}
```

**Matching Flow**:

```
Student clicks "Find Study Buddy"
↓
1. Load student profile and preferences
2. Query database for compatible students
   - Filter: same age group (if minor)
   - Filter: level within ±3
   - Filter: timezone overlap >2 hours
   - Filter: currently active (last 7 days)
3. Calculate match score for each candidate
4. Rank by score (require >60 for suggestion)
5. Return top 10 matches
↓
Display matches with:
- Profile photo + name
- Match score (e.g., "92% compatible")
- Shared interests/goals
- Availability overlap
- "Connect" or "Skip" buttons
```

**Smart Match Suggestions**:

The system proactively suggests matches based on:
- **Struggling together**: Both students failed the same quiz → suggest partnering
- **Complementary skills**: One strong in design, other in code → good team
- **Similar pace**: Both completed Module 3 in the same week → aligned
- **Shared projects**: Both want to build a game → natural collaboration
- **Geography**: Both in same city → potential in-person meetups

### 2. Study Group Formation

**Group Types**:

1. **Learning Circles** (3-5 students)
   - Same module, study together weekly
   - Discuss concepts, solve problems
   - Accountability for completing videos/quizzes

2. **Project Teams** (2-4 students)
   - Collaborate on building projects
   - Divide responsibilities
   - Code reviews and feedback

3. **Accountability Pods** (2-3 students)
   - Daily/weekly check-ins
   - Share progress, celebrate wins
   - Keep each other motivated

4. **Skill Workshops** (5-10 students)
   - Topic-specific (e.g., "React Hooks Deep Dive")
   - Time-limited (1-2 weeks)
   - Expert-led or peer-led

**Group Structure**:

```typescript
interface StudyGroup {
  id: string;
  name: string;
  description: string;
  type: 'learning-circle' | 'project-team' | 'accountability-pod' | 'workshop';

  // Members
  members: GroupMember[];
  maxMembers: number; // 3-10 depending on type
  recruitingStatus: 'open' | 'invite-only' | 'closed';

  // Focus
  focusModule?: number; // Which module they're studying
  focusProject?: string; // Project they're building
  focusTopic?: string; // Specific topic (e.g., "State Management")

  // Schedule
  meetingSchedule: MeetingSchedule; // When they meet
  timezone: string;
  startDate: string;
  endDate?: string; // Optional for time-limited groups

  // Activity requirements
  minWeeklyCheckIns: number; // E.g., 3 check-ins per week
  minWeeklyMessages: number; // E.g., 5 messages per week

  // Resources
  sharedResources: Resource[];
  sharedProjects: SharedProject[];

  // Status
  createdBy: string; // Student who created the group
  createdAt: string;
  lastActivityAt: string;
  activityScore: number; // 0-100, health metric
}

interface GroupMember {
  studentId: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string;
  lastActiveAt: string;
  contributionScore: number; // Based on messages, check-ins, etc.
}
```

**Group Creation Flow**:

```
Student clicks "Create Study Group"
↓
1. Choose group type
   └─→ Shows template for each type with defaults

2. Set details
   ├─→ Name: "React Mastery Circle"
   ├─→ Description: "We're learning React together, Module 4-6"
   ├─→ Max members: 5
   ├─→ Focus: Module 4
   └─→ Meeting schedule: "Every Wednesday 7pm EST"

3. Set requirements (optional)
   ├─→ Min level: 10
   ├─→ Max level: 20
   ├─→ Required topics: ['React', 'JavaScript']
   └─→ Time commitment: "5 hours/week"

4. Invite members (optional)
   ├─→ Search and invite specific students
   └─→ Or make recruiting public

5. Create group
   ├─→ Store in database
   ├─→ Create Discord channel (if integrated)
   ├─→ Create shared workspace
   └─→ Send invitations
↓
Group is live and discoverable
```

**Group Discovery**:

Students can find groups through:
- **Browse all recruiting groups** - filterable by type, module, level
- **Suggested for you** - AI matches groups to student profile
- **Friends' groups** - see what groups connections are in
- **Creator's groups** - official study groups hosted by creator
- **Search** - by keyword, topic, project type

### 3. Shared Workspace

**Collaborative Features**:

1. **Group Chat**
   - Text messaging (Discord or in-app)
   - Code snippet sharing with syntax highlighting
   - Screen sharing links (Loom, etc.)
   - File attachments (max 10MB)
   - Reactions and threading

2. **Shared Project Board**
   ```typescript
   interface SharedProject {
     id: string;
     groupId: string;
     name: string;
     description: string;

     // GitHub integration
     githubRepo?: string;
     branches: { member: string; branch: string }[];

     // Task management
     tasks: ProjectTask[];

     // Status
     status: 'planning' | 'in-progress' | 'review' | 'completed';
     progress: number; // 0-100%

     // Resources
     references: Resource[]; // Helpful links, videos
     codeSnippets: CodeSnippet[];
   }

   interface ProjectTask {
     id: string;
     title: string;
     description: string;
     assignedTo?: string; // Student ID
     status: 'todo' | 'in-progress' | 'blocked' | 'done';
     dueDate?: string;
     priority: 'low' | 'medium' | 'high';
   }
   ```

3. **Shared Calendar**
   - Group study sessions
   - Project deadlines
   - Milestone celebrations
   - Timezone-aware display

4. **Resource Library**
   - Links to helpful videos/articles
   - Code templates and snippets
   - Notes from study sessions
   - Quiz study guides

5. **Check-In System**
   ```typescript
   interface CheckIn {
     studentId: string;
     groupId: string;
     timestamp: string;

     // Progress
     videosWatchedThisWeek: number;
     quizzesTakenThisWeek: number;
     projectHoursThisWeek: number;

     // Mood/status
     mood: 'struggling' | 'ok' | 'confident' | 'crushing-it';
     blockers?: string; // What they're stuck on
     wins?: string; // What went well

     // Commitments
     nextWeekCommitment: string; // "Complete Module 5 videos"
   }
   ```

### 4. Accountability Features

**Mutual Accountability**:

1. **Study Streaks (Partner Synced)**
   - Both students must check in to maintain streak
   - "7-day streak with @Sarah"
   - Streak broken if either person misses

2. **Goal Commitments**
   ```typescript
   interface PeerCommitment {
     id: string;
     studentId: string;
     partnerId: string;

     goal: string; // "Complete Module 4 by Friday"
     dueDate: string;
     stakes?: string; // "Loser buys coffee"

     status: 'active' | 'completed' | 'failed';
     completedAt?: string;

     // Verification
     requiresPartnerVerification: boolean;
     verifiedBy?: string;
   }
   ```

3. **Weekly Progress Sharing**
   - Auto-generated summary: "This week I completed 5 videos, 2 quizzes, gained 500 XP"
   - Share with study group or buddy
   - Celebrate wins together

4. **Challenge Mode**
   - Friendly competition: "Who can complete more videos this week?"
   - Leaderboard within study group
   - Rewards for both winner and participants

5. **Buddy Reminders**
   - "@John hasn't checked in today, send them a message?"
   - "Your study session with @Sarah is in 30 minutes"
   - "@Mike needs help with React Hooks"

### 5. Safety and Moderation

**Safety Features**:

1. **Age-Appropriate Matching**
   - Minors (13-17) only matched with same age group
   - Adults (18+) separate pool
   - No cross-age-group messaging for minors

2. **Reporting System**
   ```typescript
   interface SafetyReport {
     reportedBy: string;
     reportedUser: string;
     context: 'message' | 'profile' | 'behavior';
     category: 'harassment' | 'inappropriate-content' | 'spam' | 'other';
     description: string;
     evidence?: string[]; // Screenshot URLs
     timestamp: string;
   }
   ```

3. **Content Moderation**
   - AI-powered message scanning for inappropriate content
   - Automatic flagging of suspicious patterns
   - Creator dashboard for reviewing reports

4. **Parent Controls** (for users under 18)
   - Parent can view groups child is in
   - Receive notifications of new connections
   - Ability to block specific users
   - Weekly activity summary emails

5. **Code of Conduct**
   - All students agree to community guidelines
   - Violations → warnings → temporary ban → permanent ban
   - Zero tolerance for harassment, hate speech, bullying

**Moderation Workflow**:

```
Report submitted
↓
1. Auto-flag if contains known harmful keywords
2. Queue for creator review
3. Creator investigates:
   ├─→ Review chat logs
   ├─→ Check user history
   └─→ Assess severity
4. Take action:
   ├─→ Warning (first offense, minor)
   ├─→ 24-hour timeout (repeated minor)
   ├─→ 7-day ban (serious violation)
   └─→ Permanent ban (severe/repeated)
5. Notify both parties
6. Update safety logs
```

### 6. AI-Powered Suggestions

**Smart Recommendations**:

1. **"You Might Want to Study With..."**
   - Daily AI-curated match suggestions
   - Based on recent activity, current module, goals
   - "Sarah just completed Module 5 too! She's available evenings PST."

2. **"Join These Groups"**
   - Groups that match student's level and interests
   - Groups with high activity scores (healthy groups)
   - Groups with open spots and recruiting

3. **"Help These Students"**
   - Students struggling with topics you've mastered
   - Peer teaching = deeper learning
   - Earn "Helper" achievement + bonus XP

4. **"Study Session Recommendations"**
   - Optimal study times based on both calendars
   - Topics to focus on based on quiz performance
   - Collaborative projects to start

**AI Prompt Example**:

```typescript
const matchSuggestionPrompt = `
Analyze these two student profiles and determine compatibility:

Student A:
- Level 15, Module 4 (React fundamentals)
- Available: Mon/Wed/Fri 6-9pm EST
- Goals: Build portfolio, get job
- Struggles with: State management
- Strengths: CSS, design

Student B:
- Level 14, Module 4 (React fundamentals)
- Available: Mon/Thu 7-10pm EST
- Goals: Freelance work, side projects
- Struggles with: CSS, styling
- Strengths: JavaScript, logic

Should we suggest they study together? Rate compatibility 0-100 and explain:
1. Schedule overlap
2. Complementary skills
3. Shared goals
4. Learning synergy
`;
```

### 7. Gamification Integration

**XP Rewards for Social Learning**:

```typescript
const SOCIAL_XP = {
  // Matching
  FIRST_STUDY_BUDDY: 150,
  JOINED_STUDY_GROUP: 200,
  CREATED_STUDY_GROUP: 300,

  // Engagement
  WEEKLY_CHECK_IN: 50,
  HELPED_PEER: 100, // Answered their question
  STUDY_SESSION_COMPLETED: 75, // Video call/session

  // Group activities
  GROUP_PROJECT_MILESTONE: 250,
  GROUP_PROJECT_COMPLETED: 500,

  // Accountability
  SEVEN_DAY_BUDDY_STREAK: 200,
  THIRTY_DAY_BUDDY_STREAK: 1000,
  COMMITMENT_COMPLETED: 150,

  // Teaching
  PEER_REVIEW_PROJECT: 100,
  TAUGHT_CONCEPT: 200, // Verified by peer
  MENTORED_NEWBIE: 300, // Helped Level 1-5 student
};
```

**Social Achievements**:

- 🤝 **First Friend** - Connect with your first study buddy (150 XP)
- 👥 **Group Learner** - Join your first study group (200 XP)
- 🎯 **Accountable** - Complete 10 buddy commitments (500 XP)
- 🔥 **Study Streak Master** - 30-day buddy streak (1000 XP, Legendary!)
- 👨‍🏫 **Peer Teacher** - Help 20 students (750 XP)
- 🏆 **Community Champion** - 100 peer interactions (1500 XP, Legendary!)
- 💪 **Team Player** - Complete 5 group projects (1000 XP)

**Group Achievements** (awarded to all members):

- 🚀 **First Project** - Complete first group project (250 XP each)
- ⭐ **Active Group** - 30 days of daily group activity (500 XP each)
- 🏅 **Group Excellence** - All members pass module quiz (300 XP each)

## Technical Implementation

### Database Schema

**Study Buddies Table**:

```sql
CREATE TABLE study_buddy_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_a_id UUID REFERENCES students(id),
  student_b_id UUID REFERENCES students(id),

  -- Match quality
  match_score INTEGER NOT NULL, -- 0-100
  match_reasoning TEXT,

  -- Status
  status VARCHAR(20) NOT NULL, -- 'pending', 'accepted', 'active', 'paused', 'ended'
  initiated_by UUID NOT NULL, -- Which student sent request

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

  CONSTRAINT unique_study_buddies UNIQUE (student_a_id, student_b_id),
  CONSTRAINT no_self_buddy CHECK (student_a_id != student_b_id)
);

CREATE INDEX idx_buddy_connections_student ON study_buddy_connections(student_a_id, status);
CREATE INDEX idx_buddy_connections_active ON study_buddy_connections(status, last_interaction_at)
  WHERE status = 'active';
```

**Study Groups Table**:

```sql
CREATE TABLE study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL, -- 'learning-circle', 'project-team', etc.

  -- Focus
  focus_module INTEGER,
  focus_project VARCHAR(255),
  focus_topic VARCHAR(100),

  -- Configuration
  max_members INTEGER NOT NULL DEFAULT 5,
  recruiting_status VARCHAR(20) DEFAULT 'open', -- 'open', 'invite-only', 'closed'
  min_level INTEGER,
  max_level INTEGER,
  required_topics JSONB, -- Array of topic strings

  -- Schedule
  timezone VARCHAR(50),
  meeting_schedule JSONB, -- { day: 'Wednesday', time: '19:00', recurrence: 'weekly' }
  start_date DATE,
  end_date DATE,

  -- Activity requirements
  min_weekly_check_ins INTEGER DEFAULT 0,
  min_weekly_messages INTEGER DEFAULT 0,

  -- Status
  created_by UUID REFERENCES students(id),
  activity_score INTEGER DEFAULT 100, -- 0-100, health metric
  total_messages INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE study_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),

  role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'creator', 'admin', 'member'

  -- Activity
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0,
  total_check_ins INTEGER DEFAULT 0,
  contribution_score INTEGER DEFAULT 0, -- 0-100

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'left', 'removed'
  left_at TIMESTAMP,

  CONSTRAINT unique_group_member UNIQUE (group_id, student_id)
);

CREATE INDEX idx_group_members_student ON study_group_members(student_id, status);
CREATE INDEX idx_group_members_group ON study_group_members(group_id, status);
```

**Check-Ins Table**:

```sql
CREATE TABLE study_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  group_id UUID REFERENCES study_groups(id),
  buddy_id UUID, -- If this is a buddy check-in

  -- Progress
  videos_watched INTEGER DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  project_hours DECIMAL(4,1) DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,

  -- Mood
  mood VARCHAR(20), -- 'struggling', 'ok', 'confident', 'crushing-it'
  blockers TEXT,
  wins TEXT,

  -- Commitments
  next_week_commitment TEXT,
  previous_commitment_met BOOLEAN,

  -- Metadata
  check_in_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_check_ins_student ON study_check_ins(student_id, check_in_date DESC);
CREATE INDEX idx_check_ins_group ON study_check_ins(group_id, check_in_date DESC);
```

**Shared Projects Table**:

```sql
CREATE TABLE shared_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES study_groups(id),

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- GitHub
  github_repo VARCHAR(255),
  branches JSONB, -- [{ member: 'uuid', branch: 'feature/login' }]

  -- Tasks
  tasks JSONB, -- Array of ProjectTask objects

  -- Status
  status VARCHAR(20) DEFAULT 'planning', -- 'planning', 'in-progress', 'review', 'completed'
  progress INTEGER DEFAULT 0, -- 0-100%

  -- Resources
  references JSONB, -- Array of Resource objects
  code_snippets JSONB, -- Array of CodeSnippet objects

  -- Metadata
  created_by UUID REFERENCES students(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

**Matching Preferences Table**:

```sql
CREATE TABLE matching_preferences (
  student_id UUID PRIMARY KEY REFERENCES students(id),

  -- Availability
  weekly_availability_hours INTEGER, -- Hours per week
  timezone VARCHAR(50),
  preferred_study_times JSONB, -- Array of TimeSlot objects

  -- Goals
  primary_goal VARCHAR(50),
  interested_topics JSONB, -- Array of strings
  project_interests JSONB, -- Array of strings

  -- Style
  learning_style VARCHAR(30),
  communication_preference VARCHAR(20), -- 'text', 'voice', 'video', 'any'
  competitiveness INTEGER, -- 1-5

  -- Preferences
  open_to_matching BOOLEAN DEFAULT TRUE,
  preferred_group_size INTEGER DEFAULT 4, -- Ideal group size
  language_preferences JSONB, -- ['en', 'es']

  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Matching Algorithm

**Similarity Score Calculation**:

```typescript
export class MatchingService {
  calculateMatchScore(
    student: Student,
    candidate: Student,
    studentPrefs: MatchingPreferences,
    candidatePrefs: MatchingPreferences
  ): MatchScore {
    let totalScore = 0;
    const breakdown: any = {};

    // 1. Level Compatibility (25 points)
    const levelDiff = Math.abs(student.level - candidate.level);
    breakdown.levelCompatibility = Math.max(0, 25 - (levelDiff * 5));
    totalScore += breakdown.levelCompatibility;

    // 2. Goal Alignment (20 points)
    const sharedGoals = this.countSharedItems(
      studentPrefs.interested_topics,
      candidatePrefs.interested_topics
    );
    breakdown.goalAlignment = Math.min(20, sharedGoals * 5);
    totalScore += breakdown.goalAlignment;

    // 3. Schedule Overlap (20 points)
    const overlapHours = this.calculateScheduleOverlap(
      studentPrefs.preferred_study_times,
      candidatePrefs.preferred_study_times,
      studentPrefs.timezone,
      candidatePrefs.timezone
    );
    breakdown.scheduleOverlap = Math.min(20, overlapHours * 4);
    totalScore += breakdown.scheduleOverlap;

    // 4. Learning Pace Match (15 points)
    const paceDiff = Math.abs(
      student.videos_per_week - candidate.videos_per_week
    );
    breakdown.learningPaceMatch = Math.max(0, 15 - (paceDiff * 3));
    totalScore += breakdown.learningPaceMatch;

    // 5. Interests Overlap (10 points)
    const sharedInterests = this.countSharedItems(
      studentPrefs.project_interests,
      candidatePrefs.project_interests
    );
    breakdown.interestsOverlap = Math.min(10, sharedInterests * 3);
    totalScore += breakdown.interestsOverlap;

    // 6. Communication Style Fit (10 points)
    const commMatch = this.checkCommunicationMatch(
      studentPrefs.communication_preference,
      candidatePrefs.communication_preference
    );
    breakdown.communicationStyleFit = commMatch ? 10 : 5;
    totalScore += breakdown.communicationStyleFit;

    // Generate reasoning
    const reasoning = this.generateMatchReasoning(
      student,
      candidate,
      breakdown
    );

    return {
      totalScore,
      breakdown,
      confidenceLevel: totalScore >= 80 ? 'high' : totalScore >= 60 ? 'medium' : 'low',
      reasoning,
    };
  }
}
```

## Cost Estimate

| Component | Usage | Cost/Month |
|-----------|-------|------------|
| **Claude API** (match suggestions) | 1000 matches × 1K tokens | $8 |
| **Database Storage** | Included in Supabase | $0 |
| **Real-time messaging** | Supabase Realtime | $0 (free tier) |
| **Discord channels** (if integrated) | n8n workflow | $0 |
| **Total** | | **~$8/month** |

**Per Creator**: $0.08/month (at 100 creators)

## Next Steps

1. Read `IMPLEMENTATION.md` - Step-by-step build guide
2. Review `MATCHING_ALGORITHM.md` - Deep dive into match scoring
3. Check `GROUP_DYNAMICS.md` - Group health metrics and interventions
4. See `SAFETY_MODERATION.md` - Content moderation and reporting flows

---

**This is the COMMUNITY module - learn together, succeed together!** 🤝
