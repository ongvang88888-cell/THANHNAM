export default function PrivacyPage() {
  return (
    <section className="panel legal">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
        Chính sách quyền riêng tư
      </h1>
      <p className="muted">Cập nhật: 26/08/2026 · EduCommerce Student (`education_app`)</p>
      <p>
        EduCommerce vận hành nền tảng bán khóa học video, tài liệu số và combo. Chính sách này mô tả
        dữ liệu chúng tôi thực sự thu thập trong sản phẩm hiện tại — không bán dữ liệu cá nhân, không
        bán danh sách email.
      </p>

      <h2>Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>
          <strong>Tài khoản:</strong> email, tên hiển thị, mật khẩu đã băm, thời điểm xác minh email,
          vai trò (học viên / giảng viên / quản trị).
        </li>
        <li>
          <strong>Thương mại:</strong> đơn hàng, mã giảm giá, quyền truy cập khóa học, hóa đơn/VAT nội
          bộ, mã và số dư affiliate.
        </li>
        <li>
          <strong>Học tập:</strong> tiến độ bài học, vị trí video, ghi chú, bookmark, bình luận bài
          học, chứng chỉ đã cấp.
        </li>
        <li>
          <strong>Thanh toán:</strong> mã tham chiếu từ Stripe, VNPay, MoMo, ZaloPay hoặc Google Play
          (`purchaseToken`). Chúng tôi không lưu số thẻ, CVV, hay PAN.
        </li>
        <li>
          <strong>Kỹ thuật:</strong> header `X-App-Id`, JWT phiên, địa chỉ IP trên log máy chủ khi xử
          lý thanh toán / chống lạm dụng.
        </li>
      </ul>

      <h2>Cách dùng</h2>
      <p>
        Cung cấp khóa học đã mua, gửi email xác minh / đặt lại mật khẩu / biên lai, chống gian lận,
        và tuân thủ nghĩa vụ kế toán. Quảng cáo thưởng (nếu bật) dùng AdMob SSV — không dùng dữ liệu
        học tập để bán quảng cáo bên thứ ba.
      </p>

      <h2>Bên thứ ba</h2>
      <ul>
        <li>Cổng thanh toán: Stripe, VNPay, MoMo, ZaloPay, Google Play Billing.</li>
        <li>Hạ tầng: PostgreSQL, Redis, lưu trữ đối tượng (S3/tương đương), AWS MediaConvert khi bật.</li>
        <li>Email: SMTP do bạn cấu hình (`SMTP_HOST`).</li>
      </ul>

      <h2>Lưu trữ và bảo mật</h2>
      <p>
        Dữ liệu khóa học và khách hàng nằm trên API + PostgreSQL do người vận hành triển khai (AWS
        RDS hoặc máy chủ riêng) — không nằm trong file APK trên Google Play. Mật khẩu được băm. Media
        private dùng URL ký.
      </p>

      <h2>Quyền của bạn</h2>
      <p>
        Đăng nhập trang <a href="/account">Tài khoản</a> để xuất JSON dữ liệu hoặc xóa tài khoản. Xóa
        là vĩnh viễn và thu hồi quyền truy cập khóa học. Xem thêm{" "}
        <a href="/data-deletion">Hướng dẫn xóa dữ liệu</a>.
      </p>
      <p>
        Liên hệ: <a href="mailto:privacy@edu.local">privacy@edu.local</a> — thay email này bằng địa
        chỉ thật trước khi nộp listing Play.
      </p>
    </section>
  );
}
