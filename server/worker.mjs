import { handleAPI, isStaff } from "./api.mjs";
import assets from "./assets.generated.mjs";
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleAPI(request, env, ctx);
    if (!isStaff(request, env))
      return new Response(
        `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>LoCoMatch staff sign-in</title><body style="font:18px system-ui;max-width:420px;margin:15vh auto;padding:24px;color:#203c2d"><h1>LoCoMatch</h1><p>Staff sign-in protects product records, customer details and messages.</p><a href="/signin-with-chatgpt?returnTo=%2F" target="_top" style="display:inline-block;padding:15px 22px;background:#285a3d;color:white;border-radius:9px;text-decoration:none">Sign in to the staff workspace</a></body></html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    const asset = assets[url.pathname === "/" ? "/index.html" : url.pathname];
    if (!asset) return new Response("Not found", { status: 404 });
    return new Response(asset.body, {
      headers: {
        "Content-Type": asset.type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  },
};
