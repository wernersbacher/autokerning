# autokerning — programmatic kerning helper

autokerning computes suggested kerning values for glyph pairs from TrueType/OpenType fonts by rendering glyph bitmaps, applying a small Gaussian blur, and measuring pixel overlap across horizontal offsets. It can be used programmatically (as an imported ESM module) or via the included CLI.

Key features

- Render glyphs from .ttf/.otf using opentype.js
- Compute pixel-overlap (with Gaussian blur) to derive kerning values
- Several selection strategies and configurable thresholds
- Optionally write a kerning JSON file, or return the table directly to the caller

Programmatic API

Import the library (ESM):

```js
import { generateKerningTable, getKerningTable, kernPair, renderGlyph } from 'autokerning';
```

Main functions

- generateKerningTable(fontfile: string, opts?) -> Promise<{ outputPath?: string, kerningTable: Record<string, number> }>
  - opts:
    - pairs?: string — comma-separated pairs to analyze (e.g. "AV,To")
    - outputfile?: string — output filename (default: `<fontname>.json`)
    - writeFile?: boolean — default true; set to false to only return the kerning table

- getKerningTable(fontfile: string, pairs?: string) -> Promise<Record<string, number>>
  - Convenience helper that calls generateKerningTable(fontfile, { pairs, writeFile: false }) and returns the kerning table directly.

- kernPair(leftGlyph, rightGlyph, minOverlap, maxOverlap)
  - Low-level pair scorer. Useful if you already rendered glyph bitmaps and want to run the kernel/overlap algorithm directly.

- renderGlyph(font, char)
  - Helper that produces the internal glyph representation (bitmap + advance + metrics) used by the algorithms.

Usage examples

Programmatic (do not write a file):

```js
import { getKerningTable } from 'autokerning';

(async () => {
  const kerning = await getKerningTable('./fonts/Roboto-Black.ttf', 'AV,To,Wa');
  console.log(kerning);
})();
```

Programmatic (generate and save JSON):

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

CLI

The repository includes a CLI (program name: `autokern-ts`) with two main modes:

- Inspect pairs interactively on stdout: pass a font and pairs as positional arguments.
- Generate a kerning JSON file: pass the `--output <file>` (or `-o`) option.

Key CLI options (from `src/cli.ts`):

- `<fontfile>` (positional) — Path to font file (.ttf/.otf)
- `[pairs...]` (positional) — One or more 2-character pairs to analyze (e.g. AV WA)
- `-s, --size <n>` — Font size (default 100)
- `-o, --output <file>` — Generate kerning JSON file
- `--pairs <list>` — Comma-separated list of pairs to analyze when generating JSON

Examples (dev mode using `tsx`, as provided in `package.json`):

```powershell
# Generate a kerning JSON file (dev mode)
npm run dev -- src/cli.ts -- path/to/font.ttf --output kerning.json

# Or using the packaged CLI after build:
npm run build
node dist/cli.js path/to/font.ttf --output kerning.json

# Compute specific pairs and print results (positional pairs)
npm run dev -- src/cli.ts -- path/to/font.ttf AV WA
```

Development / Build

Requirements: Node.js (LTS recommended) and npm.

Install dependencies and build:

```powershell
npm install
npm run build
```

Run the CLI in dev mode (no build, uses `tsx`):

```powershell
npm run dev -- path/to/font.ttf AV WA
```

