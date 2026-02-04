const versionEl = document.getElementById("version");
const statusEl = document.getElementById("status");

async function init() {
  const version = await window.demo.getVersion();
  versionEl.textContent = version;
}

function bindButtons() {
  document.querySelectorAll("button[data-version]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = button.getAttribute("data-version");
      statusEl.textContent = `开始更新到 ${target}，即将退出...`;
      await window.demo.updateTo(target);
    });
  });
}

init();
bindButtons();
