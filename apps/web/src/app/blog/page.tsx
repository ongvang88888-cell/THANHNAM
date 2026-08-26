const POSTS = [
  { href: "/khoa-hoc?sort=sale", title: "Cách chọn khóa học Unica phù hợp trong 5 phút", tag: "Hướng dẫn" },
  { href: "/course/ai-cong-nghe", title: "AI cho người đi làm: bắt đầu từ đâu?", tag: "AI" },
  { href: "/giang-vien", title: "Giảng viên mới: soạn khóa và gửi duyệt", tag: "Giảng viên" },
  { href: "/doanh-nghiep", title: "Đào tạo nội bộ với LMS Unica", tag: "Doanh nghiệp" },
];

export default function BlogPage() {
  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Góc chia sẻ</h1>
        <p className="muted">Bài viết ngắn về học online, AI, bán hàng và xây khóa học.</p>
      </div>
      <div className="u-grid">
        {POSTS.map((post) => (
          <a key={post.title} className="u-card" href={post.href}>
            <div className="u-card-cover u-cover-blog">
              <span>{post.tag}</span>
            </div>
            <div className="u-card-body">
              <h3>{post.title}</h3>
              <p className="u-card-teacher">{post.tag}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
