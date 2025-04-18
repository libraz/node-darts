# node-darts Examples

This directory contains examples demonstrating how to use the node-darts library.

## Example List

1. **basic-usage.js** - Basic usage of the node-darts library
   - Loading an existing dictionary
   - Text replacement using the loaded dictionary
   - Exact match search
   - Common prefix search

2. **dictionary-builder.js** - Dictionary building and saving example
   - Creating a dictionary builder
   - Building and saving a dictionary
   - Loading a saved dictionary
   - Searching the dictionary

3. **text-replacement.js** - Text replacement example using TextDarts
   - Replacing words with a callback function
   - Replacing words with a replacement map
   - Generating HTML links
   - Building and saving a dictionary
   - Loading a dictionary from file

4. **text-replacement.ts** - TypeScript version of the text replacement example

5. **auto-complete.js** - Auto-complete feature example
   - Implementing an auto-complete feature using Darts
   - Interactive command-line auto-complete demo

6. **error-handling.js** - Error handling example
   - Handling various error cases in node-darts
   - Using try-catch blocks with specific error types

7. **morphological-analysis.js** - Dictionary search similar to morphological analysis
   - Simple implementation of morphological analysis using Darts
   - Word segmentation and part-of-speech tagging for text

## Japanese Examples

Japanese versions of these examples are available in the `ja/` subdirectory. These examples have the same functionality but include Japanese comments and console output.

## Running the Examples

Each example can be run using Node.js:

```bash
node examples/basic-usage.js
node examples/dictionary-builder.js
node examples/text-replacement.js
node examples/auto-complete.js
node examples/error-handling.js
node examples/morphological-analysis.js
```

For the TypeScript example:

```bash
ts-node examples/text-replacement.ts
```

Or compile it first:

```bash
tsc examples/text-replacement.ts
node examples/text-replacement.js
```

## Notes

- These examples demonstrate the basic features of the node-darts library
- The morphological analysis example is a simplified version of a real morphological analyzer
- The auto-complete example might require more complex implementation in real applications