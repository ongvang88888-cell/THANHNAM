"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost, apiPut, type AccessDecision } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type LessonContent = {
  id: string;
  contentType: string;
  body?: string | null;
  refId?: string | null;
};

type LessonDocument = {
  documentId: string;
  title: string;
  mime: string;
  url: string;
  version: number;
};

type LessonPayload = {
  id: string;
  title: string;
  access: AccessDecision;
  contents: LessonContent[];
  courseId?: string;
  durationSec?: number;
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  parentId?: string | null;
  user: { displayName: string };
};
type Note = { id: string; body: string };
type Announcement = { id: string; title: string; body: string; createdAt: string };

export default function LearnPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { token, ready } = useRequireAuth();
  const [lesson, setLesson] = useState<LessonPayload | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [documents, setDocuments] = useState<LessonDocument[]>([]);

  async function load() {
    if (!ready || !token) return;
    const data = await apiGet<LessonPayload>(`/lessons/${lessonId}`, token);
    setLesson(data);
    setPlaybackUrl(null);
    setPlaybackError(null);
    setDocuments([]);

    apiGet<Comment[]>(`/lessons/${data.id}/comments`)
      .then(setComments)
      .catch(() => setComments([]));
    apiGet<Note[]>(`/notes?resourceType=lesson&resourceId=${data.id}`, token)
      .then(setNotes)
      .catch(() => setNotes([]));
    if (data.courseId) {
      apiGet<Announcement[]>(`/courses/${data.courseId}/announcements`)
        .then(setAnnouncements)
        .catch(() => setAnnouncements([]));
    }

    if (data.access.code === "CAN_ACCESS") {
      const video = data.contents.find((c) => c.contentType === "VIDEO" && c.refId);
      if (video?.refId) {
        try {
          const pb = await apiPost<{ playbackUrl: string }>(
            `/videos/${video.refId}/playback`,
            { lessonId: data.id },
            token,
          );
          setPlaybackUrl(pb.playbackUrl);
        } catch (e) {
          setPlaybackError(e instanceof Error ? e.message : "Playback failed");
        }
      }
      const docContents = data.contents.filter((c) => c.contentType === "DOCUMENT" && c.refId);
      if (docContents.length > 0) {
        const loaded = await Promise.all(
          docContents.map((c) =>
            apiPost<LessonDocument>(`/documents/${c.refId}/content`, {}, token).catch(() => null),
          ),
        );
        setDocuments(loaded.filter((row): row is LessonDocument => Boolean(row)));
      }
    }
  }

  useEffect(() => {
    if (!ready || !token) return;
    load().catch((e) => setMsg(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, ready, token]);

  async function saveProgress(completed = false) {
    if (!token || !lesson) return;
    await apiPut(`/lessons/${lesson.id}/progress`, {
      timeSpentMs: 30_000,
      videoPositionMs: completed ? (lesson.durationSec ?? 0) * 1000 : 15_000,
      completed,
    }, token);
    setMsg(completed ? "Đã đánh dấu hoàn thành." : "Đã lưu tiến độ.");
  }

  async function watchAd() {
    if (!token || !lesson) return;
    setBusy(true);
    setMsg(null);
    try {
      const elig = await apiPost<{
        eligible: boolean;
        reason?: string;
        rewardSessionId?: string;
        durationHours?: number;
      }>(
        "/rewards/eligibility",
        {
          resourceType: "lesson",
          resourceId: lesson.id,
          policyCode: "lesson_unlock_24h",
        },
        token,
      );
      if (!elig.eligible || !elig.rewardSessionId) {
        setMsg(`Không đủ điều kiện xem quảng cáo: ${elig.reason}`);
        return;
      }
      await apiPost("/rewards/dev/complete", { rewardSessionId: elig.rewardSessionId }, token);
      await load();
      setMsg("Đã mở khóa bằng rewarded ad (môi trường dev).");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reward failed");
    } finally {
      setBusy(false);
    }
  }

  if (!lesson) return <p className="muted">{msg || "Loading..."}</p>;
  const access = lesson.access;

  return (
    <section className="panel">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>{lesson.title}</h1>
      <div>
        {access.code === "CAN_ACCESS" && <span className="badge free">CAN ACCESS</span>}
        {access.code === "NEEDS_PURCHASE" && <span className="badge paid">NEEDS PURCHASE</span>}
        {access.code === "NEEDS_AD" && <span className="badge ad">NEEDS AD</span>}
        {access.code === "CANNOT_ACCESS" && <span className="badge locked">LOCKED</span>}
      </div>

      {announcements.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Thông báo khóa học</h3>
          {announcements.map((a) => (
            <p key={a.id}>
              <strong>{a.title}</strong> — {a.body}
            </p>
          ))}
        </div>
      )}

      {access.code !== "CAN_ACCESS" && (
        <div style={{ marginTop: 18 }}>
          <p className="muted">
            Nội dung đang khóa. Lý do: <strong>{access.code}</strong>
            {access.reasons?.length ? ` (${access.reasons.join(", ")})` : ""}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href="/">
              Mua khóa học
            </a>
            <button className="secondary" disabled={busy} onClick={watchAd}>
              {busy ? "..." : "Xem quảng cáo để mở"}
            </button>
          </div>
        </div>
      )}

      {access.code === "CAN_ACCESS" && (
        <div style={{ marginTop: 20 }}>
          {lesson.contents.map((c) => {
            if (c.contentType === "VIDEO") {
              return (
                <div key={c.id} style={{ marginBottom: 20 }}>
                  {playbackUrl ? (
                    <video
                      controls
                      playsInline
                      style={{ width: "100%", maxHeight: 480, background: "#0b1612" }}
                      src={playbackUrl}
                      onPause={() => void saveProgress(false)}
                      onEnded={() => void saveProgress(true)}
                    />
                  ) : (
                    <p className="muted">{playbackError || "Loading video…"}</p>
                  )}
                </div>
              );
            }
            if (c.contentType === "DOCUMENT") {
              const file = documents.find((d) => d.documentId === c.refId);
              return (
                <div key={c.id} className="panel" style={{ marginBottom: 20 }}>
                  <h3 style={{ marginTop: 0 }}>Tài liệu nghiên cứu</h3>
                  {file ? (
                    <>
                      <p>
                        {file.title} · {file.mime} · v{file.version}
                      </p>
                      <a className="btn" href={file.url} target="_blank" rel="noreferrer">
                        Tải / mở tài liệu
                      </a>
                      {file.mime === "application/pdf" && (
                        <iframe
                          title={file.title}
                          src={file.url}
                          style={{
                            width: "100%",
                            height: 480,
                            marginTop: 12,
                            border: "1px solid var(--line)",
                            background: "#fff",
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <p className="muted">Đang tải tài liệu…</p>
                  )}
                </div>
              );
            }
            return (
              <article key={c.id} style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {c.body}
              </article>
            );
          })}
          {access.expiresAt && (
            <p className="muted">
              Quyền tạm thời hết hạn: {new Date(access.expiresAt).toLocaleString()}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="secondary" onClick={() => void saveProgress(false)}>
              Lưu tiến độ
            </button>
            <button type="button" onClick={() => void saveProgress(true)}>
              Đánh dấu hoàn thành
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (!token) return;
                apiPost("/bookmarks", { resourceType: "lesson", resourceId: lesson.id }, token)
                  .then(() => setMsg("Đã thêm bookmark"))
                  .catch((e: Error) => setMsg(e.message));
              }}
            >
              Bookmark
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <h3>Ghi chú của tôi</h3>
        <textarea
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          rows={3}
          style={{ width: "100%", font: "inherit", padding: 12 }}
        />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!token || !noteBody.trim()) return;
            apiPost<Note>("/notes", { resourceType: "lesson", resourceId: lesson.id, body: noteBody }, token)
              .then((n) => {
                setNotes((prev) => [n, ...prev]);
                setNoteBody("");
              })
              .catch((e: Error) => setMsg(e.message));
          }}
        >
          Lưu ghi chú
        </button>
        <ul className="lesson-list">
          {notes.map((n) => (
            <li key={n.id}>{n.body}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Bình luận</h3>
        <ul className="lesson-list">
          {comments
            .filter((c) => !c.parentId)
            .map((c) => (
              <li key={c.id} style={{ display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{c.user.displayName}</strong>
                    <div className="muted">{c.body}</div>
                  </div>
                  <span className="muted">{new Date(c.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                <button type="button" className="secondary" onClick={() => setReplyTo(c.id)}>
                  Trả lời
                </button>
                <ul className="lesson-list" style={{ marginLeft: 16 }}>
                  {comments
                    .filter((r) => r.parentId === c.id)
                    .map((r) => (
                      <li key={r.id}>
                        <div>
                          <strong>{r.user.displayName}</strong>
                          <div className="muted">{r.body}</div>
                        </div>
                        <span className="muted">{new Date(r.createdAt).toLocaleString("vi-VN")}</span>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
        </ul>
        {replyTo && (
          <p className="muted">
            Đang trả lời một bình luận.{" "}
            <button type="button" className="secondary" onClick={() => setReplyTo(null)}>
              Hủy
            </button>
          </p>
        )}
        <input
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder={replyTo ? "Viết trả lời…" : "Viết bình luận…"}
        />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!token || !commentBody.trim()) return;
            apiPost<Comment>(
              `/lessons/${lesson.id}/comments`,
              { body: commentBody, ...(replyTo ? { parentId: replyTo } : {}) },
              token,
            )
              .then((c) => {
                setComments((prev) => [...prev, { ...c, user: c.user ?? { displayName: "Bạn" } }]);
                setCommentBody("");
                setReplyTo(null);
              })
              .catch((e: Error) => setMsg(e.message));
          }}
        >
          Gửi
        </button>
      </div>

      {msg && <p className="ok">{msg}</p>}
    </section>
  );
}
