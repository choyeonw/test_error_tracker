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

const photoControls = {
  question: {
    file: form.elements.namedItem("questionImageFile"),
    camera: form.elements.namedItem("questionImageCamera"),
    remove: form.elements.namedItem("removeQuestionImage"),
    preview: document.getElementById("question-preview")
  },
  answer: {
    file: form.elements.namedItem("answerImageFile"),
    camera: form.elements.namedItem("answerImageCamera"),
    remove: form.elements.namedItem("removeAnswerImage"),
    preview: document.getElementById("answer-preview")
  }
};

let original = null;

function mistakeKey(mistake) {
  return JSON.stringify(
    fieldNames.map(name => String(mistake[name] ?? ""))
  );
}

function setUpPhotoControls(controls) {
  controls.file.addEventListener("change", () => {
    if (controls.file.files.length > 0) {
      controls.camera.value = "";
      controls.remove.checked = false;
    }
  });

  controls.camera.addEventListener("change", () => {
    if (controls.camera.files.length > 0) {
      controls.file.value = "";
      controls.remove.checked = false;
    }
  });

  controls.remove.addEventListener("change", () => {
    if (controls.remove.checked) {
      controls.file.value = "";
      controls.camera.value = "";
    }
  });
}

setUpPhotoControls(photoControls.question);
setUpPhotoControls(photoControls.answer);

function selectedPhoto(controls) {
  return controls.file.files[0] || controls.camera.files[0] || null;
}

async function showCurrentPhoto(controls, path, label) {
  controls.preview.replaceChildren();
  controls.remove.disabled = !path;

  if (!path) {
    controls.preview.textContent = "현재 등록된 사진이 없습니다.";
    return;
  }

  const { data, error } = await client.storage
    .from("mistake_images")
    .createSignedUrl(path, 3600);

  if (error) {
    controls.preview.textContent = "현재 사진을 불러오지 못했습니다.";
    return;
  }

  const image = document.createElement("img");
  image.src = data.signedUrl;
  image.alt = label;
  image.style.display = "block";
  image.style.maxWidth = "100%";
  image.style.height = "auto";

  controls.preview.appendChild(image);
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
    reason: row.reason || "",
    book: row.book || "",
    page: row.page || "",
    questionNumber: row.question_number || "",
    exam: row.exam || "",
    memo: row.memo || "",
    questionImagePath: row.question_image_path || null,
    answerImagePath: row.answer_image_path || null
  };

  fieldNames.forEach(name => {
    form.elements.namedItem(name).value = original[name];
  });

  await Promise.all([
    showCurrentPhoto(
      photoControls.question,
      original.questionImagePath,
      "현재 문제 사진"
    ),
    showCurrentPhoto(
      photoControls.answer,
      original.answerImagePath,
      "현재 답안지 사진"
    )
  ]);

  saveButton.disabled = false;
  message.textContent = "내용과 사진을 수정한 뒤 저장하세요.";
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!original) return;

  const { data: authData, error: authError } =
    await client.auth.getUser();

  if (authError || !authData.user) {
    message.textContent = "다시 로그인한 뒤 수정해 주세요.";
    return;
  }

  const questionPhoto = selectedPhoto(photoControls.question);
  const answerPhoto = selectedPhoto(photoControls.answer);
  const photos = [questionPhoto, answerPhoto].filter(Boolean);

  for (const photo of photos) {
    if (!photo.type.startsWith("image/")) {
      message.textContent = "사진 파일만 첨부해 주세요.";
      return;
    }

    if (photo.size > 10 * 1024 * 1024) {
      message.textContent = "사진은 한 장당 10MB 이하로 첨부해 주세요.";
      return;
    }
  }

  saveButton.disabled = true;
  message.textContent = "수정 내용을 저장하는 중입니다...";
  const uploadedPaths = [];

  try {
    async function uploadPhoto(photo) {
      if (!photo) return null;

      const extension = photo.name.includes(".")
        ? photo.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "")
        : "jpg";

      const path =
        authData.user.id + "/" +
        crypto.randomUUID() + "." + (extension || "jpg");

      const { error } = await client.storage
        .from("mistake_images")
        .upload(path, photo, {
          contentType: photo.type,
          upsert: false
        });

      if (error) throw error;

      uploadedPaths.push(path);
      return path;
    }

    let questionImagePath = original.questionImagePath;
    let answerImagePath = original.answerImagePath;

    if (questionPhoto) {
      questionImagePath = await uploadPhoto(questionPhoto);
    } else if (photoControls.question.remove.checked) {
      questionImagePath = null;
    }

    if (answerPhoto) {
      answerImagePath = await uploadPhoto(answerPhoto);
    } else if (photoControls.answer.remove.checked) {
      answerImagePath = null;
    }

    const changed = Object.fromEntries(
      fieldNames.map(name => [
        name,
        form.elements.namedItem(name).value
      ])
    );

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
        memo: changed.memo || null,
        question_image_path: questionImagePath,
        answer_image_path: answerImagePath
      })
      .eq("id", id)
      .select("id");

    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || "오답을 찾을 수 없습니다.");
    }

    // 기존 사진을 교체하거나 삭제했다면 이전 파일을 정리합니다.
    const oldPaths = [];

    if (
      original.questionImagePath &&
      original.questionImagePath !== questionImagePath
    ) {
      oldPaths.push(original.questionImagePath);
    }

    if (
      original.answerImagePath &&
      original.answerImagePath !== answerImagePath
    ) {
      oldPaths.push(original.answerImagePath);
    }

    if (oldPaths.length > 0) {
      const { error: removeError } = await client.storage
        .from("mistake_images")
        .remove(oldPaths);

      if (removeError) {
        console.error("이전 사진 정리 실패:", removeError);
      }
    }

    // 예전 브라우저 복사본이 있으면 글자 정보도 맞춥니다.
    try {
      const browserRecords =
        JSON.parse(localStorage.getItem("mistakes") || "[]");

      const index = browserRecords.findIndex(
        record => mistakeKey(record) === mistakeKey(original)
      );

      if (index !== -1) {
        browserRecords[index] = {
          ...browserRecords[index],
          ...changed
        };
        localStorage.setItem("mistakes", JSON.stringify(browserRecords));
      }
    } catch (localError) {
      console.error("브라우저의 이전 기록 정리 실패:", localError);
    }

    window.location.href = "mistakes.html";
  } catch (error) {
    // 데이터 저장에 실패했다면 이번 수정에서 새로 올린 사진을 정리합니다.
    if (uploadedPaths.length > 0) {
      await client.storage
        .from("mistake_images")
        .remove(uploadedPaths);
    }

    message.textContent = "저장 실패: " + error.message;
    saveButton.disabled = false;
  }
});

loadForEditing();
