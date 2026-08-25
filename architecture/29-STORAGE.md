# 29. Storage Architecture

## Port

```ts
interface IStorageProvider {
  createUploadUrl(input): Promise<SignedUpload>;
  createDownloadUrl(input): Promise<SignedDownload>;
  head(key): Promise<ObjectMeta>;
  delete(key): Promise<void>;
}
```

## Buckets

| Bucket | Access |
|--------|--------|
| `public-assets` | Public CDN (thumbnails marketing) |
| `private-originals` | Private |
| `private-renditions` | Private + CDN signed |
| `private-documents` | Private |

## Key layout

`app/{appId}/{type}/{yyyy}/{mm}/{uuid}`

## CDN

Signed cookies/URLs; short TTL; separate from API auth but bound to entitled session where possible.
