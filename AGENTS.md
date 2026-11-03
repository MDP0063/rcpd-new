# AI Agent & Workflow Rules

## Git & Branching Rules (STRICT)
- **Never commit directly to `main` or `master`.**
- Always create a new, descriptive feature branch before making any code changes (e.g., `feature/login-ui`, `security/firebase-keys`, `fix/nav-bug`).
- Keep changes scoped strictly to the task at hand.
- Once completed, push the branch and open a Pull Request.
- Follow the repository's `.github/PULL_REQUEST_TEMPLATE.md` when creating Pull Requests.

## Project Context
- Early Alpha development phase for the Police Roleplay Web Portal.
- Prioritize security, modular UI, and environment-variable-based configurations.

## Pre-PR & Verification Requirements (STRICT)
- **Run Build Check:** Before opening a Pull Request, always verify that the project builds without errors (`npm run build`).
- **Run Tests:** Run all available test suites (`npm test`) and ensure all tests pass.
- **Fix Errors Locally:** If the build or tests fail, resolve all issues on the local branch before pushing.
- **Document Status:** Indicate in the Pull Request description (using the template checklist) that the build and tests were successfully verified.
