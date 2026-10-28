const client = window.supabaseClient;
const subjectShare = document.getElementById("subject-share");
const subjectSelect = document.getElementById("subject-select");
const ranking = document.getElementById("concept-ranking");

async function loadAnalysis() {
  subjectShare.textContent = "분석 결과를 불러오는 중입니다...";

  try {
    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError || !authData.user) {
      subjectShare.textContent = "분석을 보려면 먼저 로그인해 주세요.";
      subjectSelect.disabled = true;
      return;
    }

    const { data: mistakes, error } = await client
      .from("mistakes")
      .select("subject, concept");

    if (error) {
      subjectShare.textContent =
        "분석 결과를 불러오지 못했습니다: " + error.message;
      return;
    }

    subjectShare.replaceChildren();
    subjectSelect.replaceChildren();
    ranking.replaceChildren();

    if (mistakes.length === 0) {
      subjectShare.textContent = "등록된 오답이 없습니다.";
      subjectSelect.disabled = true;
      return;
    }

    const subjectCounts = new Map();

    mistakes.forEach(mistake => {
      const subject = (mistake.subject || "").trim();
      if (subject) {
        subjectCounts.set(
          subject,
          (subjectCounts.get(subject) || 0) + 1
        );
      }
    });

    const subjects = Array.from(subjectCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    const total = mistakes.length;

    subjects.forEach(([subject, count]) => {
      const percent = Math.round(count / total * 100);

      const row = document.createElement("p");
      row.textContent =
        subject + ": " + count + "건 (" + percent + "%)";

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

      mistakes.forEach(mistake => {
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
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      concepts.forEach(([concept, count], index) => {
        const item = document.createElement("li");
        item.textContent = concept + " — " + count + "회";
        item.className = index < 4 ? "rank-high" : "rank-low";
        ranking.appendChild(item);
      });
    }

    subjectSelect.disabled = false;
    subjectSelect.addEventListener("change", showRanking);
    showRanking();
  } catch (error) {
    subjectShare.textContent = "분석 중 오류가 났습니다.";
  }
}

loadAnalysis();
