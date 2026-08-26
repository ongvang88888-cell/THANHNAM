export default function EnterprisePage() {
  return (
    <div className="u-wrap">
      <section className="u-become" style={{ marginTop: 28 }}>
        <div>
          <h2>Unica cho doanh nghiệp</h2>
          <p>Đào tạo nội bộ, LMS và gói học theo đội ngũ. Kích hoạt hàng loạt, báo cáo tiến độ, thương hiệu riêng.</p>
        </div>
        <a className="btn" href="/register">
          Nhận tư vấn
        </a>
      </section>
      <section className="u-learn-box">
        <h2>Doanh nghiệp học gì trên Unica?</h2>
        <ul className="u-learn-grid">
          <li>
            <span className="u-check">✓</span>Kỹ năng bán hàng, marketing và chăm sóc khách hàng
          </li>
          <li>
            <span className="u-check">✓</span>AI & tự động hóa cho nhân sự văn phòng
          </li>
          <li>
            <span className="u-check">✓</span>Tin học văn phòng, kế toán, quản trị
          </li>
          <li>
            <span className="u-check">✓</span>Gói hội viên và kích hoạt mã hàng loạt
          </li>
        </ul>
      </section>
    </div>
  );
}
