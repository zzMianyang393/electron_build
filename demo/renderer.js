async function loadVersion() {
  const version = await window.demoApi.getVersion();
  document.querySelector("#version").textContent = version;
}

function bindButtons() {
  document.querySelectorAll("[data-version]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      await window.demoApi.updateTo(button.dataset.version);
    });
  });
}

loadVersion();
bindButtons();
