interface PostFrontmatter {
  title: string;
  description: string;
  publishedTime: string;
  series?: string;
  image?: string;
  draft?: boolean;
}

interface PostModule {
  frontmatter: PostFrontmatter;
}

interface Post extends PostFrontmatter {
  slug: string;
}

const posts = import.meta.glob<PostModule>("/src/pages/blog/**/*.mdx", {
  eager: true,
});

function pathToSlug(path: string): string {
  return path.replace(/^\/src\/pages/, "").replace(/\.mdx$/, "");
}

function allPostsIncludingDrafts(): Post[] {
  return Object.entries(posts)
    .filter(([, module]) => module.frontmatter?.publishedTime)
    .map(([path, module]) => ({
      slug: pathToSlug(path),
      ...module.frontmatter,
    }))
    .sort(
      (a, b) =>
        new Date(b.publishedTime).getTime() -
        new Date(a.publishedTime).getTime(),
    );
}

export function getAllPosts(): Post[] {
  return allPostsIncludingDrafts().filter((p) => !p.draft);
}

export function getSeriesPosts(series: string): Post[] {
  return allPostsIncludingDrafts()
    .filter((p) => p.series === series)
    .sort(
      (a, b) =>
        new Date(a.publishedTime).getTime() -
        new Date(b.publishedTime).getTime(),
    );
}
