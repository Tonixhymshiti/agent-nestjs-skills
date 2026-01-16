# NestJS Best Practices Skill

A comprehensive Claude Code skill for NestJS best practices, providing AI agents with deep knowledge of NestJS patterns, anti-patterns, and production-ready code examples.

## Overview

This skillset contains **37 rules** across **10 categories**, covering everything from architecture patterns to deployment strategies. Each rule includes:

- Impact assessment (CRITICAL, HIGH, MEDIUM-HIGH, MEDIUM, LOW-MEDIUM)
- Incorrect code examples showing anti-patterns
- Correct code examples with explanations
- References to official documentation

## Categories

| Section | Category | Impact | Rules |
|---------|----------|--------|-------|
| 1 | Architecture | CRITICAL | 5 |
| 2 | Dependency Injection | CRITICAL | 4 |
| 3 | Error Handling | HIGH | 3 |
| 4 | Security | HIGH | 5 |
| 5 | Performance | HIGH | 4 |
| 6 | Testing | MEDIUM-HIGH | 3 |
| 7 | Database & ORM | MEDIUM-HIGH | 3 |
| 8 | API Design | MEDIUM | 4 |
| 9 | Microservices | MEDIUM | 3 |
| 10 | DevOps & Deployment | LOW-MEDIUM | 3 |

## Structure

```
nestjs-best-practices-skill/
├── SKILL.md              # Main entry point for Claude Code
├── AGENTS.md             # Consolidated rules document (generated)
├── metadata.json         # Version and metadata
├── rules/                # Individual rule files
│   ├── _sections.md      # Category definitions
│   ├── _template.md      # Template for new rules
│   ├── arch-*.md         # Architecture rules
│   ├── di-*.md           # Dependency Injection rules
│   ├── error-*.md        # Error Handling rules
│   ├── security-*.md     # Security rules
│   ├── perf-*.md         # Performance rules
│   ├── test-*.md         # Testing rules
│   ├── db-*.md           # Database rules
│   ├── api-*.md          # API Design rules
│   ├── micro-*.md        # Microservices rules
│   └── devops-*.md       # DevOps rules
└── scripts/              # Build tools
    ├── build-agents.ts   # AGENTS.md generator
    ├── build.sh          # Shell wrapper
    └── package.json      # NPM config
```

## Workflow

The repository uses a prefix-based naming system where filenames indicate their section:

- `arch-` rules address Architecture patterns
- `di-` rules focus on Dependency Injection
- `security-` rules cover Security best practices
- `perf-` rules handle Performance optimization

Rules are automatically sorted alphabetically within each section when building `AGENTS.md`.

## Building

To regenerate `AGENTS.md` after modifying rules:

```bash
cd scripts
npx ts-node build-agents.ts
```

Or use the shell wrapper:

```bash
./scripts/build.sh
```

## Adding New Rules

1. Copy `rules/_template.md` to a new file with the appropriate prefix
2. Fill in the frontmatter and content following the template structure
3. Run the build script to regenerate `AGENTS.md`

### Rule Structure

Each rule follows this format:

```markdown
---
title: Rule Title Here
impact: MEDIUM
impactDescription: Brief description of impact
tags: tag1, tag2, tag3
---

## Rule Title Here

Brief explanation of the rule and why it matters.

**Incorrect (description of what's wrong):**

\`\`\`typescript
// Bad code example here
\`\`\`

**Correct (description of what's right):**

\`\`\`typescript
// Good code example here
\`\`\`

Reference: [NestJS Documentation](https://docs.nestjs.com)
```

## Impact Classification

| Level | Description |
|-------|-------------|
| CRITICAL | Violations cause runtime errors, security vulnerabilities, or architectural breakdown |
| HIGH | Significant impact on reliability, security, or maintainability |
| MEDIUM-HIGH | Notable impact on quality and developer experience |
| MEDIUM | Moderate impact on code quality and best practices |
| LOW-MEDIUM | Minor improvements for consistency and maintainability |
