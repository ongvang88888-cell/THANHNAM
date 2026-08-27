type ProviderFeatureView = {
  id: string;
  label: string;
  status: "wired_auto" | "reserved";
  usedOnUpload: boolean;
  ready: boolean;
  note: string;
  docsUrl: string;
  modelId: string | null;
};

export type ProviderFeatureCatalog = {
  autoOnUpload: string[];
  fallbackOnUpload?: string[];
  features: ProviderFeatureView[];
};

export function ProviderFeatureList(props: { providers: ProviderFeatureCatalog }) {
  const auto = props.providers.features.filter((row) => props.providers.autoOnUpload.includes(row.id));
  const reserved = props.providers.features.filter((row) => row.status === "reserved");
  return (
    <details className="provider-features">
      <summary>Tính năng AI đã học (Wan 2.2 · Fal · Nano Banana)</summary>
      <p className="muted">
        Khi tải video lên, máy chủ chỉ chạy ảnh nhân vật + Wan Replace + ghép tiếng gốc. Các mục reserved không tự chạy
        — không Move, không speech-to-video, không tự đổi sang Nano Banana 2.
      </p>
      <h4>Tự chạy khi tải lên</h4>
      <ul>
        {auto.map((row) => (
          <li key={row.id}>
            <strong>{row.label}</strong>
            {row.ready ? " — sẵn" : " — chưa khóa"}
            {row.modelId ? <span className="muted"> · {row.modelId}</span> : null}
            <small>{row.note}</small>
          </li>
        ))}
      </ul>
      <h4>Reserved — không tự chạy</h4>
      <ul>
        {reserved.map((row) => (
          <li key={row.id} className="is-reserved">
            <strong>{row.label}</strong>
            {row.usedOnUpload ? " · dự phòng upload" : null}
            {row.modelId ? <span className="muted"> · {row.modelId}</span> : null}
            <small>{row.note}</small>
          </li>
        ))}
      </ul>
    </details>
  );
}
