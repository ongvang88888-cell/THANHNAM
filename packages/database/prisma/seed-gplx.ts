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

const MOTO: string[] = ["A1","A"];
const B1_ONLY: string[] = ["B1"];
const CAR: string[] = ["B","C1","C","D1","D2","D","BE","CE","DE","E","F"];
const ALL: string[] = ["A1","A","B1","B","C1","C","D1","D2","D","BE","CE","DE","E","F"];
const HEAVY: string[] = ["C1","C","D1","D2","D","BE","CE","DE","E","F"];

const EXAM_QUESTION_COUNT: Record<string, number> = {
  A1: 25,
  B: 30,
  C1: 35,
};


/** Demo bank — original sample items for product development (not the official 600-question set). */
const QUESTIONS: SeedQ[] = [
  {
    topic: "concepts",
    stem: "Hiệu lệnh nào được ưu tiên thực hiện trước khi tham gia giao thông?",
    explanation: "Người điều khiển giao thông có hiệu lệnh cao nhất; sau đó mới đến đèn, biển báo, vạch kẻ.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Đèn tín hiệu giao thông" },
      { body: "Hiệu lệnh của người điều khiển giao thông", correct: true },
      { body: "Biển báo cấm" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi đèn vàng bật, người điều khiển phương tiện chưa vượt qua vạch dừng phải?",
    explanation: "Đèn vàng là tín hiệu chuyển tiếp; phải dừng nếu còn dừng an toàn được.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Tăng tốc vượt nhanh qua giao lộ" },
      { body: "Dừng lại trước vạch dừng nếu còn có thể dừng an toàn", correct: true },
      { body: "Bóp còi rồi đi tiếp" },
    ],
  },
  {
    topic: "concepts",
    stem: "Nồng độ cồn trong máu hoặc hơi thở đối với mọi người điều khiển xe cơ giới (2026) được quy định thế nào?",
    explanation: "Luật Giao thông đường bộ hiện hành nghiêm cấm mọi nồng độ cồn khi lái xe.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được phép dưới 0,25 mg/lít" },
      { body: "Không được có nồng độ cồn (bằng 0)", correct: true },
      { body: "Chỉ cấm với xe tải" },
    ],
  },
  {
    topic: "concepts",
    stem: "Xe ưu tiên đang phát tín hiệu ưu tiên đi đúng hướng, các xe khác phải?",
    explanation: "Giảm tốc, tránh hoặc dừng lại nhường đường cho xe ưu tiên.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Tiếp tục đi nếu đang đúng làn" },
      { body: "Giảm tốc, tránh hoặc dừng lại nhường đường", correct: true },
      { body: "Bóp còi xin vượt" },
    ],
  },
  {
    topic: "concepts",
    stem: "Đi ngược chiều trên đường một chiều có biển cấm là hành vi?",
    explanation: "Vi phạm nghiêm trọng quy tắc giao thông và bị xử phạt theo quy định.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Không vi phạm nếu đường vắng" },
      { body: "Vi phạm nghiêm trọng, bị xử phạt theo quy định", correct: true },
      { body: "Chỉ bị nhắc nhở" },
    ],
  },
  {
    topic: "concepts",
    stem: "Giấy phép lái xe đã hết hạn, người điều khiển xe có được tiếp tục lái không?",
    explanation: "Không được điều khiển xe khi GPLX hết hạn; phải làm thủ tục đổi/gia hạn.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được lái thêm 30 ngày" },
      { body: "Không được điều khiển xe khi GPLX hết hạn", correct: true },
      { body: "Chỉ cần mang CCCD thay thế" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi muốn chuyển hướng, người lái xe phải?",
    explanation: "Giảm tốc, báo hiệu hướng và nhường đường theo quy định.",
    classes: ALL,
    answers: [
      { body: "Tăng tốc để chuyển nhanh" },
      { body: "Giảm tốc, báo hiệu hướng và nhường đường", correct: true },
      { body: "Chỉ cần nhìn gương" },
    ],
  },
  {
    topic: "concepts",
    stem: "Người đi bộ phải đi ở đâu khi tham gia giao thông?",
    explanation: "Đi trên hè phố; nơi không có hè thì đi sát mép đường.",
    classes: ALL,
    answers: [
      { body: "Đi giữa lòng đường" },
      { body: "Đi trên hè phố; không có hè thì sát mép đường", correct: true },
      { body: "Đi theo làn xe thô sơ" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khoảng cách an toàn giữa hai xe phụ thuộc chủ yếu vào?",
    explanation: "Tốc độ, mặt đường, thời tiết và tầm nhìn.",
    classes: CAR,
    answers: [
      { body: "Chỉ loại xe" },
      { body: "Tốc độ, mặt đường, thời tiết và tầm nhìn", correct: true },
      { body: "Chỉ kinh nghiệm lái" },
    ],
  },
  {
    topic: "concepts",
    stem: "Xe đi trên đường nhánh muốn nhập đường ưu tiên phải?",
    explanation: "Giảm tốc, quan sát và nhường xe trên đường ưu tiên.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Tăng tốc nhập làn trước" },
      { body: "Nhường đường cho xe trên đường ưu tiên", correct: true },
      { body: "Đi song song rồi chen" },
    ],
  },
  {
    topic: "concepts",
    stem: "Qua đường ngang cắt đường sắt không có rào chắn, người lái phải?",
    explanation: "Quan sát kỹ hai phía, chỉ đi khi không có tàu tới và an toàn.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Tăng tốc vượt nhanh" },
      { body: "Quan sát kỹ và chỉ đi khi bảo đảm an toàn", correct: true },
      { body: "Bóp còi liên tục rồi đi" },
    ],
  },
  {
    topic: "concepts",
    stem: "Không được vượt xe trong trường hợp nào?",
    explanation: "Không vượt ở đoạn cấm vượt, cầu hẹp, đường cong/dốc mất tầm nhìn…",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Đường rộng, tầm nhìn tốt" },
      { body: "Đoạn cấm vượt hoặc tầm nhìn bị hạn chế theo quy định", correct: true },
      { body: "Trong khu dân cư ban ngày" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi đèn xanh vừa bật, người lái phải?",
    explanation: "Nhường người/phương tiện còn trên giao lộ; chỉ đi khi an toàn.",
    classes: ALL,
    answers: [
      { body: "Tăng tốc lao vào giao lộ" },
      { body: "Quan sát, nhường phần đường còn bị chiếm và đi khi an toàn", correct: true },
      { body: "Bóp còi để mọi người tránh" },
    ],
  },
  {
    topic: "concepts",
    stem: "Xe thô sơ và xe cơ giới trên đường có lề phải?",
    explanation: "Mỗi loại đi đúng phần đường quy định.",
    classes: ALL,
    answers: [
      { body: "Đi lẫn giữa đường" },
      { body: "Đi đúng phần đường quy định cho từng loại xe", correct: true },
      { body: "Xe cơ giới luôn sát lề" },
    ],
  },
  {
    topic: "concepts",
    stem: "Người đủ điều kiện sức khỏe theo quy định là yêu cầu khi?",
    explanation: "Cấp, đổi GPLX và điều khiển xe đúng hạng.",
    classes: ALL,
    answers: [
      { body: "Chỉ khi mua bảo hiểm" },
      { body: "Khi cấp/đổi GPLX và điều khiển xe theo quy định", correct: true },
      { body: "Không liên quan GPLX" },
    ],
  },
  {
    topic: "concepts",
    stem: "Người lái xe mô tô hai bánh khi chở người phải?",
    explanation: "Người ngồi sau đội mũ bảo hiểm đúng quy chuẩn; không vượt số người cho phép.",
    classes: MOTO,
    answers: [
      { body: "Chỉ người lái cần mũ bảo hiểm" },
      { body: "Bảo đảm hành khách đội mũ bảo hiểm và không quá số người quy định", correct: true },
      { body: "Được chở ba người nếu đường vắng" },
    ],
  },
  {
    topic: "concepts",
    stem: "Xe ô tô số tự động hạng B1 khi dừng đỗ trên dốc nên?",
    explanation: "Giữ phanh chân hoặc phanh tay phù hợp để xe không trôi.",
    classes: B1_ONLY,
    answers: [
      { body: "Về số N và bỏ phanh" },
      { body: "Dùng phanh để giữ xe, không để xe trôi tự do", correct: true },
      { body: "Tắt máy, không cần phanh" },
    ],
  },
  {
    topic: "concepts",
    stem: "Xe tải hạng C khi chở hàng vượt quá tải trọng cho phép sẽ?",
    explanation: "Vi phạm quy định về tải trọng; bị xử phạt và không bảo đảm an toàn.",
    classes: HEAVY,
    answers: [
      { body: "Không sao nếu đi chậm" },
      { body: "Vi phạm quy định tải trọng và bị xử phạt", correct: true },
      { body: "Chỉ vi phạm trên cao tốc" },
    ],
  },
  {
    topic: "signs",
    stem: "Biển báo cấm thường có hình dạng?",
    explanation: "Hình tròn, viền đỏ, nền trắng, hình vẽ đen.",
    classes: ALL,
    answers: [
      { body: "Hình vuông nền xanh" },
      { body: "Hình tròn, viền đỏ, nền trắng", correct: true },
      { body: "Hình tam giác viền vàng" },
    ],
  },
  {
    topic: "signs",
    stem: "Biển báo nguy hiểm thường có dạng?",
    explanation: "Hình tam giác đều, viền đỏ, nền vàng.",
    classes: ALL,
    answers: [
      { body: "Hình tròn viền đỏ" },
      { body: "Hình tam giác đều, viền đỏ, nền vàng", correct: true },
      { body: "Hình chữ nhật nền xanh" },
    ],
  },
  {
    topic: "signs",
    stem: "Biển hiệu lệnh khác biển cấm ở điểm nào?",
    explanation: "Biển hiệu lệnh bắt buộc thực hiện theo nội dung biển.",
    classes: ALL,
    answers: [
      { body: "Không khác biệt" },
      { body: "Bắt buộc thực hiện theo nội dung biển", correct: true },
      { body: "Chỉ mang tính gợi ý" },
    ],
  },
  {
    topic: "signs",
    stem: "Gặp biển 'Cấm dừng và đỗ xe', người lái được phép?",
    explanation: "Không dừng cũng không đỗ trong phạm vi biển (trừ khẩn cấp theo luật).",
    classes: ALL,
    answers: [
      { body: "Dừng ngắn dưới 5 phút" },
      { body: "Không dừng và không đỗ trong phạm vi biển", correct: true },
      { body: "Đỗ nếu bật đèn hazard" },
    ],
  },
  {
    topic: "signs",
    stem: "Biển hết mọi lệnh cấm có ý nghĩa?",
    explanation: "Hết hiệu lực các biển cấm trước đó; vẫn tuân thủ quy tắc chung.",
    classes: ALL,
    answers: [
      { body: "Được làm mọi việc" },
      { body: "Hết hiệu lực biển cấm trước; vẫn tuân thủ luật chung", correct: true },
      { body: "Chỉ hết hiệu lực ban đêm" },
    ],
  },
  {
    topic: "signs",
    stem: "Vạch trắng nét đứt giữa đường thường cho phép?",
    explanation: "Được vượt/chuyển hướng khi an toàn và không bị cấm.",
    classes: ALL,
    answers: [
      { body: "Cấm vượt mọi trường hợp" },
      { body: "Vượt/chuyển hướng khi an toàn và đúng luật", correct: true },
      { body: "Chỉ dành xe ưu tiên" },
    ],
  },
  {
    topic: "signs",
    stem: "Vạch vàng nét liền giữa đường hai chiều thường có ý nghĩa?",
    explanation: "Phân chia chiều xe; không được vượt qua tùy quy định vạch.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được vượt tự do" },
      { body: "Phân chia chiều; không vượt qua theo quy định vạch", correct: true },
      { body: "Chỉ trang trí" },
    ],
  },
  {
    topic: "signs",
    stem: "Biển Stop yêu cầu người lái?",
    explanation: "Dừng hẳn trước biển/vạch, chỉ đi khi an toàn.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Chỉ giảm tốc" },
      { body: "Dừng hẳn và chỉ đi tiếp khi an toàn", correct: true },
      { body: "Bóp còi rồi đi" },
    ],
  },
  {
    topic: "signs",
    stem: "Biển chỉ dẫn thường dùng để?",
    explanation: "Cung cấp thông tin hướng đi, địa điểm, làn đường.",
    classes: ALL,
    answers: [
      { body: "Cấm hành vi nguy hiểm" },
      { body: "Cung cấp thông tin hướng đi, địa điểm", correct: true },
      { body: "Cảnh báo ổ gà" },
    ],
  },
  {
    topic: "signs",
    stem: "Biển khu vực đông học sinh thuộc nhóm?",
    explanation: "Biển nguy hiểm/cảnh báo để giảm tốc, quan sát.",
    classes: ALL,
    answers: [
      { body: "Biển cấm đỗ" },
      { body: "Biển báo nguy hiểm / cảnh báo", correct: true },
      { body: "Biển chỉ dẫn du lịch" },
    ],
  },
  {
    topic: "signs",
    stem: "Hết biển hạn chế tốc độ, người lái được phép?",
    explanation: "Chạy theo tốc độ cho phép của đoạn đường và loại xe.",
    classes: ALL,
    answers: [
      { body: "Chạy tốc độ bất kỳ" },
      { body: "Chạy theo tốc độ cho phép của đoạn đường và loại xe", correct: true },
      { body: "Chỉ dưới 40 km/h" },
    ],
  },
  {
    topic: "situations",
    stem: "Muốn vượt xe phía trước phải bảo đảm?",
    explanation: "Khoảng trống an toàn, không bị cấm vượt, quan sát và báo hiệu.",
    classes: ALL,
    answers: [
      { body: "Chỉ cần bóp còi" },
      { body: "Quan sát, khoảng cách an toàn, không ở đoạn cấm vượt", correct: true },
      { body: "Vượt bên phải mọi lúc" },
    ],
  },
  {
    topic: "situations",
    stem: "Giao lộ không đèn, thứ tự ưu tiên theo?",
    explanation: "Hiệu lệnh, biển báo và quy tắc nhường đường.",
    classes: ALL,
    answers: [
      { body: "Ai đến trước đi trước" },
      { body: "Hiệu lệnh, biển báo và quy tắc nhường đường", correct: true },
      { body: "Xe lớn luôn ưu tiên" },
    ],
  },
  {
    topic: "situations",
    stem: "Xe trước đang rẽ trái, bạn đi thẳng cùng chiều nên?",
    explanation: "Giảm tốc, giữ khoảng cách, không ép xe đang rẽ.",
    classes: CAR,
    answers: [
      { body: "Tăng tốc vượt trái" },
      { body: "Giảm tốc, giữ khoảng cách an toàn", correct: true },
      { body: "Bóp còi liên tục" },
    ],
  },
  {
    topic: "situations",
    stem: "Trên đường cao tốc không được?",
    explanation: "Không dừng, đỗ, quay đầu, lùi trái quy định.",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Vượt đúng làn" },
      { body: "Quay đầu hoặc đi lùi trên đường cao tốc", correct: true },
      { body: "Tuân thủ tốc độ tối đa/tối thiểu" },
    ],
  },
  {
    topic: "situations",
    stem: "Trên cao tốc xe hỏng, người lái ưu tiên?",
    explanation: "Đưa xe vào làn dừng khẩn cấp, bật đèn cảnh báo, đặt biển báo hiệu.",
    classes: CAR,
    answers: [
      { body: "Sửa xe giữa làn chạy" },
      { body: "Đưa xe nơi an toàn, cảnh báo và gọi hỗ trợ", correct: true },
      { body: "Đứng giữa làn chờ" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi muốn lùi xe, người lái phải?",
    explanation: "Quan sát kỹ, chỉ lùi khi an toàn và không bị cấm.",
    classes: ALL,
    answers: [
      { body: "Lùi nhanh" },
      { body: "Quan sát kỹ và chỉ lùi khi an toàn, đúng nơi cho phép", correct: true },
      { body: "Bóp còi là đủ" },
    ],
  },
  {
    topic: "situations",
    stem: "Tránh xe ngược chiều trên đường hẹp nên?",
    explanation: "Giảm tốc, tránh về bên phải, nhường nhau an toàn.",
    classes: ALL,
    answers: [
      { body: "Ai mạnh hơn đi trước" },
      { body: "Giảm tốc, tránh đúng phần đường và nhường nhau", correct: true },
      { body: "Đi giữa đường" },
    ],
  },
  {
    topic: "situations",
    stem: "Chuyển làn trên đường nhiều làn phải?",
    explanation: "Xi-nhan, quan sát gương/điểm mù, chuyển khi an toàn.",
    classes: CAR,
    answers: [
      { body: "Chuyển rồi mới xi-nhan" },
      { body: "Xi-nhan, quan sát và chuyển khi an toàn", correct: true },
      { body: "Chuyển bất ngờ" },
    ],
  },
  {
    topic: "situations",
    stem: "Xe trước phanh gấp, bạn nên?",
    explanation: "Phanh/giảm tốc an toàn, giữ hướng ổn định.",
    classes: ALL,
    answers: [
      { body: "Bóp còi vượt phải" },
      { body: "Phanh/giảm tốc an toàn, giữ hướng ổn định", correct: true },
      { body: "Tăng tốc vượt" },
    ],
  },
  {
    topic: "situations",
    stem: "Mô tô chuyển làn phải?",
    explanation: "Quan sát, báo hiệu, bảo đảm khoảng cách rồi mới chuyển.",
    classes: MOTO,
    answers: [
      { body: "Chuyển rồi mới báo hiệu" },
      { body: "Quan sát, báo hiệu và chuyển khi an toàn", correct: true },
      { body: "Chỉ tăng ga" },
    ],
  },
  {
    topic: "situations",
    stem: "Trời mưa đường trơn nên?",
    explanation: "Giảm tốc, tăng khoảng cách, tránh phanh/đánh lái đột ngột.",
    classes: ALL,
    answers: [
      { body: "Giữ nguyên tốc độ" },
      { body: "Giảm tốc và tăng khoảng cách an toàn", correct: true },
      { body: "Tắt đèn tránh chói" },
    ],
  },
  {
    topic: "situations",
    stem: "Gặp học sinh qua đường tại vạch, người lái phải?",
    explanation: "Giảm tốc, dừng nếu cần và nhường đường.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Bóp còi để họ nhanh" },
      { body: "Giảm tốc, dừng và nhường đường cho học sinh", correct: true },
      { body: "Đi chậm nhưng không dừng" },
    ],
  },
  {
    topic: "situations",
    stem: "Tín hiệu giảm tốc trên cao tốc, người lái phải?",
    explanation: "Giảm tốc theo tín hiệu/biển và điều kiện mặt đường.",
    classes: CAR,
    answers: [
      { body: "Giữ tốc độ tối đa" },
      { body: "Giảm tốc theo tín hiệu và điều kiện mặt đường", correct: true },
      { body: "Chuyển làn liên tục" },
    ],
  },
  {
    topic: "situations",
    stem: "Phanh gấp khẩn cấp, nguyên tắc chung?",
    explanation: "Giữ tay lái chắc, phanh đúng kỹ thuật, tránh đánh lái đột ngột.",
    classes: ALL,
    answers: [
      { body: "Đánh lái mạnh sang phải" },
      { body: "Giữ tay lái chắc và phanh đúng kỹ thuật", correct: true },
      { body: "Tắt máy ngay" },
    ],
  },
  {
    topic: "ethics",
    stem: "Văn hóa giao thông đòi hỏi?",
    explanation: "Chấp hành pháp luật, tôn trọng và nhường nhịn.",
    classes: ALL,
    answers: [
      { body: "Chỉ không gây tai nạn" },
      { body: "Chấp hành pháp luật và tôn trọng người khác", correct: true },
      { body: "Đi nhanh tránh ùn" },
    ],
  },
  {
    topic: "ethics",
    stem: "Tai nạn giao thông, trách nhiệm trước tiên?",
    explanation: "Dừng xe, cứu giúp, bảo vệ hiện trường và trình báo.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Rời hiện trường" },
      { body: "Dừng xe, cứu giúp người bị nạn và trình báo", correct: true },
      { body: "Chỉ gọi người thân" },
    ],
  },
  {
    topic: "ethics",
    stem: "Bỏ mặc hiện trường tai nạn gây thương vong là?",
    explanation: "Hành vi bỏ trốn, bị xử lý nghiêm theo pháp luật.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Không vi phạm nếu không gây ra" },
      { body: "Vi phạm nghiêm trọng, có thể bị truy cứu trách nhiệm hình sự", correct: true },
      { body: "Chỉ bị phạt tiền nhẹ" },
    ],
  },
  {
    topic: "ethics",
    stem: "Uống rượu bia rồi lái xe là?",
    explanation: "Vi phạm nghiêm trọng; nồng độ cồn bằng 0 mới được lái.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được nếu tỉnh táo" },
      { body: "Hành vi vi phạm nghiêm trọng, bị nghiêm cấm", correct: true },
      { body: "Chỉ nhắc nhở lần đầu" },
    ],
  },
  {
    topic: "ethics",
    stem: "Dùng điện thoại khi lái xe có thể?",
    explanation: "Phân tán chú ý, tăng nguy cơ tai nạn; nhiều trường hợp bị cấm.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Không ảnh hưởng nếu nói ngắn" },
      { body: "Phân tán chú ý và tăng nguy cơ tai nạn", correct: true },
      { body: "Giúp điều hướng mọi lúc" },
    ],
  },
  {
    topic: "ethics",
    stem: "Nhường người đi bộ qua đường đúng nơi quy định là?",
    explanation: "Nghĩa vụ và văn hóa giao thông.",
    classes: ALL,
    answers: [
      { body: "Tùy thích" },
      { body: "Trách nhiệm của người điều khiển phương tiện", correct: true },
      { body: "Chỉ với xe buýt" },
    ],
  },
  {
    topic: "ethics",
    stem: "Bị xe khác cắt mặt nên ứng xử?",
    explanation: "Giữ bình tĩnh, giảm tốc, ưu tiên an toàn.",
    classes: ALL,
    answers: [
      { body: "Tăng tốc chặn đầu" },
      { body: "Giữ bình tĩnh, ưu tiên an toàn", correct: true },
      { body: "Bóp còi liên tục" },
    ],
  },
  {
    topic: "ethics",
    stem: "Thấy người bị nạn trên đường nên?",
    explanation: "Dừng an toàn, hỗ trợ/báo cáo theo khả năng.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Đi tiếp tránh rắc rối" },
      { body: "Dừng an toàn và hỗ trợ/báo cáo", correct: true },
      { body: "Quay xe bỏ chạy" },
    ],
  },
  {
    topic: "technique",
    stem: "Trước khởi hành cần kiểm tra?",
    explanation: "Lốp, phanh, đèn, gương, nhiên liệu và tư thế an toàn.",
    classes: ALL,
    answers: [
      { body: "Chỉ nhiên liệu" },
      { body: "Lốp, phanh, đèn, gương và điều kiện an toàn", correct: true },
      { body: "Không cần nếu xe mới" },
    ],
  },
  {
    topic: "technique",
    stem: "Đổ đèo ô tô nên?",
    explanation: "Dùng số thấp, phanh động cơ, tránh phanh chân liên tục.",
    classes: CAR,
    answers: [
      { body: "Tắt máy tiết kiệm" },
      { body: "Đi số thấp, dùng phanh động cơ hợp lý", correct: true },
      { body: "Số cao, phanh liên tục" },
    ],
  },
  {
    topic: "technique",
    stem: "Tư thế ngồi lái đúng giúp?",
    explanation: "Quan sát tốt, phản xạ kịp thời, giảm mệt mỏi.",
    classes: ALL,
    answers: [
      { body: "Chỉ thẩm mỹ" },
      { body: "Quan sát và điều khiển an toàn hơn", correct: true },
      { body: "Không ảnh hưởng an toàn" },
    ],
  },
  {
    topic: "technique",
    stem: "Lái ban đêm thiếu sáng nên?",
    explanation: "Giảm tốc, dùng đèn đúng quy định, tăng khoảng cách.",
    classes: ALL,
    answers: [
      { body: "Giữ tốc độ ban ngày" },
      { body: "Giảm tốc, dùng đèn đúng, tăng khoảng cách", correct: true },
      { body: "Chỉ bật hazard" },
    ],
  },
  {
    topic: "technique",
    stem: "Phanh ABS giúp?",
    explanation: "Hạn chế bó cứng bánh khi phanh gấp, hỗ trợ giữ hướng.",
    classes: CAR,
    answers: [
      { body: "Tăng tốc nhanh" },
      { body: "Hạn chế bó cứng bánh, hỗ trợ giữ hướng khi phanh gấp", correct: true },
      { body: "Thay thế khoảng cách an toàn" },
    ],
  },
  {
    topic: "technique",
    stem: "Xe chết máy giữa đường ưu tiên?",
    explanation: "Đưa xe nơi an toàn, bật cảnh báo, đặt biển hiệu, gọi hỗ trợ.",
    classes: ALL,
    answers: [
      { body: "Ở giữa làn chờ" },
      { body: "Đưa xe nơi an toàn và cảnh báo người tham gia giao thông", correct: true },
      { body: "Sửa trên làn cao tốc không cảnh báo" },
    ],
  },
  {
    topic: "technique",
    stem: "Khởi hành ngang dốc số sàn nên?",
    explanation: "Phối hợp côn, ga và phanh tay hợp lý.",
    classes: CAR,
    answers: [
      { body: "Nhả côn thật nhanh" },
      { body: "Phối hợp côn – ga – phanh tay hợp lý", correct: true },
      { body: "Tắt máy đẩy xe" },
    ],
  },
  {
    topic: "technique",
    stem: "Kiểm tra áp suất lốp định kỳ giúp?",
    explanation: "An toàn, tiết kiệm nhiên liệu, kéo dài tuổi lốp.",
    classes: ALL,
    answers: [
      { body: "Chỉ để xe đẹp" },
      { body: "Tăng an toàn và hiệu quả vận hành", correct: true },
      { body: "Không ảnh hưởng" },
    ],
  },
  {
    topic: "technique",
    stem: "Số tự động xuống dốc dài nên?",
    explanation: "Chuyển số thấp phù hợp, dùng phanh động cơ.",
    classes: CAR,
    answers: [
      { body: "Số D, phanh liên tục" },
      { body: "Dùng số thấp hỗ trợ hãm tốc", correct: true },
      { body: "Về N tiết kiệm" },
    ],
  },
  {
    topic: "technique",
    stem: "Gương chiếu hậu chỉnh để?",
    explanation: "Quan sát tối đa phía sau, hạn chế điểm mù.",
    classes: ALL,
    answers: [
      { body: "Chỉ nhìn thân xe" },
      { body: "Quan sát tối đa phía sau, hạn chế điểm mù", correct: true },
      { body: "Hướng sát mặt đường" },
    ],
  },
  {
    topic: "technique",
    stem: "Xe tải/khách kéo rơ-moóc cần chú ý?",
    explanation: "Khoảng cách dừng dài hơn, quan sát điểm mù rộng hơn.",
    classes: HEAVY,
    answers: [
      { body: "Giống xe con" },
      { body: "Tăng khoảng cách an toàn và quan sát cẩn thận", correct: true },
      { body: "Không cần xi-nhan" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi lái xe trong khu dân cư (trừ khi có biển riêng), người lái xe nên/ phải xử lý thế nào?",
    explanation: "Tối đa 50 km/h hoặc theo biển báo hiệu lực",
    classes: ALL,
    answers: [
      { body: "Tối đa 80 km/h" },
      { body: "Tối đa 50 km/h hoặc theo biển báo hiệu lực", correct: true },
      { body: "Tối thiểu 60 km/h" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi lái xe trong đường đôi ngoài khu dân cư không có dải phân cách, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Tối đa 90 km/h hoặc theo biển báo",
    classes: ALL,
    answers: [
      { body: "Tối đa 120 km/h" },
      { body: "Tối đa 90 km/h hoặc theo biển báo", correct: true },
      { body: "Không giới hạn" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi lái xe trong đường cao tốc đối với ô tô con, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Theo biển báo, thường tối đa 120 km/h",
    classes: ALL,
    answers: [
      { body: "Tối đa 150 km/h" },
      { body: "Theo biển báo, thường tối đa 120 km/h", correct: true },
      { body: "Tối thiểu 100 km/h" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi lái xe trong đường cao tốc đối với xe tải, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Theo biển báo, thường thấp hơn ô tô con",
    classes: ALL,
    answers: [
      { body: "Bằng ô tô con mọi lúc" },
      { body: "Theo biển báo, thường thấp hơn ô tô con", correct: true },
      { body: "Không giới hạn" },
    ],
  },
  {
    topic: "concepts",
    stem: "Khi lái xe trong khu vực trường học khi có biển báo, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giảm tốc theo biển, thường 40 km/h hoặc thấp hơn",
    classes: ALL,
    answers: [
      { body: "Giữ 60 km/h" },
      { body: "Giảm tốc theo biển, thường 40 km/h hoặc thấp hơn", correct: true },
      { body: "Tăng tốc vượt nhanh" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi tại nơi có vạch sang đường cho người đi bộ, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giảm tốc, dừng nếu cần và nhường người đi bộ",
    classes: ALL,
    answers: [
      { body: "Bóp còi để họ nhanh" },
      { body: "Giảm tốc, dừng nếu cần và nhường người đi bộ", correct: true },
      { body: "Không cần dừng" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi khi nhập làn từ đường nhánh, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Nhường xe đang đi trên đường chính",
    classes: ALL,
    answers: [
      { body: "Tăng tốc chen làn" },
      { body: "Nhường xe đang đi trên đường chính", correct: true },
      { body: "Đi song song" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi khi rẽ trái tại giao lộ có đèn, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Nhường người đi bộ và xe đi thẳng đối diện theo quy định",
    classes: ALL,
    answers: [
      { body: "Ưu tiên mình trước" },
      { body: "Nhường người đi bộ và xe đi thẳng đối diện theo quy định", correct: true },
      { body: "Chỉ nhường xe tải" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi khi gặp xe ưu tiên phía sau, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giảm tốc, tránh hoặc dừng nhường đường",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Tăng tốc để không bị chặn" },
      { body: "Giảm tốc, tránh hoặc dừng nhường đường", correct: true },
      { body: "Đi song song" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi tại vòng xuyến (theo quy định hiện hành tại điểm giao), người lái xe nên/ phải xử lý thế nào?",
    explanation: "Tuân thủ biển báo/hiệu lệnh tại vòng xuyến",
    classes: ALL,
    answers: [
      { body: "Luôn ưu tiên xe bên phải mọi nơi" },
      { body: "Tuân thủ biển báo/hiệu lệnh tại vòng xuyến", correct: true },
      { body: "Không cần xi-nhan" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi vượt xe trên đường hai chiều có vạch liền, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không vượt khi vạch/biển cấm vượt",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Vượt nếu xe trước chậm" },
      { body: "Không vượt khi vạch/biển cấm vượt", correct: true },
      { body: "Vượt bên phải" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi vượt xe trên cầu hẹp một làn mỗi chiều, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không vượt khi không bảo đảm an toàn và bị cấm",
    classes: ALL,
    answers: [
      { body: "Vượt nếu bóp còi" },
      { body: "Không vượt khi không bảo đảm an toàn và bị cấm", correct: true },
      { body: "Vượt sát mép cầu" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi vượt xe xe phía trước đang rẽ trái, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không vượt bên phải xe đang rẽ trái",
    classes: ALL,
    answers: [
      { body: "Vượt bên phải nhanh" },
      { body: "Không vượt bên phải xe đang rẽ trái", correct: true },
      { body: "Bóp còi ép rẽ" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi vượt xe trên đường cao tốc, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Vượt bên trái, đúng làn và tốc độ cho phép",
    classes: ALL,
    answers: [
      { body: "Vượt bên phải làn chậm" },
      { body: "Vượt bên trái, đúng làn và tốc độ cho phép", correct: true },
      { body: "Vượt trên làn dừng khẩn cấp" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi vượt xe khi tầm nhìn bị che khuất, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không vượt khi không quan sát được phía trước",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Vượt nếu đường vắng" },
      { body: "Không vượt khi không quan sát được phía trước", correct: true },
      { body: "Vượt nhanh trước xe ngược chiều" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi dừng, đỗ xe trên cầu, đường hầm, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không dừng, đỗ trừ trường hợp khẩn cấp theo luật",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Đỗ 5 phút" },
      { body: "Không dừng, đỗ trừ trường hợp khẩn cấp theo luật", correct: true },
      { body: "Đỗ nếu bật hazard" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi dừng, đỗ xe trước cổng trường học giờ tan học, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không gây cản trở; tuân thủ biển cấm dừng đỗ",
    classes: CAR,
    answers: [
      { body: "Đỗ hai hàng nếu vội" },
      { body: "Không gây cản trở; tuân thủ biển cấm dừng đỗ", correct: true },
      { body: "Đỗ trên vạch sang đường" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi dừng, đỗ xe trên đường cao tốc, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Chỉ dừng tại làn dừng khẩn cấp khi cần thiết",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Đỗ bất kỳ làn nào" },
      { body: "Chỉ dừng tại làn dừng khẩn cấp khi cần thiết", correct: true },
      { body: "Dừng trên làn chạy" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi dừng, đỗ xe tại giao lộ trong phạm vi biển cấm dừng, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không dừng, đỗ trong phạm vi biển",
    classes: CAR,
    answers: [
      { body: "Dừng ngắn nhận khách" },
      { body: "Không dừng, đỗ trong phạm vi biển", correct: true },
      { body: "Đỗ nếu tắt máy" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi dừng, đỗ xe trên dốc, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Kéo phanh tay/chân, về số phù hợp để xe không trôi",
    classes: CAR,
    answers: [
      { body: "Về N, không phanh" },
      { body: "Kéo phanh tay/chân, về số phù hợp để xe không trôi", correct: true },
      { body: "Chỉ đạp phanh chân" },
    ],
  },
  {
    topic: "concepts",
    stem: "Tại giao lộ có đèn đỏ, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Dừng trước vạch dừng hoặc trước vị trí quy định",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Giảm tốc rồi đi" },
      { body: "Dừng trước vạch dừng hoặc trước vị trí quy định", correct: true },
      { body: "Đi nếu không thấy xe" },
    ],
  },
  {
    topic: "concepts",
    stem: "Tại giao lộ có đèn vàng, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Dừng nếu còn dừng an toàn được",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Tăng tốc vượt" },
      { body: "Dừng nếu còn dừng an toàn được", correct: true },
      { body: "Bóp còi đi" },
    ],
  },
  {
    topic: "concepts",
    stem: "Tại giao lộ có đèn xanh, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Đi khi đã nhường phần đường còn bị chiếm",
    classes: ALL,
    answers: [
      { body: "Lao ngay vào giao lộ" },
      { body: "Đi khi đã nhường phần đường còn bị chiếm", correct: true },
      { body: "Chờ thêm đèn đỏ" },
    ],
  },
  {
    topic: "concepts",
    stem: "Tại giao lộ có đèn xanh nhấp nháy, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Đi thận trọng, nhường đường theo quy định tại điểm đó",
    classes: ALL,
    answers: [
      { body: "Được đi như đường ưu tiên tuyệt đối" },
      { body: "Đi thận trọng, nhường đường theo quy định tại điểm đó", correct: true },
      { body: "Dừng bắt buộc" },
    ],
  },
  {
    topic: "concepts",
    stem: "Tại giao lộ có tín hiệu tay của CSGT, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Thực hiện theo hiệu lệnh người điều khiển",
    classes: ALL,
    answers: [
      { body: "Theo đèn nếu khác hiệu lệnh" },
      { body: "Thực hiện theo hiệu lệnh người điều khiển", correct: true },
      { body: "Theo xe trước" },
    ],
  },
  {
    topic: "signs",
    stem: "Gặp biển báo cấm vượt, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không được vượt xe trong phạm vi biển",
    classes: ALL,
    answers: [
      { body: "Vượt nếu xe trước chậm" },
      { body: "Không được vượt xe trong phạm vi biển", correct: true },
      { body: "Vượt ban đêm" },
    ],
  },
  {
    topic: "signs",
    stem: "Gặp biển báo nguy hiểm giao nhau, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giảm tốc, quan sát, chú ý giao thông cắt ngang",
    classes: ALL,
    answers: [
      { body: "Tăng tốc qua nhanh" },
      { body: "Giảm tốc, quan sát, chú ý giao thông cắt ngang", correct: true },
      { body: "Bóp còi liên tục" },
    ],
  },
  {
    topic: "signs",
    stem: "Gặp biển báo hiệu lệnh đi thẳng, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Bắt buộc đi thẳng theo biển",
    classes: ALL,
    answers: [
      { body: "Được rẽ tùy ý" },
      { body: "Bắt buộc đi thẳng theo biển", correct: true },
      { body: "Chỉ gợi ý" },
    ],
  },
  {
    topic: "signs",
    stem: "Gặp biển báo chỉ dẫn hướng đi, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Cung cấp thông tin hướng, không phải lệnh cấm",
    classes: ALL,
    answers: [
      { body: "Cấm rẽ" },
      { body: "Cung cấp thông tin hướng, không phải lệnh cấm", correct: true },
      { body: "Bắt buộc dừng" },
    ],
  },
  {
    topic: "signs",
    stem: "Gặp biển báo cấm rẽ trái, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không được rẽ trái trong phạm vi biển",
    classes: ALL,
    answers: [
      { body: "Rẽ nếu không thấy xe" },
      { body: "Không được rẽ trái trong phạm vi biển", correct: true },
      { body: "Rẽ khi bật xi-nhan" },
    ],
  },
  {
    topic: "signs",
    stem: "Khi gặp vạch liền màu vàng giữa đường hai chiều, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không vượt qua vạch theo quy định",
    classes: ALL,
    answers: [
      { body: "Được vượt tự do" },
      { body: "Không vượt qua vạch theo quy định", correct: true },
      { body: "Chỉ xe tải không vượt" },
    ],
  },
  {
    topic: "signs",
    stem: "Khi gặp vạch đứt màu trắng, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Được chuyển hướng/vượt khi an toàn và đúng luật",
    classes: ALL,
    answers: [
      { body: "Cấm mọi chuyển hướng" },
      { body: "Được chuyển hướng/vượt khi an toàn và đúng luật", correct: true },
      { body: "Chỉ ban ngày" },
    ],
  },
  {
    topic: "signs",
    stem: "Khi gặp vạch sang đường người đi bộ, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giảm tốc, nhường người đi bộ đang qua",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Đi nếu họ chưa bước" },
      { body: "Giảm tốc, nhường người đi bộ đang qua", correct: true },
      { body: "Bóp còi ép qua" },
    ],
  },
  {
    topic: "signs",
    stem: "Khi gặp làn đường dành cho xe buýt, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không lấn làn xe buýt khi bị cấm",
    classes: ALL,
    answers: [
      { body: "Lấn làn nếu vội" },
      { body: "Không lấn làn xe buýt khi bị cấm", correct: true },
      { body: "Lấn làn ban đêm" },
    ],
  },
  {
    topic: "signs",
    stem: "Khi gặp vạch dừng tại biển Stop, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Dừng hẳn trước vạch/biển",
    classes: ALL,
    answers: [
      { body: "Chỉ giảm tốc" },
      { body: "Dừng hẳn trước vạch/biển", correct: true },
      { body: "Dừng sau vạch" },
    ],
  },
  {
    topic: "situations",
    stem: "Trên đường cao tốc, nhập làn tăng tốc, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Tăng tốc phù hợp, quan sát và nhường xe trên cao tốc",
    classes: CAR,
    answers: [
      { body: "Dừng đầu làn nhập" },
      { body: "Tăng tốc phù hợp, quan sát và nhường xe trên cao tốc", correct: true },
      { body: "Đi chậm giữa làn nhập" },
    ],
  },
  {
    topic: "situations",
    stem: "Trên đường cao tốc, ra khỏi cao tốc, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Xi-nhan sớm, giảm tốc dần trên làn giảm tốc",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Phanh gấp trên làn chạy" },
      { body: "Xi-nhan sớm, giảm tốc dần trên làn giảm tốc", correct: true },
      { body: "Lùi nếu lỡ lối" },
    ],
  },
  {
    topic: "situations",
    stem: "Trên đường cao tốc, xe chạy chậm trên cao tốc, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Đi làn phải, không chiếm làn nhanh",
    classes: CAR,
    answers: [
      { body: "Đi giữa các làn" },
      { body: "Đi làn phải, không chiếm làn nhanh", correct: true },
      { body: "Dừng trên làn chạy" },
    ],
  },
  {
    topic: "situations",
    stem: "Trên đường cao tốc, gặp tai nạn trên cao tốc, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Cảnh báo, gọi cứu hộ, không tụ tập gây cản trở",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Dừng xem, chụp ảnh giữa đường" },
      { body: "Cảnh báo, gọi cứu hộ, không tụ tập gây cản trở", correct: true },
      { body: "Quay đầu trên cao tốc" },
    ],
  },
  {
    topic: "situations",
    stem: "Trên đường cao tốc, làn dừng khẩn cấp, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Chỉ dùng khi xe gặp sự cố cần dừng",
    classes: CAR,
    answers: [
      { body: "Dùng để vượt xe" },
      { body: "Chỉ dùng khi xe gặp sự cố cần dừng", correct: true },
      { body: "Đỗ nghỉ dài" },
    ],
  },
  {
    topic: "ethics",
    stem: "Khi xử lý cứu nạn, sơ cứu ban đầu tại hiện trường, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Gọi 115/113, không di chuyển nạn nhân bừa bãi nếu nghi chấn thương cột sống",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Kéo nạn nhân nhanh ra đường" },
      { body: "Gọi 115/113, không di chuyển nạn nhân bừa bãi nếu nghi chấn thương cột sống", correct: true },
      { body: "Bỏ đi ngay" },
    ],
  },
  {
    topic: "ethics",
    stem: "Khi xử lý cứu nạn, đặt tam giác cảnh báo, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Đặt cách xe đủ xa theo quy định để cảnh báo phía sau",
    classes: ALL,
    answers: [
      { body: "Đặt sát đuôi xe" },
      { body: "Đặt cách xe đủ xa theo quy định để cảnh báo phía sau", correct: true },
      { body: "Không cần cảnh báo ban ngày" },
    ],
  },
  {
    topic: "ethics",
    stem: "Khi xử lý cứu nạn, bảo vệ hiện trường, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giữ nguyên vị trí xe/dấu vết nếu có thể cho cơ quan chức năng",
    classes: ALL,
    answers: [
      { body: "Dọn dẹp ngay để thông đường" },
      { body: "Giữ nguyên vị trí xe/dấu vết nếu có thể cho cơ quan chức năng", correct: true },
      { body: "Rửa vết máu" },
    ],
  },
  {
    topic: "ethics",
    stem: "Khi xử lý cứu nạn, khi không thể cứu được, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Vẫn trình báo và hợp tác điều tra",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Rời đi im lặng" },
      { body: "Vẫn trình báo và hợp tác điều tra", correct: true },
      { body: "Xóa camera" },
    ],
  },
  {
    topic: "ethics",
    stem: "Về việc cầm điện thoại tay khi lái ô tô, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Làm phân tán chú ý, vi phạm quy định và nguy hiểm",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "An toàn nếu nói ngắn" },
      { body: "Làm phân tán chú ý, vi phạm quy định và nguy hiểm", correct: true },
      { body: "Chỉ vi phạm trên cao tốc" },
    ],
  },
  {
    topic: "ethics",
    stem: "Về việc nhắn tin khi lái, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Rất nguy hiểm, bị cấm khi đang điều khiển",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được nếu dừng đèn đỏ" },
      { body: "Rất nguy hiểm, bị cấm khi đang điều khiển", correct: true },
      { body: "Được nếu chạy chậm" },
    ],
  },
  {
    topic: "ethics",
    stem: "Về việc tai nghe không dây, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Vẫn có thể phân tán; ưu tiên dừng xe an toàn khi cần",
    classes: ALL,
    answers: [
      { body: "Luôn an toàn tuyệt đối" },
      { body: "Vẫn có thể phân tán; ưu tiên dừng xe an toàn khi cần", correct: true },
      { body: "Bắt buộc dùng" },
    ],
  },
  {
    topic: "concepts",
    stem: "Về GPLX: GPLX hết hạn dưới 1 tháng, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không được lái; cần gia hạn/đổi trước khi điều khiển",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được lái thêm 30 ngày" },
      { body: "Không được lái; cần gia hạn/đổi trước khi điều khiển", correct: true },
      { body: "Mang CCCD thay" },
    ],
  },
  {
    topic: "concepts",
    stem: "Về GPLX: lái xe không đúng hạng GPLX, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Vi phạm quy định về GPLX",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được nếu quen đường" },
      { body: "Vi phạm quy định về GPLX", correct: true },
      { body: "Chỉ vi phạm ban đêm" },
    ],
  },
  {
    topic: "concepts",
    stem: "Về GPLX: không mang GPLX khi lái, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Vi phạm; phải xuất trình khi yêu cầu",
    classes: ALL,
    answers: [
      { body: "Không sao nếu nhớ số" },
      { body: "Vi phạm; phải xuất trình khi yêu cầu", correct: true },
      { body: "Chỉ cần ảnh trên điện thoại" },
    ],
  },
  {
    topic: "situations",
    stem: "Gặp xe cứu thương, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Nhường đường: giảm tốc, tránh hoặc dừng",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Tiếp tục nếu đúng làn" },
      { body: "Nhường đường: giảm tốc, tránh hoặc dừng", correct: true },
      { body: "Đua theo dẫn đường" },
    ],
  },
  {
    topic: "situations",
    stem: "Gặp xe cảnh sát giao thông, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Thực hiện hiệu lệnh, nhường đường khi có tín hiệu ưu tiên",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Bỏ qua nếu vội" },
      { body: "Thực hiện hiệu lệnh, nhường đường khi có tín hiệu ưu tiên", correct: true },
      { body: "Quay đầu tránh" },
    ],
  },
  {
    topic: "situations",
    stem: "Gặp xe chữa cháy, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Nhường đường kịp thời",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Chặn để xem" },
      { body: "Nhường đường kịp thời", correct: true },
      { body: "Đi song song" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi trời mưa nhẹ, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giảm tốc, bật đèn phù hợp, tăng khoảng cách",
    classes: ALL,
    answers: [
      { body: "Giữ tốc độ" },
      { body: "Giảm tốc, bật đèn phù hợp, tăng khoảng cách", correct: true },
      { body: "Tắt đèn" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi trời mưa to đường trơn, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giảm tốc mạnh, tránh phanh/đánh lái gấp",
    classes: ALL,
    answers: [
      { body: "Tăng tốc thoát mưa" },
      { body: "Giảm tốc mạnh, tránh phanh/đánh lái gấp", correct: true },
      { body: "Dùng phanh tay" },
    ],
  },
  {
    topic: "situations",
    stem: "Khi trời ngập nước nhẹ, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Không cố đi qua nếu không chắc độ sâu",
    classes: ALL,
    answers: [
      { body: "Đi nhanh tạo sóng" },
      { body: "Không cố đi qua nếu không chắc độ sâu", correct: true },
      { body: "Tắt máy giữa ngập" },
    ],
  },
  {
    topic: "technique",
    stem: "Khi xuống dốc dài, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Dùng số thấp, phanh động cơ, tránh phanh nóng",
    classes: CAR,
    answers: [
      { body: "Về N" },
      { body: "Dùng số thấp, phanh động cơ, tránh phanh nóng", correct: true },
      { body: "Phanh chân liên tục" },
    ],
  },
  {
    topic: "technique",
    stem: "Khi lên dốc, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Chọn số phù hợp, giữ đều ga",
    classes: CAR,
    answers: [
      { body: "Số quá cao gây chết máy" },
      { body: "Chọn số phù hợp, giữ đều ga", correct: true },
      { body: "Lùi xe" },
    ],
  },
  {
    topic: "technique",
    stem: "Khi đường đèo quanh co, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giảm tốc, giữ làn, không vượt khi mất tầm nhìn",
    classes: CAR,
    answers: [
      { body: "Vượt trên cua" },
      { body: "Giảm tốc, giữ làn, không vượt khi mất tầm nhìn", correct: true },
      { body: "Đi sát làn ngược" },
    ],
  },
  {
    topic: "technique",
    stem: "Khi phanh gấp có ABS, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Giữ chặt phanh, vẫn có thể đánh lái tránh vật cản",
    classes: CAR,
    answers: [
      { body: "Nhả phanh liên tục" },
      { body: "Giữ chặt phanh, vẫn có thể đánh lái tránh vật cản", correct: true },
      { body: "Tắt ABS khi mưa" },
    ],
  },
  {
    topic: "technique",
    stem: "Khi phanh trên đường trơn, người lái xe nên/ phải xử lý thế nào?",
    explanation: "Phanh êm, tăng khoảng cách, tránh đánh lái gấp",
    classes: CAR,
    answers: [
      { body: "Phanh mạnh một lần" },
      { body: "Phanh êm, tăng khoảng cách, tránh đánh lái gấp", correct: true },
      { body: "Tăng tốc" },
    ],
  },
  {
    topic: "concepts",
    stem: "Lùi xe trên đường cao tốc là?",
    explanation: "Nghiêm cấm; rất nguy hiểm và vi phạm.",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Được nếu ít xe" },
      { body: "Hành vi bị nghiêm cấm", correct: true },
      { body: "Được ban đêm" },
    ],
  },
  {
    topic: "ethics",
    stem: "Gây tai nạn rồi bỏ trốn hiện trường có thể bị?",
    explanation: "Truy cứu trách nhiệm hình sự tùy mức độ.",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Chỉ phạt hành chính nhẹ" },
      { body: "Truy cứu trách nhiệm hình sự theo quy định", correct: true },
      { body: "Không xử lý" },
    ],
  },
  {
    topic: "concepts",
    stem: "Điều khiển xe khi đã uống rượu bia dù ít cũng?",
    explanation: "Vi phạm vì nồng độ cồn phải bằng 0.",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Được nếu cảm thấy tỉnh" },
      { body: "Vi phạm pháp luật, không được lái", correct: true },
      { body: "Chỉ cấm xe tải" },
    ],
  },
  {
    topic: "situations",
    stem: "Đi ngược chiều trên cao tốc là?",
    explanation: "Cực kỳ nguy hiểm, bị xử lý nghiêm.",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Được nếu gần lối ra" },
      { body: "Vi phạm nghiêm trọng", correct: true },
      { body: "Chỉ cảnh cáo" },
    ],
  },
  {
    topic: "ethics",
    stem: "Không dừng cứu người bị nạn khi có điều kiện có thể bị?",
    explanation: "Xem xét trách nhiệm theo pháp luật hiện hành.",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Không sao" },
      { body: "Xem xét trách nhiệm pháp lý", correct: true },
      { body: "Chỉ bị góp ý" },
    ],
  },
  {
    topic: "concepts",
    stem: "Xe máy chở quá số người quy định là?",
    explanation: "Vi phạm và tăng nguy cơ tai nạn.",
    isCritical: true,
    classes: MOTO,
    answers: [
      { body: "Được nếu đi chậm" },
      { body: "Vi phạm quy định, không được phép", correct: true },
      { body: "Chỉ cấm cao tốc" },
    ],
  },
  {
    topic: "situations",
    stem: "Không nhường xe ưu tiên đang phát tín hiệu là?",
    explanation: "Vi phạm quy tắc ưu tiên, có thể bị phạt nặng.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Không vi phạm nếu vội" },
      { body: "Vi phạm quy tắc ưu tiên", correct: true },
      { body: "Chỉ nhắc nhở" },
    ],
  },
  {
    topic: "signs",
    stem: "Vượt qua vạch liền phân làn ngược chiều là?",
    explanation: "Nguy hiểm, thường bị cấm.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được nếu vắng" },
      { body: "Vi phạm, thường bị cấm vượt", correct: true },
      { body: "Chỉ cấm ban đêm" },
    ],
  },
  {
    topic: "ethics",
    stem: "Lái xe bằng GPLX đã bị tước còn hiệu lực là?",
    explanation: "Vi phạm nghiêm trọng.",
    isCritical: true,
    classes: ALL,
    answers: [
      { body: "Được nếu gần nhà" },
      { body: "Vi phạm nghiêm trọng, bị xử phạt", correct: true },
      { body: "Chỉ phạt tiền" },
    ],
  },
  {
    topic: "situations",
    stem: "Dừng xe giữa đường cao tốc để chụp ảnh là?",
    explanation: "Gây nguy hiểm, bị cấm.",
    isCritical: true,
    classes: CAR,
    answers: [
      { body: "Được nếu ít xe" },
      { body: "Bị cấm, gây nguy hiểm", correct: true },
      { body: "Được ở làn trái" },
    ],
  }
];

function appliesToClass(classes: string[], licenseClass: string): boolean {
  return classes.includes(licenseClass);
}

function rotatePool<T>(pool: T[], offset: number): T[] {
  if (pool.length === 0) return [];
  const o = offset % pool.length;
  return [...pool.slice(o), ...pool.slice(0, o)];
}

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

  await prisma.gplxBookmark.deleteMany({ where: { appId } });
  await prisma.gplxMockAttempt.deleteMany({ where: { appId } });
  await prisma.gplxFixedSet.deleteMany({ where: { appId } });
  await prisma.gplxStudyProgress.deleteMany({
    where: { question: { appId } },
  });
  await prisma.gplxBankQuestion.deleteMany({ where: { appId } });

  let position = 0;
  const createdIds: string[] = [];
  const createdByClass = new Map<string, string[]>();
  const createdMeta: Array<{ id: string; isCritical: boolean; classes: string[] }> = [];

  for (const q of QUESTIONS) {
    const topicId = topicIds.get(q.topic);
    if (!topicId) continue;
    position += 1;
    const row = await prisma.gplxBankQuestion.create({
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
    createdIds.push(row.id);
    createdMeta.push({ id: row.id, isCritical: !!q.isCritical, classes: q.classes });
    for (const cls of q.classes) {
      const list = createdByClass.get(cls) ?? [];
      list.push(row.id);
      createdByClass.set(cls, list);
    }
  }

  const criticalCount = createdMeta.filter(
    (q) => q.isCritical && q.classes.some((c) => CAR.includes(c)),
  ).length;

  const fixedSpecs: Array<{
    code: string;
    title: string;
    licenseClass: string;
    kind: "full" | "critical";
  }> = [
    { code: "set-b-01", title: "Đề cố định B #01", licenseClass: "B", kind: "full" },
    { code: "set-b-02", title: "Đề cố định B #02", licenseClass: "B", kind: "full" },
    { code: "set-a1-01", title: "Đề cố định A1 #01", licenseClass: "A1", kind: "full" },
    { code: "set-c1-01", title: "Đề cố định C1 #01", licenseClass: "C1", kind: "full" },
    { code: "set-critical-b", title: "Ôn điểm liệt (hạng B)", licenseClass: "B", kind: "critical" },
  ];

  for (let i = 0; i < fixedSpecs.length; i += 1) {
    const spec = fixedSpecs[i]!;
    const pool = createdByClass.get(spec.licenseClass) ?? [];
    const examSize = EXAM_QUESTION_COUNT[spec.licenseClass] ?? 30;
    const offset = (i * 11) % Math.max(1, pool.length);

    let questionIds: string[];
    if (spec.kind === "critical") {
      const criticalPool = createdMeta
        .filter((q) => q.isCritical && appliesToClass(q.classes, spec.licenseClass))
        .map((q) => q.id);
      questionIds = rotatePool(criticalPool, offset).slice(
        0,
        Math.min(examSize, criticalPool.length),
      );
    } else {
      questionIds = rotatePool(pool, offset).slice(0, Math.min(examSize, pool.length));
    }

    await prisma.gplxFixedSet.create({
      data: {
        appId,
        code: spec.code,
        title: spec.title,
        licenseClass: spec.licenseClass,
        questionIdsJson: questionIds,
        position: i,
      },
    });
  }

  return {
    topicCount: TOPICS.length,
    questionCount: QUESTIONS.length,
    fixedSetCount: fixedSpecs.length,
    criticalCount,
  };
}
