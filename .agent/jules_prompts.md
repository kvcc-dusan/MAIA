# Code Review Prompts for Jules

## Prompt 1: ChronosModal Code Quality & Performance Review
Please review `src/components/ChronosModal.jsx` for:
- **Performance issues**: Identify unnecessary re-renders, missing memoization (useMemo/useCallback), or expensive operations in render
- **Code duplication**: Find repeated logic that could be extracted into helper functions
- **Complex functions**: Identify functions over 50 lines that should be broken down
- **State management**: Check for redundant state or state that could be derived
- **Memory leaks**: Look for missing cleanup in useEffect hooks
- **Prop drilling**: Identify deeply nested prop passing that could use context

Provide specific line numbers and refactoring suggestions.

---

## Prompt 2: Session Management Logic Audit
Review the session management implementation in `src/components/ChronosModal.jsx`:
- **Edge cases**: Test overlap detection logic for edge cases (same start/end times, midnight crossover, DST transitions)
- **Race conditions**: Check for potential race conditions in session CRUD operations
- **Data validation**: Ensure all session data is properly validated before saving
- **Error handling**: Identify missing error handling for failed operations
- **Timezone handling**: Check if date/time operations handle timezones correctly
- **Consistency**: Verify session state stays consistent across all operations (create, edit, delete, drag, resize)

List any bugs or potential issues with reproduction steps.

---

## Prompt 3: DataContext & State Management Review
Analyze `src/context/DataContext.jsx` and `src/App.jsx`:
- **Context optimization**: Check if context value changes trigger unnecessary re-renders
- **localStorage efficiency**: Review if we're saving too frequently or could batch updates
- **Data normalization**: Check if data structures are optimized (e.g., should we use Maps instead of arrays for lookups?)
- **Stale closures**: Look for potential stale closure bugs in callbacks
- **Action patterns**: Suggest if we should use useReducer for complex state updates
- **Type safety**: Identify places where TypeScript/JSDoc would prevent bugs

Provide specific optimization recommendations.

---

## Prompt 4: Accessibility (a11y) Audit
Review the entire codebase for accessibility issues:
- **Keyboard navigation**: Check if all interactive elements are keyboard accessible
- **ARIA labels**: Identify missing aria-labels, aria-describedby, or role attributes
- **Focus management**: Review focus trap in modals, focus restoration after close
- **Screen reader**: Check if screen readers can understand the UI flow
- **Color contrast**: Verify text/background color combinations meet WCAG AA standards
- **Semantic HTML**: Look for divs that should be buttons, proper heading hierarchy

List specific accessibility violations with WCAG guideline references.

---

## Prompt 5: Component Architecture & Reusability
Review component structure across the codebase:
- **Component size**: Identify components over 500 lines that should be split
- **Reusable patterns**: Find UI patterns that are duplicated and could be extracted
- **Prop interfaces**: Check for inconsistent prop naming or missing prop validation
- **Component coupling**: Identify tightly coupled components that should be decoupled
- **Composition**: Suggest where compound components or render props would improve flexibility
- **File organization**: Review if components are in the right directories

Suggest specific refactoring opportunities.

---

## Prompt 6: Error Boundaries & Error Handling
Audit error handling throughout the app:
- **Missing try-catch**: Identify async operations without error handling
- **Error boundaries**: Check if critical sections have error boundaries
- **User feedback**: Verify users get meaningful error messages (not just console.logs)
- **Graceful degradation**: Check if features fail gracefully when errors occur
- **Error recovery**: Identify places where users can recover from errors
- **Logging**: Review if errors are logged properly for debugging

Provide a comprehensive error handling improvement plan.

---

## Prompt 7: Performance & Bundle Size Analysis
Analyze build output and performance:
- **Bundle analysis**: Review the 1.54MB bundle - what's taking up space?
- **Code splitting**: Identify opportunities for dynamic imports to reduce initial load
- **Tree shaking**: Check for unused exports or imports
- **Heavy dependencies**: Identify large dependencies that could be replaced with lighter alternatives
- **Lazy loading**: Suggest components/routes that should be lazy loaded
- **Image optimization**: Check if images/assets are optimized

Provide specific bundle size reduction recommendations.

---

## Prompt 8: React Best Practices & Patterns
Review code for React anti-patterns:
- **Key props**: Check for missing or improper key props in lists
- **Controlled vs uncontrolled**: Verify form inputs are consistently controlled
- **Side effects**: Look for side effects in render (should be in useEffect)
- **Ref usage**: Check if refs are used correctly (not for state that should trigger re-renders)
- **Hook rules**: Verify hooks are called in the correct order and not conditionally
- **Default props**: Check for missing default props or prop types

List all violations with explanations.

---

## Prompt 9: Code Consistency & Style
Review codebase for consistency issues:
- **Naming conventions**: Check for inconsistent variable/function naming (camelCase, PascalCase)
- **Import order**: Verify consistent import ordering (React, libraries, components, utils)
- **File naming**: Check for inconsistent file naming conventions
- **Comment quality**: Identify outdated comments or missing documentation for complex logic
- **Magic numbers**: Find hardcoded values that should be constants
- **Code formatting**: Check for inconsistent spacing, indentation (though Prettier should handle this)

Create a style guide based on current patterns.

---

## Prompt 10: Security Review
Audit the codebase for security vulnerabilities:
- **XSS risks**: Check for dangerouslySetInnerHTML or unescaped user input
- **localStorage security**: Review what sensitive data is stored in localStorage
- **Input validation**: Verify all user inputs are validated/sanitized
- **Dependency vulnerabilities**: Check for known vulnerabilities in dependencies (npm audit)
- **API security**: Review if any API keys or secrets are exposed
- **Content Security Policy**: Check if CSP headers would break anything

List security concerns with severity ratings.

---

## Prompt 11: Testing Strategy Recommendations
Analyze the codebase and suggest testing approach:
- **Critical paths**: Identify the most important user flows that need tests
- **Edge cases**: List edge cases that should have unit tests
- **Integration tests**: Suggest which component interactions need integration tests
- **E2E scenarios**: Recommend end-to-end test scenarios
- **Test utilities**: Suggest helper functions/mocks that would make testing easier
- **Coverage gaps**: Identify areas with high complexity but no tests

Provide a prioritized testing roadmap.

---

## Prompt 12: Git & Repository Structure Review
Review repository organization and Git practices:
- **Commit history**: Analyze recent commits for quality and atomicity
- **Branch strategy**: Review if current branching strategy is optimal
- **.gitignore**: Check if all necessary files are ignored
- **README**: Review if README has setup instructions, architecture overview
- **Package.json**: Check for outdated dependencies, unused scripts
- **Environment variables**: Verify .env files are properly configured and documented

Suggest repository improvements.

---

## Output Format for All Prompts
For each review, please provide:
1. **Summary**: High-level overview of findings
2. **Critical Issues**: Bugs or problems that need immediate attention (with severity: High/Medium/Low)
3. **Improvements**: Refactoring suggestions with code examples
4. **Best Practices**: Violations of React/JavaScript best practices
5. **Action Items**: Prioritized list of what to fix first

Save each review as a separate markdown file in `.agent/reviews/` directory.
