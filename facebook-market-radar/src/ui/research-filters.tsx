import { CREATIVE_ANGLE_VI, CREATIVE_ANGLES } from "@/domain/creative-angles";
import { LANDING_KIND_VI } from "@/domain/landing";
import { LOCKED_NICHES, NICHE_GROUPS } from "@/domain/niches";
import type { ResearchQuery } from "./research-query";

export function ResearchFilters({
  action,
  query,
}: {
  action: string;
  query: ResearchQuery;
}) {
  return (
    <form className="research-filters" action={action} method="get">
      {query.view ? <input type="hidden" name="view" value={query.view} /> : null}
      <label>
        Tên / hook
        <input name="ten" defaultValue={query.ten ?? ""} placeholder="Serum, Đèn LED…" />
      </label>
      <label>
        Nhóm
        <select name="group" defaultValue={query.group ?? ""}>
          <option value="">Tất cả nhóm</option>
          {NICHE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ngành
        <select name="niche" defaultValue={query.niche ?? ""}>
          <option value="">Tất cả ngành</option>
          {LOCKED_NICHES.map((niche) => (
            <option key={niche.slug} value={niche.slug}>
              {niche.nameVi}
            </option>
          ))}
        </select>
      </label>
      <label>
        Làn
        <select name="lane" defaultValue={query.lane ?? "all"}>
          <option value="all">Mọi làn</option>
          <option value="trending">Trending</option>
          <option value="fresh">Fresh / mới nổi</option>
          <option value="other">Khác</option>
        </select>
      </label>
      <label>
        Ngày chạy ≥
        <input name="minDays" inputMode="numeric" defaultValue={query.minDays ?? ""} placeholder="7" />
      </label>
      <label>
        Số trang ≥
        <input name="minPages" inputMode="numeric" defaultValue={query.minPages ?? ""} placeholder="2" />
      </label>
      <label>
        Landing
        <select name="landing" defaultValue={query.landing ?? "any"}>
          <option value="any">Mọi thẻ</option>
          <option value="yes">Có đích</option>
          <option value="no">Chưa có đích</option>
        </select>
      </label>
      <label>
        Loại đích
        <select name="landingKind" defaultValue={query.landingKind ?? ""}>
          <option value="">Mọi loại</option>
          <option value="shopee">{LANDING_KIND_VI.shopee}</option>
          <option value="tiktok">{LANDING_KIND_VI.tiktok}</option>
          <option value="web">{LANDING_KIND_VI.web}</option>
        </select>
      </label>
      <label>
        Góc creative
        <select name="angle" defaultValue={query.angle ?? ""}>
          <option value="">Mọi góc</option>
          {CREATIVE_ANGLES.map((angle) => (
            <option key={angle} value={angle}>
              {CREATIVE_ANGLE_VI[angle]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Media
        <select name="media" defaultValue={query.media ?? ""}>
          <option value="">Ảnh + chữ</option>
          <option value="image">Có ảnh</option>
          <option value="text">Chỉ chữ</option>
        </select>
      </label>
      <label>
        Giá từ (VND)
        <input name="minPrice" inputMode="numeric" defaultValue={query.minPrice ?? ""} />
      </label>
      <label>
        Giá đến (VND)
        <input name="maxPrice" inputMode="numeric" defaultValue={query.maxPrice ?? ""} />
      </label>
      <label>
        Shop / landing đã dán
        <input name="shop" defaultValue={query.shop ?? ""} placeholder="shopee:shop-name" />
      </label>
      <label>
        Sort by
        <select name="sort" defaultValue={query.sort ?? "heat"}>
          <option value="heat">Heat ước lượng</option>
          <option value="days">Running days</option>
          <option value="latest">Latest creatives</option>
          <option value="lastSeen">Last seen</option>
        </select>
      </label>
      <div className="watch-actions">
        <button type="submit">Apply filters</button>
        <a className="btn secondary" href={action}>
          Xóa lọc
        </a>
      </div>
    </form>
  );
}
