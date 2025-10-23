# AGENT 12: CHRONOS Token Reward System

**Status:** 🔄 In Development
**Agent Type:** Specialized - Blockchain Integration & Token Economy
**Dependencies:** Agent 0 (Feature Gating), Agent 3 (Video Processing), Agent 6 (Progress & Gamification)
**Estimated Delivery:** 15-20 files, ~3,000 lines of code

---

## 📋 Mission Statement

Build a **Solana blockchain-based token reward system** that awards users CHRONOS tokens for learning activities, provides dual reward tracking (XP + CHRONOS), enables real-world redemption, and integrates seamlessly with the existing gamification system.

---

## 🎯 Core Objectives

### 1. Blockchain Infrastructure
- ✅ Solana Web3.js SDK integration (Devnet for testing, Mainnet-ready)
- ✅ SPL Token program for CHRONOS token standard
- ✅ Auto-generated Solana wallets per user (encrypted private keys)
- ✅ Token minting service (platform-controlled, secure)
- ✅ Transaction signing and verification
- ✅ On-chain/off-chain balance synchronization

### 2. Token Reward Engine
- ✅ Video completion milestone rewards (25%, 50%, 75%, 100%)
- ✅ Quiz completion rewards (score-based: 50-200 CHRONOS)
- ✅ Practice task rewards (100 CHRONOS per submission)
- ✅ Project completion bonuses (300 CHRONOS)
- ✅ Achievement unlock rewards (50-500 CHRONOS by rarity)
- ✅ Streak bonuses and week/module completion rewards
- ✅ Creator-adjustable multiplier system (0.5x - 2x)

### 3. Dual Reward System (XP + CHRONOS)
- ✅ Every action awards BOTH XP and CHRONOS simultaneously
- ✅ XP is platform-standard (non-adjustable)
- ✅ CHRONOS can be adjusted by creators via multiplier
- ✅ Equal 1:1 ratio by default (100 XP = 100 CHRONOS)

### 4. Token Redemption System
- ✅ In-platform purchases (cosmetics, badges, features)
- ✅ Real-world redemption (PayPal, gift cards, platform credit)
- ✅ Minimum withdrawal thresholds
- ✅ Conversion rate: 10,000 CHRONOS = $10 USD (0.001 USD per CHRONOS)
- ✅ Redemption request workflow with admin approval

### 5. Wallet & Transaction Management
- ✅ User wallet dashboard with balance display
- ✅ Transaction history (filterable: earn/spend/redeem)
- ✅ Real-time balance updates
- ✅ Token leaderboard (top earners)
- ✅ Transaction notifications with animations

---

## 🏗️ Technical Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Blockchain | **Solana (SPL Token)** | High-speed, low-cost token transactions |
| SDK | **@solana/web3.js** | Wallet and transaction management |
| Token Standard | **SPL Token** | Fungible token implementation |
| Network | **Devnet** (testing) → **Mainnet** (production) | Dual environment support |
| Encryption | **AES-256-GCM** | Private key encryption at rest |
| Database | **Supabase PostgreSQL** | Transaction log and balance cache |
| Payment Gateway | **PayPal API** | Real-world redemptions |

---

## 📊 Database Schema

### Token Wallets
```sql
CREATE TABLE token_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  solana_address TEXT UNIQUE NOT NULL,
  private_key_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted
  balance BIGINT DEFAULT 0, -- Cached balance (synced from on-chain)
  total_earned BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  total_redeemed BIGINT DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_wallets_student ON token_wallets(student_id);
CREATE INDEX idx_token_wallets_balance ON token_wallets(balance DESC);
```

### Token Transactions
```sql
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES token_wallets(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'redeem')),
  source TEXT NOT NULL, -- 'video_watch', 'quiz_complete', 'achievement_unlock', etc.
  source_id UUID, -- Reference to video_id, quiz_id, achievement_id, etc.
  signature TEXT, -- Solana transaction signature (on-chain proof)
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_tx_wallet ON token_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_token_tx_type ON token_transactions(type, created_at DESC);
CREATE INDEX idx_token_tx_source ON token_transactions(source, created_at DESC);
```

### Redemption Requests
```sql
CREATE TABLE redemption_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES token_wallets(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  redemption_type TEXT NOT NULL CHECK (redemption_type IN ('paypal', 'gift_card', 'platform_credit')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_details JSONB NOT NULL, -- { email, address, preferences }
  admin_notes TEXT,
  processed_by UUID REFERENCES creators(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redemption_status ON redemption_requests(status, created_at DESC);
CREATE INDEX idx_redemption_student ON redemption_requests(student_id);
```

### Token Leaderboard (Materialized View)
```sql
CREATE MATERIALIZED VIEW token_leaderboard AS
SELECT
  tw.student_id,
  s.full_name,
  s.avatar_url,
  tw.balance AS current_balance,
  tw.total_earned,
  tw.total_spent,
  RANK() OVER (ORDER BY tw.total_earned DESC) as rank
FROM token_wallets tw
JOIN students s ON tw.student_id = s.id
WHERE tw.total_earned > 0
ORDER BY tw.total_earned DESC
LIMIT 100;

CREATE UNIQUE INDEX ON token_leaderboard(student_id);

-- Refresh function (call hourly via cron)
CREATE OR REPLACE FUNCTION refresh_token_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY token_leaderboard;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎁 Token Reward Breakdown

### Video Completion Rewards
**Based on 4-hour daily video limit:**

| Milestone | Watch Time | CHRONOS Reward | XP Reward |
|-----------|-----------|-------------|-----------|
| 25% watched | 1 hour | 25 CHRONOS | 25 XP |
| 50% watched | 2 hours | 50 CHRONOS | 50 XP |
| 75% watched | 3 hours | 75 CHRONOS | 75 XP |
| 100% watched | 4 hours | 100 CHRONOS | 100 XP |
| **Daily Completion Bonus** | All videos in day | **+50 CHRONOS** | **+50 XP** |
| **Total per Day** | 4 hours | **150 CHRONOS** | **150 XP** |

### Quiz & Assessment Rewards

| Action | CHRONOS Range | XP Range |
|--------|-----------|----------|
| Quiz completion (0-59%) | 50 CHRONOS | 50 XP |
| Quiz completion (60-79%) | 100 CHRONOS | 100 XP |
| Quiz completion (80-94%) | 150 CHRONOS | 150 XP |
| Quiz completion (95-100%) | 200 CHRONOS | 200 XP |
| Practice task submission | 100 CHRONOS | 100 XP |
| Project completion | 300 CHRONOS | 300 XP |
| Code review (peer) | 50 CHRONOS | 50 XP |

### Achievement Rewards

| Rarity | CHRONOS Reward | XP Reward | Examples |
|--------|-------------|-----------|----------|
| Common | 50 CHRONOS | 50 XP | First Steps, Early Bird |
| Uncommon | 100 CHRONOS | 100 XP | Week Warrior, Quiz Master |
| Rare | 200 CHRONOS | 200 XP | Month Champion, Perfect Scorer |
| Epic | 350 CHRONOS | 350 XP | Knowledge Guru, Triple Threat |
| Legendary | 500 CHRONOS | 500 XP | Completion Legend, 100% Club |

### Milestone Bonuses

| Milestone | CHRONOS Bonus | XP Bonus |
|-----------|-----------|----------|
| Week completion | 500 CHRONOS | 500 XP |
| Module completion | 2,000 CHRONOS | 2,000 XP |
| Course completion | 10,000 CHRONOS | 10,000 XP |
| 7-day streak | 200 CHRONOS | 200 XP |
| 30-day streak | 1,000 CHRONOS | 1,000 XP |

### Creator Multiplier System

Creators can adjust CHRONOS rewards (XP remains constant):

| Multiplier | CHRONOS Adjustment | Use Case |
|------------|----------------|----------|
| 0.5x | Half rewards | High-value courses, premium content |
| 1.0x (default) | Standard rewards | Most courses |
| 1.5x | 50% bonus | Promotional periods, new courses |
| 2.0x | Double rewards | Special events, challenges |

**Example:**
- Video completion: 100 XP (always) + 100 CHRONOS (default)
- With 2x multiplier: 100 XP (unchanged) + 200 CHRONOS
- With 0.5x multiplier: 100 XP (unchanged) + 50 CHRONOS

---

## 💰 Token Redemption Options

### In-Platform Purchases

| Item | CHRONOS Cost | Description |
|------|-----------|-------------|
| Custom Badge | 500 CHRONOS | Unlock special profile badges |
| Profile Theme | 1,000 CHRONOS | Custom color schemes |
| Priority AI Chat | 2,000 CHRONOS/month | Skip rate limits, faster responses |
| Certificate of Completion | 5,000 CHRONOS | Official course certificate |
| Discord Role Upgrade | 1,500 CHRONOS | Special Discord perks |

### Real-World Redemption

| Option | Conversion Rate | Minimum | Processing Time |
|--------|----------------|---------|-----------------|
| PayPal Cash | 10,000 CHRONOS = $10 USD | 5,000 CHRONOS | 3-5 business days |
| Amazon Gift Card | 10,000 CHRONOS = $10 card | 10,000 CHRONOS | 1-2 business days |
| Platform Credit | 1:1 ratio (1 CHRONOS = $0.001) | 5,000 CHRONOS | Instant |
| Whop Marketplace Credit | 10,000 CHRONOS = $10 credit | 10,000 CHRONOS | Instant |

**Redemption Fees:**
- PayPal: 5% processing fee
- Gift Cards: No fee
- Platform Credit: No fee

---

## 🔧 API Endpoints

### Wallet Management

#### `POST /api/tokens/wallet/create`
**Description:** Auto-create Solana wallet for new user
**Authentication:** Required (Whop OAuth)
**Request Body:**
```json
{
  "student_id": "uuid"
}
```
**Response:**
```json
{
  "wallet_id": "uuid",
  "solana_address": "8xY7Z...",
  "balance": 0,
  "created_at": "2025-10-21T12:00:00Z"
}
```

#### `GET /api/tokens/balance`
**Description:** Get current CHRONOS balance
**Authentication:** Required
**Query Params:** None
**Response:**
```json
{
  "balance": 1250,
  "total_earned": 3500,
  "total_spent": 1200,
  "total_redeemed": 1050,
  "usd_value": 1.25
}
```

#### `GET /api/tokens/sync`
**Description:** Sync on-chain balance with database cache
**Authentication:** Required
**Response:**
```json
{
  "on_chain_balance": 1250,
  "cached_balance": 1250,
  "synced_at": "2025-10-21T12:00:00Z",
  "discrepancy": 0
}
```

### Token Transactions

#### `POST /api/tokens/award`
**Description:** Award CHRONOS tokens (internal service use only)
**Authentication:** Service role key
**Request Body:**
```json
{
  "student_id": "uuid",
  "amount": 100,
  "source": "video_complete",
  "source_id": "video_uuid",
  "metadata": {
    "video_title": "Getting Started",
    "completion_percentage": 100
  }
}
```
**Response:**
```json
{
  "transaction_id": "uuid",
  "new_balance": 1350,
  "signature": "5yG3h...",
  "created_at": "2025-10-21T12:00:00Z"
}
```

#### `POST /api/tokens/spend`
**Description:** Spend CHRONOS on in-platform items
**Authentication:** Required
**Request Body:**
```json
{
  "amount": 500,
  "item_type": "custom_badge",
  "item_id": "badge_uuid"
}
```
**Response:**
```json
{
  "transaction_id": "uuid",
  "new_balance": 750,
  "item_unlocked": {
    "type": "badge",
    "name": "Code Master"
  }
}
```

#### `GET /api/tokens/transactions`
**Description:** Get transaction history (paginated)
**Authentication:** Required
**Query Params:**
- `type`: Filter by 'earn', 'spend', or 'redeem' (optional)
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": 100,
      "type": "earn",
      "source": "video_complete",
      "metadata": { "video_title": "..." },
      "created_at": "2025-10-21T12:00:00Z"
    }
  ],
  "total": 42,
  "has_more": true
}
```

### Redemption

#### `POST /api/tokens/redeem`
**Description:** Request real-world redemption
**Authentication:** Required
**Request Body:**
```json
{
  "amount": 10000,
  "redemption_type": "paypal",
  "payout_details": {
    "email": "user@example.com"
  }
}
```
**Response:**
```json
{
  "request_id": "uuid",
  "status": "pending",
  "amount": 10000,
  "usd_value": 10.00,
  "estimated_processing": "3-5 business days",
  "created_at": "2025-10-21T12:00:00Z"
}
```

#### `GET /api/tokens/redemption-status/:id`
**Description:** Check redemption request status
**Authentication:** Required
**Response:**
```json
{
  "request_id": "uuid",
  "status": "completed",
  "amount": 10000,
  "redemption_type": "paypal",
  "processed_at": "2025-10-23T14:30:00Z",
  "transaction_id": "paypal_txn_123"
}
```

### Leaderboard

#### `GET /api/tokens/leaderboard`
**Description:** Get top CHRONOS earners
**Authentication:** Required
**Query Params:**
- `limit`: Number of results (default: 10, max: 100)
- `period`: 'all_time', 'monthly', 'weekly' (default: 'all_time')

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "student_id": "uuid",
      "name": "Game Developer",
      "avatar_url": "https://...",
      "total_earned": 8930,
      "current_balance": 6200
    }
  ],
  "current_user_rank": 42,
  "current_user_earned": 1250
}
```

---

## 🧩 Service Layer

### `lib/tokens/solana-service.ts`

**Purpose:** Core Solana blockchain operations

**Key Functions:**

```typescript
// Initialize Solana connection
export async function initializeSolana(): Promise<Connection>

// Create new user wallet
export async function createWallet(): Promise<{
  publicKey: string;
  privateKey: string;
}>

// Encrypt private key for storage
export async function encryptPrivateKey(
  privateKey: string,
  encryptionKey: string
): Promise<string>

// Decrypt private key from storage
export async function decryptPrivateKey(
  encryptedKey: string,
  encryptionKey: string
): Promise<string>

// Mint CHRONOS tokens to user wallet
export async function mintTokens(
  recipientAddress: string,
  amount: number
): Promise<string> // Returns transaction signature

// Transfer tokens between wallets
export async function transferTokens(
  fromPrivateKey: string,
  toAddress: string,
  amount: number
): Promise<string>

// Get on-chain balance
export async function getBalance(
  walletAddress: string
): Promise<number>

// Verify transaction signature
export async function verifyTransaction(
  signature: string
): Promise<boolean>
```

**Implementation Notes:**
- Use `@solana/web3.js` v1.87+
- Connection to Devnet: `https://api.devnet.solana.com`
- Connection to Mainnet: `https://api.mainnet-beta.solana.com`
- Rate limiting: 100 RPC calls/10 seconds
- Retry logic with exponential backoff

---

### `lib/tokens/reward-engine.ts`

**Purpose:** Calculate and award token rewards

**Key Functions:**

```typescript
// Award tokens for video completion
export async function awardVideoCompletion(
  studentId: string,
  videoId: string,
  completionPercentage: number
): Promise<TokenTransaction>

// Award tokens for quiz completion
export async function awardQuizCompletion(
  studentId: string,
  quizId: string,
  score: number
): Promise<TokenTransaction>

// Award tokens for achievement unlock
export async function awardAchievement(
  studentId: string,
  achievementId: string,
  rarity: AchievementRarity
): Promise<TokenTransaction>

// Calculate reward amount based on action
export function calculateReward(
  action: RewardAction,
  metadata: Record<string, any>
): number

// Apply creator multiplier to base reward
export async function applyMultiplier(
  creatorId: string,
  baseAmount: number
): Promise<number>

// Dual award (XP + CHRONOS simultaneously)
export async function awardDualRewards(
  studentId: string,
  action: RewardAction,
  metadata: Record<string, any>
): Promise<{
  xp: number;
  blox: number;
  xpTransaction: XPTransaction;
  bloxTransaction: TokenTransaction;
}>
```

**Reward Calculation Logic:**

```typescript
// Example: Video completion reward
function calculateVideoReward(completionPercentage: number): number {
  if (completionPercentage >= 100) return 100;
  if (completionPercentage >= 75) return 75;
  if (completionPercentage >= 50) return 50;
  if (completionPercentage >= 25) return 25;
  return 0;
}

// Example: Quiz score reward
function calculateQuizReward(score: number): number {
  if (score >= 95) return 200;
  if (score >= 80) return 150;
  if (score >= 60) return 100;
  return 50;
}

// Example: Achievement rarity reward
function calculateAchievementReward(rarity: AchievementRarity): number {
  const rarityMap = {
    COMMON: 50,
    UNCOMMON: 100,
    RARE: 200,
    EPIC: 350,
    LEGENDARY: 500
  };
  return rarityMap[rarity] || 50;
}
```

---

### `lib/tokens/redemption-service.ts`

**Purpose:** Handle real-world token redemptions

**Key Functions:**

```typescript
// Create redemption request
export async function createRedemptionRequest(
  studentId: string,
  amount: number,
  redemptionType: RedemptionType,
  payoutDetails: Record<string, any>
): Promise<RedemptionRequest>

// Process PayPal redemption
export async function processPayPalRedemption(
  requestId: string
): Promise<void>

// Generate gift card code
export async function generateGiftCard(
  amount: number,
  provider: 'amazon' | 'steam'
): Promise<string>

// Convert to platform credit
export async function convertToPlatformCredit(
  studentId: string,
  amount: number
): Promise<void>

// Update redemption status
export async function updateRedemptionStatus(
  requestId: string,
  status: RedemptionStatus,
  adminNotes?: string
): Promise<void>

// Calculate redemption fees
export function calculateRedemptionFee(
  amount: number,
  redemptionType: RedemptionType
): number
```

**Integration Points:**
- **PayPal API:** Payouts API for cash redemptions
- **Gift Card Providers:** Third-party APIs (e.g., Tremendous, Giftbit)
- **Notification Service:** Email confirmations for redemptions
- **Admin Dashboard:** Manual approval workflow for large redemptions

---

### `lib/tokens/wallet-service.ts`

**Purpose:** Wallet management and balance operations

**Key Functions:**

```typescript
// Create wallet for new student
export async function createStudentWallet(
  studentId: string
): Promise<TokenWallet>

// Get wallet by student ID
export async function getWallet(
  studentId: string
): Promise<TokenWallet | null>

// Update cached balance from on-chain
export async function syncBalance(
  walletId: string
): Promise<number>

// Get transaction history
export async function getTransactionHistory(
  walletId: string,
  filters: TransactionFilters
): Promise<TokenTransaction[]>

// Calculate total earnings
export async function getTotalEarnings(
  walletId: string
): Promise<number>

// Get leaderboard position
export async function getLeaderboardRank(
  studentId: string
): Promise<number>
```

---

## 🎨 UI Components

### `components/tokens/TokenBalanceWidget.tsx`

**Purpose:** Display CHRONOS balance in header stats bar

**Props:**
```typescript
interface TokenBalanceWidgetProps {
  balance: number;
  showUSDValue?: boolean;
  onClick?: () => void; // Navigate to wallet page
}
```

**Design:**
```tsx
<div className="flex items-center gap-2 cursor-pointer" onClick={onClick}>
  <Coins className="w-5 h-5 text-green-400" />
  <span className="text-lg font-bold text-green-400">
    {balance.toLocaleString()}
  </span>
  <span className="text-sm text-gray-400">CHRONOS</span>
  {showUSDValue && (
    <span className="text-xs text-gray-500">
      ≈ ${(balance * 0.001).toFixed(2)}
    </span>
  )}
</div>
```

---

### `components/tokens/TokenNotification.tsx`

**Purpose:** Animated popup when user earns CHRONOS

**Props:**
```typescript
interface TokenNotificationProps {
  amount: number;
  source: string; // "Video Completion", "Quiz Passed", etc.
  onComplete?: () => void;
}
```

**Animation:**
```tsx
<motion.div
  initial={{ scale: 0, y: 50, opacity: 0 }}
  animate={{ scale: 1, y: 0, opacity: 1 }}
  exit={{ scale: 0, opacity: 0 }}
  transition={{ type: "spring", duration: 0.6 }}
  className="fixed top-20 right-4 bg-green-500/90 backdrop-blur-md rounded-lg p-4 shadow-2xl"
>
  <div className="flex items-center gap-3">
    <motion.div
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <Coins className="w-8 h-8 text-white" />
    </motion.div>
    <div>
      <p className="text-2xl font-bold text-white">+{amount} CHRONOS</p>
      <p className="text-sm text-white/80">{source}</p>
    </div>
  </div>
  <ConfettiExplosion particleCount={30} />
</motion.div>
```

---

### `components/tokens/WalletDashboard.tsx`

**Purpose:** Full wallet page with balance and transactions

**Layout:**
```tsx
<div className="wallet-page">
  {/* Balance Hero */}
  <div className="balance-hero bg-gradient-to-br from-green-900 to-cyan-900 rounded-xl p-8">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-300 text-sm">Total Balance</p>
        <h1 className="text-6xl font-bold text-white">{balance.toLocaleString()}</h1>
        <p className="text-2xl text-gray-300">CHRONOS</p>
        <p className="text-lg text-gray-400">≈ ${usdValue.toFixed(2)} USD</p>
      </div>
      <Coins className="w-24 h-24 text-green-400 opacity-50" />
    </div>

    <div className="grid grid-cols-3 gap-4 mt-6">
      <StatCard label="Total Earned" value={totalEarned} color="green" />
      <StatCard label="Total Spent" value={totalSpent} color="orange" />
      <StatCard label="Total Redeemed" value={totalRedeemed} color="blue" />
    </div>

    <div className="flex gap-4 mt-6">
      <Button onClick={openRedeemModal} variant="primary">
        Redeem Tokens
      </Button>
      <Button onClick={navigateToStore} variant="secondary">
        Spend in Store
      </Button>
    </div>
  </div>

  {/* Transaction History */}
  <div className="mt-8">
    <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
    <FilterTabs tabs={['All', 'Earned', 'Spent', 'Redeemed']} />
    <TransactionList transactions={transactions} />
  </div>
</div>
```

---

### `components/tokens/TransactionList.tsx`

**Purpose:** Display filterable transaction history

**Item Design:**
```tsx
<div className="transaction-item flex items-center justify-between p-4 bg-card rounded-lg">
  <div className="flex items-center gap-4">
    {/* Icon based on type */}
    {type === 'earn' && <TrendingUp className="w-6 h-6 text-green-400" />}
    {type === 'spend' && <ShoppingCart className="w-6 h-6 text-orange-400" />}
    {type === 'redeem' && <DollarSign className="w-6 h-6 text-blue-400" />}

    <div>
      <p className="font-semibold">{source}</p>
      <p className="text-sm text-gray-400">{formatTimestamp(createdAt)}</p>
    </div>
  </div>

  <div className="text-right">
    <p className={cn(
      "text-xl font-bold",
      type === 'earn' ? 'text-green-400' : 'text-red-400'
    )}>
      {type === 'earn' ? '+' : '-'}{amount.toLocaleString()} CHRONOS
    </p>
    <p className="text-sm text-gray-400">
      ≈ ${(amount * 0.001).toFixed(2)} USD
    </p>
  </div>
</div>
```

---

### `components/tokens/RedemptionModal.tsx`

**Purpose:** Redemption request flow

**Steps:**
1. Select redemption type (PayPal, Gift Card, Credit)
2. Enter payout details
3. Confirm amount and fees
4. Submit request

**Form:**
```tsx
<Modal open={isOpen} onClose={onClose}>
  <h2 className="text-2xl font-bold mb-4">Redeem CHRONOS Tokens</h2>

  <div className="redemption-form">
    {/* Step 1: Select Type */}
    <div className="redemption-type-selector grid grid-cols-3 gap-4">
      <TypeCard
        icon={DollarSign}
        title="PayPal Cash"
        description="10,000 CHRONOS = $10 USD"
        selected={type === 'paypal'}
        onClick={() => setType('paypal')}
      />
      <TypeCard
        icon={Gift}
        title="Gift Card"
        description="Amazon, Steam, etc."
        selected={type === 'gift_card'}
        onClick={() => setType('gift_card')}
      />
      <TypeCard
        icon={CreditCard}
        title="Platform Credit"
        description="Instant, no fees"
        selected={type === 'platform_credit'}
        onClick={() => setType('platform_credit')}
      />
    </div>

    {/* Step 2: Enter Details */}
    {type === 'paypal' && (
      <Input
        label="PayPal Email"
        type="email"
        placeholder="your@email.com"
        value={payoutEmail}
        onChange={setPayoutEmail}
      />
    )}

    {/* Step 3: Confirm Amount */}
    <div className="amount-summary bg-card p-4 rounded-lg mt-4">
      <div className="flex justify-between">
        <span>CHRONOS Amount</span>
        <span className="font-bold">{amount.toLocaleString()} CHRONOS</span>
      </div>
      <div className="flex justify-between">
        <span>USD Value</span>
        <span>${(amount * 0.001).toFixed(2)}</span>
      </div>
      {fee > 0 && (
        <div className="flex justify-between text-red-400">
          <span>Processing Fee (5%)</span>
          <span>-${fee.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
        <span>You'll Receive</span>
        <span className="text-green-400">${netAmount.toFixed(2)}</span>
      </div>
    </div>

    {/* Submit */}
    <Button
      onClick={handleSubmit}
      disabled={!isValid || isSubmitting}
      className="w-full mt-4"
    >
      {isSubmitting ? 'Processing...' : 'Confirm Redemption'}
    </Button>
  </div>
</Modal>
```

---

### `components/tokens/TokenLeaderboard.tsx`

**Purpose:** Display top CHRONOS earners

**Design:**
```tsx
<div className="leaderboard">
  <h2 className="text-3xl font-bold mb-6">Top CHRONOS Earners</h2>

  {/* Top 3 Podium */}
  <div className="podium grid grid-cols-3 gap-4 mb-8">
    <PodiumCard rank={2} user={leaders[1]} />
    <PodiumCard rank={1} user={leaders[0]} featured />
    <PodiumCard rank={3} user={leaders[2]} />
  </div>

  {/* Leaderboard List */}
  <div className="leaderboard-list space-y-2">
    {leaders.slice(3).map((user, index) => (
      <LeaderRow
        key={user.id}
        rank={index + 4}
        user={user}
        highlighted={user.id === currentUserId}
      />
    ))}
  </div>

  {/* Current User Position */}
  {currentUserRank > 10 && (
    <div className="current-user-position mt-6 p-4 bg-gradient-to-r from-cyan-900 to-purple-900 rounded-lg">
      <p className="text-center text-lg">
        You're ranked <span className="font-bold text-2xl">#{currentUserRank}</span> with <span className="font-bold text-green-400">{currentUserTokens.toLocaleString()} CHRONOS</span>
      </p>
    </div>
  )}
</div>
```

---

## 🔗 Integration Points

### Integration with Agent 3 (Video Processing)

**Hook into video completion events:**

```typescript
// lib/video/completion-handler.ts
import { awardDualRewards } from '@/lib/tokens/reward-engine';

export async function handleVideoCompletion(
  studentId: string,
  videoId: string,
  watchedSeconds: number,
  totalDuration: number
) {
  const completionPercentage = (watchedSeconds / totalDuration) * 100;

  // Check milestone thresholds
  const milestones = [25, 50, 75, 100];
  const reachedMilestone = milestones.find(m =>
    completionPercentage >= m &&
    !hasReachedMilestone(studentId, videoId, m)
  );

  if (reachedMilestone) {
    // Award both XP and CHRONOS
    await awardDualRewards(studentId, 'video_milestone', {
      video_id: videoId,
      milestone: reachedMilestone
    });

    // Mark milestone as reached
    await markMilestoneReached(studentId, videoId, reachedMilestone);

    // Trigger notification
    await notifyTokenEarned(studentId, calculateVideoReward(reachedMilestone));
  }
}
```

---

### Integration with Agent 6 (Progress & Gamification)

**Dual reward on achievement unlock:**

```typescript
// lib/progress/achievement-handler.ts
import { awardDualRewards } from '@/lib/tokens/reward-engine';

export async function unlockAchievement(
  studentId: string,
  achievementId: string
) {
  const achievement = await getAchievement(achievementId);

  // Award both XP and CHRONOS based on rarity
  const { xp, blox } = await awardDualRewards(studentId, 'achievement_unlock', {
    achievement_id: achievementId,
    rarity: achievement.rarity
  });

  // Store achievement unlock
  await storeAchievementUnlock(studentId, achievementId);

  // Trigger celebration animation
  await triggerCelebration(achievement.rarity);

  // Show dual reward notification
  await notifyDualReward(studentId, xp, blox, achievement.name);
}
```

---

### Integration with Agent 7 (Assessment System)

**Award tokens on quiz completion:**

```typescript
// lib/assessment/quiz-handler.ts
import { awardDualRewards } from '@/lib/tokens/reward-engine';

export async function handleQuizCompletion(
  studentId: string,
  quizId: string,
  score: number
) {
  // Award both XP and CHRONOS based on score
  const { xp, blox } = await awardDualRewards(studentId, 'quiz_complete', {
    quiz_id: quizId,
    score: score
  });

  // Store quiz attempt
  await storeQuizAttempt(studentId, quizId, score, xp, blox);

  // Show results with dual rewards
  return {
    score,
    xp_earned: xp,
    blox_earned: blox,
    grade: calculateGrade(score)
  };
}
```

---

### Integration with Agent 0 (Feature Gating)

**Token features require plan tier:**

```typescript
// Redemption requires PRO tier
import { withFeatureGate } from '@/lib/middleware/feature-gate';

export const POST = withFeatureGate(
  { feature: Feature.TOKEN_REDEMPTION, requiredTier: PlanTier.PRO },
  async (req) => {
    // Handle redemption request
    const { amount, redemption_type } = await req.json();
    return await createRedemptionRequest(userId, amount, redemption_type);
  }
);
```

---

## 🧪 Testing Strategy

### Unit Tests

**Test Coverage:**
- ✅ Wallet creation and encryption
- ✅ Token minting and transfers
- ✅ Reward calculation logic
- ✅ Multiplier application
- ✅ Redemption fee calculations
- ✅ Balance synchronization

**Example Test:**
```typescript
describe('Reward Engine', () => {
  it('should calculate correct video completion reward', () => {
    expect(calculateVideoReward(100)).toBe(100);
    expect(calculateVideoReward(75)).toBe(75);
    expect(calculateVideoReward(50)).toBe(50);
    expect(calculateVideoReward(25)).toBe(25);
    expect(calculateVideoReward(20)).toBe(0);
  });

  it('should apply creator multiplier correctly', async () => {
    const baseReward = 100;
    const multiplied = await applyMultiplier('creator_id', baseReward);
    expect(multiplied).toBe(200); // Assuming 2x multiplier
  });

  it('should award both XP and CHRONOS simultaneously', async () => {
    const result = await awardDualRewards('student_id', 'video_complete', {});
    expect(result.xp).toBe(100);
    expect(result.blox).toBe(100);
  });
});
```

### Integration Tests

**Test Scenarios:**
- ✅ End-to-end video completion → token award
- ✅ Quiz submission → dual reward
- ✅ Achievement unlock → token + XP
- ✅ Redemption request → PayPal payout
- ✅ On-chain transaction verification
- ✅ Leaderboard ranking updates

### Security Tests

**Security Checks:**
- ✅ Private key encryption/decryption
- ✅ Transaction signature verification
- ✅ Double-spending prevention
- ✅ Rate limiting on token awards
- ✅ Admin-only redemption approval
- ✅ SQL injection prevention

---

## 🚀 Deployment Checklist

### Environment Variables

```bash
# Solana Configuration
SOLANA_NETWORK=devnet # or mainnet-beta
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_MINT_AUTHORITY_PRIVATE_KEY=your_private_key_here
CHRONOS_TOKEN_MINT_ADDRESS=your_mint_address_here

# Encryption
TOKEN_WALLET_ENCRYPTION_KEY=your_64_char_hex_key_here

# PayPal Integration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox # or live

# Gift Card Provider
GIFTCARD_API_KEY=your_api_key
GIFTCARD_API_SECRET=your_api_secret

# Conversion Rates
CHRONOS_TO_USD_RATE=0.001 # 1 CHRONOS = $0.001 USD
```

### Migration Steps

1. **Deploy Database Migrations:**
   ```bash
   supabase db push
   # Creates: token_wallets, token_transactions, redemption_requests, token_leaderboard
   ```

2. **Initialize Solana Token Mint:**
   ```bash
   npm run tokens:init-mint
   # Creates SPL token mint on Solana
   ```

3. **Backfill Existing Users:**
   ```bash
   npm run tokens:create-wallets
   # Auto-creates wallets for existing students
   ```

4. **Refresh Leaderboard:**
   ```bash
   npm run tokens:refresh-leaderboard
   # Initial materialized view population
   ```

5. **Setup Cron Jobs:**
   ```javascript
   // Vercel cron (vercel.json)
   {
     "crons": [{
       "path": "/api/cron/sync-balances",
       "schedule": "0 * * * *" // Every hour
     }, {
       "path": "/api/cron/refresh-leaderboard",
       "schedule": "0 */6 * * *" // Every 6 hours
     }]
   }
   ```

---

## 📈 Success Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Wallet creation rate | 100% of new users | Auto-created on signup |
| Token award latency | < 2 seconds | Time from action → notification |
| Redemption processing time | < 5 business days | Request → payout completion |
| Transaction failure rate | < 0.1% | Failed mints/transfers |
| Leaderboard accuracy | 100% | Manual verification |
| User engagement increase | +40% | Tracked via analytics |

### Business Impact

- **Increased Retention:** Token rewards incentivize daily activity
- **Higher Completion Rates:** Students motivated to finish courses for bonuses
- **Monetization:** Platform takes 5% fee on PayPal redemptions
- **Virality:** Leaderboard creates competition and social proof
- **Creator Value:** Adjustable multipliers allow promotional campaigns

---

## 🛠️ Maintenance & Support

### Routine Operations

**Daily:**
- Monitor failed transactions (alert if > 5 failures/day)
- Check redemption request queue
- Verify on-chain/off-chain balance sync

**Weekly:**
- Review large redemption requests (> $50)
- Analyze top earners for abuse detection
- Update conversion rates if needed

**Monthly:**
- Refresh materialized views manually
- Audit transaction logs for anomalies
- Generate financial reports

### Common Issues & Solutions

**Issue:** User reports missing tokens after video completion
**Solution:** Check `token_transactions` table for award record. If missing, manually trigger `awardDualRewards()` with source metadata.

**Issue:** On-chain balance doesn't match database
**Solution:** Run `syncBalance(walletId)` to refresh from blockchain. Investigate discrepancy cause.

**Issue:** Redemption stuck in "processing"
**Solution:** Check PayPal API logs. If payout succeeded but status not updated, manually call `updateRedemptionStatus()`.

**Issue:** Leaderboard shows stale data
**Solution:** Manually refresh: `REFRESH MATERIALIZED VIEW CONCURRENTLY token_leaderboard;`

---

## 📚 Additional Resources

### Documentation
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Program](https://spl.solana.com/token)
- [PayPal Payouts API](https://developer.paypal.com/docs/api/payouts/v1/)

### Code Examples
- See `examples/token-award-flow.ts` for complete reward flow
- See `examples/redemption-process.ts` for redemption workflow
- See `examples/leaderboard-query.ts` for efficient leaderboard queries

### Support Contacts
- **Blockchain Issues:** blockchain-team@mentora.com
- **Payment Issues:** payments@mentora.com
- **Security Issues:** security@mentora.com

---

## ✅ Agent 12 Deliverables Summary

### Files Created (Estimated: 15-20 files)

**Services:**
- `lib/tokens/solana-service.ts` (Blockchain operations)
- `lib/tokens/reward-engine.ts` (Token award logic)
- `lib/tokens/redemption-service.ts` (Redemption handling)
- `lib/tokens/wallet-service.ts` (Wallet management)

**API Routes:**
- `app/api/tokens/wallet/create/route.ts`
- `app/api/tokens/balance/route.ts`
- `app/api/tokens/award/route.ts`
- `app/api/tokens/spend/route.ts`
- `app/api/tokens/redeem/route.ts`
- `app/api/tokens/transactions/route.ts`
- `app/api/tokens/leaderboard/route.ts`
- `app/api/tokens/sync/route.ts`

**Components:**
- `components/tokens/TokenBalanceWidget.tsx`
- `components/tokens/TokenNotification.tsx`
- `components/tokens/WalletDashboard.tsx`
- `components/tokens/TransactionList.tsx`
- `components/tokens/RedemptionModal.tsx`
- `components/tokens/TokenLeaderboard.tsx`

**Database:**
- `supabase/migrations/20251021000013_token_system.sql`

**Types:**
- `types/tokens.ts`

**Utilities:**
- `lib/tokens/constants.ts`
- `lib/tokens/helpers.ts`

### Lines of Code: ~3,000 lines
### Estimated Build Time: 4-6 hours (with agent)

---

**Agent 12 Status:** 📝 Documented, Ready for Implementation
**Next Steps:** Await user approval to begin build

---

*Last Updated: October 21, 2025*
*Agent Lead: Claude Code (Sonnet 4.5)*
*Documentation Version: 1.0*
