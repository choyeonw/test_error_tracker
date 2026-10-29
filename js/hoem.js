const authArea = document.getElementById("auth-area");
const client = window.supabaseClient;

async function showAuthState() {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    authArea.innerHTML = '<a href="login.html">로그인</a>';
    return;
  }

  authArea.innerHTML = `
    <span>로그인됨</span>
    <button type="button" id="logout-button">로그아웃</button>
  `;

  document.getElementById("logout-button").addEventListener("click", async () => {
    const { error } = await client.auth.signOut({ scope: "local" });

    if (error) {
      alert("로그아웃에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    await showAuthState();
  });
}

showAuthState();
