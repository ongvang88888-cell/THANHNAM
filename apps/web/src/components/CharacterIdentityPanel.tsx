"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { ProviderFeatureList, type ProviderFeatureCatalog } from "@/components/ProviderFeatureList";

type CharacterLook = "teacher" | "cartoon_kid" | "custom";

type CharacterView = {
  name: string;
  look: CharacterLook;
  bible: string;
  stillUrl: string | null;
  autoReplace: boolean;
  confirmOwned: boolean;
  confirmLikeness: boolean;
  ready: boolean;
  gap: string;
};

type CharacterCaps = {
  wan: boolean;
  nanoBanana: boolean;
  fal: boolean;
  dashscope: boolean;
};

type CharacterResponse = {
  character: CharacterView;
  capabilities: CharacterCaps;
  providers?: ProviderFeatureCatalog;
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
  const [caps, setCaps] = useState<CharacterCaps>({ wan: false, nanoBanana: false, fal: false, dashscope: false });
  const [providers, setProviders] = useState<ProviderFeatureCatalog | null>(null);
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
        setProviders(res.providers ?? null);
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
      setProviders(res.providers ?? null);
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
        Học từ Short Nano Banana + Wan 2.2: lưu một ảnh nhân vật (hoặc để Nano Banana vẽ), rồi Wan 2.2 thay người trong
        video — giữ chuyển động, cảnh và tiếng gốc. Không thẻ chữ, không Ken Burns. Cần FAL_KEY hoặc DASHSCOPE_API_KEY
        trên máy chủ; nếu chưa có ảnh https thì cần GEMINI_API_KEY.
      </p>
      <div className="ai-edit-caps">
        <span className={`badge ${caps.wan ? "ok" : ""}`}>Wan 2.2 {caps.wan ? "sẵn" : "chưa khóa"}</span>
        <span className={`badge ${caps.fal ? "ok" : ""}`}>Fal {caps.fal ? "sẵn" : "chưa FAL_KEY"}</span>
        <span className={`badge ${caps.dashscope ? "ok" : ""}`}>
          DashScope {caps.dashscope ? "sẵn" : "chưa khóa"}
        </span>
        <span className={`badge ${caps.nanoBanana ? "ok" : ""}`}>
          Nano Banana {caps.nanoBanana ? "sẵn" : "chưa GEMINI_API_KEY"}
        </span>
        {row?.stillUrl ? <span className="badge ok">Đã có ảnh nhân vật</span> : null}
        {row?.ready ? <span className="badge ok">Sẽ tự thay người</span> : <span className="badge">Chưa tự thay</span>}
      </div>
      {providers ? <ProviderFeatureList providers={providers} /> : null}
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
      <label htmlFor="character-bible">Mô tả khóa mặt (Nano Banana dùng lại mọi bài)</label>
      <textarea id="character-bible" maxLength={2000} rows={5} value={bible} onChange={(e) => setBible(e.target.value)} />
      <button type="button" className="secondary btn-sm" onClick={fillBible}>
        Điền lại mô tả mẫu
      </button>
      <label htmlFor="character-still">Ảnh https công khai (tùy chọn — bỏ qua nếu để Nano Banana vẽ)</label>
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
        Tự thay người bằng Wan 2.2 trên mọi video tải lên
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
