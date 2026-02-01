# Testing Strategy and Documentation Overhaul

## 1. Test Coverage Gap Analysis

Maia currently lacks a formal testing suite. This section analyzes the most complex logic found in `src/utils`, `src/hooks`, and `src/lib` and provides critical unit tests to ensure stability.

### Analysis of Complex Logic

-   **`src/lib/analysis/index.js`**: Contains the core business logic for note analysis, including:
    -   `calculateVelocity`: Determines trending tags.
    -   `detectStaleness`: Identifies inactive projects.
    -   `findClusters`: Groups related notes using a graph-based approach.
-   **`src/lib/parseContentMeta.js`**: Handles parsing of user content for tags and wikilinks. This is critical for the graph and tagging systems.
-   **`src/utils/notify.js`**: Manages notification scheduling logic.

### Recommended Unit Tests (Vitest Syntax)

Below are 4 critical unit tests covering the most complex logic identified above.

#### A. Tag Velocity Calculation (`src/lib/analysis/index.js`)

```javascript
import { describe, it, expect } from 'vitest';
import { calculateVelocity } from '../src/lib/analysis/index.js';

describe('calculateVelocity', () => {
  it('should correctly calculate velocity and sort by highest velocity', () => {
    const now = Date.now();
    const day = 86400000;

    const notes = [
      // Recent notes (0-7 days)
      { createdAt: new Date(now - 1 * day).toISOString(), tags: ['react', 'vite'] },
      { createdAt: new Date(now - 2 * day).toISOString(), tags: ['react'] },
      // Previous notes (8-14 days)
      { createdAt: new Date(now - 9 * day).toISOString(), tags: ['vite', 'vite'] },
    ];

    // 'react': recent=2, prev=0 => velocity=2
    // 'vite': recent=1, prev=2 => velocity=-1

    const result = calculateVelocity(notes, 7);

    expect(result).toHaveLength(2);
    expect(result[0].tag).toBe('react');
    expect(result[0].velocity).toBe(2);
    expect(result[1].tag).toBe('vite');
    expect(result[1].velocity).toBe(-1);
  });
});
```

#### B. Graph Clustering (`src/lib/analysis/index.js`)

```javascript
import { describe, it, expect } from 'vitest';
import { findClusters } from '../src/lib/analysis/index.js';

describe('findClusters', () => {
  it('should group connected notes into a cluster', () => {
    const notes = [
      { id: '1', title: 'Alpha', content: 'Link to [[Beta]]' },
      { id: '2', title: 'Beta', content: 'Link to [[Alpha]]' },
      { id: '3', title: 'Gamma', content: 'No links' },
    ];

    const clusters = findClusters(notes);

    // Alpha and Beta form a cluster. Gamma is isolated (and filtered out by logic if size > 1).
    expect(clusters).toHaveLength(1);
    expect(clusters[0].size).toBe(2);
    const ids = clusters[0].notes.map(n => n.id).sort();
    expect(ids).toEqual(['1', '2']);
  });
});
```

#### C. Project Staleness Detection (`src/lib/analysis/index.js`)

```javascript
import { describe, it, expect } from 'vitest';
import { detectStaleness } from '../src/lib/analysis/index.js';

describe('detectStaleness', () => {
  it('should identify stale projects based on threshold', () => {
    const now = Date.now();
    const day = 86400000;

    const projects = [
      { id: 'p1', name: 'Active Project', status: 'Active', createdAt: new Date(now - 100 * day).toISOString() },
      { id: 'p2', name: 'Stale Project', status: 'Active', createdAt: new Date(now - 100 * day).toISOString() },
    ];

    const notes = [
      { projectIds: ['p1'], createdAt: new Date(now - 2 * day).toISOString() }, // Recent activity for p1
      { projectIds: ['p2'], createdAt: new Date(now - 20 * day).toISOString() }, // Old activity for p2
    ];

    // Threshold is 14 days by default
    const result = detectStaleness(projects, notes, 14);

    expect(result).toHaveLength(1);
    expect(result[0].project.id).toBe('p2');
    expect(result[0].isStale).toBe(true);
  });
});
```

#### D. Content Parsing (`src/lib/parseContentMeta.js`)

```javascript
import { describe, it, expect } from 'vitest';
import { parseContentMeta } from '../src/lib/parseContentMeta.js';

describe('parseContentMeta', () => {
  it('should extract unique tags and clean wikilinks', () => {
    const content = `
      Here is a #tag and another #tag.
      Also a [[Link]] and a [[Link|Alias]].
      And a [[Link#Heading]].
    `;

    const { tags, links } = parseContentMeta(content);

    expect(tags).toEqual(['tag']);
    expect(links).toContain('Link');
    expect(links).toHaveLength(1); // Should handle duplicates and aliases mapping to same link
  });
});
```

## 2. Type Safety (JSDoc)

To improve semantic type safety and IDE support, we propose the following JSDoc standard.

### Proposed JSDoc Standard

1.  **Mandatory Blocks**: All exported functions in `src/lib`, `src/utils`, and `src/hooks` must have a JSDoc block.
2.  **Parameters**: Use `@param {Type} name - Description`.
    -   Use `?` for optional types: `@param {string} [name]` or `@param {string?} name`.
    -   Use complex types where necessary: `@param {{id: string, value: number}} obj`.
3.  **Return Values**: Use `@returns {Type} Description`.
4.  **Generics**: Use `@template T` for generic functions (especially hooks).

### Example Application

We have applied this standard to key files. For example, in `src/utils/notify.js`:

```javascript
/**
 * Schedule a local notification to be shown at a specific time.
 * @param {string} id - Unique identifier for the notification.
 * @param {string} title - Title of the notification.
 * @param {string} whenISO - ISO 8601 date string for when the notification should be shown.
 */
export function scheduleLocalNotification(id, title, whenISO) { ... }
```

## 3. Backend Readiness

Maia currently operates as a "Local First" application using `localStorage`. To support future Pinecone/AI integrations, we should introduce an abstraction layer for external services.

### Proposed Architecture

Create a new directory `src/services` and a file `src/services/ai.js`. This file will serve as the interface for all AI-related operations.

### Proposed Interface (`src/services/ai.js`)

```javascript
/**
 * AI Service Interface
 *
 * This module abstracts the interaction with AI backends (e.g., Pinecone, OpenAI).
 * Initially, this might be a stub or connect to a local mock.
 */

const CONFIG = {
  endpoint: import.meta.env.VITE_AI_ENDPOINT || 'http://localhost:3000/api',
  apiKey: import.meta.env.VITE_AI_API_KEY,
};

/**
 * Generate embeddings for a given text.
 * @param {string} text - The input text to embed.
 * @returns {Promise<number[]>} A vector embedding.
 */
export async function generateEmbedding(text) {
  // Placeholder for future implementation
  console.log('Generating embedding for:', text.slice(0, 20) + '...');
  return [];
}

/**
 * Query the vector database for similar content.
 * @param {number[]} vector - The query vector.
 * @param {number} [topK=5] - Number of results to return.
 * @returns {Promise<Array<{id: string, score: number}>>} Ranked results.
 */
export async function querySimilar(vector, topK = 5) {
  // Placeholder for Pinecone query
  return [];
}

/**
 * Send a prompt to an LLM.
 * @param {string} prompt - The user prompt.
 * @param {string} [context] - Optional context from RAG.
 * @returns {Promise<string>} The LLM response.
 */
export async function completion(prompt, context) {
  // Placeholder for OpenAI/LLM call
  return "I'm sorry, I can't do that yet.";
}
```

By using this service pattern, the UI components (e.g., `CommandPalette` or `EditorRich`) can import functions from `src/services/ai.js` without worrying about the underlying implementation details or API keys.
