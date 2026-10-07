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
    item.textContent =
      mistake.subject + " · " + mistake.concept + " · " + mistake.mistakeType;
    list.appendChild(item);
  });
}
