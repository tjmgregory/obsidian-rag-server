export class Note {
  constructor(
    public readonly path: string,
    public readonly title: string,
    public readonly content: string,
    public readonly frontmatter: Record<string, unknown>,
    public readonly tags: string[],
    public readonly links: string[],
    public readonly createdAt: Date,
    public readonly modifiedAt: Date,
  ) {}

  hasTag(tag: string): boolean {
    const normalizedTag = tag.toLowerCase();
    return this.tags.some((t) => t.toLowerCase() === normalizedTag);
  }

  matchesQuery(query: string): boolean {
    const normalizedQuery = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(normalizedQuery) ||
      this.content.toLowerCase().includes(normalizedQuery)
    );
  }
}
