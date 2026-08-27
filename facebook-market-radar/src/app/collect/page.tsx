import { LOCKED_NICHES } from "@/domain/niches";
import { CollectForm } from "./collect-form";

type Props = { searchParams: Promise<{ url?: string }> };

export default async function CollectPage({ searchParams }: Props) {
  const { url } = await searchParams;
  const originHint = "http://127.0.0.1:3100";
  const bookmarklet = `javascript:(function(){var u=location.href;if(u.indexOf('facebook.com/ads/library')===-1){alert('Mở Thư viện quảng cáo rồi bấm lại');return;}location.href='${originHint}/collect?url='+encodeURIComponent(u);}())`;

  return (
    <>
      <h1>Lưu ads từ Ad Library</h1>
      <div className="banner">
        Server không tải facebook.com. Chỉ parse URL bạn dán hoặc JSON bạn copy. Bookmarklet chỉ mở form với URL trang bạn đang xem.
      </div>
      <h2>Bookmarklet</h2>
      <p className="muted">Kéo link này lên thanh bookmark. Khi đang ở Ad Library, bấm bookmark để mở form.</p>
      <p>
        <a className="btn" href={bookmarklet}>
          Lưu vào FMR
        </a>
      </p>
      <h2>Form</h2>
      <CollectForm niches={[...LOCKED_NICHES]} defaultUrl={url ?? ""} />
    </>
  );
}
