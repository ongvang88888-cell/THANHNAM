import { LOCKED_NICHES } from "@/domain/niches";

export function NicheFilter({
  action,
  niche,
}: {
  action: string;
  niche?: string;
}) {
  return (
    <form className="niche-filter" action={action} method="get">
      <label>
        Ngành
        <select name="niche" defaultValue={niche ?? ""}>
          <option value="">Tất cả ngành</option>
          {LOCKED_NICHES.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.nameVi}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn secondary">
        Lọc
      </button>
    </form>
  );
}
