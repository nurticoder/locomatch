import { handleAPI } from "./api.mjs";
const allowed = new Set([
  "GET /api/workspace",
  "POST /api/initialise",
  "PUT /api/workspace",
  "POST /api/reset",
  "POST /api/bot/simulate",
]);
export function publicPreviewHTML(html) {
  return html.replace(
    "<head>",
    '<head>\n<base href="/">\n<meta name="locomatch-public-demo" content="true">',
  );
}
function demoDatabase(db) {
  return {
    prepare(sql) {
      if (!/\bworkspace_state\b/.test(sql))
        throw new Error("Public previews cannot access private storage.");
      let statement = db.prepare(sql);
      const result = {
        bind(...values) {
          statement = statement.bind(
            ...values.map((value) =>
              value === "main" ? "public-preview" : value,
            ),
          );
          return result;
        },
        first: () => statement.first(),
        run: () => statement.run(),
      };
      return result;
    },
  };
}
export async function handlePublicPreview(request, env, ctx) {
  const u = new URL(request.url);
  u.pathname = u.pathname.replace(/^\/api\/demo(?=\/)/, "/api");
  if (!allowed.has(request.method + " " + u.pathname))
    return new Response(
      JSON.stringify({
        error:
          "Live WhatsApp connection settings and sending are available only in the private staff workspace.",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  if (request.method !== "GET" && request.headers.get("Origin") !== u.origin)
    return new Response(
      JSON.stringify({ error: "Open this action from the public demo page." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  const demoEnv = {
    DB: demoDatabase(env.DB),
    LOCAL_DEMO: true,
    PUBLIC_PREVIEW: true,
    PUBLIC_ORIGIN: env.PUBLIC_ORIGIN,
  };
  return handleAPI(new Request(u, request), demoEnv, ctx);
}
