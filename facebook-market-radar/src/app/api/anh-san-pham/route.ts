import { renderProductSvg } from "@/domain/product-image";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("ten") ?? "Sản phẩm";
  const niche = url.searchParams.get("nganh") ?? "khac";
  const svg = renderProductSvg(title, niche);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
