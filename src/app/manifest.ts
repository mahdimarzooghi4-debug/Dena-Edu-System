import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/student",
    name: "دنا | اپ دانش‌آموز",
    short_name: "دنا",
    description: "آموزش، دوره‌ها، تمرین‌ها و مسیر رشد دانش‌آموز",
    start_url: "/student",
    scope: "/student/",
    lang: "fa",
    dir: "rtl",
    display: "standalone",
    background_color: "#f7f6fb",
    theme_color: "#5b4ce2",
    icons: [
      { src: "/dena-app-logo.png", type: "image/png", sizes: "any", purpose: "any" },
    ],
  };
}
