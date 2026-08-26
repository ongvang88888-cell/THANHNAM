import { LIVE_CLASSES } from "@/lib/unica-data";

export default function LivePage() {
  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Lịch học trực tiếp</h1>
        <p className="muted">Học miễn phí qua Zoom cùng chuyên gia. Đăng ký trước để nhận link vào lớp.</p>
      </div>
      <div className="u-grid">
        {LIVE_CLASSES.map((row) => (
          <a key={row.id} className="u-live" href="/register">
            <div className={`u-live-art ${row.tone}`}>
              <span>{row.platform}</span>
            </div>
            <h3>{row.title}</h3>
            <div className="u-live-meta">
              <span>
                {row.date} · {row.time}
              </span>
              <b>{row.priceLabel}</b>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
