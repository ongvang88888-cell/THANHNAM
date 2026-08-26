export function videoStudioHref(courseId?: string | null): string {
  return courseId ? `/teacher/courses/${courseId}#video` : "/teacher?tab=upload";
}

export function VideoStudioHint(props: { courseId?: string | null; compact?: boolean }) {
  return (
    <div className="note-box">
      <strong>Tải video không nằm ở trang quản trị này.</strong> CSV / danh sách khóa chỉ nhập tên, giá, chương. Vào
      studio, chọn bài, chọn video — hệ thống tự chỉnh hình + tiếng và gắn vào bài.
      {!props.compact && (
        <div className="admin-actions" style={{ marginTop: 12 }}>
          <a className="btn" href={videoStudioHref(props.courseId)}>
            Mở studio tải video &amp; AI
          </a>
        </div>
      )}
    </div>
  );
}
