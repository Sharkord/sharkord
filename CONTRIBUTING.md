# Sharkord Contributing Guide

## Maintainer Authority

Sharkord is maintained by its core maintainers.

Contributions that do not align with the project’s vision, scope, or technical direction may be closed without merge. Maintainer decisions are final. This ensures the project remains focused, coherent, and sustainable long-term.

## What Sharkord Is

Sharkord is a self-hosted communication platform that provides core Discord-like features on your own infrastructure.

It follows the philosophy of TeamSpeak: focused, lightweight, and practical — with a clean, modern interface and an emphasis on ease of deployment.

## Core Principles

- **Simplicity**: Clear architecture, minimal abstraction, no unnecessary complexity.
- **Self-Hosted First**: Easy to deploy and maintain on your own server.
- **Clean Interface**: Functional, intuitive, and distraction-free.
- **Core Features Only**: Voice channels, text channels, and essential user management.
- **Small Group Focus**: Designed for families, friends, and small teams.
- **No Paywalls**: Fully free and open. No premium tiers.

## What Sharkord Is Not

- **Not a Discord Clone**: We do not aim to replicate every Discord feature. Sharkord is not intended to be a huge community platform or a knowledge base. We focus on core communication features, not feature parity with Discord.
- **Not for Large Communities**: Enterprise-scale or massive community features are out of scope.
- **Not Bloated Software**: We reject unnecessary features, over-engineering, and complexity.

Features aimed at enterprise-scale usage or feature parity with Discord are outside the scope of this project.

# How to Contribute

## Before You Start

You MUST create an issue before opening a pull request.

This allows discussion, validation, and alignment with project goals.

- PRs without a related issue will be closed.
- Check the [Roadmap](/ROADMAP.md) before proposing new features.
- If a feature is not aligned with the project vision, it will not be accepted.

## Creating an Issue

Your issue must:

- Clearly describe the problem or feature
- Include relevant context (logs, screenshots, reproduction steps if applicable)
- Explain why it fits Sharkord’s scope

Vague or low-effort issues may be closed.

## Creating a Pull Request

Once your issue has been discussed and validated, you may submit a PR.

### Requirements

- Must reference an existing issue
- Must target the `development` branch
- One feature or fix per PR
- Large architectural changes must be discussed and approved before implementation
- All CI checks must pass before review

PRs that do not meet these requirements may be closed without review.

## PR Title Format

Use the following format:

- `fix(issue-number): short description`
- `feat(issue-number): short description`
- `chore(issue-number): short description`

Example:

```
feat(123): add channel mute support
```

PRs not following this format may be closed.

## Commit Message Format

Commits must follow:

- `fix: short description`
- `feat: short description`
- `chore: short description`

Keep messages concise and descriptive.

## Code Standards

Code that does not follow project standards may be requested to be rewritten before merge.

Requirements:

- ES6+ syntax only
- Use `const` and `let`
- Avoid `any` in TypeScript; use explicit types
- No default exports, always use named exports
- Follow existing project structure and conventions
- Avoid unnecessary dependencies and over-engineering

Clarity and maintainability are prioritized over cleverness.

## Not Planned

If a feature is marked as **not planned**, please understand that the decision is final. This is done in order to maintain the project’s vision and focus. Adding features that are not aligned with the project’s goals can lead to confusion and a lack of direction.

## Testing

All changes must be properly tested before submission.

- Ensure the project builds successfully
- Ensure CI passes
- Verify that your change does not introduce regressions

Unstable or untested code will not be merged.

## Use of AI

AI tools may be used to assist development.

However:

- You are responsible for understanding the code you submit.
- AI-generated code must meet the same standards as manually written code.
- Low-effort or blindly generated submissions may be rejected.

Quality and correctness always come first.

## CI

Make sure all checks are passing when you submit your PR. This includes linting, formatting, and tests.

## Unit and Integration Tests

When applicable, please include unit and integration tests for your changes. This helps ensure the stability and reliability of the project. If your change is in a area that already has tests, please make sure to update or add tests as needed.
