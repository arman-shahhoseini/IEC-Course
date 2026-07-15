import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getPublishedCourseSlugs } from "@/server/auth/public-courses.functions";

/**
 * Production base URL for sitemap and canonical links.
 * Update this when the custom domain is finalized.
 */
const BASE_URL = "https://karafarini.shomal.ac.ir";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Static pages — same as before.
        const staticPaths = [
          { path: "/", priority: "1.0", changefreq: "monthly" as const },
          { path: "/courses", priority: "0.9", changefreq: "monthly" as const },
          { path: "/about", priority: "0.7", changefreq: "monthly" as const },
          { path: "/contact", priority: "0.7", changefreq: "monthly" as const },
          { path: "/faq", priority: "0.6", changefreq: "monthly" as const },
        ];

        // Dynamic course detail pages — fetched from the DB via a
        // server function. Each published course gets its own URL.
        // If the DB is unavailable, we just skip the dynamic URLs
        // (the sitemap still has the static pages).
        let courseSlugs: string[] = [];
        try {
          courseSlugs = await getPublishedCourseSlugs();
        } catch {
          // DB unavailable — skip dynamic URLs.
        }

        const today = new Date().toISOString().split("T")[0];

        const staticUrls = staticPaths.map((p) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${p.path}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            `    <changefreq>${p.changefreq}</changefreq>`,
            `    <priority>${p.priority}</priority>`,
            "  </url>",
          ].join("\n"),
        );

        const courseUrls = courseSlugs.map((slug) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}/courses/${slug}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            `    <changefreq>weekly</changefreq>`,
            `    <priority>0.8</priority>`,
            "  </url>",
          ].join("\n"),
        );

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...courseUrls].join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
