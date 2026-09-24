import { handleTarotReading } from "./tarot-reading.mjs";

const API_PATH = "/api/tarot-reading";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === API_PATH) return handleTarotReading(request, env);

    // Matching static files are served directly by the Site asset layer.
    // This fallback also supports directory and not-found behavior when bound.
    if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
