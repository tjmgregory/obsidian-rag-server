# Semantic Search Explained

A learning guide for understanding how semantic search works in our Obsidian RAG server.

## The Problem with Keyword Search

Imagine you're searching for "how to get better at Spanish":

**Keyword search** (Phase 1) would miss:
- "Spanish learning techniques"
- "Improving español fluency"
- "Methods for language acquisition"
- "Practice exercises for castellano"

Why? Because it's looking for exact words, not meaning.

## Enter Semantic Search

Semantic search understands that all those phrases are about the same thing.

### The Magic: Embeddings

Think of embeddings like **GPS coordinates for meaning**:

```
"dog"     → [0.2, 0.8, -0.3, ...]
"puppy"   → [0.3, 0.7, -0.2, ...]  <- Similar numbers!
"cat"     → [0.1, 0.9, -0.4, ...]  <- Still similar (both pets)
"car"     → [-0.8, 0.1, 0.6, ...]  <- Very different!
```

In reality, we use 384 dimensions instead of 3, but the concept is the same.

### How It Works: Step by Step

#### 1. Indexing Time (One-Time Setup)

```mermaid
graph LR
    A[Your Notes] --> B[Chunker]
    B --> C[Text Chunks]
    C --> D[Embedding Model]
    D --> E[Vectors]
    E --> F[Vector Database]
```

**Example Note**:
```markdown
# Spanish Learning Progress

I've been practicing Spanish for 3 months now.
Focus areas include vocabulary and conversation.

## Techniques That Work

Daily practice with flashcards has been helpful.
Watching Spanish TV shows with subtitles...
```

**After Chunking**:
- Chunk 1: "Spanish Learning Progress. I've been practicing..."
- Chunk 2: "Techniques That Work. Daily practice with..."

**After Embedding**:
- Chunk 1 → [0.23, -0.45, 0.67, ...] (384 numbers)
- Chunk 2 → [0.31, -0.52, 0.71, ...] (384 numbers)

#### 2. Search Time (When You Query)

```mermaid
graph LR
    A[Your Query] --> B[Embedding Model]
    B --> C[Query Vector]
    C --> D[Find Similar Vectors]
    D --> E[Ranked Results]
```

**Your Query**: "How to improve at languages"
**Query Vector**: [0.28, -0.48, 0.69, ...]

**Finding Matches**: Calculate similarity with all stored vectors
- Spanish chunk 1: 0.92 similarity (very related!)
- Spanish chunk 2: 0.88 similarity (quite related!)
- Random cooking note: 0.23 similarity (unrelated)

## The Math (Simplified)

### Cosine Similarity

Imagine vectors as arrows pointing in space:
- Same direction = Similar meaning (similarity ≈ 1.0)
- Perpendicular = Unrelated (similarity ≈ 0.0)
- Opposite = Contrary meaning (similarity ≈ -1.0)

```
   "dog" →
         ↗ "puppy"
   
   ↑ "cat"
   
   ← "car" (different direction = different meaning)
```

### Distance Metrics

We use **cosine similarity** because it measures angle, not magnitude:
- "I love dogs" and "I really really love dogs" → Same direction
- They have the same meaning despite different "lengths"

## Our Implementation Choices

### 1. Local Embeddings (Transformers.js)

**Pros**:
- Your notes stay private
- No API costs
- Works offline

**Cons**:
- Initial model download (23MB)
- Slightly slower than cloud APIs
- Slightly lower quality than GPT-4

### 2. Smart Chunking

Bad chunking:
```
"I love Spanish. It's beautif" | "ul and expressive."
```

Good chunking (ours):
```
"I love Spanish. It's beautiful and expressive." | 
"[overlap] expressive. Learning it has been..."
```

### 3. Hybrid Search

We combine **keyword** and **semantic** search:

```typescript
results = 0.7 * semanticScore + 0.3 * keywordScore
```

This catches both:
- Exact terminology (keyword)
- Related concepts (semantic)

## Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| Embed one chunk | ~100ms | First time slower (model loading) |
| Search 1000 notes | ~50ms | After indexing |
| Index 100 notes | ~30s | One-time setup |
| Update 1 note | ~200ms | Incremental |

## Common Questions

### Q: Why not just use GPT-4 for everything?
**A**: Privacy, cost, and speed. Local embeddings are "good enough" for most use cases.

### Q: How much disk space will this use?
**A**: Roughly 2x your vault size:
- Original notes: 10MB
- Embeddings: ~10MB
- Index structures: ~5MB

### Q: Will this slow down Obsidian?
**A**: No, it runs in a separate process and only updates changed notes.

### Q: Can I tune the results?
**A**: Yes! We'll add settings for:
- Chunk size
- Overlap amount
- Keyword vs semantic weight
- Similarity threshold

## Try It Yourself

Once Phase 2 is complete, you'll see the difference:

**Query**: "productivity"

**Phase 1 (keyword)** returns:
- Notes containing the word "productivity"

**Phase 2 (semantic)** returns:
- Time management techniques
- GTD methodology
- Focus strategies
- Efficiency tips
- Work-life balance

All related to productivity, even without the exact word!

## Next: Building Phase 2

Now that you understand the concepts, we'll implement:
1. Embedding generation pipeline
2. Vector storage system
3. Smart chunking algorithm
4. Hybrid search API

Each piece builds on these fundamentals to create intelligent search that understands meaning, not just matches words.