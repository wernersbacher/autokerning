# autokerning — programmatic kerning helper

## Overview

autokerning computes suggested kerning values for glyph pairs from TrueType/OpenType fonts by rendering glyph bitmaps, applying a small Gaussian blur, and measuring pixel overlap across horizontal offsets. It can be used as a CLI tool or imported programmatically from other Node.js/TypeScript projects

Key features

- Render glyphs from .ttf/.otf using opentype.js
- Compute pixel-overlap (with Gaussian blur) to derive kerning values
- Several selection strategies and configurable thresholds
- Optionally write a kerning JSON file, or return the table directly to the caller

Programmatic API

Import the library (ESM):

import { generateKerningTable, getKerningTable, kernPair, renderGlyph } from 'autokerning';

Functions

- generateKerningTable(fontfile: string, opts?): Promise<{ outputPath?: string, kerningTable: Record<string, number> }>
  - opts: {
    pairs?: string; // comma-separated pairs to analyze ("AV,To")
    outputfile?: string; // output filename (default: `<fontname>.json`)
    writeFile?: boolean; // default true; set false to only return kerning table
  }
  - Behavior: loads the font, calibrates overlap thresholds, computes kerning for the provided or a built-in common pair list, and writes a JSON file when writeFile=true.

\- getKerningTable(fontfile: string, pairs?: string): Promise<Record<string, number>>
  - Convenience helper that calls generateKerningTable(fontfile, { pairs, writeFile: false }) and returns the kerning table directly.

- kernPair(leftGlyph, rightGlyph, minOverlap, maxOverlap)
  - Low-level pair scorer. Useful if you already rendered glyph bitmaps and want to run the kernel/overlap algorithm directly.

- renderGlyph(font, char)
  - Helper that produces the internal glyph representation (bitmap + advance + metrics) used by the algorithms.

Usage examples

1) Programmatic (do not write a file):

import { getKerningTable } from 'autokerning';

(async () => {
  const kerning = await getKerningTable('./fonts/Roboto-Black.ttf', 'AV,To,Wa');
  console.log(kerning);
})();

2) Programmatic (generate and save JSON):

import { generateKerningTable } from 'autokerning';

(async () => {
  const { outputPath, kerningTable } = await generateKerningTable('./fonts/Roboto-Black.ttf', {
    outputfile: 'Roboto-Kerning.json',
    writeFile: true,
  });
  console.log(`Saved kerning to ${outputPath}`);
})();

CLI

The repository includes a CLI for quick experiments. Examples:

# Generate a kerning JSON file (dev mode using tsx)
npm run dev -- src/cli.ts -- path/to/font.ttf --output kerning.json

# Compute specific pairs and print results
npm run dev -- src/cli.ts -- path/to/font.ttf AV WA

Development / Build

Requirements: Node.js (LTS recommended) and npm.

Install dependencies and build:

```powershell
npm install
npm run build
```

Run the CLI in dev mode (no build, uses tsx):

```powershell
# autokerning — programmatic kerning helper

## Overview

autokerning computes suggested kerning values for glyph pairs from TrueType/OpenType fonts by rendering glyph bitmaps, applying a small Gaussian blur, and measuring pixel overlap across horizontal offsets. It can be used as a CLI tool or imported programmatically from other Node.js/TypeScript projects — no subprocess or shelling out required.

## Key features

- Render glyphs from .ttf/.otf using opentype.js
- Compute pixel-overlap (with Gaussian blur) to derive kerning values
- Several selection strategies and configurable thresholds
- Optionally write a kerning JSON file, or return the table directly to the caller

## Programmatic API

Import the library (ESM):

```js
import { generateKerningTable, getKerningTable, kernPair, renderGlyph } from 'autokerning';
```

## Functions

- **generateKerningTable(fontfile: string, opts?)** -> Promise<{ outputPath?: string, kerningTable: Record<string, number> }>

  opts:

  - `pairs?: string` — comma-separated pairs to analyze (e.g. "AV,To")
  - `outputfile?: string` — output filename (default: `<fontname>.json`)
  - `writeFile?: boolean` — default `true`; set to `false` to only return the kerning table

  Behavior: loads the font, calibrates overlap thresholds, computes kerning for the provided or a built-in common pair list, and writes a JSON file when `writeFile=true`.

- **getKerningTable(fontfile: string, pairs?: string)** -> Promise<Record<string, number>>

  Convenience helper that calls `generateKerningTable(fontfile, { pairs, writeFile: false })` and returns the kerning table directly.

- **kernPair(leftGlyph, rightGlyph, minOverlap, maxOverlap)**

  Low-level pair scorer. Useful if you already rendered glyph bitmaps and want to run the kernel/overlap algorithm directly.

- **renderGlyph(font, char)**

  Helper that produces the internal glyph representation (bitmap + advance + metrics) used by the algorithms.

## Usage examples

### Programmatic (do not write a file)

```js
import { getKerningTable } from 'autokerning';

(async () => {
  const kerning = await getKerningTable('./fonts/Roboto-Black.ttf', 'AV,To,Wa');
  console.log(kerning);
})();
```

### Programmatic (generate and save JSON)

```js
import { generateKerningTable } from 'autokerning';

(async () => {
  const { outputPath, kerningTable } = await generateKerningTable('./fonts/Roboto-Black.ttf', {
    outputfile: 'Roboto-Kerning.json',
    writeFile: true,
  });
  console.log(`Saved kerning to ${outputPath}`);
})();
```

## CLI

The repository includes a CLI for quick experiments. Examples:

Generate a kerning JSON file (dev mode using tsx):

```powershell
npm run dev -- src/cli.ts -- path/to/font.ttf --output kerning.json
```

Compute specific pairs and print results:

```powershell
npm run dev -- src/cli.ts -- path/to/font.ttf AV WA
```

## Development / Build

Requirements: Node.js (LTS recommended) and npm.

Install dependencies and build:

```powershell
npm install
npm run build
```

Run the CLI in dev mode (no build, uses tsx):

```powershell
npm run dev -- path/to/font.ttf AV WA
```

## Notes and recommendations

- The package is configured as ESM (package.json contains `"type": "module"`).
- `generateKerningTable` is backward-compatible and defaults to writing a JSON file; use `writeFile:false` to only receive the table in memory.
- If you plan to use this as a library in production, consider calling `getKerningTable` in a worker thread when processing many fonts/pairs to avoid blocking the main event loop.

## Next steps (suggested)

- Add a small test harness that runs generate/getKerningTable against a test font and verifies expected keys/values.
- Add type exports to package.json (if you publish `.d.ts` files) so TypeScript consumers have better autocompletion.

If you want, I can add the test harness and CI config next.
