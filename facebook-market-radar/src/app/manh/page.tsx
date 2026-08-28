import Link from "next/link";
import { LOCKED_NICHES } from "@/domain/niches";
import { adRunSummary } from "@/domain/product-watch";
import { STRONG_FIND_METHODS, STRONG_HEAT, STRONG_LOOK_FOR, STRONG_LONGEVITY, strongProductReason } from "@/domain/strong-ads";
import { ProductCell } from "@/ui/product-cell";
import { ResearchGrid } from "@/ui/research-grid";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ niche?: string; view?: string; asOf?: string }>;
};

export default async function StrongAdsPage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const niche = params.niche?.trim() || undefined;
  const view = params.view === "grid" ? "grid" : "table";
  const rows = await getRadarService().listStrongProducts(nowMs, niche);

  return (
    <>
      <h1>Sản phẩm đang chạy ads mạnh nhất</h1>
      <p className="muted">
        Meta không công bố bảng “ads mạnh nhất Việt Nam”. Cách hợp pháp: soi Thư viện (VN, đang chạy), lưu thẻ,
        rồi để Radar xếp kho đó. Điểm nóng luôn ước lượng — không phải doanh số / ROAS đối thủ. Sàn /
        Google / YouTube: <Link href="/kenh/shopee">thống kê kênh</Link>.
      </p>
      <div className="banner">
        Trang này chỉ sản phẩm <strong>đã lưu</strong> đạt ngưỡng mạnh (điểm nóng ≥ {STRONG_HEAT}, hoặc độ bền ≥{" "}
        {STRONG_LONGEVITY} và ≥ 2 ads đang chạy). Radar không kéo ads Facebook. Không có dump Graph cho ads bán hàng
        VN.
      </div>

      <h2>Ba cách hợp pháp</h2>
      <div className="cards">
        {STRONG_FIND_METHODS.map((method, index) => (
          <div className="card" key={method.id}>
            <div className="n">{index + 1}</div>
            <strong>{method.titleVi}</strong>
            <p className="muted">{method.howVi}</p>
            <p className="muted">{method.limitVi}</p>
          </div>
        ))}
      </div>
      <p className="muted">
        Bắt đầu: <Link href="/quet">mở hàng đợi Thư viện</Link> → <Link href="/collect">lưu thẻ</Link> → quay lại đây.
        Feed đã mua: <Link href="/nguon">catalog nguồn</Link>.
      </p>

      <h2>Trên thẻ Ad Library, ưu tiên lưu gì</h2>
      <table>
        <thead>
          <tr>
            <th>Dấu hiệu</th>
            <th>Cách đọc</th>
            <th>Radar cộng vào</th>
          </tr>
        </thead>
        <tbody>
          {STRONG_LOOK_FOR.map((item) => (
            <tr key={item.id}>
              <td>{item.titleVi}</td>
              <td>{item.howVi}</td>
              <td>
                {item.mapsTo === "longevity"
                  ? "Độ bền"
                  : item.mapsTo === "intensity"
                    ? "Cường độ"
                    : "Tốc độ mới"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Bảng mạnh trên kho đã lưu ({rows.length})</h2>
      <div className="filters">
        <Link href="/manh" className={!niche ? "on" : ""}>
          Tất cả ngành
        </Link>
        {LOCKED_NICHES.map((item) => (
          <Link
            key={item.slug}
            href={`/manh?niche=${item.slug}${view === "grid" ? "&view=grid" : ""}`}
            className={niche === item.slug ? "on" : ""}
          >
            {item.nameVi}
          </Link>
        ))}
      </div>
      <p className="muted">
        <Link href={view === "grid" ? `/manh${niche ? `?niche=${niche}` : ""}` : `/manh?view=grid${niche ? `&niche=${niche}` : ""}`}>
          {view === "grid" ? "Xem bảng" : "Xem lưới creative"}
        </Link>
        {" · "}
        <Link href="/?lane=trending">Lọc trending trên trang chủ</Link>
        {" · "}
        <Link href="/">Tổng hợp kênh</Link>
        {" · "}
        <Link href="/xu-huong">Xu hướng / Fresh</Link>
        {" · "}
        <Link href="/nganh">Ngành chạy mạnh</Link>
      </p>

      {rows.length === 0 ? (
        <p className="muted">
          Chưa có sản phẩm đạt ngưỡng mạnh trong kho
          {niche ? " ngành này" : ""}. Mở <Link href="/quet">Quét cành</Link>, lưu thẻ Active lâu ngày / nhiều page,
          rồi tính lại — Radar không tự kéo Facebook.
        </p>
      ) : view === "grid" ? (
        <ResearchGrid rows={rows} />
      ) : (
        <table className="rankings">
          <thead>
            <tr>
              <th>#</th>
              <th>Sản phẩm</th>
              <th>Ngành</th>
              <th>Số QC / Số trang</th>
              <th>Cường độ</th>
              <th>Độ bền</th>
              <th>Tốc độ mới</th>
              <th>Proxy bán</th>
              <th>Điểm nóng</th>
              <th>Vì sao mạnh</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.clusterSlug}>
                <td>{index + 1}</td>
                <td>
                  <ProductCell
                    title={row.clusterTitle}
                    imageUrls={row.imageUrls}
                    price={row.price}
                    adSummary={adRunSummary(row.activeAdCount, row.distinctPageCount, row.totalAdCount)}
                    href={`/san-pham/${row.clusterSlug}`}
                  />
                </td>
                <td>
                  <Link href={`/manh?niche=${row.nicheSlug}`}>{row.nicheName}</Link>
                </td>
                <td>
                  {row.activeAdCount} / {row.distinctPageCount}
                </td>
                <td>{row.scores.intensity}</td>
                <td>{row.scores.longevity}</td>
                <td>{row.scores.velocity}</td>
                <td>{row.scores.salesProxy}</td>
                <td>
                  <span className="badge warn">{row.scores.heat} ước lượng</span>
                </td>
                <td>{strongProductReason(row).labelVi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
