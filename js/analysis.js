const client = window.supabaseClient;

const subjectShare = document.getElementById("subject-share");
const typeShare = document.getElementById("type-share");
const subjectSelect = document.getElementById("subject-select");
const ranking = document.getElementById("concept-ranking");

const startDate = document.getElementById("start-date");
const endDate = document.getElementById("end-date");
const periodStatus = document.getElementById("period-status");

const dialog = document.getElementById("analysis-dialog");
const dialogTitle = document.getElementById("dialog-title");
const dialogList = document.getElementById("dialog-list");

let allMistakes = [];
let selectedMistakes = [];

function normalizedKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s·ㆍ・]/g, "");
}

function groupMistakes(mistakes, fieldName) {
  const groups = new Map();

  mistakes.forEach(mistake => {
    const name = String(mistake[fieldName] || "").trim() || "미기록";
    const key = normalizedKey(name);

    if (!groups.has(key)) {
      groups.set(key, { name, mistakes: [] });
    }

    groups.get(key).mistakes.push(mistake);
  });

  return Array.from(groups.values())
    .sort((a, b) => b.mistakes.length - a.mistakes.length);
}

function showDialog(title, mistakes) {
  dialogTitle.textContent = title + "에 해당하는 오답";
  dialogList.replaceChildren();

  mistakes.forEach(mistake => {
    const item = document.createElement("li");

    const date = mistake.mistake_date || "날짜 미기록";
    const subject = mistake.subject || "과목 미기록";
    const unit = mistake.unit || "단원 미기록";
    const concept = mistake.concept || "개념 미기록";
    const type = mistake.mistake_type || "유형 미기록";

    item.textContent =
      date + " · " + subject + " · " + unit +
      " · " + concept + " · " + type + " ";

    const editLink = document.createElement("a");
    editLink.href = "edit.html?id=" + encodeURIComponent(mistake.id);
    editLink.textContent = "수정하기";
    item.appendChild(editLink);

    dialogList.appendChild(item);
  });

  dialog.showModal();
}

function showShare(container, groups, total) {
  container.replaceChildren();

  groups.forEach(group => {
    const count = group.mistakes.length;
    const percent = Math.round(count / total * 100);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "share-button";
    button.setAttribute(
      "aria-label",
      group.name + " " + count + "건의 오답 보기"
    );

    const text = document.createElement("span");
    text.textContent =
      group.name + ": " + count + "건 (" + percent + "%)";

    const bar = document.createElement("progress");
    bar.value = count;
    bar.max = total;

    button.appendChild(text);
    button.appendChild(bar);
    button.addEventListener("click", () => {
      showDialog(group.name, group.mistakes);
    });

    container.appendChild(button);
  });
}

function showRanking() {
  ranking.replaceChildren();
  const conceptCounts = new Map();

  selectedMistakes.forEach(mistake => {
    const subject =
      String(mistake.subject || "").trim() || "미기록";

    if (normalizedKey(subject) !== normalizedKey(subjectSelect.value)) return;

    const name = String(mistake.concept || "").trim();
    const key = normalizedKey(name);
    if (!key) return;

    const entry = conceptCounts.get(key) || {
      name,
      total: 0,
      incorrect: 0,
      notTried: 0
    };

    entry.total += 1;

    if (mistake.retry_result === "incorrect") {
      entry.incorrect += 1;
    } else if (mistake.retry_result !== "correct") {
      entry.notTried += 1;
    }

    conceptCounts.set(key, entry);
  });

  const concepts = Array.from(conceptCounts.values())
    .sort((a, b) =>
      b.incorrect - a.incorrect ||
      b.notTried - a.notTried ||
      b.total - a.total ||
      a.name.localeCompare(b.name, "ko")
    )
    .slice(0, 10);

  concepts.forEach((entry, index) => {
    const item = document.createElement("li");
    const correctCount =
      entry.total - entry.incorrect - entry.notTried;

    item.style.fontSize = (1.5 - index * 0.055).toFixed(2) + "rem";
    item.style.fontWeight = "700";
    item.appendChild(document.createTextNode(entry.name + " — "));

    const stats = document.createElement("span");
    stats.style.fontSize = "0.95rem";
    stats.style.fontWeight = "400";
    stats.textContent =
      "또 틀림 " + entry.incorrect + "건" +
      " · 아직 안 풀어봄 " + entry.notTried + "건" +
      " · 다시 풀어 맞힘 " + correctCount + "건" +
      " · 전체 " + entry.total + "회";

    item.appendChild(stats);
    ranking.appendChild(item);
  });
}

function renderAnalysis() {
  const total = selectedMistakes.length;
  const previousSubject = subjectSelect.value;

  subjectSelect.replaceChildren();
  ranking.replaceChildren();

  if (total === 0) {
    subjectShare.textContent = "해당 기간에 등록된 오답이 없습니다.";
    typeShare.textContent = "해당 기간에 등록된 오답이 없습니다.";
    subjectSelect.disabled = true;
    return;
  }

  const subjects = groupMistakes(selectedMistakes, "subject");
  const types = groupMistakes(selectedMistakes, "mistake_type");

  showShare(subjectShare, subjects, total);
  showShare(typeShare, types, total);

  subjects.forEach(group => {
    const option = document.createElement("option");
    option.value = group.name;
    option.textContent = group.name;
    subjectSelect.appendChild(option);
  });

  if (subjects.some(group => group.name === previousSubject)) {
    subjectSelect.value = previousSubject;
  }

  subjectSelect.disabled = false;
  showRanking();
}

function applyPeriod() {
  const start = startDate.value;
  const end = endDate.value;

  if (start && end && start > end) {
    periodStatus.textContent =
      "시작일은 종료일보다 늦을 수 없습니다.";
    return;
  }

  selectedMistakes = allMistakes.filter(mistake => {
    const date = mistake.mistake_date;

    // 기간을 지정했다면 날짜가 없는 이전 오답은 제외합니다.
    if ((start || end) && !date) return false;
    if (start && date < start) return false;
    if (end && date > end) return false;

    return true;
  });

  if (!start && !end) {
    periodStatus.textContent =
      "전체 기간 · 오답 " + selectedMistakes.length + "건";
  } else {
    periodStatus.textContent =
      (start || "처음") + "부터 " +
      (end || "현재") + "까지 · 오답 " +
      selectedMistakes.length + "건";
  }

  renderAnalysis();
}

async function loadAnalysis() {
  subjectShare.textContent = "분석 결과를 불러오는 중입니다...";
  typeShare.textContent = "분석 결과를 불러오는 중입니다...";
  subjectSelect.disabled = true;

  try {
    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError || !authData.user) {
      subjectShare.textContent =
        "분석을 보려면 먼저 로그인해 주세요.";
      typeShare.textContent = "";
      return;
    }

    const { data, error } = await client
      .from("mistakes")
      .select(
        "id, mistake_date, subject, unit, concept, " +
        "mistake_type, retry_result"
      );

    if (error) {
      subjectShare.textContent =
        "분석 결과를 불러오지 못했습니다: " + error.message;
      typeShare.textContent = "";
      return;
    }

    allMistakes = data || [];
    applyPeriod();
  } catch (error) {
    subjectShare.textContent = "분석 중 오류가 났습니다.";
    typeShare.textContent = "";
  }
}

document.getElementById("apply-period")
  .addEventListener("click", applyPeriod);

document.getElementById("reset-period")
  .addEventListener("click", () => {
    startDate.value = "";
    endDate.value = "";
    applyPeriod();
  });

subjectSelect.addEventListener("change", showRanking);

document.getElementById("close-dialog")
  .addEventListener("click", () => dialog.close());

dialog.addEventListener("click", function (event) {
  if (event.target !== dialog) return;

  const box = dialog.getBoundingClientRect();
  const outside =
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom;

  if (outside) dialog.close();
});

loadAnalysis();
