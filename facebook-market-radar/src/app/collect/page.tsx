import Link from "next/link";
import { LOCKED_NICHES } from "@/domain/niches";
import { CollectBookmarklet } from "./collect-bookmarklet";
import { CollectForm } from "./collect-form";
import { LicensedImportForm } from "./licensed-import";
import { SheetImportForm } from "./sheet-import";

type Props = { searchParams: Promise<{ url?: string }> };

export default async function CollectPage({ searchParams }: Props) {
  const { url } = await searchParams;

  return (
    <>
      <p className="eyebrow">Save Ad</p>
      <h1>Lưu quảng cáo từ Thư viện</h1>
      <div className="banner">
        Máy chủ không tải facebook.com hay sàn TMĐT. Chỉ đọc đường dẫn bạn dán, JSON bạn sao chép, và
        giá bán bạn tự điền. Bookmark chỉ mở form với đường dẫn trang bạn đang xem. Hàng đợi nhiều
        cành: <Link href="/quet">Quét cành</Link>.
      </div>
      <h2>Bookmark lưu nhanh</h2>
      <p className="muted">
        Kéo liên kết này lên thanh bookmark. Khi đang ở Thư viện quảng cáo, bấm bookmark để mở form
        trên cùng origin máy chủ (kể cả VPS). Extension unpacked trong thư mục{" "}
        <code>extension/</code> cũng chỉ mở <code>/collect?url=</code> — không đọc facebook.com.
      </p>
      <p>
        <CollectBookmarklet />
      </p>
      <h2>Biểu mẫu</h2>
      <CollectForm niches={[...LOCKED_NICHES]} defaultUrl={url ?? ""} />
      <h2>Nhập nhiều thẻ từ sheet</h2>
      <SheetImportForm />
      <h2>Feed đã mua (licensed)</h2>
      <LicensedImportForm />
    </>
  );
}
