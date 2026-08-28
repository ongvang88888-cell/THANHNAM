import Link from "next/link";
import {
  DATA_SOURCES,
  SOURCE_FAMILIES,
  SOURCE_FAMILY_VI,
  type DataSource,
  type SourceFamily,
} from "@/domain/data-sources";
import { CHANNEL_FAMILY_VI, SALES_CHANNELS } from "@/domain/sales-channels";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

function badgeClass(source: DataSource): string {
  if (source.status === "blocked") {
    return "badge danger";
  }
  if (source.status === "wired") {
    return "badge";
  }
  return "badge warn";
}

function statusLabel(source: DataSource): string {
  if (source.status === "blocked") {
    return "Cấm";
  }
  if (source.status === "wired") {
    return "Đã nối kho";
  }
  return "Cần hợp đồng / xuất tay";
}

function vnLabel(value: DataSource["vnCommercial"]): string {
  if (value === "yes") {
    return "Ads bán hàng VN: có";
  }
  if (value === "human_only") {
    return "Ads bán hàng VN: người xem rồi lưu";
  }
  if (value === "if_licensed") {
    return "Ads bán hàng VN: nếu feed đã mua";
  }
  return "Ads bán hàng VN: không";
}

export default async function SourcesPage() {
  const warehouse = await getRadarService().warehouseStats();
  const groups = SOURCE_FAMILIES.map((family: SourceFamily) => ({
    family,
    rows: DATA_SOURCES.filter((row) => row.family === family),
  }));

  return (
    <>
      <h1>Nguồn dữ liệu ads Facebook</h1>
      <p className="muted">
        Kho Radar chỉ nhận thẻ đã lưu hoặc feed JSON/CSV/API <strong>đã mua / user tự xuất</strong>.
        Không có API Meta nào trả ads bán hàng đang chạy tại Việt Nam. Điểm nóng luôn là ước lượng —
        không ai cho doanh số / ROAS / CPA đối thủ.
      </p>
      <div className="banner">
        Server không HTTP GET facebook.com, không gọi <code>/ads_archive</code> cho commercial VN, không
        scrape Shopee/TikTok/YouTube/Google Transparency/BigSpy. Facebook: <code>docs/SOURCES.md</code>.
        Đa kênh: <Link href="/tong-hop">bảng tổng hợp</Link> · <code>docs/CHANNELS.md</code>.
      </div>
      <div className="cards">
        <div className="card">
          <div className="n">{warehouse.adCount}</div>
          <div className="muted">Ads trong kho</div>
        </div>
        <div className="card">
          <div className="n">{warehouse.activeAdCount}</div>
          <div className="muted">Đang đánh dấu chạy</div>
        </div>
        <div className="card">
          <div className="n">{warehouse.productCount}</div>
          <div className="muted">Sản phẩm (cụm)</div>
        </div>
        <div className="card">
          <div className="n">{warehouse.pageCount}</div>
          <div className="muted">Trang đã lưu</div>
        </div>
        <div className="card">
          <div className="n">{warehouse.nicheCount}</div>
          <div className="muted">Ngành có dữ liệu</div>
        </div>
      </div>
      <p>
        Đồng bộ ngay: <Link href="/collect">Lưu thẻ / sheet / JSON</Link> ·{" "}
        <Link href="/quet">Mở URL Thư viện</Link> · <Link href="/tong-hop">Tổng hợp kênh</Link> ·{" "}
        <Link href="/own-ads">Ads của tôi</Link>.
      </p>
      {groups.map((group) => (
        <section key={group.family}>
          <h2>{SOURCE_FAMILY_VI[group.family]}</h2>
          <table>
            <thead>
              <tr>
                <th>Nguồn</th>
                <th>Trạng thái</th>
                <th>Cổng Radar</th>
                <th>Cho kho</th>
                <th>Không có</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.nameVi}</strong>
                    <div className="muted">{row.notesVi}</div>
                    <div className="muted">{vnLabel(row.vnCommercial)}</div>
                  </td>
                  <td>
                    <span className={badgeClass(row)}>{statusLabel(row)}</span>
                    <div className="muted">{row.ingestPath}</div>
                  </td>
                  <td>{row.radarPort}</td>
                  <td>{row.provides.join(", ") || "—"}</td>
                  <td>{row.missing.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <h2>Kênh bán hàng / ads ngoài Facebook</h2>
      <p className="muted">
        Không có API dump “sản phẩm bán chạy nhất VN” trên Google, YouTube hay sàn. Radar chỉ sinh URL
        chính thức và nhận số bạn nhập. Bảng chỉ số: <Link href="/tong-hop">/tong-hop</Link>.
      </p>
      {(["ad_transparency", "ecommerce", "search_demand", "own_account", "blocked"] as const).map((family) => (
        <section key={family}>
          <h3>{CHANNEL_FAMILY_VI[family]}</h3>
          <table>
            <thead>
              <tr>
                <th>Kênh</th>
                <th>Ingest</th>
                <th>Có</th>
                <th>Không có</th>
              </tr>
            </thead>
            <tbody>
              {SALES_CHANNELS.filter((row) => row.family === family).map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.nameVi}</strong>
                    <div className="muted">{row.notesVi}</div>
                  </td>
                  <td>{row.ingest}</td>
                  <td>{row.metrics.join(", ") || "—"}</td>
                  <td>{row.missing.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
