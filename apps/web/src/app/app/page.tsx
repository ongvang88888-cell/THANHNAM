export default function AppDownloadPage() {
  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Tải app Unica</h1>
        <p className="muted">Học trên điện thoại, tiếp tục đúng bài đang dở, xem video và tài liệu đã mua.</p>
      </div>
      <section className="u-learn-box">
        <h2>Ứng dụng học viên</h2>
        <ul className="u-learn-grid">
          <li>
            <span className="u-check">✓</span>Khóa học của tôi đồng bộ với web
          </li>
          <li>
            <span className="u-check">✓</span>Học thử, ghi chú và bình luận bài học
          </li>
          <li>
            <span className="u-check">✓</span>Thông báo khi có lớp Zoom
          </li>
        </ul>
        <p className="muted">
          App học viên dùng Expo (`com.educommerce.student`). Liên kết cửa hàng sẽ mở khi bản phát hành
          Google Play / App Store được duyệt.
        </p>
        <p>
          <a className="btn" href="/library">
            Học trên web ngay
          </a>
        </p>
      </section>
    </div>
  );
}
