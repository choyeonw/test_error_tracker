const migrateButton = document.getElementById("migrate-button");
const migrateStatus = document.getElementById("migrate-status");

migrateButton.addEventListener("click", async function () {
  const browserOnly = allMistakes.filter(
    mistake => mistake.source === "browser"
  );

  if (browserOnly.length === 0) {
    migrateStatus.textContent = "옮길 이전 오답이 없습니다.";
    return;
  }

  const proceed = confirm(
    `이 브라우저에만 저장된 오답 ${browserOnly.length}건을 Supabase로 옮길까요?`
  );
  if (!proceed) return;

  migrateButton.disabled = true;
  migrateStatus.textContent = "오답을 옮기는 중입니다...";

  const rows = browserOnly.map(mistake => ({
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
    mistake_date: mistake.mistakeDate || null
  }));

  try {
    const { error } = await window.supabaseClient
      .from("mistakes")
      .insert(rows);

    if (error) {
      migrateStatus.textContent = "옮기기 실패: " + error.message;
      return;
    }

    await loadMistakes();

    const remaining = allMistakes.filter(
      mistake => mistake.source === "browser"
    ).length;

    migrateStatus.textContent = remaining === 0
      ? `${browserOnly.length}건을 Supabase로 옮겼습니다.`
      : `${browserOnly.length}건을 옮겼지만, 아직 이전 오답 ${remaining}건이 남아 있습니다.`;
  } catch (error) {
    migrateStatus.textContent = "옮기는 중 오류가 났습니다.";
  } finally {
    migrateButton.disabled = false;
  }
});
