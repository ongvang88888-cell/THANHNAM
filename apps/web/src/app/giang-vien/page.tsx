import { coverStyle } from "@/lib/catalog";
import { FEATURED_TEACHERS } from "@/lib/unica-data";

export default function TeacherLandingPage() {
  return (
    <div className="u-wrap">
      <section className="u-become" style={{ marginTop: 28 }}>
        <div>
          <h2>Trở thành Giảng viên Unica</h2>
          <p>Giúp mọi người trở nên tốt hơn — bao gồm cả chính bạn. Đăng khóa, soạn giáo trình, gửi duyệt và bán.</p>
        </div>
        <a className="btn" href="/teacher">
          Đăng ký ngay
        </a>
      </section>
      <section className="u-rail">
        <div className="u-rail-head">
          <h2>Giảng viên tiêu biểu</h2>
        </div>
        <div className="u-teachers">
          {FEATURED_TEACHERS.map((teacher) => (
            <div key={teacher.name} className="u-teacher">
              <div className="u-avatar" style={coverStyle(teacher.name)}>
                {teacher.name.slice(0, 1)}
              </div>
              <strong>{teacher.name}</strong>
              <span>{teacher.role}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="u-intro">
        <h2>Unica làm gì cho giảng viên?</h2>
        <ul className="u-learn-grid">
          <li>
            <span className="u-check">✓</span>Studio soạn chương — bài, tài liệu và quiz
          </li>
          <li>
            <span className="u-check">✓</span>Gửi admin duyệt trước khi lên cửa hàng
          </li>
          <li>
            <span className="u-check">✓</span>Affiliate và theo dõi đơn
          </li>
          <li>
            <span className="u-check">✓</span>Học viên học trên web với mục lục khóa học
          </li>
        </ul>
      </section>
    </div>
  );
}
