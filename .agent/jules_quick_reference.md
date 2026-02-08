# Jules Code Review - Quick Reference

## 📋 12 Review Prompts Created

### High Priority (Run First)
1. **Session Management Logic Audit** - Critical for data integrity
2. **Error Boundaries & Error Handling** - User experience & stability
3. **Security Review** - Protect user data

### Medium Priority (Important for Quality)
4. **ChronosModal Code Quality & Performance** - Our largest component
5. **DataContext & State Management** - Core data flow
6. **Accessibility Audit** - User inclusivity
7. **Performance & Bundle Size** - Load time optimization

### Lower Priority (Nice to Have)
8. **Component Architecture** - Long-term maintainability
9. **React Best Practices** - Code quality
10. **Code Consistency & Style** - Developer experience
11. **Testing Strategy** - Future-proofing
12. **Git & Repository Structure** - Project organization

## 🎯 Expected Outputs

Jules will create review files in `.agent/reviews/`:
- `01_session_management_audit.md`
- `02_error_handling_review.md`
- `03_security_review.md`
- etc.

Each review includes:
- ✅ Summary of findings
- 🔴 Critical issues (High/Medium/Low severity)
- 💡 Improvement suggestions with code examples
- 📚 Best practice violations
- 📝 Prioritized action items

## 💬 How to Use with Jules

**Option 1: Run All at Once**
```
Hey Jules, please complete all 12 code review prompts in .agent/jules_prompts.md
and save each review as a separate markdown file in .agent/reviews/
```

**Option 2: Run Prioritized Subset**
```
Jules, please complete prompts 1, 2, and 3 from .agent/jules_prompts.md
(Session Management, Error Handling, Security) and save reviews in .agent/reviews/
```

**Option 3: Run Individually**
```
Jules, please complete Prompt 1 (Session Management Logic Audit) from
.agent/jules_prompts.md and save the review in .agent/reviews/01_session_management_audit.md
```

## 📊 What We'll Get Tomorrow

- **Bug reports** with reproduction steps
- **Performance bottlenecks** identified
- **Security vulnerabilities** flagged
- **Refactoring opportunities** with code examples
- **Testing recommendations** prioritized
- **Accessibility issues** with WCAG references
- **Bundle optimization** suggestions

## 🚀 Tomorrow's Workflow

1. Review Jules' findings in `.agent/reviews/`
2. Prioritize critical issues
3. Create implementation tasks from recommendations
4. Fix bugs and apply improvements
5. Iterate on code quality

---

**File Location**: `/Users/dusankvcc/Desktop/maia/.agent/jules_prompts.md`
