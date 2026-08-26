export default function MembershipPage() {
  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Hội viên Unica</h1>
        <p className="muted">Học không giới hạn trong thư viện khóa được mở bằng gói hội viên hoặc premium library.</p>
      </div>
      <section className="u-learn-box">
        <h2>Quyền lợi hội viên</h2>
        <ul className="u-learn-grid">
          <li>
            <span className="u-check">✓</span>Mở khóa các khóa thuộc gói hội viên
          </li>
          <li>
            <span className="u-check">✓</span>Học trên web, tiếp tục đúng bài đang dở
          </li>
          <li>
            <span className="u-check">✓</span>Ưu đãi combo và kích hoạt mã
          </li>
          <li>
            <span className="u-check">✓</span>Hỗ trợ hoàn tiền 07 ngày với khóa lẻ
          </li>
        </ul>
        <p>
          <a className="btn" href="/khoa-hoc">
            Xem khóa hội viên
          </a>
        </p>
      </section>
    </div>
  );
}
