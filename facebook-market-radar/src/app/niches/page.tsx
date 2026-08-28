import Link from "next/link";
import { catalogScanQueryCount, scanQueriesForNiche } from "@/domain/ad-library-scan";
import { LOCKED_NICHES, NICHE_GROUPS, nichesInGroup } from "@/domain/niches";

export default function NichesPage() {
  return (
    <>
      <h1>Danh mục ngành hàng</h1>
      <p className="muted">
        {LOCKED_NICHES.length} ngành, {NICHE_GROUPS.length} nhóm, {catalogScanQueryCount()} cành từ
        khóa để bạn tự tìm trên Thư viện. Đây không phải kết quả quét Facebook.{" "}
        <Link href="/quet">Mở hàng đợi quét</Link>.
      </p>
      <div className="banner">
        Dán từng từ khóa vào Thư viện (quốc gia Việt Nam, loại Tất cả quảng cáo), rồi lưu thẻ bạn thấy
        vào Radar. Máy chủ không tự kéo kết quả.
      </div>
      {NICHE_GROUPS.map((group) => (
        <section key={group}>
          <h2>
            <Link href={`/?group=${encodeURIComponent(group)}`}>{group}</Link>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Ngành hàng</th>
                <th>Mã</th>
                <th>Cành tìm trên Thư viện</th>
              </tr>
            </thead>
            <tbody>
              {nichesInGroup(group).map((n) => (
                <tr key={n.slug}>
                  <td>
                    <Link href={`/?niche=${n.slug}`}>{n.nameVi}</Link>
                    {" · "}
                    <Link href={`/quet?niche=${n.slug}`}>quét</Link>
                  </td>
                  <td>
                    <code>{n.slug}</code>
                  </td>
                  <td>
                    {(() => {
                      const queries = scanQueriesForNiche(n);
                      return queries.length === 0
                        ? "—"
                        : `${queries.slice(0, 5).join(" · ")}${queries.length > 5 ? ` · +${queries.length - 5}` : ""}`;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
