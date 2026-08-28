import Link from "next/link";
import { catalogScanQueryCount } from "@/domain/ad-library-scan";
import { getRadarService } from "@/server/radar";
import { ScanBoard } from "./scan-board";
import { ScanLookupPanel } from "./scan-lookup";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ group?: string; niche?: string; asOf?: string; ten?: string }> };

export default async function ScanPage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const service = getRadarService();
  const plan = await service.scanPlan(nowMs);
  const ten = params.ten?.trim() ?? "";
  const lookup = ten.length >= 2 ? await service.lookupScan(ten) : null;

  return (
    <>
      <h1>Hàng đợi quét nhiều cành</h1>
      <p className="muted">
        {plan.totalBranches} cành catalog, cộng biến thể tên và từ khóa rút từ nội dung ads đã lưu. Tự
        mở Thư viện (VN, đang chạy). Radar chỉ biết ads <strong>đã lưu</strong>. Điểm nóng vẫn ước lượng.
      </p>
      <div className="banner">
        Máy chủ không HTTP-GET facebook.com và không gọi /ads_archive cho ads bán hàng VN. Mỗi cành là
        một URL search chính thức. Mở thẻ → dán vào{" "}
        <Link href="/collect">Lưu quảng cáo</Link> hoặc nhập sheet bên dưới.
      </div>
      <div className="cards">
        <div className="card">
          <div className="n">{plan.totalBranches}</div>
          <div className="muted">Cành trong hàng đợi</div>
        </div>
        <div className="card">
          <div className="n">{plan.uncoveredCount}</div>
          <div className="muted">Cành chưa có mẫu</div>
        </div>
        <div className="card">
          <div className="n">{plan.coveredCount}</div>
          <div className="muted">Cành đã khớp dữ liệu lưu</div>
        </div>
        <div className="card">
          <div className="n">{plan.emptyNicheCount}</div>
          <div className="muted">Ngành chưa có mẫu</div>
        </div>
        <div className="card">
          <div className="n">{plan.runningProducts.length}</div>
          <div className="muted">Sản phẩm đang chạy (đã lưu)</div>
        </div>
        <div className="card">
          <div className="n">{plan.moreRunningBatch.length}</div>
          <div className="muted">Lô tìm thêm bài đang chạy</div>
        </div>
        <div className="card">
          <div className="n">{catalogScanQueryCount()}</div>
          <div className="muted">Từ khóa catalog (không scrape)</div>
        </div>
      </div>
      <ScanLookupPanel initialQuery={ten} initialLookup={lookup} />
      <ScanBoard plan={plan} initialGroup={params.group} initialNiche={params.niche} />
    </>
  );
}
