export default function TermsPage() {
  return (
    <section className="panel legal">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Điều khoản sử dụng</h1>
      <p className="muted">Cập nhật: 26/08/2026</p>
      <p>
        Bằng việc tạo tài khoản hoặc mua khóa học trên EduCommerce, bạn đồng ý với các điều khoản
        dưới đây. Nền tảng dành cho người từ 18 tuổi hoặc có sự đồng ý của người giám hộ.
      </p>

      <h2>Tài khoản</h2>
      <p>
        Bạn chịu trách nhiệm bảo mật mật khẩu. Một tài khoản gắn với một email. Chúng tôi có thể khóa
        tài khoản khi phát hiện gian lận thanh toán hoặc lạm dụng API.
      </p>

      <h2>Nội dung số</h2>
      <p>
        Khóa học video, tài liệu và combo là sản phẩm số. Mua hàng cấp quyền truy cập trên nền tảng
        (entitlement), không chuyển quyền sở hữu bản quyền trừ khi hợp đồng riêng nói rõ. Không được
        phát tán lại video hay tài liệu đã tải.
      </p>

      <h2>Thanh toán</h2>
      <ul>
        <li>
          <strong>Web:</strong> Stripe, VNPay, MoMo hoặc ZaloPay — theo cổng bạn chọn lúc thanh toán.
        </li>
        <li>
          <strong>Android (Google Play):</strong> mua trong ứng dụng qua Google Play Billing. Giá và
          thuế hiển thị trên Play. Hoàn tiền / tranh chấp mua trong app đi theo chính sách Google
          Play, sau đó hệ thống thu hồi quyền khi nhận thông báo hoàn.
        </li>
      </ul>
      <p>
        Đơn web có hóa đơn VAT nội bộ (bản in). Hóa đơn điện tử GDT đầy đủ chưa được bật trong phiên
        bản này.
      </p>

      <h2>Hoàn tiền (web)</h2>
      <p>
        Yêu cầu hoàn tiền web do quản trị viên xử lý. Khi hoàn, quyền truy cập khóa học gắn với đơn
        đó bị thu hồi. Mua trên Play tuân theo cửa hàng, không hoàn song song trên cổng web.
      </p>

      <h2>Giới hạn trách nhiệm</h2>
      <p>
        Nền tảng được cung cấp “nguyên trạng”. Chúng tôi không chịu trách nhiệm cho mất dữ liệu do
        bạn xóa tài khoản, hoặc gián đoạn hạ tầng bên thứ ba (cổng thanh toán, Play, nhà mạng).
      </p>

      <p>
        Chi tiết dữ liệu: <a href="/privacy">Chính sách quyền riêng tư</a>. Xóa tài khoản:{" "}
        <a href="/data-deletion">Hướng dẫn xóa dữ liệu</a>.
      </p>
    </section>
  );
}
