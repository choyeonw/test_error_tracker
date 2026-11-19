(async function () {
  const form = document.querySelector(".mistake-form");
  const client = window.supabaseClient;
  if (!form || !client) return;

  const names = ["subject", "unit", "concept"];
  const inputs = Object.fromEntries(
    names.map(name => [name, form.elements.namedItem(name)])
  );

  if (names.some(name => !inputs[name])) return;
    form.setAttribute("autocomplete", "off");

  names.forEach(name => {
    inputs[name].setAttribute("autocomplete", "off");
  });

  const labels = {
    subject: "과목",
    unit: "단원",
    concept: "세부 개념"
  };

  const selectors = {};

  names.forEach(name => {
    const select = document.createElement("select");
    select.setAttribute("aria-label", "이전 " + labels[name] + " 중 선택");
    select.style.marginTop = "6px";
    select.style.width = "100%";

    inputs[name].parentElement.appendChild(select);
    selectors[name] = select;
  });

  function key(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s·ㆍ]/g, "");
  }

  function uniqueValues(values) {
    const seen = new Set();

    return values.filter(value => {
      const normalized = key(value);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  let records = [];

  function updateOptions() {
    names.forEach(name => {
      let matching = records;

      if (name === "unit" && inputs.subject.value.trim()) {
        matching = matching.filter(row =>
          key(row.subject) === key(inputs.subject.value)
        );
      }

      if (name === "concept") {
        if (inputs.subject.value.trim()) {
          matching = matching.filter(row =>
            key(row.subject) === key(inputs.subject.value)
          );
        }

        if (inputs.unit.value.trim()) {
          matching = matching.filter(row =>
            key(row.unit) === key(inputs.unit.value)
          );
        }
      }

      const values = uniqueValues(
        matching.map(row => String(row[name] || "").trim())
      ).sort((a, b) => a.localeCompare(b, "ko"));

      const select = selectors[name];
      select.replaceChildren();

      const first = document.createElement("option");
      first.value = "";
      first.textContent = "이전 " + labels[name] + "에서 선택하거나 직접 입력";
      select.appendChild(first);

      values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      select.disabled = values.length === 0;
    });
  }

  names.forEach(name => {
    selectors[name].addEventListener("change", () => {
      if (selectors[name].value) {
        inputs[name].value = selectors[name].value;
        updateOptions();
      }
    });

    inputs[name].addEventListener("input", updateOptions);
  });

  const { data: authData, error: authError } =
    await client.auth.getUser();

  if (authError || !authData.user) return;

  const { data, error } = await client
    .from("mistakes")
    .select("subject, unit, concept");

  if (error) {
    console.error("이전 입력값을 불러오지 못했습니다:", error);
    return;
  }

  records = data || [];
  updateOptions();
})();
