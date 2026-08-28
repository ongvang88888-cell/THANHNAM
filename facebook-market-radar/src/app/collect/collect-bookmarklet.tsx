"use client";

import { useEffect, useState } from "react";

export function CollectBookmarklet() {
  const [href, setHref] = useState("#");

  useEffect(() => {
    const origin = window.location.origin;
    setHref(
      `javascript:(function(){var u=location.href;if(u.indexOf('facebook.com/ads/library')===-1){alert('Mở Thư viện quảng cáo rồi bấm lại');return;}location.href='${origin}/collect?url='+encodeURIComponent(u);}())`,
    );
  }, []);

  return (
    <a className="btn" href={href}>
      Lưu vào Radar
    </a>
  );
}
