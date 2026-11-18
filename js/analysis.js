const client = window.supabaseClient;
const subjectShare = document.getElementById("subject-share");
const typeShare = document.getElementById("type-share");
const subjectSelect = document.getElementById("subject-select");
const ranking = document.getElementById("concept-ranking");

function countValues(mistakes, fieldName) {
  const counts = new Map();

  mistakes.forEach(mistake => {
    const value = String(mistake[fieldName] || "").trim() || "미기록";
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1]);
}

function showShare(container, entries, total) {
  container.replaceChildren();

  entries.forEach(([name, count]) => {
    const percent = Math.round(count / total * 100);

    const row = document.createElement("p");
    row.textContent =
      name + ": " + count + "건 (" + percent + "%)";

    const bar = document.createElement("progress");
    bar.value = count;
    bar.max = total;

    row.appendChild(document.createElement("br"));
    row.appendChild(bar);
    container.appendChild(row);
  });
}

// 띄어쓰기와 가운뎃점만 다른 개념을 같은 개념으로 판단합니다.
function conceptKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s·ㆍ・]/g, "");
}

async function loadAnalysis() {
  subjectShare.textContent = "분석 결과를 불러오는 중입니다...";
  typeShare.textContent = "분석 결과를 불러오는 중입니다...";
  subjectSelect.disabled = true;

  try {
    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError || !authData.user) {
      subjectShare.textContent = "분석을 보려면 먼저 로그인해 주세요.";
      typeShare.textContent = "";
      return;
    }

    const { data: mistakes, error } = await client
      .from("mistakes")
      .select("subject, concept, mistake_type, retry_result");

    if (error) {
      subjectShare.textContent =
        "분석 결과를 불러오지 못했습니다: " + error.message;
      typeShare.textContent = "";
      return;
    }

    subjectShare.replaceChildren();
    typeShare.replaceChildren();
    subjectSelect.replaceChildren();
    ranking.replaceChildren();

    if (!mistakes || mistakes.length === 0) {
      subjectShare.textContent = "등록된 오답이 없습니다.";
      typeShare.textContent = "등록된 오답이 없습니다.";
      return;
    }

    const total = mistakes.length;
    const subjects = countValues(mistakes, "subject");
    const types = countValues(mistakes, "mistake_type");

    showShare(subjectShare, subjects, total);
    showShare(typeShare, types, total);

    subjects.forEach(([subject]) => {
      const option = document.createElement("option");
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });

    function showRanking() {
      ranking.replaceChildren();
      const conceptCounts = new Map();

      mistakes.forEach(mistake => {
        const subject =
          String(mistake.subject || "").trim() || "미기록";

        if (subject !== subjectSelect.value) return;

        const originalName = String(mistake.concept || "").trim();
        const key = conceptKey(originalName);

        if (!key) return;

        // 같은 개념의 여러 표기를 하나의 건수로 합칩니다.
        const entry = conceptCounts.get(key) || {
          name: originalName,
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

        // 1순위가 가장 크고, 뒤로 갈수록 조금씩 작아집니다.
        item.style.fontSize = (1.5 - index * 0.055).toFixed(2) + "rem";
        item.style.fontWeight = "700";
        item.appendChild(document.createTextNode(entry.name + " — "));

        // 건수 설명은 읽기 쉬운 크기로 표시합니다.
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

    subjectSelect.disabled = false;
    subjectSelect.addEventListener("change", showRanking);
    showRanking();
  } catch (error) {
    subjectShare.textContent = "분석 중 오류가 났습니다.";
    typeShare.textContent = "";
  }
}

loadAnalysis();
