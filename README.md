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

## Installation

### Claude Code

Add this skill to your Claude Code configuration:

```bash
# Clone to your skills directory
git clone https://github.com/YOUR_USERNAME/nestjs-best-practices-skill.git ~/.claude/skills/nestjs-best-practices
```

Or reference it in your project's `.claude/settings.json`:

```json
{
  "skills": [
    "https://github.com/YOUR_USERNAME/nestjs-best-practices-skill"
  ]
}
```

## Structure

```
nestjs-best-practices-skill/
├── SKILL.md              # Main entry point for Claude Code
├── AGENTS.md             # Consolidated rules document (192KB)
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
2. Fill in the frontmatter and content
3. Run the build script to regenerate `AGENTS.md`

### Naming Convention

Rules are automatically categorized by filename prefix:

- `arch-` - Architecture
- `di-` - Dependency Injection
- `error-` - Error Handling
- `security-` - Security
- `perf-` - Performance
- `test-` - Testing
- `db-` - Database
- `api-` - API Design
- `micro-` - Microservices
- `devops-` - DevOps

## References

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## License

MIT
