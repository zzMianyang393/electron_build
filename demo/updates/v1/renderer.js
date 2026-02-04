async function hydrate() {
  const version = await window.demoApi.getVersion();
  const versionNode = document.querySelector("#version");
  if (versionNode) {
    versionNode.textContent = version;
  }
}

function bindButtons() {
  document.querySelectorAll("[data-version]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      await window.demoApi.updateTo(button.dataset.version);
    });
  });
}

hydrate();
bindButtons();
