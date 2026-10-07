const storageKey = "mistakes";
const form = document.querySelector("form");

if (form) {
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const mistake = Object.fromEntries(new FormData(form).entries());
    const mistakes = JSON.parse(localStorage.getItem(storageKey) || "[]");

    mistakes.push(mistake);
    localStorage.setItem(storageKey, JSON.stringify(mistakes));
    window.location.href = "index.html";
  });
}

const list = document.getElementById("mistake-list");

if (list) {
  const mistakes = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const searchInput = document.getElementById("mistake-search");

  function showMistakes() {
    list.replaceChildren();

    const keyword = searchInput.value.trim().toLowerCase();
    const results = mistakes.filter(function (mistake) {
      return Object.values(mistake).some(function (value) {
        return String(value).toLowerCase().includes(keyword);
      });
    });

    if (results.length === 0) {
      const item = document.createElement("li");
      item.textContent = keyword
        ? "검색 결과가 없습니다."
        : "아직 등록된 오답이 없습니다.";
      list.appendChild(item);
    }

    results.forEach(function (mistake) {
      const item = document.createElement("li");
      const details = document.createElement("details");
      const summary = document.createElement("summary");

      summary.textContent =
        mistake.subject + " · " + mistake.concept + " · " + mistake.mistakeType;
      details.appendChild(summary);

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

      fields.forEach(function (field) {
        if (field[1]) {
          const line = document.createElement("p");
          line.textContent = field[0] + ": " + field[1];
          details.appendChild(line);
        }
      });

      item.appendChild(details);
      list.appendChild(item);
    });
  }

  searchInput.addEventListener("input", showMistakes);
  showMistakes();
}

const subjectShare = document.getElementById("subject-share");

if (subjectShare) {
  const mistakes = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const subjectSelect = document.getElementById("subject-select");
  const ranking = document.getElementById("concept-ranking");
  const subjectCounts = new Map();

  mistakes.forEach(function (mistake) {
    const subject = (mistake.subject || "").trim();
    if (subject) {
      subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
    }
  });

  subjectShare.replaceChildren();

  if (subjectCounts.size === 0) {
    subjectShare.textContent = "등록된 오답이 없습니다.";
    subjectSelect.disabled = true;
  } else {
    const total = Array.from(subjectCounts.values())
      .reduce(function (sum, count) { return sum + count; }, 0);

    const subjects = Array.from(subjectCounts.entries())
      .sort(function (a, b) { return b[1] - a[1]; });

    subjects.forEach(function (entry) {
      const subject = entry[0];
      const count = entry[1];
      const percent = Math.round(count / total * 100);

      const row = document.createElement("p");
      row.textContent = subject + ": " + count + "건 (" + percent + "%)";

      const bar = document.createElement("progress");
      bar.value = count;
      bar.max = total;

      row.appendChild(document.createElement("br"));
      row.appendChild(bar);
      subjectShare.appendChild(row);

      const option = document.createElement("option");
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });

    function showRanking() {
      ranking.replaceChildren();
      const conceptCounts = new Map();

      mistakes.forEach(function (mistake) {
        if (mistake.subject === subjectSelect.value) {
          const concept = (mistake.concept || "").trim();
          if (concept) {
            conceptCounts.set(
              concept,
              (conceptCounts.get(concept) || 0) + 1
            );
          }
        }
      });

      const concepts = Array.from(conceptCounts.entries())
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, 10);

      concepts.forEach(function (entry, index) {
        const item = document.createElement("li");
        item.textContent = entry[0] + " — " + entry[1] + "회";
        item.className = index < 4 ? "rank-high" : "rank-low";
        ranking.appendChild(item);
      });
    }

    subjectSelect.addEventListener("change", showRanking);
    showRanking();
  }
}
