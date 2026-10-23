# Global development workflow

Installed tools: Ponytail (coding guidance), Claude-Mem (project memory), Anthropic Agent Skills.

For development tasks:

1. **Recall** – Claude-Mem injects recent project context at session start. For deeper history
   (past decisions, architecture, earlier fixes, debugging findings) use the `mem-search` skill
   before re-investigating. Memory is scoped per project; don't pull in other projects' context.
2. **Skills** – When a task matches an installed skill (documents: docx/xlsx/pptx/pdf; webapp-testing,
   mcp-builder, frontend-design, skill-creator, etc.), load it instead of improvising.
3. **Ponytail** – Prefer the simplest maintainable solution: reuse existing code, stdlib first,
   no unrequested abstractions or dependencies. Never trade away security, input validation,
   error handling, or tests for brevity. Use `/ponytail-review` or `/ponytail-audit` for reviews.
4. **Verify** – Run the project's tests, lint, and typecheck for what you changed before calling it done.
5. **Remember** – Claude-Mem records outcomes automatically. State key decisions and root causes
   plainly in the conversation so they are captured well.

Never write passwords, tokens, API keys, or other secrets into prompts, memory, or summaries.
Wrap anything sensitive in `<private>…</private>` so Claude-Mem excludes it.
Don't change application code, running services, deployments, or project configuration beyond what the task needs.
