#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * Validates that all required environment variables are set and properly formatted
 * Run this before deploying to production
 *
 * Usage: node scripts/validate-env.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Environment variable definitions
const ENV_VARS = {
  REQUIRED: {
    // Application
    'NEXT_PUBLIC_APP_URL': {
      description: 'Production URL of the application',
      validate: (val) => val.startsWith('https://') || val.startsWith('http://localhost'),
      example: 'https://your-app.vercel.app',
    },
    'NODE_ENV': {
      description: 'Environment mode',
      validate: (val) => ['development', 'production', 'test'].includes(val),
      example: 'production',
    },

    // Whop Integration
    'WHOP_API_KEY': {
      description: 'Whop API key for server-side calls',
      validate: (val) => val.startsWith('whop_'),
      example: 'whop_xxxxxxxxxxxx',
    },
    'NEXT_PUBLIC_WHOP_APP_ID': {
      description: 'Whop App ID (public)',
      validate: (val) => val.startsWith('app_'),
      example: 'app_xxxxxxxxxxxx',
    },
    'WHOP_CLIENT_ID': {
      description: 'Whop OAuth Client ID',
      validate: (val) => val.length > 10,
      example: 'xxxxxxxxxxxxxxxxxxxx',
    },
    'WHOP_CLIENT_SECRET': {
      description: 'Whop OAuth Client Secret',
      validate: (val) => val.length > 10,
      example: 'xxxxxxxxxxxxxxxxxxxx',
    },
    'WHOP_WEBHOOK_SECRET': {
      description: 'Whop Webhook Secret for signature verification',
      validate: (val) => val.startsWith('whop_webhook_'),
      example: 'whop_webhook_xxxxxxxxxxxx',
    },
    'WHOP_TOKEN_ENCRYPTION_KEY': {
      description: 'Encryption key for Whop tokens (64 char hex)',
      validate: (val) => /^[0-9a-f]{64}$/i.test(val),
      example: '0123456789abcdef...(64 chars)',
    },

    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL': {
      description: 'Supabase project URL',
      validate: (val) => val.startsWith('https://') && val.includes('supabase'),
      example: 'https://xxxxxxxxxxxx.supabase.co',
    },
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
      description: 'Supabase anonymous key',
      validate: (val) => val.startsWith('eyJ'),
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
    'SUPABASE_SERVICE_ROLE_KEY': {
      description: 'Supabase service role key (secret)',
      validate: (val) => val.startsWith('eyJ'),
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },

    // AI Services
    'ANTHROPIC_API_KEY': {
      description: 'Anthropic Claude API key',
      validate: (val) => val.startsWith('sk-ant-'),
      example: 'sk-ant-api03-xxxxxxxxxxxx',
    },
    'OPENAI_API_KEY': {
      description: 'OpenAI API key',
      validate: (val) => val.startsWith('sk-') || val.startsWith('sk-proj-'),
      example: 'sk-proj-xxxxxxxxxxxx',
    },

    // Monitoring
    'SENTRY_DSN': {
      description: 'Sentry DSN for error tracking',
      validate: (val) => val.includes('sentry.io'),
      example: 'https://xxxxxxxx@sentry.io/xxxxxxx',
    },

    // Cache & Queue
    'KV_REST_API_URL': {
      description: 'Vercel KV (Upstash) REST API URL',
      validate: (val) => val.startsWith('https://') && val.includes('upstash'),
      example: 'https://xxxx.upstash.io',
    },
    'KV_REST_API_TOKEN': {
      description: 'Vercel KV REST API token',
      validate: (val) => val.length > 20,
      example: 'xxxxxxxxxxxxxxxxxxxx',
    },
    'INNGEST_EVENT_KEY': {
      description: 'Inngest event key',
      validate: (val) => val.startsWith('evt_'),
      example: 'evt_xxxxxxxxxxxx',
    },
    'INNGEST_SIGNING_KEY': {
      description: 'Inngest signing key',
      validate: (val) => val.startsWith('signkey-'),
      example: 'signkey-prod-xxxxxxxxxxxx',
    },

    // Email
    'RESEND_API_KEY': {
      description: 'Resend email API key',
      validate: (val) => val.startsWith('re_'),
      example: 're_xxxxxxxxxxxx',
    },
    'RESEND_FROM_EMAIL': {
      description: 'Sender email address',
      validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      example: 'noreply@yourdomain.com',
    },
  },

  OPTIONAL: {
    // Discord (Enterprise feature)
    'DISCORD_BOT_TOKEN': {
      description: 'Discord bot token (Enterprise tier)',
      validate: (val) => val.length > 50,
    },
    'DISCORD_CLIENT_ID': {
      description: 'Discord OAuth client ID',
      validate: (val) => /^\d+$/.test(val),
    },
    'DISCORD_GUILD_ID': {
      description: 'Discord server ID',
      validate: (val) => /^\d+$/.test(val),
    },

    // YouTube
    'YOUTUBE_API_KEY': {
      description: 'YouTube Data API v3 key',
      validate: (val) => val.startsWith('AIzaSy'),
    },

    // PostHog
    'NEXT_PUBLIC_POSTHOG_KEY': {
      description: 'PostHog analytics key',
      validate: (val) => val.startsWith('phc_'),
    },

    // Sentry (additional)
    'SENTRY_AUTH_TOKEN': {
      description: 'Sentry auth token for source maps',
      validate: (val) => val.startsWith('sntrys_'),
    },
  },
};

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  addError(varName, message) {
    this.errors.push({ varName, message });
  }

  addWarning(varName, message) {
    this.warnings.push({ varName, message });
  }

  addPassed(varName) {
    this.passed.push(varName);
  }

  validateVariable(varName, config, isRequired) {
    const value = process.env[varName];

    // Check if variable is set
    if (!value || value.trim() === '') {
      if (isRequired) {
        this.addError(varName, `Missing required variable`);
        return false;
      } else {
        this.addWarning(varName, `Optional variable not set`);
        return true;
      }
    }

    // Check for placeholder values
    const placeholders = ['your_', 'xxxx', 'change_me', 'todo', 'example'];
    if (placeholders.some(p => value.toLowerCase().includes(p))) {
      this.addError(varName, `Contains placeholder value: ${value}`);
      return false;
    }

    // Run custom validation
    if (config.validate && !config.validate(value)) {
      this.addError(varName, `Invalid format. Expected: ${config.example || 'valid format'}`);
      return false;
    }

    this.addPassed(varName);
    return true;
  }

  validateAll() {
    this.log('\n🔍 Validating Environment Variables...\n', 'cyan');

    // Validate required variables
    this.log('Required Variables:', 'blue');
    Object.entries(ENV_VARS.REQUIRED).forEach(([varName, config]) => {
      this.validateVariable(varName, config, true);
    });

    // Validate optional variables
    this.log('\nOptional Variables:', 'blue');
    Object.entries(ENV_VARS.OPTIONAL).forEach(([varName, config]) => {
      this.validateVariable(varName, config, false);
    });

    // Print results
    this.printResults();

    // Return exit code
    return this.errors.length === 0 ? 0 : 1;
  }

  printResults() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('VALIDATION RESULTS', 'cyan');
    this.log('='.repeat(60) + '\n', 'cyan');

    // Print passed variables
    if (this.passed.length > 0) {
      this.log(`✅ Passed: ${this.passed.length} variables`, 'green');
      this.passed.forEach(varName => {
        this.log(`  ✓ ${varName}`, 'green');
      });
      console.log();
    }

    // Print warnings
    if (this.warnings.length > 0) {
      this.log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
      this.warnings.forEach(({ varName, message }) => {
        this.log(`  ⚠ ${varName}: ${message}`, 'yellow');
      });
      console.log();
    }

    // Print errors
    if (this.errors.length > 0) {
      this.log(`❌ Errors: ${this.errors.length}`, 'red');
      this.errors.forEach(({ varName, message }) => {
        this.log(`  ✗ ${varName}: ${message}`, 'red');
        const config = ENV_VARS.REQUIRED[varName] || ENV_VARS.OPTIONAL[varName];
        if (config) {
          this.log(`    Description: ${config.description}`, 'reset');
          if (config.example) {
            this.log(`    Example: ${config.example}`, 'reset');
          }
        }
      });
      console.log();
    }

    // Summary
    this.log('='.repeat(60), 'cyan');
    if (this.errors.length === 0) {
      this.log('✅ All required environment variables are valid!', 'green');
      this.log('='.repeat(60) + '\n', 'cyan');
    } else {
      this.log('❌ Validation failed. Please fix the errors above.', 'red');
      this.log('='.repeat(60) + '\n', 'cyan');
    }
  }

  generateEnvTemplate() {
    this.log('\n📝 Environment Variable Template:\n', 'cyan');

    Object.entries(ENV_VARS.REQUIRED).forEach(([varName, config]) => {
      console.log(`# ${config.description}`);
      console.log(`# Example: ${config.example || 'N/A'}`);
      console.log(`${varName}=`);
      console.log();
    });
  }
}

// Main execution
if (require.main === module) {
  const validator = new EnvValidator();

  // Check if we should generate template
  if (process.argv.includes('--template')) {
    validator.generateEnvTemplate();
    process.exit(0);
  }

  // Load .env file if it exists (for local testing)
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath) && !process.env.CI) {
    validator.log('Loading .env.local for local validation...', 'yellow');
    require('dotenv').config({ path: envPath });
  }

  // Run validation
  const exitCode = validator.validateAll();
  process.exit(exitCode);
}

module.exports = EnvValidator;
