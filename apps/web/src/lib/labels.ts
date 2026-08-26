export function statusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Bản nháp";
    case "IN_REVIEW":
      return "Chờ duyệt";
    case "PUBLISHED":
      return "Đã xuất bản";
    case "ARCHIVED":
      return "Đã lưu trữ";
    case "REJECTED":
      return "Từ chối";
    case "PUBLIC":
      return "Công khai";
    case "UNLISTED":
      return "Không liệt kê";
    case "PRIVATE":
      return "Riêng tư";
    case "PAID":
      return "Đã thanh toán";
    case "FULFILLED":
      return "Đã giao";
    case "REFUND_PENDING":
      return "Chờ hoàn tiền";
    case "REFUNDED":
      return "Đã hoàn";
    case "PENDING":
      return "Đang chờ";
    case "REQUESTED":
      return "Yêu cầu rút";
    case "ACTIVE":
      return "Đang hoạt động";
    default:
      return status;
  }
}

export function statusTone(status: string): "draft" | "review" | "live" | "warn" | "ok" {
  switch (status) {
    case "PUBLISHED":
    case "PAID":
    case "FULFILLED":
    case "ACTIVE":
      return "live";
    case "IN_REVIEW":
    case "PENDING":
    case "REQUESTED":
    case "REFUND_PENDING":
      return "review";
    case "REFUNDED":
      return "warn";
    case "DRAFT":
    case "ARCHIVED":
    case "PRIVATE":
      return "draft";
    case "REJECTED":
      return "warn";
    default:
      return "ok";
  }
}

export function productTypeLabel(type: string): string {
  switch (type) {
    case "VIDEO_COURSE":
      return "Khóa học";
    case "DIGITAL_DOCUMENT":
      return "Tài liệu";
    case "MIXED_BUNDLE":
      return "Combo";
    case "COURSE_BUNDLE":
      return "Combo khóa học";
    case "DOCUMENT_BUNDLE":
      return "Combo tài liệu";
    case "SUBSCRIPTION":
      return "Gói tháng";
    case "PREMIUM_LIBRARY":
      return "Thư viện premium";
    default:
      return type.replaceAll("_", " ");
  }
}
