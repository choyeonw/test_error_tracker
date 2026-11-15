const storageKey = "mistakes";
const form = document.querySelector("form");

if (form) {
  form.style.display = "none";

  async function checkLogin() {
    const { data, error } = await window.supabaseClient.auth.getSession();

    if (error || !data.session) {
      alert("오답을 등록하려면 먼저 로그인해 주세요.");
      window.location.replace("login.html");
      return;
    }

    form.style.removeProperty("display");
  }

  checkLogin();

  const dateInput = form.querySelector('input[name="mistakeDate"]');

  if (dateInput) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.value = today.toISOString().slice(0, 10);
  }

  // 기존 사진 선택과 카메라 촬영 중 마지막으로 고른 사진만 사용
  const questionFileInput = form.querySelector('[name="questionImageFile"]');
  const questionCameraInput = form.querySelector('[name="questionImageCamera"]');
  const answerFileInput = form.querySelector('[name="answerImageFile"]');
  const answerCameraInput = form.querySelector('[name="answerImageCamera"]');

  function useOneInput(first, second) {
    first.addEventListener("change", function () {
      if (first.files.length > 0) second.value = "";
    });

    second.addEventListener("change", function () {
      if (second.files.length > 0) first.value = "";
    });
  }

  useOneInput(questionFileInput, questionCameraInput);
  useOneInput(answerFileInput, answerCameraInput);

  function selectedPhoto(fileInput, cameraInput) {
    return fileInput.files[0] || cameraInput.files[0] || null;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const { data, error: sessionError } =
      await window.supabaseClient.auth.getSession();

    if (sessionError || !data.session) {
      alert("먼저 로그인한 뒤 오답을 등록해 주세요.");
      return;
    }

    const questionPhoto = selectedPhoto(questionFileInput, questionCameraInput);
    const answerPhoto = selectedPhoto(answerFileInput, answerCameraInput);
    const photos = [questionPhoto, answerPhoto].filter(Boolean);

    for (const photo of photos) {
      if (!photo.type.startsWith("image/")) {
        alert("사진 파일만 첨부해 주세요.");
        return;
      }

      if (photo.size > 10 * 1024 * 1024) {
        alert("사진은 한 장당 10MB 이하로 첨부해 주세요.");
        return;
      }
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    const uploadedPaths = [];

    try {
      async function uploadPhoto(photo) {
        if (!photo) return null;

        const extension = photo.name.includes(".")
          ? photo.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "")
          : "jpg";

        const path =
          data.session.user.id + "/" +
          crypto.randomUUID() + "." + (extension || "jpg");

        const { error } = await window.supabaseClient.storage
          .from("mistake_images")
          .upload(path, photo, {
            contentType: photo.type,
            upsert: false
          });

        if (error) throw error;

        uploadedPaths.push(path);
        return path;
      }

      const questionImagePath = await uploadPhoto(questionPhoto);
      const answerImagePath = await uploadPhoto(answerPhoto);
      const mistake = Object.fromEntries(new FormData(form).entries());

      const { error } = await window.supabaseClient
        .from("mistakes")
        .insert({
          subject: mistake.subject,
          unit: mistake.unit,
          concept: mistake.concept,
          mistake_type: mistake.mistakeType,
          difficulty: mistake.difficulty,
          reason: mistake.reason,
          book: mistake.book || null,
          page: mistake.page || null,
          question_number: mistake.questionNumber || null,
          exam: mistake.exam || null,
          memo: mistake.memo || null,
          mistake_date: mistake.mistakeDate || null,
          question_image_path: questionImagePath,
          answer_image_path: answerImagePath
        });

      if (error) throw error;

      window.location.href = "mistakes.html";
    } catch (error) {
      // 오답 저장에 실패하면 방금 올린 사진도 정리
      if (uploadedPaths.length > 0) {
        await window.supabaseClient.storage
          .from("mistake_images")
          .remove(uploadedPaths);
      }

      alert("오답 저장 실패: " + error.message);
    } finally {
      submitButton.disabled = false;
    }
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
      details.open = true;
      const summary = document.createElement("summary");

      summary.textContent =
        (mistake.mistakeDate || "날짜 미기록") + " · " +
        mistake.subject + " · " +
        mistake.concept + " · " +
        mistake.mistakeType;

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
      .reduce(function (sum, count) {
        return sum + count;
      }, 0);

    const subjects = Array.from(subjectCounts.entries())
      .sort(function (a, b) {
        return b[1] - a[1];
      });

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
        .sort(function (a, b) {
          return b[1] - a[1];
        })
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
