# Digital Document Architecture

## Supported formats (allowlist)

PDF · DOC/DOCX · PPT/PPTX · XLS/XLSX · ZIP · images · audio · other approved MIME types

## Versioning

`documents` + `document_versions` (immutable blobs). Latest pointer on document.

## Access

- Preview vs download permissions separate flags in policy
- Paid docs require Access Engine before bytes
- Signed URL or authenticated streaming proxy

## Metadata

size · MIME · checksum · page count (when detectable) · language · OCR flag (future)

## Security

- MIME sniffing + extension checks
- Max upload size
- Antivirus scanning hook in worker (ClamAV or cloud scanner port)
- ZIP bomb guards

## Learning features

Preview · bookmark page · notes · progress · optional full-text extract for search (async)
