export default function NotFound() {
  return (
    <section className="panel">
      <h1 style={{ fontFamily: "var(--font-display)" }}>Không tìm thấy trang</h1>
      <p className="muted">Đường dẫn không tồn tại hoặc đã bị gỡ.</p>
      <a className="btn" href="/">
        Về cửa hàng
      </a>
    </section>
  );
}
