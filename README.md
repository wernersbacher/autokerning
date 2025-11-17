# autokerning

autokerning computes suggested kerning values for glyph pairs from TrueType/OpenType fonts by rendering glyph bitmaps, applying a small Gaussian blur, and measuring pixel overlap across horizontal offsets. It can be used programmatically (as an imported ESM module) or via the included CLI.

## Programmatic usage

**Get kerning table (no file):**

```js
const kerning = await getKerningTable('./fonts/Roboto-Black.ttf', ['AV', 'To', 'Wa']);
```

**Generate and save JSON:**

```js
const myPairs = ['AV', 'To', 'Wa']
const { outputPath } = await generateKerningTable('./fonts/Roboto-Black.ttf', {
  outputfile: 'Roboto-Black.json',
  pairs: myPairs,
  writeFile: true,
});
```

## CLI Usage

```powershell


# Print results for custom pairs
autokerning Roboto-Black.ttf AV WA To Ta ox

# Generate kerning JSON
autokerning Roboto-Black.ttf --output kerning.json

```
