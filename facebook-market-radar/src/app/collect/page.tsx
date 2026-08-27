import { LOCKED_NICHES } from "@/domain/niches";
import { CollectForm } from "./collect-form";

type Props = { searchParams: Promise<{ url?: string }> };

export default async function CollectPage({ searchParams }: Props) {
  const { url } = await searchParams;
  const originHint = "http://127.0.0.1:3100";
  const bookmarklet = `javascript:(function(){var u=location.href;if(u.indexOf('facebook.com/ads/library')===-1){alert('Mở Thư viện quảng cáo rồi bấm lại');return;}location.href='${originHint}/collect?url='+encodeURIComponent(u);}())`;

  return (
    <>
      <h1>Lưu quảng cáo từ Thư viện</h1>
      <div className="banner">
        Máy chủ không tải facebook.com. Chỉ đọc đường dẫn bạn dán hoặc JSON bạn sao chép. Bookmark chỉ
        mở form với đường dẫn trang bạn đang xem.
      </div>
      <h2>Bookmark lưu nhanh</h2>
      <p className="muted">
        Kéo liên kết này lên thanh bookmark. Khi đang ở Thư viện quảng cáo, bấm bookmark để mở form.
      </p>
      <p>
        <a className="btn" href={bookmarklet}>
          Lưu vào Radar
        </a>
      </p>
      <h2>Biểu mẫu</h2>
      <CollectForm niches={[...LOCKED_NICHES]} defaultUrl={url ?? ""} />
    </>
  );
}
