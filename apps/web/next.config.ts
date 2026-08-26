import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/kichhoat", destination: "/kich-hoat", permanent: false },
      { source: "/biz", destination: "/doanh-nghiep", permanent: false },
      { source: "/gioi-thieu", destination: "/about", permanent: false },
      { source: "/books", destination: "/khoa-hoc?type=doc", permanent: false },
      { source: "/dashboard/user/group", destination: "/hoi-vien", permanent: false },
      { source: "/course/sach-hay", destination: "/course/sach-hay-nen-doc", permanent: false },
      { source: "/course/sach-hay/:path*", destination: "/course/sach-hay-nen-doc/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
