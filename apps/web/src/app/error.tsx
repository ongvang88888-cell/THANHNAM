"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="panel">
      <h1 style={{ fontFamily: "var(--font-display)" }}>Có lỗi xảy ra</h1>
      <p className="error">{error.message}</p>
      <button type="button" onClick={reset}>
        Thử lại
      </button>
    </section>
  );
}
