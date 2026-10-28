const list = document.getElementById("mistake-list");
const searchInput = document.getElementById("mistake-search");
const client = window.supabaseClient;
let allMistakes = [];

const fieldNames = [
  "mistakeDate", "subject", "unit", "concept", "mistakeType",
  "difficulty", "reason", "book", "page", "questionNumber",
  "exam", "memo"
];

function mistakeKey(mistake) {
  return JSON.stringify(
    fieldNames.map(name => String(mistake[name] ?? ""))
  );
}

function showMessage(message) {
  list.replaceChildren();
  const item = document.createElement("li");
  item.textContent = message;
  list.appendChild(item);
}

function showMistakes() {
  list.replaceChildren();

  const keyword = searchInput.value.trim().toLowerCase();
  const results = allMistakes.filter(mistake =>
    fieldNames.some(name =>
      String(mistake[name] ?? "").toLowerCase().includes(keyword)
    )
  );

  if (results.length === 0) {
    showMessage(keyword ? "검색 결과가 없습니다." : "아직 등록된 오답이 없습니다.");
    return;
  }

  results.forEach(mistake => {
    const item = document.createElement("li");
    const details = document.createElement("details");
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent =
      (mistake.mistakeDate || "날짜 미기록") + " · " +
      mistake.subject + " · " +
      mistake.concept + " · " +
      mistake.mistakeType;
    details.appendChild(summary);

    const place = document.createElement("p");
    place.textContent = mistake.source === "supabase"
      ? "Supabase에 저장됨"
      : "이 브라우저에만 저장된 이전 오답";
    details.appendChild(place);

    const fields = [
      ["단원", mistake.unit],
      ["난이도", mistake.difficulty],
      ["틀린 이유", mistake.reason],
      ["문제집 이름", mistake.book],
      ["페이지", mistake.page],
      ["문제 번호", mistake.questionNumber],
      ["시험명", mistake.exam],
      ["추가 메모", mistake.memo]
    ];

    fields.forEach(([label, value]) => {
      if (value) {
        const line = document.createElement("p");
        line.textContent = label + ": " + value;
        details.appendChild(line);
      }
    });

    item.appendChild(details);
    list.appendChild(item);
  });
}

async function loadMistakes() {
  showMessage("오답을 불러오는 중입니다...");

  try {
    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError || !authData.user) {
      showMessage("오답을 보려면 먼저 로그인해 주세요.");
      return;
    }

    const { data: rows, error } = await client
      .from("mistakes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showMessage("오답을 불러오지 못했습니다: " + error.message);
      return;
    }

    const savedMistakes = rows.map(row => ({
      source: "supabase",
      mistakeDate: row.mistake_date || "",
      subject: row.subject,
      unit: row.unit,
      concept: row.concept,
      mistakeType: row.mistake_type,
      difficulty: row.difficulty,
      reason: row.reason,
      book: row.book || "",
      page: row.page || "",
      questionNumber: row.question_number || "",
      exam: row.exam || "",
      memo: row.memo || ""
    }));

    let browserMistakes = [];
    try {
      browserMistakes =
        JSON.parse(localStorage.getItem("mistakes") || "[]");
    } catch (error) {
      browserMistakes = [];
    }

    // 양쪽에 저장된 같은 오답은 화면에 한 번만 표시합니다.
    const savedCounts = new Map();
    savedMistakes.forEach(mistake => {
      const key = mistakeKey(mistake);
      savedCounts.set(key, (savedCounts.get(key) || 0) + 1);
    });

    const browserOnly = [];
    browserMistakes.forEach(mistake => {
      const key = mistakeKey(mistake);
      const count = savedCounts.get(key) || 0;

      if (count > 0) {
        savedCounts.set(key, count - 1);
      } else {
        browserOnly.push({ ...mistake, source: "browser" });
      }
    });

    allMistakes = [...savedMistakes, ...browserOnly];
    showMistakes();
  } catch (error) {
    showMessage("오답을 불러오는 중 오류가 났습니다.");
  }
}

searchInput.addEventListener("input", showMistakes);
loadMistakes();
