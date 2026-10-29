const client = window.supabaseClient;
const form = document.getElementById("edit-form");
const message = document.getElementById("edit-message");
const saveButton = document.getElementById("save-button");
const id = new URLSearchParams(window.location.search).get("id");

const fieldNames = [
  "mistakeDate", "subject", "unit", "concept", "mistakeType",
  "difficulty", "reason", "book", "page", "questionNumber",
  "exam", "memo"
];

let original = null;

function mistakeKey(mistake) {
  return JSON.stringify(
    fieldNames.map(name => String(mistake[name] ?? ""))
  );
}

async function loadForEditing() {
  if (!id) {
    message.textContent = "수정할 오답을 찾을 수 없습니다.";
    return;
  }

  const { data: authData, error: authError } =
    await client.auth.getUser();

  if (authError || !authData.user) {
    message.textContent = "오답을 수정하려면 먼저 로그인해 주세요.";
    return;
  }

  const { data: row, error } = await client
    .from("mistakes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    message.textContent = "오답을 불러오지 못했습니다.";
    return;
  }

  original = {
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
  };

  fieldNames.forEach(name => {
    form.elements.namedItem(name).value = original[name];
  });

  saveButton.disabled = false;
  message.textContent = "내용을 고친 뒤 저장하세요.";
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!original) return;

  saveButton.disabled = true;
  message.textContent = "수정 내용을 저장하는 중입니다...";

  const changed = Object.fromEntries(new FormData(form).entries());

  const { data: updated, error } = await client
    .from("mistakes")
    .update({
      mistake_date: changed.mistakeDate || null,
      subject: changed.subject,
      unit: changed.unit,
      concept: changed.concept,
      mistake_type: changed.mistakeType,
      difficulty: changed.difficulty,
      reason: changed.reason,
      book: changed.book || null,
      page: changed.page || null,
      question_number: changed.questionNumber || null,
      exam: changed.exam || null,
      memo: changed.memo || null
    })
    .eq("id", id)
    .select("id");

  if (error || !updated || updated.length === 0) {
    message.textContent =
      "저장 실패: " + (error?.message || "오답을 찾을 수 없습니다.");
    saveButton.disabled = false;
    return;
  }

  // 예전 브라우저 복사본이 있다면 같은 내용으로 맞춥니다.
  try {
    const browserRecords =
      JSON.parse(localStorage.getItem("mistakes") || "[]");

    const index = browserRecords.findIndex(
      record => mistakeKey(record) === mistakeKey(original)
    );

    if (index !== -1) {
      browserRecords[index] = { ...browserRecords[index], ...changed };
      localStorage.setItem("mistakes", JSON.stringify(browserRecords));
    }
  } catch (error) {
    message.textContent =
      "Supabase에는 저장됐지만 브라우저의 이전 기록을 정리하지 못했습니다.";
    return;
  }

  window.location.href = "mistakes.html";
});

loadForEditing();
