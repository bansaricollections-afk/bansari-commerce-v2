/**
 * Instagram Content Publishing API client.
 *
 * THE PUBLISH IS TWO-PHASE, AND THAT SHAPES EVERYTHING HERE
 * Instagram does not accept a post in one call. You create a media container,
 * Meta fetches and processes the media asynchronously, and only once it
 * reports FINISHED can it be published. A carousel adds a third phase: one
 * container per image, then a parent container holding their ids.
 *
 * The consequence is that "publish" can fail at four different points, and
 * only the last one is actually harmless to retry. That is why every step
 * here reports precisely where it stopped.
 *
 * MEDIA MUST BE PUBLICLY REACHABLE
 * Meta cURLs the URLs given to it. Bytes cannot be uploaded to this API. See
 * lib/instagram/image.ts, which exists to put a compliant rendition at a
 * public URL first.
 */

/**
 * Pinned rather than floating. Meta ships breaking changes per version and
 * keeps each for roughly two years; a floating version means the integration
 * breaks on Meta's schedule rather than on ours. v26.0 released 29 Jul 2026.
 */
const API_VERSION = process.env.IG_API_VERSION ?? 'v26.0';

/**
 * graph.instagram.com is the Instagram Login path — a Business or Creator
 * account authorises the app directly, with no Facebook Page in between.
 * Override to https://graph.facebook.com when using the Facebook Login path,
 * where the token comes from a Page.
 */
const API_BASE = process.env.IG_API_BASE ?? 'https://graph.instagram.com';

export type InstagramCredentials = { igUserId: string; accessToken: string };

/**
 * Read credentials without throwing.
 *
 * Returns null rather than raising so the admin page can render and explain
 * what is missing. A blank screen with a 500 is a worse answer to "the
 * integration is not set up yet" than a page that says so.
 */
export function getInstagramCredentials(): InstagramCredentials | null {
  const igUserId = process.env.IG_USER_ID;
  const accessToken = process.env.IG_ACCESS_TOKEN;
  if (!igUserId || !accessToken) return null;
  return { igUserId, accessToken };
}

/** Meta returns errors as HTTP 200 with an `error` body often enough that the
 *  status code alone cannot be trusted. */
async function call<T>(
  path: string,
  creds: InstagramCredentials,
  params: Record<string, string>,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const url = new URL(`${API_BASE}/${API_VERSION}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: creds.accessToken });

  const res =
    method === 'GET'
      ? await fetch(`${url}?${body}`, { method: 'GET' })
      : await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });

  const json = (await res.json().catch(() => null)) as
    | (T & { error?: { message?: string; error_user_msg?: string } })
    | null;

  if (!json) throw new Error(`Instagram returned an unreadable response (HTTP ${res.status})`);

  if (json.error) {
    // error_user_msg is Meta's human-readable variant and is usually the more
    // actionable of the two when present.
    throw new Error(json.error.error_user_msg || json.error.message || 'Unknown Instagram error');
  }
  if (!res.ok) throw new Error(`Instagram request failed (HTTP ${res.status})`);

  return json;
}

/** Create a container for one image. `isCarouselItem` children are not
 *  publishable on their own — they only exist to be referenced by a parent. */
export async function createImageContainer(
  creds: InstagramCredentials,
  opts: { imageUrl: string; caption?: string; altText?: string; isCarouselItem?: boolean }
): Promise<string> {
  const params: Record<string, string> = { image_url: opts.imageUrl };
  if (opts.isCarouselItem) params.is_carousel_item = 'true';
  else if (opts.caption) params.caption = opts.caption;
  // alt_text is an accessibility field, supported for image posts since
  // Mar 2025. Populating it costs nothing and the alternative is a post that
  // is unreadable to anyone using a screen reader.
  if (opts.altText) params.alt_text = opts.altText.slice(0, 1000);

  const r = await call<{ id: string }>(`${creds.igUserId}/media`, creds, params);
  return r.id;
}

/** Create the parent container that binds 2–10 children into a carousel. */
export async function createCarouselContainer(
  creds: InstagramCredentials,
  childIds: string[],
  caption: string
): Promise<string> {
  if (childIds.length < 2 || childIds.length > 10) {
    throw new Error(`A carousel needs between 2 and 10 images (got ${childIds.length})`);
  }
  const r = await call<{ id: string }>(`${creds.igUserId}/media`, creds, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
  });
  return r.id;
}

/**
 * Wait for Meta to finish processing a container.
 *
 * Publishing an IN_PROGRESS container fails, so this is not optional. The
 * timeout exists because a container can sit in ERROR or simply never settle,
 * and an unbounded poll inside a request handler is how a page hangs forever.
 */
export async function waitForContainer(
  creds: InstagramCredentials,
  containerId: string,
  { timeoutMs = 90_000, intervalMs = 3_000 } = {}
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const r = await call<{ status_code?: string; status?: string }>(
      containerId,
      creds,
      { fields: 'status_code,status' },
      'GET'
    );

    if (r.status_code === 'FINISHED') return;
    if (r.status_code === 'ERROR' || r.status_code === 'EXPIRED') {
      throw new Error(`Instagram could not process the image: ${r.status ?? r.status_code}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    'Instagram is still processing the image after 90 seconds. It may still publish — ' +
      'check the account before trying again.'
  );
}

/** Publish a finished container. This is the irreversible step. */
export async function publishContainer(
  creds: InstagramCredentials,
  containerId: string
): Promise<string> {
  const r = await call<{ id: string }>(`${creds.igUserId}/media_publish`, creds, {
    creation_id: containerId,
  });
  return r.id;
}

/**
 * Find a post that was published in the last few minutes carrying this exact
 * caption.
 *
 * WHY THIS IS NEEDED
 * media_publish is not safe to assume failed just because it returned an
 * error. Observed in production on the very first real post: Meta answered
 *
 *     "An unexpected error has occurred. Please retry your request later."
 *
 * and the post was already live. The retry then published a second identical
 * carousel, which had to be deleted by hand.
 *
 * The API gives no idempotency key, so the only way to tell a genuine failure
 * from a lost response is to look at what is actually on the account. The
 * caption is the strongest available fingerprint: it is long, generated, and
 * carries a product-specific URL.
 */
export async function findRecentMediaByCaption(
  creds: InstagramCredentials,
  caption: string,
  withinMs = 10 * 60 * 1000
): Promise<{ id: string; permalink: string | null } | null> {
  try {
    const r = await call<{
      data?: { id: string; caption?: string; timestamp?: string; permalink?: string }[];
    }>(
      `${creds.igUserId}/media`,
      creds,
      { fields: 'id,caption,timestamp,permalink', limit: '10' },
      'GET'
    );

    const cutoff = Date.now() - withinMs;
    const wanted = caption.trim();

    for (const media of r.data ?? []) {
      if (!media.caption || media.caption.trim() !== wanted) continue;
      // A caption match alone is not enough — the same product could have been
      // posted legitimately last month. It must also be recent.
      const posted = media.timestamp ? Date.parse(media.timestamp) : NaN;
      if (Number.isNaN(posted) || posted < cutoff) continue;
      return { id: media.id, permalink: media.permalink ?? null };
    }
    return null;
  } catch {
    // This runs inside error handling. It must never replace the original,
    // more informative failure with one of its own.
    return null;
  }
}

/** The public permalink, fetched after publishing so the record links out. */
export async function getPermalink(
  creds: InstagramCredentials,
  mediaId: string
): Promise<string | null> {
  try {
    const r = await call<{ permalink?: string }>(mediaId, creds, { fields: 'permalink' }, 'GET');
    return r.permalink ?? null;
  } catch {
    // A missing permalink does not unpublish the post. Never let this fail the
    // publish — the post is already live by the time we ask.
    return null;
  }
}

/** Remaining posts in the rolling 24-hour window, straight from Meta. */
export async function getPublishingLimit(
  creds: InstagramCredentials
): Promise<{ used: number; cap: number } | null> {
  try {
    const r = await call<{ data?: { quota_usage?: number; config?: { quota_total?: number } }[] }>(
      `${creds.igUserId}/content_publishing_limit`,
      creds,
      { fields: 'config,quota_usage' },
      'GET'
    );
    const row = r.data?.[0];
    if (!row) return null;
    return { used: row.quota_usage ?? 0, cap: row.config?.quota_total ?? 100 };
  } catch {
    return null;
  }
}

/** Verify the credentials and return the account they belong to. */
export async function getAccount(
  creds: InstagramCredentials
): Promise<{ username: string; accountType?: string }> {
  return call<{ username: string; accountType?: string }>(
    creds.igUserId,
    creds,
    { fields: 'username,account_type' },
    'GET'
  );
}
