// Posts to the Facebook Page and its linked Instagram Business account through the Meta Graph API.
// Needs META_PAGE_ID, META_IG_USER_ID and META_TOKEN: a never-expiring system user token from
// Business Manager with pages_manage_posts, pages_read_engagement, instagram_basic and
// instagram_content_publish on the Page (see scripts/daily-content/env.example).

const version = process.env["META_GRAPH_VERSION"] ?? "v23.0";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Calls the Graph API and returns its JSON, or throws with Meta's error message. */
async function graph<T>(
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "POST",
) {
  // A token passed in params (the Page token) takes precedence over META_TOKEN.
  const body = new URLSearchParams({
    access_token: env("META_TOKEN"),
    ...params,
  });
  const url = `https://graph.facebook.com/${version}/${path}`;
  const signal = AbortSignal.timeout(60_000);
  const response =
    method === "GET"
      ? await fetch(`${url}?${body}`, { signal })
      : await fetch(url, { method, body, signal });
  const json = (await response.json()) as T & {
    error?: { message: string; code: number };
  };
  if (!response.ok || json.error) {
    throw new Error(
      `Meta ${path}: ${json.error?.message ?? response.status} (code ${json.error?.code ?? "?"})`,
    );
  }
  return json;
}

/**
 * Page access token derived from META_TOKEN: posting with the system user token itself counts as a
 * person posting (Meta answers "publish_actions … deprecated"). Never expires when META_TOKEN doesn't.
 */
async function pageToken(pageId: string) {
  const { access_token } = await graph<{ access_token?: string }>(
    pageId,
    { fields: "access_token" },
    "GET",
  );
  if (!access_token) {
    throw new Error(
      `No Page token for ${pageId}: assign the Page to the system user and generate META_TOKEN again`,
    );
  }
  return access_token;
}

/** Photo post on the Page, as the Page; links in the caption are clickable there. Returns the post id. */
export async function postToFacebook(imageUrl: string, caption: string) {
  const pageId = env("META_PAGE_ID");
  const res = await graph<{ id: string; post_id?: string }>(
    `${pageId}/photos`,
    {
      url: imageUrl,
      message: caption,
      access_token: await pageToken(pageId),
    },
  );
  return res.post_id ?? res.id;
}

/** Page story (24 h): the photo is uploaded unpublished, then shared as a story. Returns the post id. */
export async function storyToFacebook(imageUrl: string) {
  const pageId = env("META_PAGE_ID");
  const access_token = await pageToken(pageId);
  const photo = await graph<{ id: string }>(`${pageId}/photos`, {
    url: imageUrl,
    published: "false",
    access_token,
  });
  const res = await graph<{ post_id?: string; success?: boolean }>(
    `${pageId}/photo_stories`,
    { photo_id: photo.id, access_token },
  );
  return res.post_id ?? photo.id;
}

/** Feed post on Instagram. Returns the media id. */
export const postToInstagram = (imageUrl: string, caption: string) =>
  publishToInstagram({ image_url: imageUrl, caption });

/** Instagram story (24 h); stories take no caption. Returns the media id. */
export const storyToInstagram = (imageUrl: string) =>
  publishToInstagram({ image_url: imageUrl, media_type: "STORIES" });

/** Creates the media container, waits until Meta has fetched the image, then publishes it. */
async function publishToInstagram(params: Record<string, string>) {
  const igUser = env("META_IG_USER_ID");
  const { id: container } = await graph<{ id: string }>(
    `${igUser}/media`,
    params,
  );

  for (let attempt = 0; ; attempt++) {
    const { status_code } = await graph<{ status_code: string }>(
      container,
      { fields: "status_code" },
      "GET",
    );
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED" || attempt >= 20) {
      throw new Error(`Instagram container ${container} is ${status_code}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  const { id } = await graph<{ id: string }>(`${igUser}/media_publish`, {
    creation_id: container,
  });
  return id;
}
