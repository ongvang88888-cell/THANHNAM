export function ProductCell({
  title,
  imageUrls,
}: {
  title: string;
  imageUrls: string[];
}) {
  const thumbs = imageUrls.slice(0, 4);
  return (
    <div className="product-cell">
      <div className="product-thumbs" aria-hidden={thumbs.length === 0}>
        {thumbs.map((src) => (
          <img key={src} src={src} alt="" width={48} height={48} />
        ))}
      </div>
      <span className="product-name">{title}</span>
    </div>
  );
}
