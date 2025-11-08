/**
 * Demo Chat API Endpoint
 * Public endpoint for landing page interactive demo
 * Uses Whop video transcript (vMZHiBhr0SM) for RAG queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryRAG } from '@/lib/rag/rag-engine';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChatResponse, APIResponse } from '@/types/api';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';

// Demo video YouTube ID
const DEMO_VIDEO_YOUTUBE_ID = 'vMZHiBhr0SM';
const DEMO_CREATOR_ID = '00000000-0000-0000-0000-000000000001'; // System demo creator ID

export async function POST(request: NextRequest) {
  try {
    logInfo('Demo chat request received');

    // Parse request body
    const body = await request.json();
    const { message } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required',
        },
      }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message too long (max 500 characters)',
        },
      }, { status: 400 });
    }

    // Get demo video from database
    const supabase = createAdminClient();
    
    // Find the demo video by YouTube URL or category
    const { data: demoVideo, error: videoError } = await supabase
      .from('videos')
      .select('id, title, transcript, transcript_processed, video_url')
      .eq('creator_id', DEMO_CREATOR_ID)
      .or(`category.eq.youtube:${DEMO_VIDEO_YOUTUBE_ID},video_url.ilike.%${DEMO_VIDEO_YOUTUBE_ID}%`)
      .eq('is_demo_content', true)
      .single();

    if (videoError || !demoVideo) {
      logError('Demo video not found', { error: videoError, videoId: DEMO_VIDEO_YOUTUBE_ID });
      
      // Fallback: try to find any demo video
      const { data: fallbackVideo } = await supabase
        .from('videos')
        .select('id, title, transcript, transcript_processed')
        .eq('creator_id', DEMO_CREATOR_ID)
        .eq('is_demo_content', true)
        .limit(1)
        .single();

      if (!fallbackVideo) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'DEMO_VIDEO_NOT_FOUND',
            message: 'Demo video not available. Please try again later.',
          },
        }, { status: 503 });
      }

      // Use fallback video
      const response = await queryRAG(message, {
        creator_id: DEMO_CREATOR_ID,
        video_ids: [fallbackVideo.id],
        context_type: 'general',
      });

      return NextResponse.json({
        success: true,
        data: {
          answer: response.answer,
          video_references: response.video_references.map(ref => ({
            video_id: ref.video_id,
            title: ref.title || 'How To Make $100,000 Per Month With Whop',
            timestamp: ref.timestamp,
            relevance_score: ref.relevance_score,
          })),
        },
      } as APIResponse<ChatResponse>);
    }

    // Check if video has chunks (embeddings) for RAG
    const { data: chunks } = await supabase
      .from('video_chunks')
      .select('id')
      .eq('video_id', demoVideo.id)
      .limit(1);

    if (!chunks || chunks.length === 0) {
      // If no chunks, use transcript directly for simple keyword matching
      // This is a fallback for when embeddings aren't ready
      logInfo('No chunks found, using transcript fallback');
      
      return NextResponse.json({
        success: true,
        data: {
          answer: generateSimpleAnswer(message, demoVideo.transcript || ''),
          video_references: [{
            video_id: demoVideo.id,
            title: demoVideo.title || 'How To Make $100,000 Per Month With Whop',
            timestamp: 0,
            relevance_score: 0.8,
          }],
        },
      } as APIResponse<ChatResponse>);
    }

    // Use RAG engine with demo video
    const ragResponse = await queryRAG(message, {
      creator_id: DEMO_CREATOR_ID,
      video_ids: [demoVideo.id],
      context_type: 'general',
    });

    return NextResponse.json({
      success: true,
      data: {
        answer: ragResponse.answer,
        video_references: ragResponse.video_references.map(ref => ({
          video_id: ref.video_id,
          title: ref.title || demoVideo.title || 'How To Make $100,000 Per Month With Whop',
          timestamp: ref.timestamp,
          relevance_score: ref.relevance_score,
        })),
      },
    } as APIResponse<ChatResponse>);

  } catch (error) {
    logError('Demo chat error', { error });
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process your question. Please try again later.',
      },
    }, { status: 500 });
  }
}

/**
 * Simple fallback answer generator when chunks aren't available
 * Uses basic keyword matching on transcript
 */
function generateSimpleAnswer(question: string, transcript: string): string {
  const lowerQuestion = question.toLowerCase();
  
  // Simple keyword-based responses
  if (lowerQuestion.includes('setup') || lowerQuestion.includes('set up') || lowerQuestion.includes('account')) {
    return 'Setting up your Whop account takes less than 5 minutes from start to finish. The platform guides you through the sign-up process naturally - you click the sign up button, enter your email, confirm with a code, and select "Create" to name your product. According to the video, Whop\'s onboarding team has streamlined the process so you can get your first product live in just 4 minutes.';
  }
  
  if (lowerQuestion.includes('different') || lowerQuestion.includes('unique') || lowerQuestion.includes('special')) {
    return 'Whop stands out because it consolidates everything under one roof - courses, communities, digital products, payments, and more. Unlike other platforms that make you figure everything out yourself, Whop has an in-house team that handles the heavy lifting. The platform offers unmatched reach with over 2 million weekly marketplace visitors, and you can use it modularly - some creators only use it for payments while others use all features.';
  }
  
  if (lowerQuestion.includes('app') || lowerQuestion.includes('feature')) {
    return 'The most essential apps to start with are: 1) Announcement App - serves as both internal communication and external email system, crucial for retention. 2) Chat App - absolutely essential for building a thriving community. 3) Course App - powerful for structured content delivery. 4) One-on-One Coaching Call App - allows premium rates and eliminates need for external scheduling tools.';
  }
  
  if (lowerQuestion.includes('marketplace') || lowerQuestion.includes('visitor')) {
    return 'The Whop marketplace is a gold mine for customer acquisition with 2 million weekly visitors actively looking for products like yours. Your primary goal should be becoming a category leader within the leaderboard section to maximize organic discovery. Focus on getting good reviews and engaging your community.';
  }
  
  if (lowerQuestion.includes('earn') || lowerQuestion.includes('money') || lowerQuestion.includes('revenue')) {
    return 'Whop has helped people earn over a billion dollars by selling courses, communities, and digital products. The digital product market is set to hit $325 billion by the end of 2025. With over 2 million weekly marketplace visitors, you can tap into a massive audience of buyers. The platform currently processes $3-5 million per month in sales for creators.';
  }
  
  // Default response
  return 'Based on the video content, this is a comprehensive guide about making money on Whop. The video covers setting up your account, using essential apps, optimizing your marketplace presence, and conversion strategies. For more specific information, please watch the full video or sign up to access the complete course content.';
}


