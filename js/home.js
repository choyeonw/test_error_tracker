const authArea = document.getElementById("auth-area");
const client = window.supabaseClient;

function createLogoutButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "로그아웃";

  button.addEventListener("click", async () => {
    button.disabled = true;
    const { error } = await client.auth.signOut({ scope: "local" });

    if (error) {
      alert("로그아웃에 실패했어요. 다시 시도해 주세요.");
      button.disabled = false;
      return;
    }

    await showAuthState();
  });

  return button;
}

async function showAuthState() {
  const { data, error } = await client.auth.getUser();
  authArea.replaceChildren();

  if (error || !data.user) {
    const loginLink = document.createElement("a");
    loginLink.href = "login.html";
    loginLink.textContent = "로그인";
    authArea.appendChild(loginLink);
    return;
  }

  const displayName =
    String(data.user.user_metadata?.display_name || "").trim();

  if (displayName) {
    const nameText = document.createElement("span");
    nameText.textContent = displayName + "님";

    authArea.append(nameText, createLogoutButton());
    return;
  }

  // 예전에 가입한 계정은 표시 이름이 없으므로 여기에서 한 번 설정합니다.
  const nameForm = document.createElement("form");
  nameForm.style.display = "inline-flex";
  nameForm.style.gap = "8px";
  nameForm.style.marginRight = "8px";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 20;
  nameInput.required = true;
  nameInput.placeholder = "표시할 이름";
  nameInput.setAttribute("aria-label", "화면에 표시할 이름");

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "이름 저장";

  nameForm.append(nameInput, saveButton);

  nameForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }

    saveButton.disabled = true;
    const { error } = await client.auth.updateUser({
      data: { display_name: name }
    });

    if (error) {
      alert("이름 저장 실패: " + error.message);
      saveButton.disabled = false;
      return;
    }

    await showAuthState();
  });

  authArea.append(nameForm, createLogoutButton());
}

showAuthState();
