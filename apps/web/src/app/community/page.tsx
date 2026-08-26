export default function CommunityPage() {
  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Community</h1>
        <p className="muted">Cộng đồng học viên: thông báo lớp Zoom, hỏi đáp bài học và chia sẻ tiến độ.</p>
      </div>
      <section className="u-learn-box">
        <h2>Bạn làm gì được ở đây?</h2>
        <ul className="u-learn-grid">
          <li>
            <span className="u-check">✓</span>Xem lịch học trực tiếp và đăng ký Zoom
          </li>
          <li>
            <span className="u-check">✓</span>Bình luận ngay trong bài học đã mua
          </li>
          <li>
            <span className="u-check">✓</span>Theo dõi thông báo khóa mới
          </li>
        </ul>
        <p>
          <a className="btn" href="/live">
            Xem lịch Zoom
          </a>{" "}
          <a className="btn ghost" href="/notifications">
            Thông báo
          </a>
        </p>
      </section>
    </div>
  );
}
