-- ============================================================================
-- SEED ACHIEVEMENTS
-- ============================================================================

INSERT INTO achievements (name, description, icon_url, animation_type, xp_value, rarity, criteria) VALUES
-- Video Completion Achievements
('First Steps', 'Complete your first video', '/achievements/first-video.svg', 'stars', 50, 'common', '{"type": "video_completed", "count": 1}'),
('Learning Streak', 'Watch videos for 7 days in a row', '/achievements/week-streak.svg', 'fireworks', 200, 'rare', '{"type": "daily_streak", "days": 7}'),
('Marathon Learner', 'Watch 10 hours of content', '/achievements/marathon.svg', 'confetti', 500, 'epic', '{"type": "watch_time", "hours": 10}'),
('Course Conqueror', 'Complete 50 videos', '/achievements/conqueror.svg', 'fireworks', 1000, 'epic', '{"type": "video_completed", "count": 50}'),

-- Quiz Achievements
('Quiz Master', 'Pass your first quiz with 90%+', '/achievements/quiz-master.svg', 'trophy', 100, 'common', '{"type": "quiz_score", "percentage": 90}'),
('Perfect Score', 'Get 100% on any quiz', '/achievements/perfect.svg', 'stars', 300, 'rare', '{"type": "quiz_score", "percentage": 100}'),
('Quiz Champion', 'Pass 20 quizzes', '/achievements/champion.svg', 'fireworks', 750, 'epic', '{"type": "quiz_passed", "count": 20}'),

-- Project Achievements
('First Build', 'Submit your first project', '/achievements/first-project.svg', 'rocket', 250, 'common', '{"type": "project_submitted", "count": 1}'),
('Code Reviewer', 'Review 5 peer projects', '/achievements/reviewer.svg', 'stars', 300, 'rare', '{"type": "peer_reviews", "count": 5}'),
('Project Pro', 'Complete 10 projects', '/achievements/project-pro.svg', 'fireworks', 1500, 'legendary', '{"type": "project_completed", "count": 10}'),
('GitHub Star', 'Get 100 stars on a project', '/achievements/github-star.svg', 'stars', 500, 'epic', '{"type": "github_stars", "count": 100}'),

-- Community Achievements
('Team Player', 'Join a study group', '/achievements/team.svg', 'confetti', 150, 'common', '{"type": "joined_group", "count": 1}'),
('Mentor', 'Help 10 students in chat', '/achievements/mentor.svg', 'stars', 400, 'rare', '{"type": "helpful_answers", "count": 10}'),
('Community Leader', 'Create a study group', '/achievements/leader.svg', 'rocket', 300, 'rare', '{"type": "created_group", "count": 1}'),

-- XP and Level Achievements
('Level 5', 'Reach level 5', '/achievements/level-5.svg', 'level-up', 100, 'common', '{"type": "level_reached", "level": 5}'),
('Level 10', 'Reach level 10', '/achievements/level-10.svg', 'level-up', 300, 'rare', '{"type": "level_reached", "level": 10}'),
('Level 25', 'Reach level 25', '/achievements/level-25.svg', 'level-up', 1000, 'epic', '{"type": "level_reached", "level": 25}'),
('XP Master', 'Earn 10,000 XP', '/achievements/xp-master.svg', 'fireworks', 500, 'epic', '{"type": "xp_earned", "amount": 10000}'),

-- Special Achievements
('Early Bird', 'Complete a lesson before 8 AM', '/achievements/early-bird.svg', 'stars', 100, 'rare', '{"type": "early_completion", "hour": 8}'),
('Night Owl', 'Study after midnight', '/achievements/night-owl.svg', 'stars', 100, 'rare', '{"type": "late_completion", "hour": 0}'),
('Speed Runner', 'Complete a quiz in under 5 minutes', '/achievements/speedrun.svg', 'rocket', 200, 'rare', '{"type": "quiz_time", "minutes": 5}'),
('Perfectionist', 'Get 100% on 5 quizzes', '/achievements/perfectionist.svg', 'fireworks', 600, 'epic', '{"type": "perfect_quizzes", "count": 5}');
