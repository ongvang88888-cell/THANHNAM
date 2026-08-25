export default function PrivacyPage() {
  return (
    <section className="panel">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Chính sách quyền riêng tư</h1>
      <p>
        EduCommerce thu thập email, tiến độ học, đơn hàng và dữ liệu thanh toán cần thiết để cung cấp
        khóa học. Chúng tôi không bán dữ liệu cá nhân.
      </p>
      <p>
        Bạn có thể xuất hoặc xóa tài khoản trong trang <a href="/account">Tài khoản</a>. Thanh toán
        được xử lý bởi Stripe / VNPay / MoMo / ZaloPay / cửa hàng ứng dụng — chúng tôi không lưu số
        thẻ.
      </p>
      <p className="muted">Liên hệ: privacy@edu.local</p>
    </section>
  );
}
