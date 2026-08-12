# Controlled relationship layer

This package replaces broad text-inferred relationships with explicit intent mappings.

## Files

- `matrix-data/intent-relations.json`: governed base and conditional links for all 33 intents.
- `matrix-data/intent-clarification-rules.json`: context-only terms, activity signals and clarification families.
- `matrix-data/controlled-questions.json`: intent-specific questions, including land-rights and sewer-repair questions.
- `engine/build-runtime-relations-patch.mjs`: generates controlled runtime intent, recommendation and question indexes.

## Integration

1. Upload all files preserving paths.
2. Temporarily add `node engine/build-runtime-relations-patch.mjs` after `node engine/build-runtime.mjs` in the `phase-a` npm script, or replace inference in the main builder with this explicit-first logic.
3. Validate that `runtime/manifest.json` contains `relationshipMode: controlled-explicit` and `controlledRelations: 33`.
4. Update the preview matcher to apply `runtime/intent-clarification-rules.json` before confirming an intent.

No live `index.html` change is included.
