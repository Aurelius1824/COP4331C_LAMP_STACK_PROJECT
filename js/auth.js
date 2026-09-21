/* Contact Manager — Group 36
   Handles login and signup against the PHP API.
   Pages are served from the same droplet as /api, so relative URLs work.
   If you ever host the frontend elsewhere, change API_BASE to the full
   origin (e.g. "https://contact.soramimicake.me") and add CORS headers
   to the PHP endpoints. */

const API_BASE = "";

/* ---------- small helpers ---------- */

function showMessage(text, kind) {
  const box = document.getElementById("message");
  if (!box) return;
  box.textContent = text;
  box.className = kind === "ok" ? "message message--ok" : "message";
  box.hidden = false;
}

function clearMessage() {
  const box = document.getElementById("message");
  if (box) box.hidden = true;
}

function setBusy(button, busy, busyLabel) {
  button.disabled = busy;
  if (busy) {
    button.dataset.idleLabel = button.textContent;
    button.textContent = busyLabel;
  } else if (button.dataset.idleLabel) {
    button.textContent = button.dataset.idleLabel;
  }
}

/* Send JSON, always come back with { status, body } so callers can
   branch on the HTTP status code rather than guessing from the body. */
async function postJson(path, payload) {
  const response = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let body = {};
  try {
    body = await response.json();
  } catch (err) {
    // Non-JSON response (usually a PHP fatal error printed as HTML)
    body = { error: "The server sent an unreadable response." };
  }

  return { status: response.status, body: body };
}

function saveSession(user) {
  localStorage.setItem("userId", String(user.id));
  localStorage.setItem("firstName", user.firstName || "");
  localStorage.setItem("lastName", user.lastName || "");
}

/* ---------- login ---------- */

async function handleLogin(event) {
  event.preventDefault();
  clearMessage();

  const button = document.getElementById("submit");
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    showMessage("Enter your username and password.");
    return;
  }

  setBusy(button, true, "Signing in\u2026");

  try {
    const res = await postJson("/api/login.php", {
      username: username,
      password: password
    });

    if (res.status === 200) {
      saveSession(res.body);
      window.location.href = "contacts.html";
      return;
    }

    if (res.status === 401) {
      showMessage("That username and password don't match. Try again.");
    } else {
      showMessage(res.body.error || "Sign in failed. Try again in a moment.");
    }
  } catch (err) {
    showMessage("Can't reach the server. Check your connection and try again.");
  }

  setBusy(button, false);
}

/* ---------- signup ---------- */

async function handleSignup(event) {
  event.preventDefault();
  clearMessage();

  const button = document.getElementById("submit");
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (!firstName || !lastName || !username || !password) {
    showMessage("Fill in every field to create your account.");
    return;
  }

  // The API rejects anything shorter, so catch it here first.
  if (password.length < 8) {
    showMessage("Your password needs at least 8 characters.");
    return;
  }

  if (password !== confirm) {
    showMessage("The two passwords don't match.");
    return;
  }

  setBusy(button, true, "Creating account\u2026");

  try {
    const res = await postJson("/api/create_user.php", {
      firstName: firstName,
      lastName: lastName,
      username: username,
      password: password
    });

    if (res.status === 201) {
      sessionStorage.setItem("signupUsername", username);
      window.location.href = "login.html?created=1";
      return;
    }

    if (res.status === 409) {
      showMessage("That username is taken. Pick another one.");
    } else {
      showMessage(res.body.error || "Couldn't create the account. Try again.");
    }
  } catch (err) {
    showMessage("Can't reach the server. Check your connection and try again.");
  }

  setBusy(button, false);
}

/* ---------- wire up whichever form is on the page ---------- */

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);

    // Arriving here straight after signing up
    if (new URLSearchParams(window.location.search).has("created")) {
      showMessage("Account created. Sign in to get started.", "ok");
      const carried = sessionStorage.getItem("signupUsername");
      if (carried) {
        document.getElementById("username").value = carried;
        sessionStorage.removeItem("signupUsername");
        document.getElementById("password").focus();
      }
    }
  }

  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }
});
