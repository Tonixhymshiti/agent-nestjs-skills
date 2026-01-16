import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { guides, guidesList } from "@/content/generated";
import { ChevronLeft, ChevronRight, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guides/$slug")({
  component: GuidePage,
  loader: ({ params }) => {
    const guide = guides[params.slug];
    if (!guide) {
      throw notFound();
    }
    return guide;
  },
});

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-500 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  advanced: "bg-red-500/10 text-red-500 border-red-500/20",
};

function GuidePage() {
  const guide = Route.useLoaderData();

  // Find position for prev/next navigation
  const currentIndex = guidesList.findIndex((g) => g.slug === guide.slug);
  const prevGuide = currentIndex > 0 ? guidesList[currentIndex - 1] : null;
  const nextGuide =
    currentIndex < guidesList.length - 1 ? guidesList[currentIndex + 1] : null;

  return (
    <article className="space-y-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link to="/guides" className="hover:text-foreground">
          Guides
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{guide.title}</span>
      </nav>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${difficultyColors[guide.difficulty] ?? difficultyColors.beginner}`}
          >
            {guide.difficulty}
          </span>
          {guide.estimatedTime && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="size-4" />
              {guide.estimatedTime}
            </span>
          )}
          <span className="text-sm capitalize text-muted-foreground">
            {guide.category?.replace(/-/g, " ")}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {guide.title}
        </h1>
        {guide.description && (
          <p className="max-w-2xl text-lg text-muted-foreground">
            {guide.description}
          </p>
        )}
      </header>

      {/* Prerequisites */}
      {guide.prerequisites && guide.prerequisites.length > 0 && (
        <aside className="rounded-lg border border-border bg-muted/50 p-4">
          <h2 className="mb-2 text-sm font-semibold">Prerequisites</h2>
          <ul className="flex flex-wrap gap-2">
            {guide.prerequisites.map((prereq) => {
              const prereqGuide = guidesList.find((g) => g.slug === prereq);
              return (
                <li key={prereq}>
                  {prereqGuide ? (
                    <Link
                      to="/guides/$slug"
                      params={{ slug: prereq }}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm hover:border-foreground/20"
                    >
                      {prereqGuide.title}
                    </Link>
                  ) : (
                    <span className="rounded-md border border-border bg-background px-2 py-1 text-sm">
                      {prereq}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      {/* Content */}
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: guide.content }}
      />

      {/* Source link */}
      <div className="border-t border-border pt-6">
        <a
          href={`https://github.com/kadajett/nestjs-best-practices-skill/blob/main/website/content/guides/${guide.filename}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          Edit this page on GitHub
        </a>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Guide navigation"
        className="flex items-center justify-between border-t border-border pt-6"
      >
        {prevGuide ? (
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/guides/$slug" params={{ slug: prevGuide.slug }}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{prevGuide.title}</span>
              <span className="sm:hidden">Previous</span>
            </Link>
          </Button>
        ) : (
          <div />
        )}
        {nextGuide ? (
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/guides/$slug" params={{ slug: nextGuide.slug }}>
              <span className="hidden sm:inline">{nextGuide.title}</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </nav>
    </article>
  );
}
