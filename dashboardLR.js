// ============================================================
//  Dashboard LR — Digital Cleanup Day
//  Filtré sur les 10 DCD suivis (IDs spécifiques)
// ============================================================

// ===== IDs DES DCD SUIVIS =====
const LR_IDS = [115472, 115343, 115120, 115118, 115117, 115116, 114329, 113647, 112665, 112223];

// ===== FACTEURS CO₂ (méthodologie ADEME / Shift Project) =====
const CO2 = {
  GO_CLOUD: 209.5,
  GO_LOCAL: 3.2,
  EMAIL: 0.3,
  FICHIER_CLOUD: 8.0,
  FICHIER_LOCAL: 2.0,
  APP: 1.46,
  SMARTPHONE: 30000,
  PORTABLE: 156000,
  FIXE: 175000,
  ECRAN: 80000,
  TABLETTE: 63000,
  DEEE_KG: 2500,
};

const REEMPLOI_FACTOR = {
  Smartphone: CO2.SMARTPHONE,
  "Ordinateur portable": CO2.PORTABLE,
  "Ordinateur fixe": CO2.FIXE,
  "Écran": CO2.ECRAN,
  Tablette: CO2.TABLETTE,
};

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyXNApqKuItrVAOtxeB-W05rjiIW8Slk3cmREJsVBXxrq4oFJi01JpaOJMea52c3DFB/exec";

// ============================================================
// CHARGEMENT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  renderBadges();
  loadDashboard();
});

function renderBadges() {
  const container = document.getElementById("lr-badges-container");
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);
  LR_IDS.forEach((id) => {
    const badge = document.createElement("span");
    badge.className = "badge badge-blue";
    badge.style.cssText = "font-size:12px;padding:4px 10px;border-radius:12px;background:#dbeafe;color:#1e40af;font-weight:600";
    badge.textContent = "#" + id;
    container.appendChild(badge);
  });
  setText("lr-nb-dcd-suivis", LR_IDS.length + " DCD");
}

async function loadDashboard() {
  showLoader(true);
  try {
    const raw = await fetchRawData();
    const filtered = filterByLRIds(raw);
    renderFromDataJson(filtered);
    showLoader(false);
  } catch (err) {
    showLoader(false);
    showError(err.message);
  }
}

async function fetchRawData() {
  try {
    const resp = await fetch(APPS_SCRIPT_URL + "?action=getRawData");
    if (resp.ok) {
      const json = await resp.json();
      if (json && Array.isArray(json.general) && Array.isArray(json.donnees)) {
        console.log("Données brutes chargées depuis Google Sheets (live)");
        return json;
      }
    }
  } catch (e) {
    console.warn("getRawData indisponible", e);
  }

  const resp = await fetch("data.json");
  if (!resp.ok)
    throw new Error("Impossible de charger les données (ni Apps Script, ni data.json)");
  console.log("Données chargées depuis data.json (export statique)");
  return resp.json();
}

function filterByLRIds(data) {
  const idSet = new Set(LR_IDS.map(String));

  function matchId(e) {
    return idSet.has(String(e.cleanup_id));
  }

  return {
    exportDate: data.exportDate,
    general: (data.general || []).filter(matchId),
    sensibilisation: (data.sensibilisation || []).filter(matchId),
    donnees: (data.donnees || []).filter(matchId),
    reemploi: (data.reemploi || []).filter(matchId),
    recyclage: (data.recyclage || []).filter(matchId),
  };
}

// ============================================================
// RENDU PRINCIPAL
// ============================================================

function renderFromDataJson(d) {
  renderKPIs(d);
  renderSensibilisation(d);
  renderCO2(d);
  renderTopCleaners(d);
  renderCharts(d);
  setText("last-update-date", d.exportDate || new Date().toLocaleDateString("fr-FR"));
}

// ============================================================
// KPIs VUE D'ENSEMBLE
// ============================================================

function renderKPIs(d) {
  const totalDCD = d.general.length;
  setText("kpi-total-dcd", fmt(totalDCD));

  const participants = d.sensibilisation.reduce(
    (s, e) => s + (e.participants_reels || 0), 0
  );
  setText("kpi-participants", fmt(participants));

  const audience = d.sensibilisation.reduce(
    (s, e) => s + (e.audience_touchee || 0), 0
  );
  setText("kpi-audience", fmt(audience));

  const reemploiTotal = d.reemploi.reduce(
    (s, e) =>
      s + (e.don || 0) + (e.reparation || 0) + (e.protection || 0) + (e.reutilisation || 0),
    0
  );
  setText("kpi-reemploi", fmt(reemploiTotal));

  const emails = d.donnees.reduce((s, e) => s + (e.emails || 0), 0);
  const fCloud = d.donnees.reduce((s, e) => s + (e.fichiers_cloud || 0), 0);
  const fLocal = d.donnees.reduce((s, e) => s + (e.fichiers_local || 0), 0);
  const apps = d.donnees.reduce((s, e) => s + (e.apps || 0), 0);
  const goCloud = d.donnees.reduce((s, e) => s + (e.go_cloud || 0), 0);
  const goLocal = d.donnees.reduce((s, e) => s + (e.go_local || 0), 0);

  setText("kpi-emails", fmt(emails));
  setText("kpi-fichiers-cloud", fmt(fCloud));
  setText("kpi-fichiers-local", fmt(fLocal));
  setText("kpi-apps", fmt(apps));
  setText("kpi-go-cloud", fmtGo(goCloud));
  setText("kpi-go-local", fmtGo(goLocal));

  const reemploiByType = {};
  d.reemploi.forEach((e) => {
    const t = e.type_equipement || "Autre";
    const n = (e.don || 0) + (e.reparation || 0) + (e.protection || 0) + (e.reutilisation || 0);
    reemploiByType[t] = (reemploiByType[t] || 0) + n;
  });
  setText("kpi-smartphones", fmt(reemploiByType["Smartphone"] || 0));
  setText("kpi-portables", fmt(reemploiByType["Ordinateur portable"] || 0));
  setText("kpi-fixes", fmt(reemploiByType["Ordinateur fixe"] || 0));
  setText("kpi-ecrans", fmt(reemploiByType["Écran"] || 0));

  const poidsTotal = d.recyclage.reduce((s, e) => s + (e.poids_kg || 0), 0);
  setText("kpi-poids-total", fmtDec(poidsTotal / 1000) + " t");
  setText("kpi-recycle", fmt(Math.round(poidsTotal * 0.76)) + " kg");
  setText("kpi-valorise", fmt(Math.round(poidsTotal * 0.12)) + " kg");
  setText("kpi-reutilise", fmt(Math.round(poidsTotal * 0.01)) + " kg");
}

// ============================================================
// SENSIBILISATION
// ============================================================

function renderSensibilisation(d) {
  const s = d.sensibilisation || [];

  const totalParticipants = s.reduce((acc, e) => acc + (e.participants_reels || 0), 0);
  const totalAudience = s.reduce((acc, e) => acc + (e.audience_touchee || 0), 0);
  const totalSensi = totalParticipants + totalAudience;

  setText("kpi-participants-detail", fmt(totalParticipants));
  setText("kpi-audience-detail", fmt(totalAudience));
  setText("kpi-sensi-total", fmt(totalSensi) + " personnes");
  setText("kpi-sensi-sessions", fmt(s.length));

  function normalizeFormat(raw) {
    const str = (raw || "").toLowerCase();
    if (str.includes("webinaire")) return "Webinaires";
    if (str.includes("quizz") || str.includes("quiz")) return "Quizz";
    if (str.includes("fresque")) return "Fresques";
    if (
      str.includes("jeux") ||
      str.includes("jeu") ||
      str.includes("dowino") ||
      str.includes("wokies") ||
      str.includes("numéville") ||
      str.includes("numeville")
    )
      return "Jeux";
    return "Autre";
  }

  const byFormat = {
    Webinaires: { sessions: 0, participants: 0 },
    Fresques: { sessions: 0, participants: 0 },
    Jeux: { sessions: 0, participants: 0 },
    Quizz: { sessions: 0, participants: 0 },
    Autre: { sessions: 0, participants: 0 },
  };
  s.forEach((e) => {
    const f = normalizeFormat(e.type_sensibilisation);
    byFormat[f].sessions++;
    byFormat[f].participants += e.participants_reels || 0;
  });

  const formatsTbody = document.getElementById("sensi-formats-body");
  if (formatsTbody) {
    while (formatsTbody.firstChild) formatsTbody.removeChild(formatsTbody.firstChild);
    const sorted = Object.entries(byFormat)
      .filter(([, v]) => v.sessions > 0)
      .sort((a, b) => b[1].participants - a[1].participants);
    if (sorted.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 2;
      td.style.cssText = "text-align:center;color:var(--gray-500);font-style:italic";
      td.textContent = "Aucune donnée";
      tr.appendChild(td);
      formatsTbody.appendChild(tr);
    } else {
      sorted.forEach(([format, vals]) => {
        const tr = document.createElement("tr");
        [format, fmt(vals.sessions)].forEach((text, i) => {
          const td = document.createElement("td");
          td.textContent = text;
          if (i > 0) td.style.textAlign = "right";
          if (i === 0) td.style.fontWeight = "600";
          tr.appendChild(td);
        });
        formatsTbody.appendChild(tr);
      });
    }
  }

  const byOrg = {};
  s.forEach((e) => {
    const org = e.organisateur || "Inconnu";
    byOrg[org] = (byOrg[org] || 0) + (e.participants_reels || 0) + (e.audience_touchee || 0);
  });

  const topTbody = document.getElementById("sensi-top-body");
  if (topTbody) {
    while (topTbody.firstChild) topTbody.removeChild(topTbody.firstChild);
    const top5 = Object.entries(byOrg)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (top5.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.style.cssText = "text-align:center;color:var(--gray-500);font-style:italic";
      td.textContent = "Aucune donnée";
      tr.appendChild(td);
      topTbody.appendChild(tr);
    } else {
      const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
      top5.forEach(([org, total], i) => {
        const tr = document.createElement("tr");

        const tdRank = document.createElement("td");
        tdRank.style.fontWeight = "700";
        tdRank.textContent = i < 3 ? medals[i] : "#" + (i + 1);
        tr.appendChild(tdRank);

        const tdOrg = document.createElement("td");
        tdOrg.textContent = org;
        tr.appendChild(tdOrg);

        const tdVal = document.createElement("td");
        tdVal.style.fontWeight = "700";
        tdVal.style.color = "var(--pink)";
        tdVal.style.textAlign = "right";
        tdVal.textContent = fmt(total);
        tr.appendChild(tdVal);

        topTbody.appendChild(tr);
      });
    }
  }
}

// ============================================================
// CO₂
// ============================================================

function renderCO2(d) {
  const goCloud = d.donnees.reduce((s, e) => s + (e.go_cloud || 0), 0);
  const goLocal = d.donnees.reduce((s, e) => s + (e.go_local || 0), 0);
  const emails = d.donnees.reduce((s, e) => s + (e.emails || 0), 0);
  const posts = d.donnees.reduce((s, e) => s + (e.posts || 0), 0);
  const fCloud = d.donnees.reduce((s, e) => s + (e.fichiers_cloud || 0), 0);
  const fLocal = d.donnees.reduce((s, e) => s + (e.fichiers_local || 0), 0);
  const apps = d.donnees.reduce((s, e) => s + (e.apps || 0), 0);

  const co2GoCloud = goCloud * CO2.GO_CLOUD;
  const co2GoLocal = goLocal * CO2.GO_LOCAL;
  const co2Emails = emails * CO2.EMAIL;
  const co2Posts = posts * CO2.EMAIL;
  const co2FCloud = fCloud * CO2.FICHIER_CLOUD;
  const co2FLocal = fLocal * CO2.FICHIER_LOCAL;
  const co2Apps = apps * CO2.APP;
  const co2Donnees = co2GoCloud + co2GoLocal + co2Emails + co2Posts + co2FCloud + co2FLocal + co2Apps;

  setText("co2-go-cloud-kg", fmtCO2(co2GoCloud));
  setText("co2-go-local-kg", fmtCO2(co2GoLocal));
  setText("co2-emails-kg", fmtCO2(co2Emails));
  setText("co2-posts-kg", fmtCO2(co2Posts));
  setText("co2-fichiers-cloud-kg", fmtCO2(co2FCloud));
  setText("co2-fichiers-local-kg", fmtCO2(co2FLocal));
  setText("co2-apps-kg", fmtCO2(co2Apps));
  setText("co2-donnees-total", fmtCO2(co2Donnees));

  let co2Reemploi = 0;
  const co2ReemploiDetail = {};
  d.reemploi.forEach((e) => {
    const t = e.type_equipement || "Autre";
    const n = (e.don || 0) + (e.reparation || 0) + (e.protection || 0) + (e.reutilisation || 0);
    const factor = REEMPLOI_FACTOR[t] || 0;
    const co2 = n * factor;
    co2Reemploi += co2;
    co2ReemploiDetail[t] = (co2ReemploiDetail[t] || 0) + co2;
  });

  setText("co2-smartphones", fmtCO2(co2ReemploiDetail["Smartphone"] || 0));
  setText("co2-portables", fmtCO2(co2ReemploiDetail["Ordinateur portable"] || 0));
  setText("co2-fixes", fmtCO2(co2ReemploiDetail["Ordinateur fixe"] || 0));
  setText("co2-ecrans", fmtCO2(co2ReemploiDetail["Écran"] || 0));
  setText("co2-tablettes", fmtCO2(co2ReemploiDetail["Tablette"] || 0));
  setText("co2-reemploi-total", fmtCO2(co2Reemploi));

  const poidsTotal = d.recyclage.reduce((s, e) => s + (e.poids_kg || 0), 0);
  const poidsRecycle = poidsTotal * 0.76;
  const co2Recyclage = poidsRecycle * CO2.DEEE_KG;

  setText("co2-poids-recycle", fmt(Math.round(poidsRecycle)) + " kg");
  setText("co2-recyclage-kg", fmtCO2(co2Recyclage));
  setText("co2-recyclage-total", fmtCO2(co2Recyclage));

  const co2Total = co2Donnees + co2Reemploi + co2Recyclage;
  setText("co2-kg", fmtDec(co2Total / 1000000) + " t");
  setText("co2-go-source", fmtGo(goCloud) + " cloud + " + fmtGo(goLocal) + " local supprimés");

  const total = co2Total || 1;
  setBar("bar-donnees", (co2Donnees / total) * 100, "co2-donnees-pct");
  setBar("bar-reemploi", (co2Reemploi / total) * 100, "co2-reemploi-pct");
  setBar("bar-recyclage", (co2Recyclage / total) * 100, "co2-recyclage-pct");

  renderImpactWidget(co2Total / 1000);
}

function setBar(barId, pct, pctId) {
  const bar = document.getElementById(barId);
  if (bar) bar.style.width = Math.max(pct, pct > 0 ? 3 : 0) + "%";
  setText(pctId, Math.round(pct) + "%");
}

function renderImpactWidget(kgCO2) {
  const container = document.getElementById("impactco2-container");
  if (!container) return;
  const value = Math.round(kgCO2);
  if (value <= 0) {
    container.textContent = "Pas de données suffisantes.";
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.src =
    "https://impactco2.fr/iframes/comparateur/etiquette?value=" +
    encodeURIComponent(value) +
    "&comparisons=voiturethermique,tgv,avion-moyencourrier,streamingvideo&language=fr";
  iframe.style.cssText = "border:none;width:100%;min-height:480px;border-radius:8px;display:block";
  iframe.loading = "lazy";
  iframe.title = "Équivalences CO₂";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  container.textContent = "";
  container.appendChild(iframe);
}

// ============================================================
// TOP 5 CLEANERS PAR CATÉGORIE
// ============================================================

function renderTopCleaners(d) {
  const donneesCO2 = {};
  d.donnees.forEach((e) => {
    const org = e.organisateur || "Inconnu";
    const co2 =
      (e.go_cloud || 0) * CO2.GO_CLOUD +
      (e.go_local || 0) * CO2.GO_LOCAL +
      (e.emails || 0) * CO2.EMAIL +
      (e.posts || 0) * CO2.EMAIL +
      (e.fichiers_cloud || 0) * CO2.FICHIER_CLOUD +
      (e.fichiers_local || 0) * CO2.FICHIER_LOCAL +
      (e.apps || 0) * CO2.APP;
    donneesCO2[org] = (donneesCO2[org] || 0) + co2;
  });
  fillTopTable("top-donnees-body", donneesCO2);

  const reemploiCO2 = {};
  d.reemploi.forEach((e) => {
    const org = e.organisateur || "Inconnu";
    const n = (e.don || 0) + (e.reparation || 0) + (e.protection || 0) + (e.reutilisation || 0);
    const factor = REEMPLOI_FACTOR[e.type_equipement] || 0;
    reemploiCO2[org] = (reemploiCO2[org] || 0) + n * factor;
  });
  fillTopTable("top-reemploi-body", reemploiCO2);

  const recyclageCO2 = {};
  d.recyclage.forEach((e) => {
    const org = e.organisateur || "Inconnu";
    recyclageCO2[org] = (recyclageCO2[org] || 0) + (e.poids_kg || 0) * 0.76 * CO2.DEEE_KG;
  });
  fillTopTable("top-recyclage-body", recyclageCO2);
}

function fillTopTable(tbodyId, map) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const sorted = Object.entries(map)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  if (sorted.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.style.textAlign = "center";
    td.style.color = "var(--gray-500)";
    td.textContent = "Aucune donnée";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  sorted.forEach(([org, co2], i) => {
    const tr = document.createElement("tr");

    const tdRank = document.createElement("td");
    tdRank.style.fontWeight = "700";
    tdRank.textContent = i < 3 ? medals[i] : "#" + (i + 1);
    tr.appendChild(tdRank);

    const tdOrg = document.createElement("td");
    tdOrg.textContent = org;
    tr.appendChild(tdOrg);

    const tdCO2 = document.createElement("td");
    tdCO2.style.fontWeight = "700";
    tdCO2.style.color = "var(--pink)";
    tdCO2.textContent = fmtCO2(co2);
    tr.appendChild(tdCO2);

    tbody.appendChild(tr);
  });
}

// ============================================================
// GRAPHIQUES (Chart.js)
// ============================================================

let charts = {};

function destroyCharts() {
  Object.values(charts).forEach((c) => c.destroy());
  charts = {};
}

function renderCharts(d) {
  destroyCharts();

  // --- Structures ---
  const structCount = {};
  d.general.forEach((e) => {
    const t = e.type_structure || "autre";
    structCount[t] = (structCount[t] || 0) + 1;
  });
  charts.structures = new Chart(document.getElementById("chart-structures"), {
    type: "doughnut",
    data: {
      labels: Object.keys(structCount).map(capitalize),
      datasets: [{ data: Object.values(structCount), backgroundColor: palette(Object.keys(structCount).length) }],
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } },
  });

  // --- Régions ---
  const regionCount = {};
  d.general.forEach((e) => {
    if (e.region) regionCount[e.region] = (regionCount[e.region] || 0) + 1;
  });
  const topRegions = Object.entries(regionCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  charts.regions = new Chart(document.getElementById("chart-regions"), {
    type: "bar",
    data: {
      labels: topRegions.map((r) => r[0]),
      datasets: [{
        label: "Nombre de DCD",
        data: topRegions.map((r) => r[1]),
        backgroundColor: "#ec4899",
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  });

  // --- Réemploi par équipement ---
  const reemploiByType = {};
  d.reemploi.forEach((e) => {
    const t = e.type_equipement || "Autre";
    const n = (e.don || 0) + (e.reparation || 0) + (e.protection || 0) + (e.reutilisation || 0);
    reemploiByType[t] = (reemploiByType[t] || 0) + n;
  });
  charts.reemploi = new Chart(document.getElementById("chart-reemploi"), {
    type: "bar",
    data: {
      labels: Object.keys(reemploiByType),
      datasets: [{
        label: "Équipements réemployés",
        data: Object.values(reemploiByType),
        backgroundColor: "#a855f7",
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // --- Recyclage par type ---
  const recyclageByType = {};
  d.recyclage.forEach((e) => {
    const t = e.type_equipement || "Autre";
    recyclageByType[t] = (recyclageByType[t] || 0) + (e.poids_kg || 0);
  });
  charts.recyclage = new Chart(document.getElementById("chart-recyclage"), {
    type: "doughnut",
    data: {
      labels: Object.keys(recyclageByType),
      datasets: [{ data: Object.values(recyclageByType), backgroundColor: palette(Object.keys(recyclageByType).length) }],
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } },
  });

  // --- CO₂ par source ---
  const goCloud = d.donnees.reduce((s, e) => s + (e.go_cloud || 0), 0);
  const goLocal = d.donnees.reduce((s, e) => s + (e.go_local || 0), 0);
  const emails = d.donnees.reduce((s, e) => s + (e.emails || 0), 0);
  const fCloud = d.donnees.reduce((s, e) => s + (e.fichiers_cloud || 0), 0);
  const fLocal = d.donnees.reduce((s, e) => s + (e.fichiers_local || 0), 0);
  const apps = d.donnees.reduce((s, e) => s + (e.apps || 0), 0);

  let co2Reemploi = 0;
  d.reemploi.forEach((e) => {
    const n = (e.don || 0) + (e.reparation || 0) + (e.protection || 0) + (e.reutilisation || 0);
    co2Reemploi += n * (REEMPLOI_FACTOR[e.type_equipement] || 0);
  });
  const poidsTotal = d.recyclage.reduce((s, e) => s + (e.poids_kg || 0), 0);
  const co2Recyclage = poidsTotal * 0.76 * CO2.DEEE_KG;

  const co2Sources = {
    "Go cloud": (goCloud * CO2.GO_CLOUD) / 1000,
    "Go local": (goLocal * CO2.GO_LOCAL) / 1000,
    "Emails": (emails * CO2.EMAIL) / 1000,
    "Fichiers cloud": (fCloud * CO2.FICHIER_CLOUD) / 1000,
    "Fichiers local": (fLocal * CO2.FICHIER_LOCAL) / 1000,
    "Apps": (apps * CO2.APP) / 1000,
    "Réemploi": co2Reemploi / 1000,
    "Recyclage": co2Recyclage / 1000,
  };

  charts.co2 = new Chart(document.getElementById("chart-co2"), {
    type: "bar",
    data: {
      labels: Object.keys(co2Sources),
      datasets: [{
        label: "kg CO₂ évités",
        data: Object.values(co2Sources).map((v) => Math.round(v * 10) / 10),
        backgroundColor: ["#ec4899","#f9a8d4","#9d174d","#a855f7","#d8b4fe","#6b21a8","#3b82f6","#fb923c"],
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "kg CO₂" } } },
    },
  });

  // --- Cloud vs Local ---
  const chartCloudLocal = document.getElementById("chart-cloud-local");
  if (chartCloudLocal) {
    charts.cloudLocal = new Chart(chartCloudLocal, {
      type: "bar",
      data: {
        labels: ["Fichiers", "Go supprimés"],
        datasets: [
          { label: "Cloud", data: [fCloud, goCloud], backgroundColor: "#3b82f6", borderRadius: 6 },
          { label: "Local", data: [fLocal, goLocal], backgroundColor: "#10b981", borderRadius: 6 },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "top" } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}

// ============================================================
// UTILITAIRES
// ============================================================

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function fmt(n) {
  return Number(n).toLocaleString("fr-FR");
}

function fmtDec(n) {
  if (n >= 100) return Math.round(n).toLocaleString("fr-FR");
  return Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function fmtGo(go) {
  if (go >= 1000) return fmtDec(go / 1000) + " To";
  return fmtDec(go) + " Go";
}

function fmtCO2(grams) {
  const kg = grams / 1000;
  if (kg >= 1000) return fmtDec(kg / 1000) + " t CO₂";
  if (kg >= 1) return fmtDec(kg) + " kg CO₂";
  return Math.round(grams) + " g CO₂";
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function palette(n) {
  const colors = [
    "#9d174d","#ec4899","#6b21a8","#a855f7","#be185d",
    "#9f1239","#f472b6","#c084fc","#fb7185","#fda4af",
    "#818cf8","#3b82f6",
  ];
  return Array.from({ length: n }, (_, i) => colors[i % colors.length]);
}

function showLoader(visible) {
  const el = document.getElementById("loader-dash");
  if (el) el.style.display = visible ? "flex" : "none";
}

function showError(msg) {
  const main = document.querySelector("main");
  if (!main) return;
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.style.cssText =
    "background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;padding:16px;border-radius:8px;margin-bottom:16px";
  const strong = document.createElement("strong");
  strong.textContent = "Erreur de chargement : ";
  banner.appendChild(strong);
  banner.appendChild(document.createTextNode(msg));
  main.insertBefore(banner, main.firstChild);
}
