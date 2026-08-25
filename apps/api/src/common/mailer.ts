import nodemailer from "nodemailer";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function publicWebBase(): string {
  return (process.env.PUBLIC_WEB_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function webUrl(path: string): string {
  return `${publicWebBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendMail(input: MailInput): Promise<{ delivered: boolean; preview?: string }> {
  const from = process.env.MAIL_FROM || "EduCommerce <noreply@localhost>";
  const tx = transport();
  if (!tx) {
    console.info("[mailer:dry-run]", input.to, input.subject, input.text.slice(0, 180));
    return { delivered: false, preview: input.text };
  }
  await tx.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? `<pre>${input.text}</pre>`,
  });
  return { delivered: true };
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = webUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  return sendMail({
    to,
    subject: "Xác minh email EduCommerce",
    text: `Xin chào,\n\nXác minh email của bạn tại: ${url}\nLink hết hạn sau 24 giờ.\n`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = webUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  return sendMail({
    to,
    subject: "Đặt lại mật khẩu EduCommerce",
    text: `Bạn vừa yêu cầu đặt lại mật khẩu.\n\nMở: ${url}\nNếu không phải bạn, hãy bỏ qua email này.\n`,
  });
}

export async function sendReceiptEmail(to: string, invoiceNumber: string, orderId: string) {
  const url = webUrl(`/invoices/${invoiceNumber}`);
  return sendMail({
    to,
    subject: `Hóa đơn ${invoiceNumber}`,
    text: `Thanh toán thành công. Mã đơn ${orderId}. Xem hóa đơn: ${url}\n`,
  });
}

export async function sendAbandonedCheckoutEmail(to: string, orderId: string) {
  const url = webUrl(`/checkout/return?orderId=${encodeURIComponent(orderId)}`);
  return sendMail({
    to,
    subject: "Bạn còn đơn chưa thanh toán",
    text: `Hoàn tất thanh toán để giữ quyền học: ${url}\n`,
  });
}

export async function sendIdleLearningEmail(to: string, lessonId: string, title: string) {
  const url = webUrl(`/learn/${lessonId}`);
  return sendMail({
    to,
    subject: `Tiếp tục học: ${title}`,
    text: `Bạn đang học dở "${title}". Học tiếp: ${url}\n`,
  });
}
