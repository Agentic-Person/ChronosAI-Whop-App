# CHRONOS Token Reward System

Universal token system that rewards students for engagement across all creators on the platform.

## Philosophy

- **Universal Tokens**: Students earn CHRONOS regardless of which creator's content they're watching
- **Simple Rewards**: No complex gamification, just straightforward token earnings
- **Engagement-Based**: Reward watching videos and asking questions
- **Future Redemption**: Tokens can be redeemed for premium features (implementation pending)

## Reward Amounts

| Action | CHRONOS Tokens |
|--------|----------------|
| Video Completion | 100 |
| Chat Message | 10 |
| Daily Streak (7 days) | 50 |
| Daily Streak (30 days) | 50 |
| Daily Streak (100 days) | 50 |
| Weekly Milestone | 200 |
| Course Completion | 500 |

## Architecture

### Database Tables

1. **token_wallets** - Stores student wallet information with Solana integration
2. **token_transactions** - Logs all token operations (earn/spend/redeem)
3. **student_streaks** - Tracks daily activity streaks
4. **redemption_requests** - Handles token redemption for real-world value

### Core Functions

#### Reward Engine (`lib/chronos/rewardEngine.ts`)

- `awardVideoCompletion(studentId, videoId, creatorId?)` - Award tokens for completing a video
- `awardChatMessage(studentId, creatorId, messageId)` - Award tokens for asking questions
- `awardDailyStreak(studentId, streakDays)` - Award streak bonus
- `getBalance(studentId)` - Get current CHRONOS balance
- `getTransactionHistory(studentId, limit, offset)` - Get transaction history
- `getWalletStats(studentId)` - Get wallet statistics

#### Streak Tracker (`lib/chronos/streakTracker.ts`)

- `updateStreak(studentId)` - Update and check streak (awards bonus if milestone reached)
- `getStreak(studentId)` - Get current streak information
- `hasActivityToday(studentId)` - Check if student has activity today
- `getStreakStats(studentId)` - Get streak statistics for display

### API Endpoints

#### GET `/api/chronos/balance`

Get student's CHRONOS balance and statistics.

**Query Parameters:**
- `studentId` (optional) - Defaults to authenticated user

**Response:**
```json
{
  "balance": 1250,
  "totalEarned": 2000,
  "totalSpent": 500,
  "totalRedeemed": 250,
  "usdValue": 1.25
}
```

#### GET `/api/chronos/history`

Get transaction history with pagination.

**Query Parameters:**
- `studentId` (optional) - Defaults to authenticated user
- `limit` (optional) - Default: 50
- `offset` (optional) - Default: 0

**Response:**
```json
{
  "transactions": [...],
  "total": 150,
  "hasMore": true,
  "limit": 50,
  "offset": 0
}
```

#### GET `/api/chronos/streak`

Get streak statistics.

**Query Parameters:**
- `studentId` (optional) - Defaults to authenticated user

**Response:**
```json
{
  "currentStreak": 12,
  "longestStreak": 30,
  "milestoneProgress": {
    "current": 12,
    "next": 30,
    "percentage": 40
  }
}
```

#### POST `/api/chronos/award`

Manually award tokens (internal use).

**Request Body:**
```json
{
  "studentId": "uuid",
  "reason": "video_completion",
  "metadata": {
    "videoId": "uuid",
    "creatorId": "uuid"
  }
}
```

## UI Components

### ChronosBalance (`components/student/ChronosBalance.tsx`)

Header widget showing current balance with animated count-up.

**Props:**
- `studentId` - Student's ID
- `initialBalance` (optional) - Initial balance value

**Usage:**
```tsx
<ChronosBalance studentId={student.id} />
```

### RewardNotification (`components/student/RewardNotification.tsx`)

Toast notification when earning tokens with confetti for large rewards.

**Props:**
- `amount` - Token amount
- `reason` - 'video_completion' | 'chat_message' | 'daily_streak'
- `show` - Visibility flag
- `onDismiss` - Callback when dismissed

**Usage:**
```tsx
import { showRewardToast } from '@/components/student/RewardNotification';

// Show notification
showRewardToast(100, 'video_completion');
```

### TransactionHistory (`components/student/TransactionHistory.tsx`)

Transaction history table with pagination and filtering.

**Props:**
- `studentId` - Student's ID
- `pageSize` (optional) - Default: 20

**Usage:**
```tsx
<TransactionHistory studentId={student.id} pageSize={25} />
```

### ChronosStats (`components/student/ChronosStats.tsx`)

Dashboard stats widget showing earnings, streaks, and milestones.

**Props:**
- `studentId` - Student's ID

**Usage:**
```tsx
<ChronosStats studentId={student.id} />
```

## Video Player Integration

### VideoPlayerWithRewards

Enhanced video player that automatically awards tokens on completion.

**Usage:**
```tsx
import { VideoPlayerWithRewards } from '@/components/video/VideoPlayerWithRewards';

<VideoPlayerWithRewards
  studentId={student.id}
  creatorId={creator.id}
  videoId={video.id}
  source="youtube"
  youtubeId={video.youtube_id}
/>
```

**Features:**
- Tracks video progress automatically
- Awards 100 CHRONOS on completion
- Shows reward notification
- Updates daily streak
- Awards streak bonus if milestone reached

## Chat Integration

The chat API automatically awards 10 CHRONOS for each question asked.

**Response includes reward info:**
```json
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "content": "AI response...",
    "session_id": "uuid"
  },
  "meta": {
    "chronos_awarded": 10,
    "chronos_balance": 1260
  }
}
```

The `ChatInterface` component shows a reward notification automatically.

## Wallet Page

Full wallet view at `/dashboard/wallet` showing:
- Current balance
- Total earned all-time
- Current streak
- Transaction history with pagination
- Redemption section (coming soon)

## Testing

### Manual Testing

1. **Video Completion:**
   - Watch a video to 90%+ completion
   - Should see +100 CHRONOS notification
   - Balance in header should update

2. **Chat Messages:**
   - Ask a question in chat
   - Should see +10 CHRONOS notification
   - Balance should increase

3. **Daily Streaks:**
   - Watch videos on consecutive days
   - At 7, 30, or 100 days should see +50 CHRONOS bonus

4. **Transaction History:**
   - Visit `/dashboard/wallet`
   - Should see all transactions listed
   - Pagination should work

### Database Verification

```sql
-- Check wallet balance
SELECT * FROM token_wallets WHERE student_id = 'student-uuid';

-- Check transactions
SELECT * FROM token_transactions
WHERE student_id = 'student-uuid'
ORDER BY created_at DESC
LIMIT 10;

-- Check streak
SELECT * FROM student_streaks WHERE student_id = 'student-uuid';
```

## Future Enhancements

- Token redemption system (PayPal, gift cards, platform credit)
- Multiplier events (2x tokens on weekends)
- Referral bonuses (invite friends)
- Weekly/monthly leaderboards
- Token staking (earn interest)
- NFT badges purchasable with CHRONOS

## Security Considerations

- All token operations use database-level functions with validation
- Row-level security (RLS) ensures students can only access their own data
- Creators can view their students' wallets and transactions
- Private keys are encrypted with AES-256-GCM
- Rate limiting prevents abuse

## Troubleshooting

### Balance not updating
- Check browser console for API errors
- Verify RLS policies allow access
- Check that student has a wallet created

### Tokens not awarded
- Check database logs for errors
- Verify video completion threshold (90%)
- Ensure no duplicate completions same day

### Streak not updating
- Check `student_streaks` table
- Verify `update_student_streak` function working
- Ensure consecutive days (UTC timezone)

## Support

For issues or questions, contact the development team or file an issue in the repository.
