# Phase A: Matrix Adapter

Phase A converts the review-friendly Matrix v2 JSON exports into compact runtime indexes for the Safe Digging Hub.

## Upload

Copy all folders and files from this package into the repository root. Existing `index.html`, `/data`, and `/matrix-data` files remain in place. The two files in this package under `/matrix-data` are additions.

## Build

Run `npm run phase-a`, or use the included GitHub Action. The workflow runs whenever matrix or engine files change and commits the generated `/runtime` JSON.

## Output

- `runtime/intent-index.json`
- `runtime/question-rules.json`
- `runtime/recommendation-index.json`
- `runtime/jurisdiction-index.json`
- `runtime/onecall-index.json`
- `runtime/journey-state-schema.json`
- `runtime/manifest.json`

## Scope

This phase does not yet change the live journey. Phase B will replace the hard-coded `detect()` logic with the runtime intent index.
