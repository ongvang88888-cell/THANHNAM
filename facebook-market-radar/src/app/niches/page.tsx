import Link from "next/link";
import { catalogKeywordCount, LOCKED_NICHES, NICHE_GROUPS, nichesInGroup } from "@/domain/niches";

export default function NichesPage() {
  return (
    <>
      <h1>Danh mục ngành hàng</h1>
      <p className="muted">
        {LOCKED_NICHES.length} ngành, {NICHE_GROUPS.length} nhóm, {catalogKeywordCount()} từ khóa gợi ý
        để bạn tự tìm trên Thư viện quảng cáo. Đây không phải kết quả quét Facebook.
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
                <th>Từ khóa tìm trên Thư viện</th>
              </tr>
            </thead>
            <tbody>
              {nichesInGroup(group).map((n) => (
                <tr key={n.slug}>
                  <td>
                    <Link href={`/?niche=${n.slug}`}>{n.nameVi}</Link>
                  </td>
                  <td>
                    <code>{n.slug}</code>
                  </td>
                  <td>{n.searchKeywords.join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
