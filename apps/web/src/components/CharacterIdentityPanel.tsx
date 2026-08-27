"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";

type CharacterLook = "teacher" | "cartoon_kid" | "custom";

type CharacterView = {
  name: string;
  look: CharacterLook;
  bible: string;
  stillUrl: string | null;
  autoReplace: boolean;
  confirmOwned: boolean;
  confirmLikeness: boolean;
  hasHeygenAvatar: boolean;
  hasHeygenTalkingPhoto: boolean;
  ready: boolean;
  gap: string;
};

type CharacterResponse = {
  character: CharacterView;
  capabilities: { heygen: boolean; minimax: boolean };
  provisionNote?: string;
};

const LOOK_LABEL: Record<CharacterLook, string> = {
  teacher: "Cô giáo ảnh thật",
  cartoon_kid: "Bé 3D dễ thương",
  custom: "Tuỳ ảnh / kịch bản",
};

function defaultBible(look: CharacterLook, name: string): string {
  const who = name.trim().slice(0, 60) || "the presenter";
  if (look === "cartoon_kid") {
    return [
      `Same Pixar-like 3D child named ${who} in every shot.`,
      "Round face, large bright eyes, soft cheeks, short neat hair, friendly closed-mouth smile.",
      "Simple classroom clothes, warm key light, 16:9, eye-level, facing camera.",
      "Do not change age, face, hair, or outfit. No text, no logos, no extra people.",
    ].join(" ");
  }
  if (look === "teacher") {
    return [
      `Same photoreal Vietnamese female teacher named ${who} in every shot.`,
      "Adult, oval face, natural makeup, dark hair tied back, warm brown eyes, calm smile.",
      "Red ao dai, standing in a bright school hallway, daylight, 16:9, eye-level, facing camera.",
      "Lock identity: same face, hair, skin, clothes, and age. No text, no logos, no extra people.",
    ].join(" ");
  }
  return [
    `Same educational presenter named ${who} in every shot.`,
    "Photoreal, adult, facing camera, 16:9, even classroom lighting.",
    "Keep the exact face, hair, clothes, and age. No text, no logos, no extra people.",
  ].join(" ");
}

export function CharacterIdentityPanel(props: { token: string }) {
  const [row, setRow] = useState<CharacterView | null>(null);
  const [caps, setCaps] = useState<{ heygen: boolean; minimax: boolean }>({ heygen: false, minimax: false });
  const [name, setName] = useState("Cô Minh");
  const [look, setLook] = useState<CharacterLook>("teacher");
  const [bible, setBible] = useState(defaultBible("teacher", "Cô Minh"));
  const [stillUrl, setStillUrl] = useState("");
  const [autoReplace, setAutoReplace] = useState(true);
  const [confirmOwned, setConfirmOwned] = useState(false);
  const [confirmLikeness, setConfirmLikeness] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<CharacterResponse>("/videos/character", props.token)
      .then((res) => {
        if (cancelled) return;
        applyView(res.character);
        setCaps(res.capabilities);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Không tải được hồ sơ nhân vật");
      });
    return () => {
      cancelled = true;
    };
  }, [props.token]);

  function applyView(character: CharacterView) {
    setRow(character);
    setName(character.name);
    setLook(character.look);
    setBible(character.bible);
    setStillUrl(character.stillUrl ?? "");
    setAutoReplace(character.autoReplace);
    setConfirmOwned(character.confirmOwned);
    setConfirmLikeness(character.confirmLikeness);
  }

  function fillBible() {
    setBible(defaultBible(look, name));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await apiPut<CharacterResponse>(
        "/videos/character",
        {
          name,
          look,
          bible,
          stillUrl: stillUrl.trim(),
          autoReplace,
          confirmOwned,
          confirmLikeness,
        },
        props.token,
      );
      applyView(res.character);
      setCaps(res.capabilities);
      setMsg(res.provisionNote || res.character.gap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được nhân vật");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 860, marginBottom: 24 }}>
      <h2>Nhân vật dùng cho mọi video</h2>
      <p className="muted">
        Mọi video tải lên tự che người gốc bằng người dẫn ảo. Học từ HeyGen Instant Avatar / v3: lưu một khuôn mặt rồi
        tái dùng. Không khóa HeyGen thì máy dựng thẻ nhân vật (Ken Burns) và che người giữa khung, giữ tiếng gốc. Có
        MINIMAX_API_KEY + cùng một ảnh thì dùng Hailuo. Không phải face-swap từng pixel. Synthesia, Hedra, D-ID cùng ý
        tưởng nhưng chưa gắn API.
      </p>
      <div className="ai-edit-caps">
        <span className={`badge ${caps.heygen ? "ok" : ""}`}>HeyGen {caps.heygen ? "sẵn" : "chưa khóa"}</span>
        <span className={`badge ${caps.minimax ? "ok" : ""}`}>Hailuo {caps.minimax ? "sẵn" : "chưa khóa"}</span>
        {row?.hasHeygenAvatar ? <span className="badge ok">Đã có avatar tái dùng</span> : null}
        {row?.hasHeygenTalkingPhoto ? <span className="badge ok">Đã có talking photo</span> : null}
        {row?.ready ? <span className="badge ok">Sẽ tự thay người</span> : <span className="badge">Chưa tự thay</span>}
      </div>
      <label htmlFor="character-name">Tên nhân vật</label>
      <input id="character-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="character-look">Kiểu</label>
      <select
        id="character-look"
        value={look}
        onChange={(e) => {
          const next = e.target.value as CharacterLook;
          setLook(next);
          setBible(defaultBible(next, name));
        }}
      >
        {(Object.keys(LOOK_LABEL) as CharacterLook[]).map((value) => (
          <option key={value} value={value}>
            {LOOK_LABEL[value]}
          </option>
        ))}
      </select>
      <label htmlFor="character-bible">Mô tả khóa mặt (dùng lại mọi bài)</label>
      <textarea id="character-bible" maxLength={2000} rows={5} value={bible} onChange={(e) => setBible(e.target.value)} />
      <button type="button" className="secondary btn-sm" onClick={fillBible}>
        Điền lại mô tả mẫu
      </button>
      <label htmlFor="character-still">Ảnh https công khai (tùy chọn, cùng một ảnh cho Hailuo / HeyGen photo)</label>
      <input
        id="character-still"
        type="url"
        maxLength={500}
        value={stillUrl}
        onChange={(e) => setStillUrl(e.target.value)}
        placeholder="https://… ảnh bạn có quyền"
      />
      <label className="ai-edit-owned">
        <input type="checkbox" checked={autoReplace} onChange={(e) => setAutoReplace(e.target.checked)} />
        Tự che người trong mọi video tải lên
      </label>
      <label className="ai-edit-owned">
        <input type="checkbox" checked={confirmOwned} onChange={(e) => setConfirmOwned(e.target.checked)} />
        Tôi sở hữu ảnh và kịch bản nhân vật này
      </label>
      <label className="ai-edit-owned">
        <input type="checkbox" checked={confirmLikeness} onChange={(e) => setConfirmLikeness(e.target.checked)} />
        Đây là người ảo hoặc ảnh tôi có quyền dùng (không phải mặt người khác)
      </label>
      {row ? <p className="muted">{row.gap}</p> : null}
      {error ? <p className="toast error">{error}</p> : null}
      {msg ? <p className="toast">{msg}</p> : null}
      <button type="button" disabled={busy} onClick={() => void save()}>
        {busy ? "Đang lưu…" : "Lưu nhân vật"}
      </button>
    </div>
  );
}
