import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prakritiestates.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/property/",
          "/consultants",
          "/search",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/dashboard/",
          "/*?*token=",
          "/*?*idempotency=",
        ],
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/images/", "/uploads/public/"],
        disallow: ["/uploads/private/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
