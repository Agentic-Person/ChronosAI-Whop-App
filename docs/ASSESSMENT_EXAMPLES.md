# Assessment System Examples

## Sample Generated Quiz

### Quiz Metadata
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "React Fundamentals Quiz",
  "description": "Auto-generated quiz covering React Hooks and State Management",
  "difficulty": "intermediate",
  "passing_score": 70,
  "time_limit_minutes": 20,
  "video_ids": ["video-1", "video-2", "video-3"]
}
```

### Sample Questions

#### Question 1: Multiple Choice
```json
{
  "id": "q_1",
  "type": "multiple-choice",
  "question": "What is the primary purpose of the useState hook in React?",
  "options": [
    "To make API calls",
    "To manage component state",
    "To handle side effects",
    "To create custom hooks"
  ],
  "correct_answer": "To manage component state",
  "explanation": "useState is a React Hook that allows you to add state to functional components. It returns an array with the current state value and a function to update it.",
  "points": 10,
  "difficulty": "easy",
  "topic": "React Hooks"
}
```

#### Question 2: True/False
```json
{
  "id": "q_2",
  "type": "true-false",
  "question": "React components re-render every time their state changes.",
  "options": ["True", "False"],
  "correct_answer": "True",
  "explanation": "When a component's state changes via setState or a state setter from useState, React schedules a re-render of that component to reflect the new state.",
  "points": 5,
  "difficulty": "easy",
  "topic": "React Rendering"
}
```

#### Question 3: Short Answer
```json
{
  "id": "q_3",
  "type": "short-answer",
  "question": "Explain the difference between props and state in React.",
  "correct_answer": "Props are read-only data passed from parent to child components, while state is mutable data managed within a component that can change over time.",
  "explanation": "Props (properties) are arguments passed to components from their parent and cannot be modified by the child. State is internal data that a component manages itself and can update using setState or state setters.",
  "points": 15,
  "difficulty": "medium",
  "topic": "React Fundamentals"
}
```

#### Question 4: Code Challenge
```json
{
  "id": "q_4",
  "type": "code-challenge",
  "question": "Write a useState hook declaration for a counter that starts at 0.",
  "correct_answer": "const [count, setCount] = useState(0);",
  "explanation": "This destructuring syntax creates a state variable 'count' initialized to 0 and a setter function 'setCount' to update it.",
  "points": 10,
  "difficulty": "medium",
  "topic": "React Hooks Syntax"
}
```

---

## Sample Quiz Submission Result

```json
{
  "attempt_id": "attempt-uuid",
  "quiz_id": "quiz-uuid",
  "student_id": "student-uuid",
  "score": 35,
  "passed": true,
  "total_points": 40,
  "earned_points": 35,
  "percentage": 88,
  "time_taken_seconds": 680,
  "xp_awarded": 150,
  "feedback": [
    {
      "question_id": "q_1",
      "question": "What is the primary purpose of useState...",
      "student_answer": "To manage component state",
      "correct_answer": "To manage component state",
      "is_correct": true,
      "points_earned": 10,
      "points_possible": 10,
      "explanation": "useState is a React Hook that allows..."
    },
    {
      "question_id": "q_2",
      "question": "React components re-render...",
      "student_answer": "True",
      "correct_answer": "True",
      "is_correct": true,
      "points_earned": 5,
      "points_possible": 5,
      "explanation": "When a component's state changes..."
    },
    {
      "question_id": "q_3",
      "question": "Explain the difference...",
      "student_answer": "Props are passed from parent and can't be changed. State is internal and can change.",
      "correct_answer": "Props are read-only data passed from parent...",
      "is_correct": true,
      "points_earned": 15,
      "points_possible": 15,
      "explanation": "Props (properties) are arguments..."
    },
    {
      "question_id": "q_4",
      "question": "Write a useState hook...",
      "student_answer": "const [count, setCount] = useState(0)",
      "correct_answer": "const [count, setCount] = useState(0);",
      "is_correct": true,
      "points_earned": 5,
      "points_possible": 10,
      "explanation": "Almost correct! Remember to include the semicolon."
    }
  ]
}
```

---

## Sample AI Code Review

### Submission Context
```json
{
  "project_title": "Build a Todo App",
  "language": "JavaScript",
  "difficulty": "beginner",
  "acceptance_criteria": [
    "Add new todos",
    "Mark todos as complete",
    "Delete todos",
    "Filter by status",
    "Persist data in localStorage",
    "Responsive design"
  ]
}
```

### Submitted Code (Excerpt)
```javascript
// Todo App Implementation
const todoApp = {
  todos: [],

  init() {
    this.loadTodos();
    this.attachEventListeners();
    this.render();
  },

  addTodo(text) {
    const todo = {
      id: Date.now(),
      text: text,
      completed: false
    };
    this.todos.push(todo);
    this.saveTodos();
    this.render();
  },

  toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveTodos();
      this.render();
    }
  },

  deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    this.saveTodos();
    this.render();
  },

  saveTodos() {
    localStorage.setItem('todos', JSON.stringify(this.todos));
  },

  loadTodos() {
    const stored = localStorage.getItem('todos');
    this.todos = stored ? JSON.parse(stored) : [];
  },

  render() {
    // DOM rendering logic
  }
};
```

### AI Review Output
```json
{
  "overall_assessment": "meets",
  "summary": "Solid implementation of a todo app with good structure. All acceptance criteria are met. Code is clean and functional, though there are opportunities for improvement in error handling and code organization.",

  "strengths": [
    "Clean object-oriented structure using a module pattern",
    "Proper use of localStorage for data persistence",
    "All CRUD operations implemented correctly",
    "Good function naming that clearly indicates purpose",
    "Efficient use of Array methods (find, filter)"
  ],

  "improvements": [
    "Add error handling for localStorage operations (quota exceeded, JSON parsing errors)",
    "Implement input validation before adding todos",
    "Consider using const/let instead of var if used anywhere",
    "Add comments to explain the module pattern for beginners",
    "Optimize render function to only update changed elements instead of full re-render"
  ],

  "bugs_and_issues": [
    {
      "severity": "minor",
      "type": "performance",
      "description": "Full re-render on every state change is inefficient",
      "line_number": 35,
      "suggestion": "Implement differential updates or use a framework like React for efficient rendering"
    },
    {
      "severity": "minor",
      "type": "bug",
      "description": "No validation for empty todo text",
      "line_number": 12,
      "suggestion": "Add: if (!text || !text.trim()) return; before creating todo object"
    }
  ],

  "security_concerns": [
    {
      "severity": "low",
      "description": "No sanitization of user input before rendering to DOM",
      "recommendation": "Use textContent instead of innerHTML, or sanitize input with DOMPurify library"
    }
  ],

  "best_practices_score": 85,
  "code_quality_score": 80,
  "functionality_score": 95,
  "overall_score": 87,

  "rubric_scores": [
    {
      "category": "Functionality",
      "score": 38,
      "max_score": 40,
      "feedback": "All required features implemented and working. Minor issue with input validation."
    },
    {
      "category": "Code Quality",
      "score": 16,
      "max_score": 20,
      "feedback": "Clean, organized code. Could benefit from more comments and error handling."
    },
    {
      "category": "UI/UX",
      "score": 17,
      "max_score": 20,
      "feedback": "Good user interface. Responsive design implemented well."
    },
    {
      "category": "Data Persistence",
      "score": 16,
      "max_score": 20,
      "feedback": "localStorage implementation works correctly. Add error handling for edge cases."
    }
  ],

  "detailed_feedback": "Your todo app demonstrates a solid understanding of JavaScript fundamentals and DOM manipulation. The module pattern you've used is appropriate for this size of application and keeps the code organized. The implementation of all CRUD operations is correct and the use of localStorage for persistence shows good understanding of browser APIs.\n\nTo take this to the next level, focus on:\n1. Error handling - especially around localStorage operations which can fail\n2. Input validation - prevent empty todos and handle edge cases\n3. Performance optimization - consider updating only changed DOM elements\n4. Security - sanitize user input before rendering to prevent XSS\n\nGreat work overall! This is a strong beginner project that demonstrates practical JavaScript skills."
}
```

---

## Sample Peer Review

### Review Data
```json
{
  "rating": 4,
  "code_quality_rating": 4,
  "functionality_rating": 5,
  "strengths": [
    "Very clean and easy to read code structure",
    "All features work smoothly without bugs",
    "Nice UI design with good color choices",
    "Great use of localStorage - todos persist perfectly"
  ],
  "improvements": [
    "Could add some comments to explain the module pattern",
    "Would be nice to have edit functionality for todos",
    "Consider adding a search/filter feature",
    "Animation on todo completion would enhance UX"
  ],
  "comments": "Really impressed with this implementation! The code is very clean and everything works perfectly. I particularly like how you organized the code with the module pattern - it makes it easy to understand what each function does. The localStorage implementation is flawless. My only suggestions would be to add a few comments for beginners who might read this code, and maybe consider adding edit functionality. Overall, great work!",
  "would_use_approach": true
}
```

### Aggregated Feedback (3 Reviews)
```json
{
  "submission_id": "submission-uuid",
  "total_reviews": 3,
  "avg_rating": 4.3,
  "avg_code_quality": 4.0,
  "avg_functionality": 4.7,

  "all_strengths": [
    "Very clean and easy to read code structure",
    "All features work smoothly without bugs",
    "Nice UI design with good color choices",
    "Great use of localStorage - todos persist perfectly",
    "Good function organization",
    "Responsive design works well on mobile",
    "Clear variable names",
    "Efficient array methods usage"
  ],

  "all_improvements": [
    "Could add some comments to explain the module pattern",
    "Would be nice to have edit functionality for todos",
    "Consider adding a search/filter feature",
    "Animation on todo completion would enhance UX",
    "Add error handling for localStorage",
    "Input validation for empty todos"
  ],

  "reviewer_consensus": "Excellent work! Peers highly recommend this implementation."
}
```

---

## Project Template Example

### Todo App Template
```json
{
  "id": "template-todo-app",
  "title": "Build a Todo App",
  "description": "Create a full-featured todo list application with CRUD operations, filtering, and local storage persistence.",
  "category": "web",
  "difficulty": "beginner",

  "starter_code": "<!DOCTYPE html>\n<html>\n<head>\n  <title>My Todo App</title>\n  <link rel=\"stylesheet\" href=\"styles.css\">\n</head>\n<body>\n  <div id=\"app\"></div>\n  <script src=\"app.js\"></script>\n</body>\n</html>",

  "acceptance_criteria": [
    "Add new todos",
    "Mark todos as complete",
    "Delete todos",
    "Filter by status (all/active/completed)",
    "Persist data in localStorage",
    "Responsive design"
  ],

  "rubric": [
    {
      "category": "Functionality",
      "points": 40,
      "criteria": "All CRUD operations work correctly"
    },
    {
      "category": "Code Quality",
      "points": 20,
      "criteria": "Clean, well-organized JavaScript"
    },
    {
      "category": "UI/UX",
      "points": 20,
      "criteria": "Intuitive interface and responsive design"
    },
    {
      "category": "Data Persistence",
      "points": 20,
      "criteria": "LocalStorage implementation"
    }
  ],

  "technologies": ["HTML", "CSS", "JavaScript", "LocalStorage"],

  "estimated_hours": 8,

  "learning_objectives": [
    "DOM manipulation",
    "Event handling",
    "LocalStorage API",
    "Array methods",
    "Responsive design"
  ]
}
```

---

## Quiz Analytics Example

```json
{
  "quiz_id": "quiz-uuid",
  "total_attempts": 45,
  "unique_students": 28,
  "avg_score": 78,
  "pass_rate": 82,
  "avg_time_seconds": 720,

  "question_stats": [
    {
      "question_id": "q_1",
      "question": "What is the primary purpose of useState...",
      "correct_count": 42,
      "incorrect_count": 3,
      "accuracy_rate": 93
    },
    {
      "question_id": "q_2",
      "question": "React components re-render...",
      "correct_count": 40,
      "incorrect_count": 5,
      "accuracy_rate": 89
    },
    {
      "question_id": "q_3",
      "question": "Explain the difference between props and state...",
      "correct_count": 30,
      "incorrect_count": 15,
      "accuracy_rate": 67
    },
    {
      "question_id": "q_4",
      "question": "Write a useState hook declaration...",
      "correct_count": 25,
      "incorrect_count": 20,
      "accuracy_rate": 56
    }
  ]
}
```

This analytics shows that Question 4 (code challenge) is the most difficult with only 56% accuracy, while Question 1 (multiple choice) has 93% accuracy.
