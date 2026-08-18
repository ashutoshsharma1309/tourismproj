import { readSubmissionMedia } from "@/lib/archive-submissions";

/**
 * Serves the image attached to a pending submission, for the curator queue.
 *
 * Uploads deliberately do not live in public/. An unreviewed contribution must
 * not be reachable as a static asset with a guessable path, and it must not be
 * indexable — so it is read through this handler, which serves it with
 * no-store and noindex and nothing else.
 *
 * This is a read path only. There is no route in this application that
 * publishes, approves or verifies a submission.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const media = await readSubmissionMedia(id);

  if (!media) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(media.bytes), {
    status: 200,
    headers: {
      "Content-Type": media.type,
      "Content-Length": String(media.bytes.byteLength),
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      /*
       * The Content-Type above is the uploader's own `file.type`. Upload
       * validation allowlists it, but nothing inspects the bytes — so a file
       * whose contents are HTML can be stored while declaring image/png. Without
       * nosniff a browser is free to disregard the declared type, sniff the
       * markup and render it as a document on this origin. The sandboxed CSP
       * already neuters scripts; nosniff is what stops the sniff itself.
       */
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
