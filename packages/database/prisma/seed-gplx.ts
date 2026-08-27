import type { PrismaClient } from "@prisma/client";

type SeedQ = {
  topic: string;
  stem: string;
  explanation: string;
  isCritical?: boolean;
  classes: string[];
  answers: Array<{ body: string; correct?: boolean }>;
};

const TOPICS: Array<{ code: string; title: string }> = [
  { code: "concepts", title: "Khái niệm và quy tắc giao thông" },
  { code: "signs", title: "Hệ thống biển báo đường bộ" },
  { code: "situations", title: "Sa hình và xử lý tình huống" },
  { code: "ethics", title: "Văn hóa và đạo đức lái xe" },
  { code: "technique", title: "Kỹ thuật lái xe" },
];

/** Demo bank — original sample items for product development (not the official 600-question set). */
const QUESTIONS: SeedQ[] = [
  {
    topic: "concepts",
    stem: "Người điều khiển phương tiện tham gia giao thông đường bộ phải chấp hành hiệu lệnh của ai trước tiên?",
    explanation: "Hiệu lệnh của người điều khiển giao thông được ưu tiên thực hiện trước.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Biển báo hiệu đường bộ", correct: false },
      { body: "Người điều khiển giao thông", correct: true },
      { body: "Đèn tín hiệu", correct: false },
      { body: "Vạch kẻ đường", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi đèn tín hiệu chuyển sang màu vàng, người điều khiển phương tiện phải xử lý thế nào?",
    explanation: "Đèn vàng là tín hiệu cảnh báo chuyển tiếp; nếu chưa vượt vạch phải dừng lại (trừ trường hợp không dừng an toàn được).",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Tăng tốc để vượt nhanh qua giao lộ", correct: false },
      { body: "Dừng lại trước vạch dừng nếu còn có thể dừng an toàn", correct: true },
      { body: "Bóp còi và đi tiếp", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Nồng độ cồn đối với người điều khiển xe mô tô, xe gắn máy khi tham gia giao thông được quy định thế nào?",
    explanation: "Pháp luật hiện hành nghiêm cấm điều khiển xe khi trong máu hoặc hơi thở có nồng độ cồn.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Được phép nếu dưới mức nhất định", correct: false },
      { body: "Không được có nồng độ cồn", correct: true },
      { body: "Chỉ cấm vào ban đêm", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Phương tiện ưu tiên đang phát tín hiệu ưu tiên đi đúng hướng, các xe khác phải xử lý thế nào?",
    explanation: "Phải giảm tốc độ, tránh hoặc dừng lại nhường đường cho xe ưu tiên.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Tiếp tục đi nếu đang ở làn riêng", correct: false },
      { body: "Giảm tốc độ, tránh hoặc dừng lại nhường đường", correct: true },
      { body: "Bóp còi xin vượt", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi muốn chuyển hướng, người lái xe phải làm gì?",
    explanation: "Phải giảm tốc độ, có tín hiệu báo hướng và nhường đường cho các phương tiện đi ngược chiều / người đi bộ theo quy định.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Tăng tốc để chuyển hướng nhanh", correct: false },
      { body: "Giảm tốc độ và báo hiệu hướng chuyển", correct: true },
      { body: "Chỉ cần nhìn gương chiếu hậu", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Trên đường một chiều có biển báo cấm đi ngược chiều, người lái xe đi ngược chiều sẽ bị xử lý thế nào?",
    explanation: "Đi ngược chiều trên đường một chiều là vi phạm nghiêm trọng quy tắc giao thông.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Không bị xử phạt nếu đường vắng", correct: false },
      { body: "Bị xử phạt theo quy định", correct: true },
      { body: "Chỉ bị nhắc nhở", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi tham gia giao thông, người đi bộ phải đi ở đâu?",
    explanation: "Người đi bộ phải đi trên hè phố; nơi không có hè phố thì đi sát mép đường.",
    classes: ["A1", "A", "B1", "B"],
    answers: [
      { body: "Đi giữa lòng đường cho dễ nhìn", correct: false },
      { body: "Đi trên hè phố; nơi không có hè thì đi sát mép đường", correct: true },
      { body: "Đi theo làn xe thô sơ", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Khoảng cách an toàn giữa hai xe phụ thuộc yếu tố nào?",
    explanation: "Khoảng cách an toàn phụ thuộc tốc độ, tình trạng mặt đường, thời tiết và tầm nhìn.",
    classes: ["B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Chỉ phụ thuộc loại xe", correct: false },
      { body: "Tốc độ, mặt đường, thời tiết và tầm nhìn", correct: true },
      { body: "Chỉ phụ thuộc kinh nghiệm lái", correct: false },
    ],
  },
  {
    topic: "signs",
    stem: "Biển báo cấm thường có hình dạng và màu sắc như thế nào?",
    explanation: "Biển báo cấm phổ biến dạng hình tròn, viền đỏ, nền trắng, hình vẽ đen.",
    classes: ["A1", "A", "B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Hình vuông nền xanh", correct: false },
      { body: "Hình tròn, viền đỏ, nền trắng", correct: true },
      { body: "Hình tam giác viền vàng", correct: false },
    ],
  },
  {
    topic: "signs",
    stem: "Biển báo nguy hiểm thường có dạng nào?",
    explanation: "Biển báo nguy hiểm dạng hình tam giác đều, viền đỏ, nền vàng, hình vẽ đen.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Hình tròn viền đỏ", correct: false },
      { body: "Hình tam giác đều, viền đỏ, nền vàng", correct: true },
      { body: "Hình chữ nhật nền xanh", correct: false },
    ],
  },
  {
    topic: "signs",
    stem: "Khi gặp biển báo hết hạn chế tốc độ, người lái xe được phép?",
    explanation: "Hết hiệu lực biển hạn chế tốc độ trước đó; vẫn phải tuân thủ tốc độ tối đa theo loại đường và loại xe.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Chạy với tốc độ bất kỳ", correct: false },
      { body: "Chạy theo tốc độ cho phép của đoạn đường và loại xe", correct: true },
      { body: "Chỉ được chạy dưới 40 km/h", correct: false },
    ],
  },
  {
    topic: "signs",
    stem: "Biển chỉ dẫn thường dùng để làm gì?",
    explanation: "Biển chỉ dẫn cung cấp thông tin hướng đi, địa điểm, làn đường…",
    classes: ["A1", "A", "B1", "B"],
    answers: [
      { body: "Cấm các hành vi nguy hiểm", correct: false },
      { body: "Cung cấp thông tin hướng đi, địa điểm", correct: true },
      { body: "Cảnh báo ổ gà", correct: false },
    ],
  },
  {
    topic: "signs",
    stem: "Vạch kẻ đường nét liền màu vàng ở giữa đường thường có ý nghĩa gì?",
    explanation: "Vạch vàng nét liền phân chia hai chiều xe chạy; không được đè lên hoặc vượt qua tùy loại vạch theo quy chuẩn.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Được phép vượt tự do", correct: false },
      { body: "Phân chia chiều xe chạy; không được vượt qua tùy quy định vạch", correct: true },
      { body: "Chỉ mang tính trang trí", correct: false },
    ],
  },
  {
    topic: "signs",
    stem: "Biển báo dừng lại (Stop) yêu cầu người lái xe?",
    explanation: "Phải dừng hẳn trước biển/vạch và chỉ đi khi bảo đảm an toàn.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Chỉ cần giảm tốc độ", correct: false },
      { body: "Dừng hẳn và chỉ đi tiếp khi an toàn", correct: true },
      { body: "Bóp còi rồi đi", correct: false },
    ],
  },
  {
    topic: "situations",
    stem: "Khi muốn vượt xe phía trước, người lái xe phải bảo đảm điều kiện nào?",
    explanation: "Phải có khoảng trống an toàn, không bị cấm vượt, quan sát phía trước và phía sau, báo hiệu kịp thời.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Chỉ cần bóp còi là được vượt", correct: false },
      { body: "Quan sát, bảo đảm khoảng cách và không ở đoạn cấm vượt", correct: true },
      { body: "Vượt bên phải mọi trường hợp", correct: false },
    ],
  },
  {
    topic: "situations",
    stem: "Tại nơi đường giao nhau không có tín hiệu đèn, thứ tự ưu tiên được xác định theo?",
    explanation: "Theo hiệu lệnh người điều khiển giao thông, biển báo, quy tắc nhường đường bên phải / đường ưu tiên tùy tình huống.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Ai đến trước được đi trước bất kể hướng", correct: false },
      { body: "Hiệu lệnh, biển báo và quy tắc nhường đường", correct: true },
      { body: "Xe lớn luôn được ưu tiên", correct: false },
    ],
  },
  {
    topic: "situations",
    stem: "Khi xe phía trước đang rẽ trái, bạn đi cùng chiều muốn đi thẳng phải làm gì?",
    explanation: "Phải giảm tốc, giữ khoảng cách an toàn, không tăng tốc ép xe đang rẽ.",
    classes: ["B1", "B", "C"],
    answers: [
      { body: "Tăng tốc vượt bên trái ngay", correct: false },
      { body: "Giảm tốc, giữ khoảng cách an toàn", correct: true },
      { body: "Bóp còi liên tục để xe kia nhường", correct: false },
    ],
  },
  {
    topic: "situations",
    stem: "Trên đường cao tốc, người lái xe không được thực hiện hành vi nào?",
    explanation: "Không được dừng, đỗ, quay đầu, lùi xe trái quy định trên đường cao tốc.",
    isCritical: true,
    classes: ["B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Vượt xe đúng làn và đúng quy định", correct: false },
      { body: "Quay đầu xe hoặc đi lùi trên đường cao tốc", correct: true },
      { body: "Tuân thủ tốc độ tối đa, tối thiểu", correct: false },
    ],
  },
  {
    topic: "situations",
    stem: "Khi gặp tình huống khẩn cấp phải phanh gấp, nguyên tắc chung là?",
    explanation: "Giữ tay lái chắc, phanh đúng kỹ thuật, tránh đánh lái đột ngột gây mất lái.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Đánh lái mạnh sang phải ngay", correct: false },
      { body: "Giữ tay lái chắc và phanh đúng kỹ thuật", correct: true },
      { body: "Tắt máy ngay lập tức", correct: false },
    ],
  },
  {
    topic: "situations",
    stem: "Người lái xe mô tô khi chuyển làn phải?",
    explanation: "Quan sát gương, báo hiệu, bảo đảm khoảng cách an toàn rồi mới chuyển làn.",
    classes: ["A1", "A"],
    answers: [
      { body: "Chuyển làn rồi mới báo hiệu", correct: false },
      { body: "Quan sát, báo hiệu và chuyển làn khi an toàn", correct: true },
      { body: "Chỉ cần tăng ga", correct: false },
    ],
  },
  {
    topic: "ethics",
    stem: "Văn hóa giao thông đòi hỏi người tham gia giao thông phải?",
    explanation: "Chấp hành pháp luật, tôn trọng và nhường nhịn, giúp đỡ người khác khi cần thiết.",
    classes: ["A1", "A", "B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Chỉ cần không gây tai nạn là đủ", correct: false },
      { body: "Chấp hành pháp luật và tôn trọng người khác", correct: true },
      { body: "Đi nhanh để tránh ùn tắc", correct: false },
    ],
  },
  {
    topic: "ethics",
    stem: "Khi xảy ra tai nạn giao thông, người điều khiển phương tiện có trách nhiệm gì trước tiên?",
    explanation: "Dừng xe, cấp cứu người bị nạn trong khả năng, bảo vệ hiện trường và trình báo cơ quan chức năng.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Rời khỏi hiện trường để tránh trách nhiệm", correct: false },
      { body: "Dừng xe, cứu giúp người bị nạn và trình báo", correct: true },
      { body: "Chỉ gọi điện cho người thân", correct: false },
    ],
  },
  {
    topic: "ethics",
    stem: "Sử dụng điện thoại khi đang điều khiển xe có thể dẫn đến?",
    explanation: "Làm phân tán chú ý, tăng nguy cơ tai nạn; nhiều trường hợp bị nghiêm cấm.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Không ảnh hưởng nếu nói ngắn", correct: false },
      { body: "Phân tán chú ý và tăng nguy cơ tai nạn", correct: true },
      { body: "Giúp điều hướng tốt hơn mọi lúc", correct: false },
    ],
  },
  {
    topic: "ethics",
    stem: "Người lái xe nên ứng xử thế nào khi bị xe khác cắt mặt?",
    explanation: "Giữ bình tĩnh, giảm tốc bảo đảm an toàn, không trả đũa bằng hành vi nguy hiểm.",
    classes: ["A1", "A", "B1", "B"],
    answers: [
      { body: "Tăng tốc vượt và chặn đầu xe kia", correct: false },
      { body: "Giữ bình tĩnh, ưu tiên an toàn", correct: true },
      { body: "Bóp còi liên tục và chửi mắng", correct: false },
    ],
  },
  {
    topic: "technique",
    stem: "Trước khi khởi hành, người lái xe cần kiểm tra những gì?",
    explanation: "Kiểm tra tổng quát: lốp, phanh, đèn, gương, nhiên liệu/điện và tư thế ngồi an toàn.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Chỉ cần xem nhiên liệu", correct: false },
      { body: "Lốp, phanh, đèn, gương và điều kiện an toàn", correct: true },
      { body: "Không cần kiểm tra nếu xe mới", correct: false },
    ],
  },
  {
    topic: "technique",
    stem: "Khi đổ đèo, người lái xe ô tô nên?",
    explanation: "Sử dụng số thấp phù hợp để tận dụng phanh động cơ, tránh dùng phanh liên tục gây nóng má phanh.",
    classes: ["B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Tắt máy để tiết kiệm nhiên liệu", correct: false },
      { body: "Đi số thấp, dùng phanh động cơ hợp lý", correct: true },
      { body: "Giữ số cao và đạp phanh liên tục", correct: false },
    ],
  },
  {
    topic: "technique",
    stem: "Tư thế ngồi lái xe đúng giúp?",
    explanation: "Quan sát tốt, phản xạ kịp thời và giảm mệt mỏi.",
    classes: ["A1", "A", "B1", "B"],
    answers: [
      { body: "Chỉ mang tính thẩm mỹ", correct: false },
      { body: "Quan sát và điều khiển xe an toàn hơn", correct: true },
      { body: "Không ảnh hưởng an toàn", correct: false },
    ],
  },
  {
    topic: "technique",
    stem: "Khi lái xe ban đêm trên đường thiếu chiếu sáng, người lái nên?",
    explanation: "Giảm tốc độ phù hợp tầm nhìn, sử dụng đèn đúng quy định, tăng khoảng cách an toàn.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Giữ tốc độ như ban ngày", correct: false },
      { body: "Giảm tốc, dùng đèn đúng cách, tăng khoảng cách", correct: true },
      { body: "Chỉ bật đèn hazard", correct: false },
    ],
  },
  {
    topic: "technique",
    stem: "Phanh ABS giúp người lái xe?",
    explanation: "Hạn chế bó cứng bánh khi phanh gấp, giúp giữ khả năng điều hướng tốt hơn trên nhiều mặt đường.",
    classes: ["B1", "B", "C"],
    answers: [
      { body: "Tăng tốc nhanh hơn", correct: false },
      { body: "Hạn chế bó cứng bánh và hỗ trợ giữ hướng khi phanh gấp", correct: true },
      { body: "Thay thế hoàn toàn việc giữ khoảng cách an toàn", correct: false },
    ],
  },
  {
    topic: "technique",
    stem: "Khi xe bị chết máy giữa đường, người lái cần ưu tiên?",
    explanation: "Đưa xe vào vị trí an toàn nếu được, bật đèn cảnh báo, đặt biển báo hiệu và gọi hỗ trợ.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Ở nguyên giữa làn xe để chờ cứu hộ", correct: false },
      { body: "Đưa xe vào nơi an toàn và cảnh báo người tham gia giao thông", correct: true },
      { body: "Tự ý sửa xe trên làn cao tốc không cảnh báo", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Người đủ bao nhiêu tuổi trở lên được cấp giấy phép lái xe hạng A1 (theo quy định phổ biến hiện hành)?",
    explanation: "Hạng A1 dành cho người đủ độ tuổi theo luật giao thông đường bộ hiện hành (thường từ 16 tuổi đối với xe dưới dung tích quy định).",
    classes: ["A1", "A", "B1", "B"],
    answers: [
      { body: "14 tuổi", correct: false },
      { body: "Đủ tuổi theo quy định pháp luật hiện hành", correct: true },
      { body: "21 tuổi với mọi loại xe máy", correct: false },
    ],
  },
  {
    topic: "concepts",
    stem: "Giấy phép lái xe bị hết hạn, người điều khiển xe có được tiếp tục lái không?",
    explanation: "Không được điều khiển xe khi GPLX đã hết hạn; phải làm thủ tục đổi/gia hạn theo quy định.",
    isCritical: true,
    classes: ["A1", "A", "B1", "B", "C", "D", "E", "F"],
    answers: [
      { body: "Được lái thêm 30 ngày", correct: false },
      { body: "Không được điều khiển xe khi GPLX hết hạn", correct: true },
      { body: "Chỉ cần mang CCCD thay thế", correct: false },
    ],
  },
  {
    topic: "signs",
    stem: "Biển báo khu vực đông học sinh thường thuộc nhóm biển nào?",
    explanation: "Thường là biển báo nguy hiểm/cảnh báo để người lái giảm tốc và chú ý quan sát.",
    classes: ["A1", "A", "B1", "B"],
    answers: [
      { body: "Biển cấm đỗ xe", correct: false },
      { body: "Biển báo nguy hiểm / cảnh báo", correct: true },
      { body: "Biển chỉ dẫn du lịch", correct: false },
    ],
  },
  {
    topic: "situations",
    stem: "Khi trời mưa đường trơn, người lái xe nên?",
    explanation: "Giảm tốc độ, tăng khoảng cách, tránh phanh/đánh lái đột ngột.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Giữ nguyên tốc độ để về đích sớm", correct: false },
      { body: "Giảm tốc và tăng khoảng cách an toàn", correct: true },
      { body: "Tắt đèn để tránh chói", correct: false },
    ],
  },
  {
    topic: "ethics",
    stem: "Nhường đường cho người đi bộ qua đường đúng nơi quy định là?",
    explanation: "Nghĩa vụ và văn hóa giao thông; giúp bảo đảm an toàn người dễ bị tổn thương.",
    classes: ["A1", "A", "B1", "B", "C"],
    answers: [
      { body: "Việc làm tùy thích", correct: false },
      { body: "Trách nhiệm của người điều khiển phương tiện", correct: true },
      { body: "Chỉ áp dụng với xe buýt", correct: false },
    ],
  },
];

export async function seedGplx(prisma: PrismaClient, appId: string) {
  const topicIds = new Map<string, string>();
  for (let i = 0; i < TOPICS.length; i += 1) {
    const t = TOPICS[i]!;
    const row = await prisma.gplxTopic.upsert({
      where: { appId_code: { appId, code: t.code } },
      update: { title: t.title, position: i },
      create: { appId, code: t.code, title: t.title, position: i },
    });
    topicIds.set(t.code, row.id);
  }

  // Replace demo bank idempotently by wiping previous demo stems for this app then recreating.
  await prisma.gplxStudyProgress.deleteMany({
    where: { question: { appId } },
  });
  await prisma.gplxMockAttempt.deleteMany({ where: { appId } });
  await prisma.gplxBankQuestion.deleteMany({ where: { appId } });

  let position = 0;
  for (const q of QUESTIONS) {
    const topicId = topicIds.get(q.topic);
    if (!topicId) continue;
    position += 1;
    await prisma.gplxBankQuestion.create({
      data: {
        appId,
        topicId,
        stem: q.stem,
        explanation: q.explanation,
        isCritical: !!q.isCritical,
        licenseClassesJson: q.classes,
        officialNo: position,
        position,
        answers: {
          create: q.answers.map((a, idx) => ({
            body: a.body,
            isCorrect: !!a.correct,
            position: idx,
          })),
        },
      },
    });
  }

  return { topicCount: TOPICS.length, questionCount: QUESTIONS.length };
}
