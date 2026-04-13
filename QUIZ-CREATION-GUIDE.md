# 📝 Quiz Creation Guide

A comprehensive guide to creating custom quizzes for the Study Dashboard.

## 📋 Basic Structure

Every quiz JSON file needs this structure:

```json
{
  "title": "Your Quiz Title",
  "questions": [
    {
      "id": 1,
      "text": "Question text goes here?",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "correct": 0
    }
  ]
}
```

## 🔍 Field Explanations

### `title` (Required)
- String: The name of your quiz
- Displayed at the top during the quiz
- Example: `"Biology 101 Midterm"`, `"Spanish Vocabulary"`, `"Math Algebra"`

### `questions` (Required)
- Array: List of all questions in the quiz
- Minimum 1 question, no maximum limit
- Each question must follow the structure below

### Question Object Fields

#### `id` (Required)
- Number: Unique identifier for the question
- Must be unique within the quiz
- Examples: `1`, `2`, `3`, etc.
- Used for spaced repetition tracking

#### `text` (Required)
- String: The actual question
- Can be as long as needed
- Examples:
  - `"What is the capital of France?"`
  - `"Which of the following is NOT a type of renewable energy?"`
  - `"In the context of machine learning, what does 'overfitting' mean?"`

#### `options` (Required)
- Array of strings: Answer choices
- Can have 2 to 10+ options (4 is most common)
- Order matters - position determines the `correct` index
- Examples:
  ```json
  "options": ["Paris", "London", "Berlin", "Madrid"]
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"]
  "options": ["True", "False"]
  ```

#### `correct` (Required)
- Number: Index of the correct answer (0-based)
- Index `0` = first option
- Index `1` = second option
- Index `2` = third option
- etc.

**Example:**
```json
{
  "text": "What is 2+2?",
  "options": ["3", "4", "5", "6"],
  "correct": 1
}
```
Here, `correct: 1` means the second option ("4") is correct.

---

## ✍️ Example Quizzes

### Biology Quiz (Multiple Choice)
```json
{
  "title": "Human Anatomy",
  "questions": [
    {
      "id": 1,
      "text": "How many bones are in the adult human body?",
      "options": [
        "A) 186",
        "B) 206",
        "C) 226",
        "D) 246"
      ],
      "correct": 1
    },
    {
      "id": 2,
      "text": "What is the largest organ in the human body?",
      "options": [
        "A) Heart",
        "B) Liver",
        "C) Skin",
        "D) Brain"
      ],
      "correct": 2
    }
  ]
}
```

### History Quiz (True/False + Multiple Choice)
```json
{
  "title": "World War II",
  "questions": [
    {
      "id": 1,
      "text": "The Berlin Wall fell in 1989.",
      "options": ["True", "False"],
      "correct": 0
    },
    {
      "id": 2,
      "text": "Who was the first President of the United States?",
      "options": [
        "A) Thomas Jefferson",
        "B) George Washington",
        "C) John Adams",
        "D) Benjamin Franklin"
      ],
      "correct": 1
    }
  ]
}
```

### Math Quiz
```json
{
  "title": "Calculus Basics",
  "questions": [
    {
      "id": 1,
      "text": "What is the derivative of x³?",
      "options": ["3x²", "3x", "x²", "3"],
      "correct": 0
    },
    {
      "id": 2,
      "text": "What is the integral of 2x?",
      "options": ["2", "x²", "x² + C", "2x²"],
      "correct": 2
    }
  ]
}
```

### Language Learning Quiz
```json
{
  "title": "French Basics",
  "questions": [
    {
      "id": 1,
      "text": "What does 'bonjour' mean?",
      "options": [
        "Goodbye",
        "Good morning/Hello",
        "Please",
        "Thank you"
      ],
      "correct": 1
    },
    {
      "id": 2,
      "text": "How do you say 'I am' in French?",
      "options": ["Je suis", "Tu es", "Il est", "Nous sommes"],
      "correct": 0
    }
  ]
}
```

---

## 🛠️ Creating Your Quiz

### Step 1: Plan Your Questions
- Write out 5-20 questions for your quiz
- Ensure variety in difficulty levels
- Mix easy, medium, and hard questions

### Step 2: Structure in JSON
Use a text editor (VS Code, Notepad++, even Notepad) to create a `.json` file:

```json
{
  "title": "Your Subject",
  "questions": [
    {
      "id": 1,
      "text": "Question 1?",
      "options": ["A", "B", "C", "D"],
      "correct": 0
    }
  ]
}
```

### Step 3: Validate JSON
- Make sure all quotes are straight quotes (`"` not `"`)
- Ensure all commas and brackets are correct
- Use an online JSON validator if unsure: [jsonlint.com](https://www.jsonlint.com/)

### Step 4: Save as `.json`
- Save with `.json` extension
- Example: `biology-quiz.json`, `french-101.json`, `math-algebra.json`

### Step 5: Load in Dashboard
1. Open the Study Dashboard
2. Go to **❓ Quiz** tab
3. Click **Load Quiz JSON**
4. Select your file
5. Start studying!

---

## 💡 Best Practices

### ✅ DO:
- ✓ Use clear, unambiguous questions
- ✓ Make options similar length (so length doesn't give away answers)
- ✓ Mix up which position the correct answer is in
- ✓ Use realistic scenarios/examples
- ✓ Include questions of varying difficulty
- ✓ Proofread for typos and grammar
- ✓ Make sure exactly ONE answer is correct
- ✓ Test your JSON before using (validate it)

### ❌ DON'T:
- ✗ Use trick questions (unless intentional)
- ✗ Make all correct answers the same position (e.g., always "B")
- ✗ Use overly complex language for language learners
- ✗ Create options that are obviously wrong
- ✗ Mix different languages without context
- ✗ Use outdated or incorrect information
- ✗ Have questions with no clear correct answer
- ✗ Use special characters that might break JSON

---

## 🎯 Question Design Tips

### Make Questions Clear
❌ Bad: "Which is not a thing?"
✅ Good: "Which of the following is NOT a mammal?"

### Vary Difficulty
- **Easy**: Basic definitions, recall
- **Medium**: Application, understanding
- **Hard**: Analysis, comparison, synthesis

### Mix Answer Positions
```json
Questions 1-4: correct = [0, 2, 1, 3]  ✓ Good distribution
Questions 1-4: correct = [1, 1, 1, 1]  ✗ Pattern detectable
```

### Use Realistic Options
```json
// ✓ Good - plausible alternatives
"options": ["19", "20", "21", "22"]

// ✗ Bad - obvious wrong answers
"options": ["20", "1000000", "apple", "blue"]
```

---

## 📊 Large Quiz Tips

For quizzes with 50+ questions:

1. **Organize mentally**: Group by topic
2. **Number consistently**: Use IDs 1-100, etc.
3. **Review numbering**: Ensure all IDs are unique
4. **Test in sections**: Validate JSON every 10-15 questions
5. **Consider difficulty curve**: Place easier questions early

Example with 50 questions:
```json
{
  "title": "Comprehensive Chemistry",
  "questions": [
    { "id": 1, "text": "Easy question...", ... },
    { "id": 2, "text": "Easy question...", ... },
    ...
    { "id": 49, "text": "Hard question...", ... },
    { "id": 50, "text": "Hard question...", ... }
  ]
}
```

---

## 🔧 Tools to Help

### Online JSON Validators
- [jsonlint.com](https://www.jsonlint.com/) - Validate and format
- [json.io](http://www.json.io/) - Visual JSON editor

### Text Editors with JSON Support
- VS Code (free, excellent)
- Sublime Text
- Atom
- Notepad++ (Windows)
- TextEdit (Mac - use plain text mode)

### Quick Validation Checklist
- [ ] All strings use straight quotes (`"`)
- [ ] All objects have matching `{` and `}`
- [ ] All arrays have matching `[` and `]`
- [ ] Commas separate items (but not after last item)
- [ ] `correct` index exists in `options` array
- [ ] All IDs are unique
- [ ] No trailing commas after last field

---

## 🚀 Advanced Formatting

### Emphasis in Questions
You can use basic formatting in text:
```json
{
  "id": 1,
  "text": "What does (CO2) stand for?",
  "options": ["Carbon Dioxide", "..."],
  "correct": 0
}
```

### Multi-line Questions (Not Recommended)
```json
{
  "id": 1,
  "text": "Question with\\nmultiple lines",
  "options": ["..."],
  "correct": 0
}
```

### Special Characters
```json
{
  "id": 1,
  "text": "What is the symbol for Hydrogen?",
  "options": ["H", "He", "Ho", "Hy"],
  "correct": 0
}
```

---

## 📁 Quiz File Examples Included

The dashboard comes with sample quizzes:
- `sample-quiz.json` - Biology 101 (5 questions)
- `sample-quiz-js.json` - JavaScript Fundamentals (8 questions)

Use these as templates for your own quizzes!

---

## 🆘 Common Errors

### Error: "Invalid JSON"
**Cause**: Syntax error in JSON format
**Solution**: 
- Check for missing quotes
- Verify all brackets match
- Use an online validator
- Look for trailing commas

### Error: "Quiz won't load"
**Cause**: File not readable or JSON malformed
**Solution**:
- Ensure file is `.json` format
- Validate JSON structure
- Check file isn't corrupted

### Quiz loads but answers are wrong
**Cause**: Incorrect `correct` index
**Solution**:
- Remember: indexing starts at 0
- Option 1 = index 0
- Option 2 = index 1
- Etc.

---

## 📈 Getting Started Template

Copy and modify this template:

```json
{
  "title": "Your Quiz Title Here",
  "questions": [
    {
      "id": 1,
      "text": "First question here?",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correct": 0
    },
    {
      "id": 2,
      "text": "Second question here?",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correct": 1
    }
  ]
}
```

---

## 🎓 Educational Value

When creating quizzes, consider:

1. **Learning Objectives**: What should students learn?
2. **Question Types**: Mix recall, comprehension, application
3. **Difficulty Progression**: Easy → Medium → Hard
4. **Feedback Value**: Wrong answers teach what to review
5. **Spaced Repetition**: Dashboard tracks difficult questions for review

---

## 💪 Pro Tips

1. **Topic-Specific**: Create separate quizzes for each topic
2. **Difficulty Levels**: Create "Easy", "Medium", "Hard" versions
3. **Practice First**: Write by hand first, then digitize
4. **Peer Review**: Have others check your questions
5. **Update Often**: Keep quizzes current with course material
6. **Use Real Scenarios**: Relate questions to real-world applications

---

## ✅ Quick Checklist

Before using your quiz:
- [ ] JSON validates successfully
- [ ] All 'correct' indices match options
- [ ] No duplicate IDs
- [ ] Questions are clear and unambiguous
- [ ] Options are plausible alternatives
- [ ] File extension is `.json`
- [ ] File can be opened in text editor

---

## 🎉 You're Ready!

Create your first quiz and start studying. The dashboard will:
- ✅ Load your quiz instantly
- ✅ Track your performance
- ✅ Mark wrong answers for spaced repetition
- ✅ Help you learn effectively

**Happy learning! 📚✨**
