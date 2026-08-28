import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ niche?: string; xep?: string; ten?: string; asOf?: string }>;
};

export default async function TongHopRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.niche?.trim()) {
    query.set("niche", params.niche.trim());
  }
  if (params.xep?.trim()) {
    query.set("xep", params.xep.trim());
  }
  if (params.ten?.trim()) {
    query.set("ten", params.ten.trim());
  }
  if (params.asOf?.trim()) {
    query.set("asOf", params.asOf.trim());
  }
  const qs = query.toString();
  redirect(qs ? `/?${qs}` : "/");
}
