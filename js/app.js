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

  if (mistakes.length === 0) {
    const item = document.createElement("li");
    item.textContent = "아직 등록된 오답이 없습니다.";
    list.appendChild(item);
  }

  mistakes.forEach(function (mistake) {
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
