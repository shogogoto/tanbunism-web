# Frontend implementation guide

- Before adding or changing UI, consult `docs/ui-components.md` and search for an existing component or feature implementation. Prefer reuse over a new near-duplicate.
- Use `shared/components/ui` for domain-independent controls, `features/admin` for admin-wide table/feedback behavior, and feature components for domain-specific editors. Keep layout at the call site; do not build a universal component with many mode flags.
- For state, requests or game changes, consult `docs/frontend-architecture.md`. Keep rendering/focus/navigation, async orchestration and pure domain transitions separate. Extend the existing boundary rather than introducing a competing abstraction.
- Server snapshots go through `useAdventureState.applyState`. Never automatically repeat a state-changing request after a network failure. Preserve revision checks and activity guards.
- Add focused regression tests at the extracted boundary, retain existing screen tests, and verify the actual affected interaction. For cross-cutting changes, run typecheck, lint, the full Vitest suite and a production build.
- Do not edit generated API code directly. Do not replace existing user configuration with test fixtures or hard-coded sample catalogs.
