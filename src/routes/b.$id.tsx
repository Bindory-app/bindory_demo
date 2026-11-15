import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { loadPublicBinder } from "@/lib/binders.functions";
import { BinderCover, BinderPages } from "@/components/BinderPages";
import { Button } from "@/components/ui/button";

const publicBinderOptions = (id: string) =>
  queryOptions({
    queryKey: ["public-binder", id],
    queryFn: () => loadPublicBinder({ data: { id } }),
    staleTime: 0,
  });
export const Route = createFileRoute("/b/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(publicBinderOptions(params.id)),
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} · Bindory` : "Binder unavailable · Bindory";
    const description =
      loaderData?.description || "A Pokémon TCG binder with the stories behind its cards.";
    const cover =
      loaderData?.cards.find((c) => c.id === loaderData.cover_card_id) ?? loaderData?.cards[0];
    const image = cover?.image_url?.startsWith("https://") ? cover.image_url : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: PublicBinder,
  errorComponent: () => <PublicError />,
  notFoundComponent: () => <p>This binder is not public or could not be found.</p>,
});
function PublicError() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[390px] p-5">
      <p role="alert">I could not load this binder.</p>
      <Button className="mt-4 rounded-full" onClick={() => void router.invalidate()}>
        Retry
      </Button>
    </div>
  );
}
function PublicBinder() {
  const { id } = Route.useParams();
  const { data: binder } = useSuspenseQuery(publicBinderOptions(id));
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas-outer">
      <main className="mx-auto min-h-screen w-full max-w-[390px] bg-card px-5 py-6">
        <Link to="/" className="text-sm font-bold text-primary">
          Bindory
        </Link>
        {binder ? (
          <>
            <h1 className="mb-5 mt-4 break-words text-2xl font-bold">{binder.name}</h1>
            <BinderCover cards={binder.cards} coverId={binder.cover_card_id} name={binder.name} />
            {binder.description && (
              <p className="mb-5 text-sm text-muted-foreground">{binder.description}</p>
            )}
            <p className="mb-3 text-sm text-muted-foreground">{binder.cards.length} cards</p>
            <BinderPages cards={binder.cards} />
          </>
        ) : (
          <p className="mt-6">This binder is not public or could not be found.</p>
        )}
      </main>
    </div>
  );
}
