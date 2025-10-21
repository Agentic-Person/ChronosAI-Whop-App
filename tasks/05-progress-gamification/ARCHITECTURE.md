# Module 5: Progress & Gamification - Architecture

## System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Actions Layer                     │
│  (Video completion, Quiz pass, Project submit, etc.)    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              XP & Achievement Engine                     │
│  - Calculate XP rewards                                  │
│  - Check achievement criteria                            │
│  - Trigger level-up logic                               │
│  - Update student record                                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├──────┐
                 │      │
                 ▼      ▼
        ┌─────────┐  ┌──────────────┐
        │Database │  │  Cache Layer │
        │ Updates │  │  (Redis/KV)  │
        └─────────┘  └──────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│            Celebration Animation System                  │
│  - Queue celebration events                              │
│  - Trigger UI animations                                │
│  - Show XP/level/achievement notifications              │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. XP Calculation Engine

**Responsibility**: Calculate XP rewards for any action

```typescript
// lib/progress/xp-calculator.ts

export class XPCalculator {
  /**
   * Calculate XP for an action
   */
  calculateXP(
    action: XPAction,
    context?: XPContext
  ): number {
    const baseXP = XP_REWARDS[action];

    // Apply multipliers
    let multiplier = 1.0;

    // Streak bonus
    if (context?.streakDays) {
      multiplier += this.getStreakMultiplier(context.streakDays);
    }

    // Perfect score bonus
    if (context?.score === 100) {
      multiplier += 0.5; // 50% bonus
    }

    // First try bonus
    if (context?.attemptNumber === 1) {
      multiplier += 0.25; // 25% bonus
    }

    return Math.round(baseXP * multiplier);
  }

  private getStreakMultiplier(days: number): number {
    if (days >= 30) return 0.5; // 50% bonus for 30+ day streak
    if (days >= 14) return 0.3; // 30% bonus for 14+ day streak
    if (days >= 7) return 0.15; // 15% bonus for 7+ day streak
    return 0;
  }
}
```

### 2. Level System Architecture

**Exponential Progression Formula**:

```typescript
// Calculate XP needed for a level
function xpForLevel(level: number): number {
  const baseXP = 100;
  const multiplier = 1.5;
  return Math.floor(baseXP * Math.pow(multiplier, level - 1));
}

// Examples:
// Level 1 → 2: 100 XP
// Level 2 → 3: 150 XP
// Level 3 → 4: 225 XP
// Level 4 → 5: 338 XP
// Level 5 → 6: 507 XP
// ...
// Level 25: ~38,000 total XP accumulated
```

**Level-Up Flow**:

```
Student earns XP
↓
Update student.xp_points (+XP)
↓
Check if xp_points >= xpForLevel(current_level + 1)
↓
If yes:
  ├─ Increment student.level
  ├─ Calculate overflow XP
  ├─ Trigger level-up celebration
  ├─ Check for level-based achievements
  └─ Send notification
↓
Return updated student
```

### 3. Achievement System Architecture

**Achievement Data Model**:

```typescript
interface Achievement {
  id: string;
  slug: string; // Unique identifier
  name: string;
  description: string;
  icon_url: string;
  animation_type: 'stars' | 'confetti' | 'fireworks' | 'trophy' | 'rocket';
  xp_value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';

  // Criteria for unlocking
  criteria: {
    type: 'video_completed' | 'quiz_passed' | 'project_completed' | 'streak_days' | 'xp_earned';
    count?: number; // E.g., complete 10 videos
    condition?: string; // E.g., "score >= 90"
  };

  // Metadata
  category: 'learning' | 'engagement' | 'mastery' | 'social';
  order: number; // Display order
}
```

**Achievement Checking Engine**:

```typescript
// lib/progress/achievement-checker.ts

export class AchievementChecker {
  /**
   * Check if student unlocked any achievements after an action
   */
  async checkAchievements(
    studentId: string,
    action: AchievementTrigger
  ): Promise<Achievement[]> {
    // 1. Get student progress
    const student = await this.getStudent(studentId);

    // 2. Get all achievements not yet unlocked by student
    const unlockedIds = student.achievements.map(a => a.id);
    const availableAchievements = await this.getAchievements({
      not_in: unlockedIds,
    });

    // 3. Check which criteria are now met
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of availableAchievements) {
      if (await this.meetsReq(student, achievement.criteria, action)) {
        newlyUnlocked.push(achievement);
      }
    }

    // 4. Store unlocked achievements
    if (newlyUnlocked.length > 0) {
      await this.unlockAchievements(studentId, newlyUnlocked);
    }

    return newlyUnlocked;
  }

  /**
   * Check if criteria is met
   */
  private async meetsCriteria(
    student: Student,
    criteria: AchievementCriteria,
    action: AchievementTrigger
  ): Promise<boolean> {
    switch (criteria.type) {
      case 'video_completed':
        const videoCount = await this.getCompletedVideoCount(student.id);
        return videoCount >= (criteria.count || 1);

      case 'quiz_passed':
        const quizCount = await this.getPassedQuizCount(student.id);
        return quizCount >= (criteria.count || 1);

      case 'streak_days':
        return student.streak_days >= (criteria.count || 1);

      case 'xp_earned':
        return student.xp_points >= (criteria.count || 1000);

      case 'project_completed':
        const projectCount = await this.getCompletedProjectCount(student.id);
        return projectCount >= (criteria.count || 1);

      default:
        return false;
    }
  }
}
```

### 4. Animation State Machine

**Animation Queue System**:

```typescript
// lib/progress/animation-queue.ts

type Animation = {
  id: string;
  type: 'xp-gain' | 'level-up' | 'achievement' | 'streak';
  data: any;
  priority: number; // Higher = show first
  duration: number; // milliseconds
};

export class AnimationQueue {
  private queue: Animation[] = [];
  private playing: boolean = false;

  /**
   * Add animation to queue
   */
  enqueue(animation: Animation): void {
    this.queue.push(animation);
    this.queue.sort((a, b) => b.priority - a.priority);

    if (!this.playing) {
      this.playNext();
    }
  }

  /**
   * Play next animation in queue
   */
  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.playing = false;
      return;
    }

    this.playing = true;
    const animation = this.queue.shift()!;

    // Trigger animation in UI
    await this.triggerAnimation(animation);

    // Wait for animation to complete
    await this.delay(animation.duration);

    // Play next
    this.playNext();
  }

  private triggerAnimation(animation: Animation): Promise<void> {
    // Emit event to UI layer
    window.dispatchEvent(
      new CustomEvent('celebration', { detail: animation })
    );
    return Promise.resolve();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5. Progress Calculation

**Course Completion Percentage**:

```sql
-- Calculate overall progress for a student
CREATE OR REPLACE FUNCTION calculate_student_progress(student_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  total_videos INTEGER;
  completed_videos INTEGER;
  progress INTEGER;
BEGIN
  -- Get total videos for student's creator
  SELECT COUNT(*) INTO total_videos
  FROM videos v
  JOIN students s ON v.creator_id = s.creator_id
  WHERE s.id = student_id_param;

  -- Get completed videos for student
  SELECT COUNT(*) INTO completed_videos
  FROM video_progress vp
  WHERE vp.student_id = student_id_param
  AND vp.completed = TRUE;

  -- Calculate percentage
  IF total_videos > 0 THEN
    progress := ROUND((completed_videos::FLOAT / total_videos::FLOAT) * 100);
  ELSE
    progress := 0;
  END IF;

  RETURN progress;
END;
$$ LANGUAGE plpgsql;
```

**Video Progress Tracking**:

```typescript
// lib/progress/video-tracker.ts

export class VideoProgressTracker {
  /**
   * Update video progress as student watches
   */
  async updateProgress(
    studentId: string,
    videoId: string,
    currentTime: number,
    duration: number
  ): Promise<void> {
    const watchPercentage = (currentTime / duration) * 100;

    await supabase
      .from('video_progress')
      .upsert({
        student_id: studentId,
        video_id: videoId,
        watch_percentage: Math.round(watchPercentage),
        watch_duration: Math.round(currentTime),
        last_watched: new Date().toISOString(),
        completed: watchPercentage >= 90, // 90% = completed
      });

    // If just completed (crossed 90% threshold)
    if (watchPercentage >= 90 && !this.wasCompleted) {
      await this.handleVideoCompletion(studentId, videoId);
    }
  }

  /**
   * Handle video completion (award XP, check achievements)
   */
  private async handleVideoCompletion(
    studentId: string,
    videoId: string
  ): Promise<void> {
    // Award XP
    const xpEarned = await xpCalculator.calculateXP('VIDEO_COMPLETED');
    await this.awardXP(studentId, xpEarned);

    // Check for achievements
    const achievements = await achievementChecker.checkAchievements(
      studentId,
      { type: 'video_completed', videoId }
    );

    // Queue celebrations
    animationQueue.enqueue({
      id: generateId(),
      type: 'xp-gain',
      data: { xp: xpEarned },
      priority: 1,
      duration: 2000,
    });

    // If achievements unlocked
    achievements.forEach(achievement => {
      animationQueue.enqueue({
        id: generateId(),
        type: 'achievement',
        data: achievement,
        priority: 3,
        duration: 3000,
      });
    });
  }
}
```

## Data Flow Diagrams

### XP Earning Flow

```
User Action
(e.g., completes video)
  │
  ├─── Log action in analytics_events
  │
  ├─── Calculate XP reward
  │     ├─ Base XP (from constants)
  │     ├─ Apply streak multiplier
  │     ├─ Apply perfect score bonus
  │     └─ Apply first-try bonus
  │
  ├─── Update student.xp_points
  │
  ├─── Check for level-up
  │     └─ If yes:
  │         ├─ Increment level
  │         ├─ Queue level-up animation
  │         └─ Send notification
  │
  ├─── Check for achievements
  │     └─ For each unlocked:
  │         ├─ Store in student_achievements
  │         ├─ Award achievement XP
  │         └─ Queue achievement animation
  │
  └─── Return updated student state
```

### Streak Tracking Flow

```
Daily Activity Check
(runs at midnight UTC)
  │
  ├─── For each student:
  │     │
  │     ├─── Get last_active date
  │     │
  │     ├─── If active yesterday:
  │     │     ├─ Increment streak_days
  │     │     ├─ Award streak XP
  │     │     └─ Check streak achievements
  │     │
  │     ├─── If NOT active yesterday:
  │     │     ├─ Reset streak_days to 0
  │     │     └─ Send "streak broken" notification
  │     │
  │     └─── If active for 7/14/30 days:
  │           └─ Unlock milestone achievement
  │
  └─── Cache results for dashboard
```

## Performance Optimizations

### 1. Caching Strategy

```typescript
// Cache student progress data
const cacheKey = `progress:${studentId}`;
const cached = await cache.get(cacheKey);

if (cached) {
  return cached;
}

const progress = await calculateProgress(studentId);
await cache.set(cacheKey, progress, 300); // 5 min TTL

return progress;
```

### 2. Batch Achievement Checks

Instead of checking all achievements on every action, use triggers:

```typescript
const achievementTriggers = {
  'VIDEO_COMPLETED': ['first-video', 'video-5', 'video-10', 'video-marathon'],
  'QUIZ_PASSED': ['quiz-master', 'quiz-perfect', 'quiz-champion'],
  'STREAK_7': ['week-warrior'],
  'STREAK_30': ['unstoppable'],
};

// Only check relevant achievements
const relevantAchievements = achievementTriggers[action] || [];
```

### 3. Optimistic UI Updates

Update UI immediately, sync with server asynchronously:

```typescript
// Optimistic update
setXP(prev => prev + 50);
setLevel(prev => prev + (newXP >= threshold ? 1 : 0));

// Sync with server
await fetch('/api/progress/xp', {
  method: 'POST',
  body: JSON.stringify({ action: 'VIDEO_COMPLETED' }),
});
```

## Animation Performance

### GPU-Accelerated Properties

Only animate these properties for 60fps:
- `transform` ✅
- `opacity` ✅
- `filter` ⚠️ (use sparingly)

Avoid animating:
- `width`, `height` ❌
- `top`, `left` ❌
- `margin`, `padding` ❌

### Particle System Optimization

```typescript
// Limit particle count based on device
const getParticleCount = (): number => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0; // Accessibility
  }

  const gpu = navigator.gpu;
  if (gpu) {
    return 100; // High-end device
  }

  return 50; // Standard device
};
```

### Animation Cleanup

```typescript
useEffect(() => {
  const animation = celebrationRef.current;

  return () => {
    // Cleanup on unmount
    if (animation) {
      animation.stop();
      animation.destroy();
    }
  };
}, []);
```

## State Management Architecture

### Zustand Store Design

```typescript
// store/progress-store.ts

interface ProgressStore {
  // State
  xp: number;
  level: number;
  streak: number;
  achievements: Achievement[];
  recentXPGains: XPGain[];

  // Actions
  addXP: (amount: number, source: string) => void;
  levelUp: () => void;
  unlockAchievement: (achievement: Achievement) => void;
  updateStreak: (days: number) => void;

  // Computed
  xpToNextLevel: () => number;
  progressToNextLevel: () => number;
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  xp: 0,
  level: 1,
  streak: 0,
  achievements: [],
  recentXPGains: [],

  addXP: (amount, source) => {
    set(state => {
      const newXP = state.xp + amount;
      const threshold = xpForLevel(state.level + 1);

      // Check level up
      if (newXP >= threshold) {
        return {
          xp: newXP - threshold, // Overflow XP
          level: state.level + 1,
          recentXPGains: [
            ...state.recentXPGains,
            { amount, source, timestamp: Date.now() },
          ].slice(-10), // Keep last 10
        };
      }

      return {
        xp: newXP,
        recentXPGains: [
          ...state.recentXPGains,
          { amount, source, timestamp: Date.now() },
        ].slice(-10),
      };
    });
  },

  xpToNextLevel: () => {
    const state = get();
    return xpForLevel(state.level + 1) - state.xp;
  },

  progressToNextLevel: () => {
    const state = get();
    const current = state.xp;
    const needed = xpForLevel(state.level + 1);
    return (current / needed) * 100;
  },
}));
```

## Security Considerations

### Server-Side Validation

**Never trust client-side XP calculations**:

```typescript
// ❌ BAD: Client sends XP amount
await fetch('/api/xp/add', {
  body: JSON.stringify({ xp: 1000000 }), // Client can cheat!
});

// ✅ GOOD: Server calculates XP
await fetch('/api/actions/video-completed', {
  body: JSON.stringify({ videoId: 'xxx' }), // Server determines XP
});
```

### Anti-Cheat Measures

1. **Server-side calculation**: All XP calculations happen server-side
2. **Action validation**: Verify action actually happened (e.g., video actually watched)
3. **Rate limiting**: Prevent rapid-fire actions
4. **Audit logs**: Track all XP-earning events in analytics_events

---

**Next**: Read `IMPLEMENTATION.md` for step-by-step build guide with animations!
