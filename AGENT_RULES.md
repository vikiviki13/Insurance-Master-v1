# AI Coding Agent – Change-Control Rules

## Primary Rule

When I request a change, modification, bug fix, or new feature, change **only the functionality, files, components, and UI elements directly related to my request**.

Do not modify unrelated functionality.

## Before Making Changes

1. Read and understand the existing implementation.
2. Identify the exact files and components affected by my request.
3. Check whether the requested change could affect existing functionality.
4. Preserve all existing working behavior unless I explicitly request otherwise.

## Strict Protection Rules

Do NOT:

- Refactor unrelated code.
- Rename unrelated files, functions, variables, or components.
- Change existing UI layouts outside the requested area.
- Change existing functionality to improve or simplify the code.
- Remove existing features.
- Change database structures unless explicitly requested.
- Modify API behavior unless explicitly requested.
- Update dependencies unless required for the requested task.
- Rewrite an entire component when a targeted change is sufficient.

## Scope of Work

Treat my request as a **restricted change request**.

Only modify:

- The feature I explicitly mention.
- Files directly required to implement that feature.
- Dependencies that are strictly necessary for the requested change.

Everything else must remain unchanged.

## When an Unrelated Change Seems Necessary

STOP before making the change and explain:

1. What needs to be changed.
2. Why it is necessary.
3. What existing functionality could be affected.

Wait for my approval before modifying anything outside the requested scope.

## Verification Before Completion

Before completing any task:

1. Compare the changes with the original request.
2. Verify that unrelated functionality has not been changed.
3. Run existing tests, type checks, and builds where available.
4. Check that the requested functionality works.
5. Report exactly which files were modified.
6. Report any existing functionality that could potentially be affected.

## Default Principle

**Minimal change. Maximum preservation.**

If two solutions are possible, always choose the solution that makes the fewest changes to the existing project.