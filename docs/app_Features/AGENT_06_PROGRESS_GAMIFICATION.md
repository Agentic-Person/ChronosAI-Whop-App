# Progress & Gamification System Documentation

## Overview

The Progress & Gamification System transforms passive learning into an engaging, game-like experience through XP, levels, achievements, streaks, and stunning visual celebrations. This system is a **PRO tier feature**.

## Table of Contents

- [XP System](#xp-system)
- [Leveling System](#leveling-system)
- [Achievements](#achievements)
- [Streaks](#streaks)
- [Leaderboards](#leaderboards)
- [Celebration Animations](#celebration-animations)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Integration Guide](#integration-guide)

## XP System

### XP Values

Students earn XP for various actions:

| Action | Base XP | Bonuses |
|--------|---------|---------|
| Video Completion | 50 XP | +25 XP first time, +2 XP per minute watched |
| Quiz Pass | 100 XP | +30 XP first attempt, +50 XP perfect score |
| Project Submission | 200 XP | +40 XP early submission, +25 XP peer review |
| Daily Streak | 10 XP | +50 XP week milestone, +200 XP month milestone |
| Help Peer | 20 XP | - |

### Calculating XP

Use the gamification engine functions:

```typescript
import {
  calculateVideoXP,
  calculateQuizXP,
  calculateProjectXP,
  calculateStreakXP,
} from '@/lib/progress/gamification-engine';

// Video completion
const videoXP = calculateVideoXP({
  isFirstTime: true,
  watchTimeMinutes: 25,
  completionPercentage: 100,
});
// Returns: { amount: 125, reason: "Completed video (first time!)", source: 'video' }

// Quiz pass
const quizXP = calculateQuizXP({
  score: 100,
  passingScore: 70,
  isFirstAttempt: true,
  isPerfectScore: true,
});
// Returns: { amount: 180, reason: "Perfect score on quiz (first try!)", source: 'quiz' }
```

### Awarding XP

Award XP via the API:

```typescript
const response = await fetch('/api/progress/xp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'video_complete',
    metadata: {
      isFirstTime: true,
      watchTimeMinutes: 25,
      completionPercentage: 100,
    },
  }),
});

const result = await response.json();
// {
//   success: true,
//   xp_awarded: 125,
//   new_total_xp: 1250,
//   level_up: true,
//   old_level: 4,
//   new_level: 5,
//   achievements_unlocked: [...],
//   celebration_type: 'levelup'
// }
```

## Leveling System

### Level Formula

Levels follow an exponential growth curve:

```
Level = floor(1 + log(total_xp / 100) / log(1.5))
```

Or inversely:

```
XP Required for Level N = 100 * (1.5 ^ (N - 1))
```

### Level Thresholds

| Level | Total XP Required | XP for This Level |
|-------|-------------------|-------------------|
| 1 | 0 | 0 |
| 2 | 100 | 100 |
| 3 | 250 | 150 |
| 4 | 475 | 225 |
| 5 | 813 | 338 |
| 10 | 5,699 | 1,708 |
| 25 | 381,469 | 114,441 |

### Level Info

Get comprehensive level information:

```typescript
import { getLevelInfo } from '@/lib/progress/gamification-engine';

const levelInfo = getLevelInfo(1250);
// {
//   level: 5,
//   currentXP: 437,
//   xpForNextLevel: 506,
//   xpForCurrentLevel: 338,
//   progress: 86.4,
//   totalXP: 1250
// }
```

### Level Up Detection

Check if XP gain causes level up:

```typescript
import { checkLevelUp } from '@/lib/progress/gamification-engine';

const levelUpInfo = checkLevelUp(800, 200);
// {
//   leveledUp: true,
//   oldLevel: 4,
//   newLevel: 5,
//   levelsGained: 1
// }
```

## Achievements

### Achievement System

17 achievements across 5 categories:

**Video Achievements**
- **First Steps** (Common) - Complete first video (50 XP)
- **Marathon Learner** (Rare) - Watch 10 hours (500 XP)
- **Course Conqueror** (Epic) - Complete 50 videos (1000 XP)

**Quiz Achievements**
- **Quiz Master** (Common) - Pass with 90%+ (100 XP)
- **Perfect Score** (Rare) - Get 100% (300 XP)
- **Quiz Champion** (Epic) - Pass 20 quizzes (750 XP)

**Project Achievements**
- **First Build** (Common) - Submit first project (250 XP)
- **Code Reviewer** (Rare) - Review 5 peers (300 XP)
- **Project Pro** (Legendary) - Complete 10 projects (1500 XP)

**Streak Achievements**
- **Learning Streak** (Rare) - 7-day streak (200 XP)
- **Dedication** (Epic) - 30-day streak (1000 XP)
- **Unstoppable** (Legendary) - 100-day streak (5000 XP)

**Social Achievements**
- **Helping Hand** (Rare) - Answer 5 questions (300 XP)
- **Social Butterfly** (Common) - Join 3 study groups (150 XP)

**Special Achievements**
- **Early Bird** (Rare) - Study before 8 AM (100 XP)
- **Night Owl** (Rare) - Study after 10 PM (100 XP)
- **Course Crusher** (Legendary) - Complete entire course (2500 XP)

### Achievement Unlocking

Achievements are automatically checked when students earn XP:

```typescript
import { checkUnlockedAchievements } from '@/lib/progress/achievement-system';

const newAchievements = await checkUnlockedAchievements(studentId);
// Returns array of newly unlocked achievements
```

### Achievement Progress

Track progress towards locked achievements:

```typescript
import { getAchievementProgress } from '@/lib/progress/achievement-system';

const progress = await getAchievementProgress(studentId);
// [
//   {
//     achievement_id: 'marathon-learner',
//     current: 6,
//     required: 10,
//     percentage: 60,
//     achievement: { ... }
//   }
// ]
```

## Streaks

### Streak Tracking

Streaks track consecutive days of activity:

```typescript
interface StreakInfo {
  current: number;        // Current streak (days)
  longest: number;        // Longest streak ever
  lastActive: Date;       // Last activity date
  isActive: boolean;      // Is streak still active?
  multiplier: number;     // XP multiplier (1.0 - 2.0)
}
```

### Streak Rules

- Streak continues if student is active within 24 hours
- Streak breaks after 24 hours of inactivity
- Streaks reset to 1, not 0
- Longest streak is never decreased

### Streak Multipliers

Streaks provide XP multipliers up to 2x:

```
Multiplier = min(1 + (current_streak / 60), 2.0)
```

| Streak Days | Multiplier |
|-------------|------------|
| 0 | 1.0x |
| 15 | 1.25x |
| 30 | 1.5x |
| 60+ | 2.0x |

## Leaderboards

### Global Leaderboard

Ranks all students by total XP:

```typescript
const response = await fetch('/api/progress/leaderboard?scope=global&limit=100');
const data = await response.json();
// {
//   scope: 'global',
//   total_entries: 100,
//   leaderboard: [
//     {
//       rank: 1,
//       student_id: '...',
//       name: 'John Doe',
//       total_xp: 15000,
//       current_level: 12,
//       current_streak: 45,
//       is_current_user: false
//     },
//     ...
//   ],
//   current_user: {
//     rank: 23,
//     in_top_results: true
//   }
// }
```

### Course Leaderboard

Ranks students within the same course:

```typescript
const response = await fetch('/api/progress/leaderboard?scope=course&limit=50');
```

## Celebration Animations

### Animation Types

6 celebration animations trigger on different actions:

| Animation | Trigger | Duration | Component |
|-----------|---------|----------|-----------|
| Stars Explosion | Video complete | 3s | `<StarsExplosion />` |
| Trophy | Quiz pass | 2s | `<TrophyAnimation />` |
| Rocket Launch | Project submit | 2.5s | `<RocketLaunch />` |
| Fireworks | Weekly streak | 3s | `<FireworksDisplay />` |
| Level Up Modal | Level up | 2s | `<LevelUpModal />` |
| Confetti | General wins | 3s | `<ConfettiCelebration />` |

### Usage Example

```typescript
import { StarsExplosion } from '@/components/progress/animations/StarsExplosion';

function VideoComplete() {
  const [showCelebration, setShowCelebration] = useState(false);

  const handleComplete = async () => {
    const result = await awardXP('video_complete', metadata);

    if (result.celebration_type === 'stars') {
      setShowCelebration(true);
    }
  };

  return (
    <>
      {/* Your content */}
      {showCelebration && (
        <StarsExplosion
          particleCount={50}
          colors={['#FFD700', '#FFA500']}
          duration={3000}
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </>
  );
}
```

### Accessibility

All animations respect `prefers-reduced-motion`:

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  // Skip or simplify animation
}
```

## API Reference

### POST /api/progress/xp

Award XP to student.

**Request:**
```json
{
  "action": "video_complete",
  "metadata": {
    "isFirstTime": true,
    "watchTimeMinutes": 25,
    "completionPercentage": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "xp_awarded": 125,
  "new_total_xp": 1250,
  "level_up": true,
  "old_level": 4,
  "new_level": 5,
  "levels_gained": 1,
  "achievements_unlocked": [],
  "celebration_type": "levelup"
}
```

### GET /api/progress

Get comprehensive progress data for current user.

**Response:**
```json
{
  "current_level": 5,
  "total_xp": 1250,
  "current_xp": 437,
  "xp_for_next_level": 506,
  "level_progress": 86.4,
  "current_streak": 7,
  "longest_streak": 15,
  "last_active_date": "2025-10-21",
  "achievements_unlocked": 5,
  "total_achievements": 17,
  "achievements": [...],
  "course_completion": 45,
  "videos_completed": 23,
  "total_videos": 50
}
```

### GET /api/progress/leaderboard

Get leaderboard rankings.

**Query Parameters:**
- `scope`: `'global'` | `'course'` (default: `'global'`)
- `limit`: number (default: 100, max: 500)

**Response:**
```json
{
  "scope": "global",
  "total_entries": 100,
  "leaderboard": [...],
  "current_user": {
    "rank": 23,
    "in_top_results": true
  }
}
```

## Database Schema

### Tables

**xp_transactions** - XP transaction log
```sql
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  action TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**streak_history** - Daily activity tracking
```sql
CREATE TABLE streak_history (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  date DATE NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  activities_completed INTEGER DEFAULT 0,
  UNIQUE(student_id, date)
);
```

**leaderboard** - Materialized view for rankings
```sql
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
  student_id,
  total_xp,
  current_level,
  RANK() OVER (ORDER BY total_xp DESC) as global_rank
FROM students
WHERE total_xp > 0;
```

### Database Functions

**award_xp** - Award XP and update level
```sql
SELECT award_xp(
  p_student_id := '...',
  p_xp_amount := 100,
  p_action := 'video_complete',
  p_metadata := '{}'::jsonb
);
```

**update_streak** - Update daily streak
```sql
SELECT update_streak(
  p_student_id := '...',
  p_xp_earned := 50,
  p_activities_completed := 1
);
```

**refresh_leaderboard** - Refresh leaderboard view
```sql
SELECT refresh_leaderboard();
```

## Integration Guide

### Adding XP to New Actions

1. Define XP value in `lib/utils/constants.ts`:
```typescript
export const XP_REWARDS = {
  NEW_ACTION: 75,
};
```

2. Create calculation function in `lib/progress/gamification-engine.ts`:
```typescript
export function calculateNewActionXP(params: {...}): XPGain {
  return {
    amount: XP_REWARDS.NEW_ACTION,
    reason: 'Completed new action',
    source: 'bonus',
  };
}
```

3. Add action to API route in `app/api/progress/xp/route.ts`:
```typescript
case 'new_action':
  xpGain = calculateNewActionXP(metadata);
  break;
```

4. Call API when action occurs:
```typescript
await fetch('/api/progress/xp', {
  method: 'POST',
  body: JSON.stringify({
    action: 'new_action',
    metadata: { ... },
  }),
});
```

### Adding New Achievements

1. Add to `lib/progress/achievement-system.ts`:
```typescript
{
  id: 'new-achievement',
  name: 'New Achievement',
  description: 'Unlock this by doing something',
  category: AchievementCategory.SPECIAL,
  rarity: AchievementRarity.RARE,
  icon: 'Star',
  xp_reward: 200,
  unlock_criteria: {
    type: 'count',
    threshold: 10,
    metric: 'action_count',
  },
}
```

2. Add check logic in `checkAchievementCriteria`:
```typescript
case 'count':
  return (stats[metric] || 0) >= threshold;
```

3. Achievement automatically checks on XP award.

## Performance Optimization

### Caching

Leaderboard is materialized and refreshed daily:

```sql
-- Refresh leaderboard (run via cron)
SELECT refresh_leaderboard();
```

### Indexing

Critical indexes for fast queries:

```sql
CREATE INDEX idx_students_total_xp ON students(total_xp DESC);
CREATE INDEX idx_xp_transactions_student ON xp_transactions(student_id, created_at DESC);
CREATE INDEX idx_streak_history_student_date ON streak_history(student_id, date DESC);
```

### Animation Performance

- Use GPU-accelerated properties (`transform`, `opacity`)
- Limit particle counts (<100)
- Respect `prefers-reduced-motion`
- Clean up on unmount

## Testing

Run tests:

```bash
npm test lib/progress/__tests__/gamification-engine.test.ts
npm test lib/progress/__tests__/achievement-system.test.ts
```

Coverage targets:
- Gamification engine: >90%
- Achievement system: >85%

## Troubleshooting

### XP Not Awarded

Check:
1. User is authenticated
2. Feature gate allows PRO tier
3. Student record exists
4. XP amount > 0
5. Database function succeeds

### Achievements Not Unlocking

Check:
1. Student stats are up to date
2. Criteria threshold is met
3. Achievement not already unlocked
4. Database trigger fired

### Leaderboard Outdated

Refresh manually:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
```

## Future Enhancements

- [ ] Custom achievement creation by creators
- [ ] Seasonal/limited-time achievements
- [ ] XP decay for inactive users
- [ ] Team-based leaderboards
- [ ] Achievement sharing to Discord
- [ ] Sound effects for celebrations
- [ ] Customizable celebration preferences

---

**Built with**: Next.js, TypeScript, Supabase, Framer Motion, Recharts
**PRO Tier Feature** - Requires `Feature.FEATURE_GAMIFICATION`
