// ============================================================
//  Digital Cleanup Day — Logique complète avec Google Sheets
// ============================================================

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyXNApqKuItrVAOtxeB-W05rjiIW8Slk3cmREJsVBXxrq4oFJi01JpaOJMea52c3DFB/exec";

let collectedData = {};

// ============================================================
// NAVIGATION
// ============================================================

function goToStep2() {
  const personneattainte = document
    .getElementById("personneattainte")
    .value.trim();
  const cleanupId = document.getElementById("cleanupId").value.trim();
  const organizer = document.getElementById("organizer").value.trim();
  const structureType = document.getElementById("structureType").value;
  const region = document.getElementById("region").value;
  const eventDate = document.getElementById("eventDate").value;
  const selected = document.querySelectorAll(
    'input[name="actionType"]:checked',
  );

  // ===== VALIDATIONS =====
  if (!personneattainte) {
    alert("⚠️ Veuillez renseigner le nombre de personnes touchées (Q1).");
    return;
  }
  if (!cleanupId) {
    alert("⚠️ Veuillez renseigner le numéro du Digital Cleanup (Q2).");
    return;
  }
  if (!organizer) {
    alert("⚠️ Veuillez renseigner l'organisateur (Q3).");
    return;
  }
  if (!structureType) {
    alert("⚠️ Veuillez sélectionner un type de structure (Q4).");
    return;
  }
  if (!region) {
    alert("⚠️ Veuillez sélectionner une région (Q5).");
    return;
  }
  if (!eventDate) {
    alert("⚠️ Veuillez renseigner la date de l'événement (Q7).");
    return;
  }
  if (selected.length === 0) {
    alert("⚠️ Veuillez sélectionner au moins un type d'action.");
    return;
  }

  // Afficher uniquement les formulaires sélectionnés
  document
    .querySelectorAll(".action-form")
    .forEach((f) => f.classList.add("hidden"));
  selected.forEach((action) => {
    const el = document.getElementById("form-" + action.value);
    if (el) el.classList.remove("hidden");
  });

  showStep(2);
}

function goToStep1() {
  showStep(1);
}

function showStep(n) {
  document
    .querySelectorAll(".form-step")
    .forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".progress-step").forEach((s) => {
    s.classList.remove("active", "done");
  });
  document
    .querySelectorAll(".progress-line")
    .forEach((l) => l.classList.remove("done"));

  document.getElementById("step-" + n).classList.add("active");
  document.getElementById("step-indicator-" + n).classList.add("active");

  for (let i = 1; i < n; i++) {
    document.getElementById("step-indicator-" + i).classList.add("done");
    const lines = document.querySelectorAll(".progress-line");
    if (lines[i - 1]) lines[i - 1].classList.add("done");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// SOUMISSION
// ============================================================

async function submitForm() {
  // ===== RÉCUPÉRATION DE TOUS LES CHAMPS =====
  const personneattainte =
    parseInt(document.getElementById("personneattainte")?.value, 10) || 0;

  const cleanupId = document.getElementById("cleanupId")?.value.trim() || "";
  const organizer = document.getElementById("organizer")?.value.trim() || "";
  const structureType = document.getElementById("structureType")?.value || "";
  const region = document.getElementById("region")?.value || "";
  const departement =
    document.getElementById("departement")?.value.trim() || "";
  const eventDate = document.getElementById("eventDate")?.value || "";

  const selectedActions = Array.from(
    document.querySelectorAll('input[name="actionType"]:checked'),
  ).map((el) => el.value);

  // ===== CONSTRUCTION DU JSON =====
  collectedData = {
    metadata: {
      dateSubmission: new Date().toISOString(),
      eventDate,
      cleanupId,
      organizer,
      structureType,
      region,
      departement,
      personneattainte,
      actionsRealisees: selectedActions,
    },
    sensibilisation: null,
    reemploi: null,
    donnees: null,
    recyclage: null,
  };

  // ===== SENSIBILISATION =====
  if (selectedActions.includes("sensibilisation")) {
    collectedData.sensibilisation = {
      webinaire: {
        participants: getInt("s_webinaire_participants"),
        audience: getInt("s_webinaire_audience"),
      },
      fresqueNumerique: {
        participants: getInt("s_fresque_participants"),
        audience: getInt("s_fresque_audience"),
      },
      jeuxNumeville: {
        participants: getInt("s_numeville_participants"),
        audience: getInt("s_numeville_audience"),
      },
      jeuxDowino: {
        participants: getInt("s_dowino_participants"),
        audience: getInt("s_dowino_audience"),
      },
      jeuxTheWokies: {
        participants: getInt("s_wokies_participants"),
        audience: getInt("s_wokies_audience"),
      },
      autreFormat: {
        label: document.getElementById("s_autre_label")?.value.trim() || null,
        participants: getInt("s_autre_participants"),
        audience: getInt("s_autre_audience"),
      },
    };
  }

  // ===== RÉEMPLOI =====
  if (selectedActions.includes("reemploi")) {
    collectedData.reemploi = {
      ordinateurFixe: buildReemploi("r_fixe"),
      ecran: buildReemploi("r_ecran"),
      ordinateurPortable: buildReemploi("r_portable"),
      tablette: buildReemploi("r_tablette"),
      smartphone: buildReemploi("r_smartphone"),
    };
  }

  // ===== DONNÉES =====
  if (selectedActions.includes("donnees")) {
    collectedData.donnees = {
      fichiersSupprimes: {
        emails: getInt("d_emails"),
        postsSociaux: getInt("d_posts"),
        cloud: getInt("d_cloud_files"),
        local: getInt("d_local_files"),
      },
      applicationsDesinstallees: getInt("d_apps"),
      goRecuperes: {
        cloud: getFloat("d_go_cloud"),
        local: getFloat("d_go_local"),
      },
    };
  }

  // ===== RECYCLAGE =====
  if (selectedActions.includes("recyclage")) {
    collectedData.recyclage = {
      ordinateurFixe: buildRecyclage("rec_fixe"),
      ecran: buildRecyclage("rec_ecran"),
      ordinateurPortable: buildRecyclage("rec_portable"),
      tablette: buildRecyclage("rec_tablette"),
      smartphone: buildRecyclage("rec_smartphone"),
      divers: buildRecyclage("rec_divers"),
    };
  }

  // ===== AFFICHAGE JSON =====
  document.getElementById("json-output").textContent = JSON.stringify(
    collectedData,
    null,
    2,
  );

  // ===== BADGES =====
  renderSummaryBadges(selectedActions);

  // ===== SAUVEGARDE LOCALE =====
  saveToLocalStorage(collectedData);

  // ===== ENVOI GOOGLE SHEETS =====
  await sendToGoogleSheets(collectedData);

  showStep(3);
}

// ============================================================
// ENVOI GOOGLE SHEETS
// ============================================================

async function sendToGoogleSheets(data) {
  showLoader(true);
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json.success === false) {
      throw new Error(json.message || "Erreur serveur");
    }
    showNotification(
      "✅ Données envoyées avec succès dans Google Sheets !",
      "success",
    );
  } catch (error) {
    console.error("Erreur Google Sheets :", error);
    showNotification(
      "⚠️ Envoi échoué. Vérifiez votre connexion et réessayez.",
      "warning",
    );
  } finally {
    showLoader(false);
  }
}

// ============================================================
// BADGES DE RÉSUMÉ
// ============================================================

function renderSummaryBadges(actions) {
  const container = document.getElementById("summary-badges");
  while (container.firstChild) container.removeChild(container.firstChild);

  const config = {
    sensibilisation: {
      icon: "🎓",
      label: "Sensibilisation",
      cls: "badge-green",
    },
    reemploi: { icon: "♻️", label: "Réemploi", cls: "badge-blue" },
    donnees: { icon: "🗂️", label: "Données", cls: "badge-purple" },
    recyclage: { icon: "🔋", label: "Recyclage", cls: "badge-orange" },
  };

  actions.forEach((action) => {
    const c = config[action];
    if (!c) return;
    const badge = document.createElement("span");
    badge.className = "badge " + c.cls;
    badge.textContent = c.icon + " " + c.label;
    container.appendChild(badge);
  });
}

// ============================================================
// NOTIFICATION
// ============================================================

function showNotification(message, type) {
  const existing = document.getElementById("notification-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "notification-banner";
  banner.className = "notification " + type;
  banner.textContent = message;

  const step3 = document.getElementById("step-3");
  step3.insertBefore(banner, step3.firstChild);

  setTimeout(() => {
    if (banner.parentNode) banner.remove();
  }, 7000);
}

// ============================================================
// LOADER
// ============================================================

function showLoader(visible) {
  document.getElementById("loader-overlay").style.display = visible
    ? "flex"
    : "none";
}

// ============================================================
// UTILITAIRES
// ============================================================

function getInt(id) {
  const val = parseInt(document.getElementById(id)?.value, 10);
  return isNaN(val) ? 0 : Math.max(0, val);
}

function getFloat(id) {
  const val = parseFloat(document.getElementById(id)?.value);
  return isNaN(val) ? 0 : Math.max(0, val);
}

function buildReemploi(prefix) {
  return {
    don: getInt(prefix + "_don"),
    reparation: getInt(prefix + "_reparation"),
    protection: getInt(prefix + "_protection"),
    reutilisation: getInt(prefix + "_reutilisation"),
  };
}

function buildRecyclage(prefix) {
  return {
    quantite: getInt(prefix + "_qte"),
    poidsKg: getFloat(prefix + "_poids"),
  };
}

// ============================================================
// LOCALSTORAGE
// ============================================================

function saveToLocalStorage(data) {
  try {
    const history = JSON.parse(
      localStorage.getItem("digitalCleanupData") || "[]",
    );
    history.push(data);
    localStorage.setItem("digitalCleanupData", JSON.stringify(history));
    console.log(
      "💾 Sauvegardé localement. Total :",
      history.length,
      "entrée(s).",
    );
  } catch (e) {
    console.warn("Impossible de sauvegarder dans localStorage :", e);
  }
}

// ============================================================
// TÉLÉCHARGEMENT JSON
// ============================================================

function downloadJSON() {
  const blob = new Blob([JSON.stringify(collectedData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `digital-cleanup-${collectedData.metadata?.cleanupId || "data"}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// RÉINITIALISATION
// ============================================================

function resetForm() {
  // Textes et nombres
  document
    .querySelectorAll('input[type="text"], input[type="number"]')
    .forEach((el) => (el.value = ""));

  // Dates
  document
    .querySelectorAll('input[type="date"]')
    .forEach((el) => (el.value = ""));

  // Selects
  document.querySelectorAll("select").forEach((el) => (el.selectedIndex = 0));

  // Radios et checkboxes
  document
    .querySelectorAll('input[type="radio"], input[type="checkbox"]')
    .forEach((el) => (el.checked = false));

  // Formulaires d'action
  document
    .querySelectorAll(".action-form")
    .forEach((f) => f.classList.add("hidden"));

  // Notification
  const banner = document.getElementById("notification-banner");
  if (banner) banner.remove();

  collectedData = {};
  showStep(1);
}
