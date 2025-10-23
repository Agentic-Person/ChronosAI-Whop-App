-- ============================================================================
-- CHRONOS Token Reward System Migration
-- ============================================================================
-- Creates tables and functions for Solana-based token rewards with:
-- - Token wallets with encrypted Solana keys
-- - Transaction logging (earn/spend/redeem)
-- - Redemption requests (PayPal, gift cards, platform credit)
-- - Token leaderboard (materialized view)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: token_wallets
-- ============================================================================
-- Stores Solana wallet information for each student
-- Private keys are encrypted with AES-256-GCM before storage
-- ============================================================================

CREATE TABLE token_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  solana_address TEXT UNIQUE NOT NULL,
  private_key_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted private key
  balance BIGINT DEFAULT 0 NOT NULL CHECK (balance >= 0), -- Cached balance (synced from on-chain)
  total_earned BIGINT DEFAULT 0 NOT NULL CHECK (total_earned >= 0),
  total_spent BIGINT DEFAULT 0 NOT NULL CHECK (total_spent >= 0),
  total_redeemed BIGINT DEFAULT 0 NOT NULL CHECK (total_redeemed >= 0),
  last_synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one wallet per student
  UNIQUE(student_id)
);

-- Indexes for performance
CREATE INDEX idx_token_wallets_student ON token_wallets(student_id);
CREATE INDEX idx_token_wallets_balance ON token_wallets(balance DESC);
CREATE INDEX idx_token_wallets_total_earned ON token_wallets(total_earned DESC);

-- Updated_at trigger
CREATE TRIGGER update_token_wallets_updated_at
  BEFORE UPDATE ON token_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: token_transactions
-- ============================================================================
-- Logs all token transactions (earn/spend/redeem)
-- ============================================================================

CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES token_wallets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'redeem')),
  source TEXT NOT NULL, -- 'video_watch', 'quiz_complete', 'achievement_unlock', 'item_purchase', etc.
  source_id UUID, -- Reference to video_id, quiz_id, achievement_id, etc.
  signature TEXT, -- Solana transaction signature (on-chain proof)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_token_tx_wallet ON token_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_token_tx_student ON token_transactions(student_id, created_at DESC);
CREATE INDEX idx_token_tx_type ON token_transactions(type, created_at DESC);
CREATE INDEX idx_token_tx_source ON token_transactions(source, created_at DESC);
CREATE INDEX idx_token_tx_created_at ON token_transactions(created_at DESC);

-- ============================================================================
-- TABLE: redemption_requests
-- ============================================================================
-- Tracks real-world token redemption requests
-- ============================================================================

CREATE TABLE redemption_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES token_wallets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  redemption_type TEXT NOT NULL CHECK (redemption_type IN ('paypal', 'gift_card', 'platform_credit')),
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_details JSONB NOT NULL, -- { email, address, preferences }
  transaction_id TEXT, -- PayPal/gift card transaction ID
  admin_notes TEXT,
  processed_by UUID REFERENCES creators(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_redemption_status ON redemption_requests(status, created_at DESC);
CREATE INDEX idx_redemption_student ON redemption_requests(student_id, created_at DESC);
CREATE INDEX idx_redemption_wallet ON redemption_requests(wallet_id, created_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_redemption_requests_updated_at
  BEFORE UPDATE ON redemption_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MATERIALIZED VIEW: token_leaderboard
-- ============================================================================
-- Cached leaderboard of top CHRONOS earners
-- Refreshed hourly via cron job
-- ============================================================================

CREATE MATERIALIZED VIEW token_leaderboard AS
SELECT
  tw.student_id,
  s.full_name,
  s.avatar_url,
  tw.balance AS current_balance,
  tw.total_earned,
  tw.total_spent,
  tw.total_redeemed,
  RANK() OVER (ORDER BY tw.total_earned DESC) as rank
FROM token_wallets tw
JOIN students s ON tw.student_id = s.id
WHERE tw.total_earned > 0
ORDER BY tw.total_earned DESC
LIMIT 100;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_token_leaderboard_student ON token_leaderboard(student_id);

-- ============================================================================
-- FUNCTION: refresh_token_leaderboard
-- ============================================================================
-- Refreshes the token leaderboard materialized view
-- Call hourly via cron: SELECT refresh_token_leaderboard();
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_token_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY token_leaderboard;
END;
$$;

-- ============================================================================
-- FUNCTION: award_tokens
-- ============================================================================
-- Awards CHRONOS tokens to a student and logs the transaction
-- Returns the new balance
-- ============================================================================

CREATE OR REPLACE FUNCTION award_tokens(
  p_student_id UUID,
  p_amount BIGINT,
  p_source TEXT,
  p_source_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance BIGINT;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Token amount must be positive';
  END IF;

  -- Get or create wallet
  SELECT id INTO v_wallet_id
  FROM token_wallets
  WHERE student_id = p_student_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for student %', p_student_id;
  END IF;

  -- Update wallet balance and totals
  UPDATE token_wallets
  SET
    balance = balance + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO token_transactions (
    wallet_id,
    student_id,
    amount,
    type,
    source,
    source_id,
    metadata
  ) VALUES (
    v_wallet_id,
    p_student_id,
    p_amount,
    'earn',
    p_source,
    p_source_id,
    p_metadata
  );

  RETURN v_new_balance;
END;
$$;

-- ============================================================================
-- FUNCTION: spend_tokens
-- ============================================================================
-- Spends CHRONOS tokens and logs the transaction
-- Returns the new balance
-- ============================================================================

CREATE OR REPLACE FUNCTION spend_tokens(
  p_student_id UUID,
  p_amount BIGINT,
  p_source TEXT,
  p_source_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Token amount must be positive';
  END IF;

  -- Get wallet and current balance
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM token_wallets
  WHERE student_id = p_student_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for student %', p_student_id;
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_current_balance, p_amount;
  END IF;

  -- Update wallet balance and totals
  UPDATE token_wallets
  SET
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO token_transactions (
    wallet_id,
    student_id,
    amount,
    type,
    source,
    source_id,
    metadata
  ) VALUES (
    v_wallet_id,
    p_student_id,
    p_amount,
    'spend',
    p_source,
    p_source_id,
    p_metadata
  );

  RETURN v_new_balance;
END;
$$;

-- ============================================================================
-- FUNCTION: redeem_tokens
-- ============================================================================
-- Redeems CHRONOS tokens (marks for real-world redemption)
-- Returns the redemption request ID
-- ============================================================================

CREATE OR REPLACE FUNCTION redeem_tokens(
  p_student_id UUID,
  p_amount BIGINT,
  p_redemption_type TEXT,
  p_payout_details JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_request_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Redemption amount must be positive';
  END IF;

  -- Validate redemption type
  IF p_redemption_type NOT IN ('paypal', 'gift_card', 'platform_credit') THEN
    RAISE EXCEPTION 'Invalid redemption type: %', p_redemption_type;
  END IF;

  -- Get wallet and current balance
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM token_wallets
  WHERE student_id = p_student_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for student %', p_student_id;
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance for redemption. Current: %, Required: %', v_current_balance, p_amount;
  END IF;

  -- Update wallet balance and totals
  UPDATE token_wallets
  SET
    balance = balance - p_amount,
    total_redeemed = total_redeemed + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO token_transactions (
    wallet_id,
    student_id,
    amount,
    type,
    source,
    metadata
  ) VALUES (
    v_wallet_id,
    p_student_id,
    p_amount,
    'redeem',
    p_redemption_type,
    jsonb_build_object('redemption_type', p_redemption_type)
  );

  -- Create redemption request
  INSERT INTO redemption_requests (
    wallet_id,
    student_id,
    amount,
    redemption_type,
    payout_details,
    status
  ) VALUES (
    v_wallet_id,
    p_student_id,
    p_amount,
    p_redemption_type,
    p_payout_details,
    'pending'
  ) RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- ============================================================================
-- FUNCTION: sync_wallet_balance
-- ============================================================================
-- Syncs wallet balance from on-chain Solana balance
-- Called after blockchain operations
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_wallet_balance(
  p_wallet_id UUID,
  p_on_chain_balance BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE token_wallets
  SET
    balance = p_on_chain_balance,
    last_synced_at = NOW(),
    updated_at = NOW()
  WHERE id = p_wallet_id;
END;
$$;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own wallet
CREATE POLICY "Students can view own wallet"
  ON token_wallets FOR SELECT
  USING (student_id = auth.uid());

-- Students can view their own transactions
CREATE POLICY "Students can view own transactions"
  ON token_transactions FOR SELECT
  USING (student_id = auth.uid());

-- Students can view their own redemption requests
CREATE POLICY "Students can view own redemption requests"
  ON redemption_requests FOR SELECT
  USING (student_id = auth.uid());

-- Creators can view all wallets and transactions for their students
CREATE POLICY "Creators can view student wallets"
  ON token_wallets FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN creators c ON s.creator_id = c.id
      WHERE c.whop_user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view student transactions"
  ON token_transactions FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN creators c ON s.creator_id = c.id
      WHERE c.whop_user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can manage redemption requests"
  ON redemption_requests FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN creators c ON s.creator_id = c.id
      WHERE c.whop_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE token_wallets IS 'Solana wallet information for each student with encrypted private keys';
COMMENT ON TABLE token_transactions IS 'Transaction log for all token operations (earn/spend/redeem)';
COMMENT ON TABLE redemption_requests IS 'Real-world redemption requests (PayPal, gift cards, platform credit)';
COMMENT ON MATERIALIZED VIEW token_leaderboard IS 'Cached leaderboard of top CHRONOS earners (refreshed hourly)';

COMMENT ON FUNCTION award_tokens IS 'Awards CHRONOS tokens to student and logs transaction';
COMMENT ON FUNCTION spend_tokens IS 'Spends CHRONOS tokens and logs transaction';
COMMENT ON FUNCTION redeem_tokens IS 'Redeems CHRONOS tokens for real-world value';
COMMENT ON FUNCTION sync_wallet_balance IS 'Syncs database balance with on-chain Solana balance';
COMMENT ON FUNCTION refresh_token_leaderboard IS 'Refreshes the token leaderboard materialized view';

-- ============================================================================
-- End of Migration
-- ============================================================================
