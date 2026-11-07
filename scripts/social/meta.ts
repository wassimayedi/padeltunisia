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
  const body = new URLSearchParams({
    ...params,
    access_token: env("META_TOKEN"),
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

/** Photo post on the Page; links in the caption are clickable there. Returns the post id. */
export async function postToFacebook(imageUrl: string, caption: string) {
  const res = await graph<{ id: string; post_id?: string }>(
    `${env("META_PAGE_ID")}/photos`,
    {
      url: imageUrl,
      message: caption,
    },
  );
  return res.post_id ?? res.id;
}

/** Feed post on Instagram: creates the media container, waits until Meta has fetched the image, then publishes it. Returns the media id. */
export async function postToInstagram(imageUrl: string, caption: string) {
  const igUser = env("META_IG_USER_ID");
  const { id: container } = await graph<{ id: string }>(`${igUser}/media`, {
    image_url: imageUrl,
    caption,
  });

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
