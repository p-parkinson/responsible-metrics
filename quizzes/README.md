This directory contains JSON files with quizzes consumed by the site JavaScript quiz prototype.

Format: `test_your_knowledge.json` follows this structure:

- title: string
- description: string
- questions: array of question objects

Question object:
- id: unique id
- type: `single-select` or `multi-select` (or `true-false` as a `single-select` variant)
- text: question text
- hint: (optional)
- weight: numeric weight for scoring
- options: array of option objects

Option object:
- id: unique within question
- text: option text
- isCorrect: boolean
- feedback: optional explanation shown when the option is selected in results

Scoring:
- multi-select uses partial scoring: +1 for each correct option selected, -1 for each incorrect selected, minimum 0, normalized by number of correct options; scaled by weight.
- single-select awards full weight only for the correct option.

How to add a quiz to a page:
1. Put JSON in `quizzes/my_quiz.json`.
2. Add a placeholder `<div class="quiz" data-quiz="quizzes/my_quiz.json"></div>` in the `.md` or `.qmd` page.
3. Include `<script src="scripts/quiz.js"></script>` on the page, or add a global include for the script.
4. Optionally add per-quiz CSS tweaks in `styles/quiz.css`.

Previewing locally:
- If you have Quarto installed, run `quarto preview` in the repository root and open the previewed pages to test the quiz.
- Alternatively, open `docs/test_your_knowledge.html` after rendering, or serve the built `_site` or `docs` with a simple HTTP server.

Running the score tests:
- A small node-based test harness is included at `scripts/quiz_score_test.js`. Run `node scripts/quiz_score_test.js` to validate scoring behaviour for the sample quiz.

Accessibility & non-JS fallback:
- Add a `<noscript>` fallback linking to an alternative quiz (e.g., the original MS Form) for users without JavaScript.
- Inputs have aria attributes and are designed to be navigable by keyboard; please test with a screen reader and consider additional ARIA roles if needed.
