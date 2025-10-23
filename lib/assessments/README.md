# ChronosAI - Assessment System (Quizzes + Projects)

**Status:** SCAFFOLD ONLY
**Agent:** Agent 3

## Responsibilities

### Quiz Module
- AI-powered quiz generation from videos
- Multiple question types (MC, T/F, short answer, code challenges)
- Difficulty scaling
- Unique question generation
- Grading system with detailed feedback

### Project Module
- Project template system
- Project submission interface (GitHub, file upload, live demo)
- AI code review and feedback
- Project milestone tracking
- Portfolio showcase
- Project forking/variations

### Shared Features
- Unified grading system
- Peer review capabilities
- Progress tracking integration

## Key Files (Scaffolded)
- `quiz-generator.ts` - AI quiz creation
- `project-manager.ts` - Project lifecycle management
- `code-reviewer.ts` - AI code analysis
- `grading-engine.ts` - Scoring logic
- `peer-review.ts` - Peer review system

## Dependencies
- Claude API for generation
- GitHub API for repo integration
- Monaco Editor for code display
- Supabase for storage

## API Endpoints (Stubs)
- `POST /api/quiz/generate` - Generate quiz
- `POST /api/quiz/attempt` - Submit quiz
- `POST /api/project/create` - Create project template
- `POST /api/project/submit` - Submit project
- `GET /api/project/review/:id` - Get project review

## TODO for Full Implementation
- [ ] Implement Claude-based quiz generation
- [ ] Build project template system
- [ ] Create AI code review logic
- [ ] Integrate GitHub API
- [ ] Build Monaco code editor component
- [ ] Implement peer review workflow
