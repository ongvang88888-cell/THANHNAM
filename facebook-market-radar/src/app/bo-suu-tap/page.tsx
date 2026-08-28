import { BoardsPanel } from "./boards-panel";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const service = getRadarService();
  const boards = await service.listBoards();
  const items = await service.listBoardItems();
  return (
    <>
      <h1>Bộ sưu tập creative</h1>
      <div className="banner">
        Swipe file trên thẻ <strong>bạn đã lưu</strong> — gắn góc (giá, UGC, trước-sau…). Không phải kho ads
        EachSpy/Minea. Radar không tự kéo Facebook.
      </div>
      <BoardsPanel initialBoards={boards} initialItems={items} />
    </>
  );
}
