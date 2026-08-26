export default function DataDeletionPage() {
  return (
    <section className="panel legal">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Xóa dữ liệu tài khoản</h1>
      <p className="muted">Dùng cho yêu cầu Google Play (Account deletion) và quyền của người dùng.</p>
      <p>
        EduCommerce cho phép xóa tài khoản ngay trong sản phẩm. Việc xóa là vĩnh viễn: hồ sơ, tiến độ
        học, wishlist, ghi chú, và quyền truy cập khóa học gắn với tài khoản sẽ không khôi phục được
        từ ứng dụng.
      </p>

      <h2>Cách tự xóa</h2>
      <ol>
        <li>
          Mở web: <a href="/login?next=/account">Đăng nhập</a> rồi vào{" "}
          <a href="/account">Tài khoản</a>.
        </li>
        <li>Tùy chọn: bấm <strong>Xuất dữ liệu</strong> để tải bản sao JSON trước khi xóa.</li>
        <li>Bấm <strong>Xóa tài khoản</strong> và xác nhận hộp thoại.</li>
      </ol>
      <p>
        Ứng dụng Android dùng cùng tài khoản API. Sau khi xóa trên web, phiên app sẽ hết hiệu lực ở
        lần gọi tiếp theo.
      </p>

      <h2>Xóa hộ</h2>
      <p>
        Nếu không đăng nhập được, gửi email từ địa chỉ đã đăng ký tới{" "}
        <a href="mailto:privacy@edu.local">privacy@edu.local</a> với tiêu đề “Xóa tài khoản”. Thay
        địa chỉ này bằng email vận hành thật trước khi nộp Play Console.
      </p>

      <h2>Dữ liệu giữ lại sau khi xóa</h2>
      <p>
        Chúng tôi có thể giữ bản ghi thanh toán / hóa đơn tối thiểu theo nghĩa vụ kế toán, ở dạng
        không còn dùng để đăng nhập. Mua hàng Google Play vẫn nằm trên tài khoản Google của bạn —
        quản lý trong Play Store.
      </p>
    </section>
  );
}
