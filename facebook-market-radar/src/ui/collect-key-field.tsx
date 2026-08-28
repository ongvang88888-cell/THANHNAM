"use client";

import { useEffect, useState } from "react";
import { readCollectKey, writeCollectKey } from "./collect-headers";

export function CollectKeyField() {
  const [key, setKey] = useState("");

  useEffect(() => {
    setKey(readCollectKey());
  }, []);

  return (
    <label>
      Khóa ghi (x-fmr-key) — chỉ khi máy chủ bật FMR_COLLECT_KEY
      <input
        type="password"
        autoComplete="off"
        value={key}
        onChange={(event) => {
          const next = event.target.value;
          setKey(next);
          writeCollectKey(next);
        }}
        placeholder="Để trống nếu máy local không khóa ghi"
      />
    </label>
  );
}
