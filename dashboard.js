// ============================================================
//  Dashboard — Digital Cleanup Day
//  Charge data.json, calcule KPIs + CO₂, alimente les graphiques
// ============================================================

// ===== FACTEURS CO₂ (méthodologie ADEME / Shift Project) =====
const CO2 = {
  GO_CLOUD: 209.5, // g CO₂ / Go / an
  GO_LOCAL: 3.2, // g CO₂ / Go / an
  EMAIL: 0.3, // g CO₂ / email
  FICHIER_CLOUD: 8.0, // g CO₂ / fichier cloud
  FICHIER_LOCAL: 2.0, // g CO₂ / fichier local
  APP: 1.46, // g CO₂ / app / an
  // Réemploi — empreinte fabrication (g CO₂)
  SMARTPHONE: 30000,
  PORTABLE: 156000,
  FIXE: 175000,
  ECRAN: 80000,
  TABLETTE: 63000,
  // Recyclage
  DEEE_KG: 2500, // g CO₂ / kg DEEE recyclé (76 %)
};

const REEMPLOI_FACTOR = {
  Smartphone: CO2.SMARTPHONE,
  "Ordinateur portable": CO2.PORTABLE,
  "Ordinateur fixe": CO2.FIXE,
  Écran: CO2.ECRAN,
  Tablette: CO2.TABLETTE,
};

// URL de l'Apps Script — utilisée en priorité pour charger les données live
const APPS_SCRIPT_URL =
   "https://script.google.com/macros/s/";

let RAW = null; // données brutes
let FILTERED = null; // données après filtre

// ============================================================
// CHARGEMENT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  // Filtres : re-rendre sans re-télécharger à chaque changement
  document
    .getElementById("filter-region")
    ?.addEventListener("change", applyAndRender);
  document
    .getElementById("filter-structure")
    ?.addEventListener("change", applyAndRender);
});

function applyAndRender() {
  if (!RAW || dataSource === "appsScript") return;
  FILTERED = applyFilters(RAW);
  render(FILTERED);
}

async function loadDashboard() {
  showLoader(true);
  try {
    RAW = await fetchData();

    if (dataSource === "appsScript") {
      // Apps Script : totaux pré-calculés, filtres gérés côté serveur
      render(RAW);
    } else {
      // data.json : données brutes, filtres côté client
      populateRegionFilter(RAW.general);
      FILTERED = applyFilters(RAW);
      render(FILTERED);
    }

    showLoader(false);
  } catch (err) {
    showLoader(false);
    showError(err.message);
  }
}

/**
 * Stratégie de chargement (3 niveaux) :
 *  1. ?action=getRawData   → données brutes live (filtres, top 5, régions)
 *  2. ?action=getDashboard → totaux pré-calculés (pas de top 5, pas de filtres)
 *  3. data.json            → export statique
 *
 * dataSource: "dataJson" | "appsScript"
 */
let dataSource = "dataJson";

async function fetchData() {
  // --- 1. Données brutes live (meilleur cas) ---
  try {
    const resp = await fetch(APPS_SCRIPT_URL + "?action=getRawData");
    if (resp.ok) {
      const json = await resp.json();
      if (json && Array.isArray(json.general) && Array.isArray(json.donnees)) {
        console.log("Données brutes chargées depuis Google Sheets (live)");
        dataSource = "dataJson";
        return json;
      }
    }
  } catch (e) {
    console.warn("getRawData indisponible", e);
  }

  // --- 2. Totaux pré-calculés (fallback Apps Script) ---
  try {
    const resp = await fetch(APPS_SCRIPT_URL + "?action=getDashboard");
    if (resp.ok) {
      const json = await resp.json();
      if (json && json.success && json.dashboard) {
        console.log("Totaux chargés depuis Google Sheets (getDashboard)");
        dataSource = "appsScript";
        return json.dashboard;
      }
    }
  } catch (e) {
    console.warn("getDashboard indisponible", e);
  }

  // --- 3. Fichier statique ---
  const resp = await fetch("data.json");
  if (!resp.ok)
    throw new Error(
      "Impossible de charger les données (ni Apps Script, ni data.json)",
    );
  console.log("Données chargées depuis data.json (export statique)");
  dataSource = "dataJson";
  return resp.json();
}

// ============================================================
// FILTRES
// ============================================================

function populateRegionFilter(general) {
  const sel = document.getElementById("filter-region");
  if (!sel) return;
  const regions = [
    ...new Set(general.map((e) => e.region).filter(Boolean)),
  ].sort();
  // Garder l'option "Toutes" puis ajouter chaque région
  while (sel.options.length > 1) sel.remove(1);
  regions.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  });
}

function applyFilters(data) {
  const region = document.getElementById("filter-region")?.value || "";
  const structure = document.getElementById("filter-structure")?.value || "";

  // Aucun filtre actif → tout retourner tel quel
  if (!region && !structure) return data;

  function matchGeneral(e) {
    if (region && e.region !== region) return false;
    if (structure && (e.type_structure || "").toLowerCase() !== structure)
      return false;
    return true;
  }

  const matchedGeneral = data.general.filter(matchGeneral);

  // Filtrer les tables détail par cleanup_id des entrées générales retenues
  const matchedIds = new Set(matchedGeneral.map((g) => String(g.cleanup_id)));

  function matchDetail(e) {
    return matchedIds.has(String(e.cleanup_id));
  }

  return {
    exportDate: data.exportDate,
    general: matchedGeneral,
    sensibilisation: data.sensibilisation.filter(matchDetail),
    donnees: data.donnees.filter(matchDetail),
    reemploi: data.reemploi.filter(matchDetail),
    recyclage: data.recyclage.filter(matchDetail),
  };
}

// ============================================================
// RENDU PRINCIPAL
// ============================================================

function render(d) {
  if (dataSource === "appsScript") {
    renderFromAppsScript(d);
  } else {
    renderFromDataJson(d);
  }
}

// ============================================================
// RENDU DEPUIS APPS SCRIPT (totaux pré-calculés)
// ============================================================

function renderFromAppsScript(d) {
  // --- Vue d'ensemble ---
  setText("kpi-total-dcd", fmt(d.totalDCD || 0));
  setText("kpi-participants", fmt(d.totalParticipants || 0));
  setText("kpi-audience", fmt(d.totalAudience || 0));
  setText("kpi-reemploi", fmt(d.totalReemploi || 0));

  // --- Données cloud/local ---
  setText("kpi-emails", fmt(d.totalEmailsSup || 0));
  setText("kpi-fichiers-cloud", fmt(d.totalFichiersCloud || 0));
  setText("kpi-fichiers-local", fmt(d.totalFichiersLocal || 0));
  setText("kpi-apps", fmt(d.totalAppsSup || 0));
  setText("kpi-go-cloud", fmtGo(d.totalGoCloud || 0));
  setText("kpi-go-local", fmtGo(d.totalGoLocal || 0));

  // --- Réemploi ---
  setText("kpi-smartphones", fmt(d.totalSmartphones || 0));
  setText("kpi-portables", fmt(d.totalPortables || 0));
  setText("kpi-fixes", fmt(d.totalFixes || 0));
  setText("kpi-ecrans", fmt(d.totalEcrans || 0));

  // --- Recyclage ---
  setText("kpi-poids-total", fmtDec(d.totalPoidsTonnes || 0) + " t");
  setText("kpi-recycle", fmt(Math.round(d.matiereRecyclee || 0)) + " kg");
  setText("kpi-valorise", fmt(Math.round(d.matiereValorisee || 0)) + " kg");
  setText("kpi-reutilise", fmt(Math.round(d.matiereReutilisee || 0)) + " kg");

  // --- CO₂ ---
  const det = d.co2Detail || {};
  setText("co2-go-cloud-kg", fmtCO2((det.goCloud || 0) * 1000));
  setText("co2-go-local-kg", fmtCO2((det.goLocal || 0) * 1000));
  setText("co2-emails-kg", fmtCO2((det.emails || 0) * 1000));
  setText("co2-posts-kg", fmtCO2((det.posts || 0) * 1000));
  setText("co2-fichiers-cloud-kg", fmtCO2((det.fichiersCloud || 0) * 1000));
  setText("co2-fichiers-local-kg", fmtCO2((det.fichiersLocal || 0) * 1000));
  setText("co2-apps-kg", fmtCO2((det.apps || 0) * 1000));
  setText("co2-donnees-total", fmtCO2((det.totalDonnees || 0) * 1000));

  setText("co2-smartphones", fmtCO2((det.smartphones || 0) * 1000));
  setText("co2-portables", fmtCO2((det.portables || 0) * 1000));
  setText("co2-fixes", fmtCO2((det.fixes || 0) * 1000));
  setText("co2-ecrans", fmtCO2((det.ecrans || 0) * 1000));
  setText("co2-tablettes", fmtCO2((det.tablettes || 0) * 1000));
  setText("co2-reemploi-total", fmtCO2((det.totalReemploi || 0) * 1000));

  setText("co2-poids-recycle", fmt(Math.round(det.poidsRecycle || 0)) + " kg");
  setText("co2-recyclage-kg", fmtCO2((det.totalRecyclage || 0) * 1000));
  setText("co2-recyclage-total", fmtCO2((det.totalRecyclage || 0) * 1000));

  setText("co2-kg", fmtDec((d.co2KgEvite || 0) / 1000) + " t");
  setText(
    "co2-go-source",
    fmtGo(d.totalGoCloud || 0) +
      " cloud + " +
      fmtGo(d.totalGoLocal || 0) +
      " local",
  );

  // --- Répartition ---
  const rep = d.repartition || {};
  setBar("bar-donnees", parseFloat(rep.donneesPct) || 0, "co2-donnees-pct");
  setBar("bar-reemploi", parseFloat(rep.reemploiPct) || 0, "co2-reemploi-pct");
  setBar(
    "bar-recyclage",
    parseFloat(rep.recyclagePct) || 0,
    "co2-recyclage-pct",
  );

  // --- Widget impactCO2 ---
  renderImpactWidget(d.co2KgEvite || 0);

  // --- Graphiques depuis Apps Script (typologies / regions) ---
  destroyCharts();
  const typo = d.typologies || {};
  if (Object.keys(typo).length > 0) {
    charts.structures = new Chart(document.getElementById("chart-structures"), {
      type: "doughnut",
      data: {
        labels: Object.keys(typo).map(capitalize),
        datasets: [
          {
            data: Object.values(typo),
            backgroundColor: palette(Object.keys(typo).length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  const reg = d.regions || {};
  const topR = Object.entries(reg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (topR.length > 0) {
    charts.regions = new Chart(document.getElementById("chart-regions"), {
      type: "bar",
      data: {
        labels: topR.map((r) => r[0]),
        datasets: [
          {
            label: "Nombre de DCD",
            data: topR.map((r) => r[1]),
            backgroundColor: "#ec4899",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } },
      },
    });
  }

  // CO₂ par source (depuis co2Detail)
  const co2Sources = {
    "Go cloud": det.goCloud || 0,
    "Go local": det.goLocal || 0,
    Emails: det.emails || 0,
    "Fichiers cloud": det.fichiersCloud || 0,
    "Fichiers local": det.fichiersLocal || 0,
    Apps: det.apps || 0,
    Réemploi: det.totalReemploi || 0,
    Recyclage: det.totalRecyclage || 0,
  };
  charts.co2 = new Chart(document.getElementById("chart-co2"), {
    type: "bar",
    data: {
      labels: Object.keys(co2Sources),
      datasets: [
        {
          label: "kg CO₂ évités",
          data: Object.values(co2Sources).map((v) => Math.round(v * 10) / 10),
          backgroundColor: [
            "#ec4899",
            "#f9a8d4",
            "#9d174d",
            "#a855f7",
            "#d8b4fe",
            "#6b21a8",
            "#3b82f6",
            "#fb923c",
          ],
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "kg CO₂" } },
      },
    },
  });

  // Cloud vs local
  const cvl = document.getElementById("chart-cloud-local");
  if (cvl) {
    charts.cloudLocal = new Chart(cvl, {
      type: "bar",
      data: {
        labels: ["Fichiers", "Go supprimés"],
        datasets: [
          {
            label: "Cloud",
            data: [d.totalFichiersCloud || 0, d.totalGoCloud || 0],
            backgroundColor: "#3b82f6",
            borderRadius: 6,
          },
          {
            label: "Local",
            data: [d.totalFichiersLocal || 0, d.totalGoLocal || 0],
            backgroundColor: "#10b981",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "top" } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  // Note : les top 5 cleaners ne sont pas disponibles depuis l'Apps Script
  // (il renvoie des totaux, pas les données par organisateur)
  // On affiche un message dans les tableaux
  ["top-donnees-body", "top-reemploi-body", "top-recyclage-body"].forEach(
    (id) => {
      const tbody = document.getElementById(id);
      if (!tbody) return;
      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.style.textAlign = "center";
      td.style.color = "var(--gray-500)";
      td.style.fontStyle = "italic";
      td.textContent = "Disponible avec les données détaillées (data.json)";
      tr.appendChild(td);
      tbody.appendChild(tr);
    },
  );

  // --- Sensibilisation (données partielles depuis Apps Script) ---
  setText("kpi-participants-detail", fmt(d.totalParticipants || 0));
  setText("kpi-audience-detail", fmt(d.totalAudience || 0));
  const totalSensi = (d.totalParticipants || 0) + (d.totalAudience || 0);
  setText("kpi-sensi-total", fmt(totalSensi) + " personnes");
  // Sessions et formats non disponibles depuis getDashboard
  setText("kpi-sensi-sessions", "—");
  ["sensi-formats-body", "sensi-top-body"].forEach((id) => {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.style.cssText =
      "text-align:center;color:var(--gray-500);font-style:italic";
    td.textContent = "Disponible avec les données détaillées";
    tr.appendChild(td);
    tbody.appendChild(tr);
  });

  setText("last-update-date", new Date().toLocaleDateString("fr-FR"));
}

// ============================================================
// RENDU DEPUIS DATA.JSON (données brutes détaillées)
// ============================================================

function renderFromDataJson(d) {
  renderKPIs(d);
  renderSensibilisation(d);
  renderCO2(d);
  renderTopCleaners(d);
  renderCharts(d);
  setText("last-update-date", d.exportDate || "—");
}

// ============================================================
// KPIs VUE D'ENSEMBLE
// ============================================================

function renderKPIs(d) {
  // DCD organisés
  const totalDCD = d.general.length;
  setText("kpi-total-dcd", fmt(totalDCD));

  // Participants sensibilisation
  const participants = d.sensibilisation.reduce(
    (s, e) => s + (e.participants_reels || 0),
    0,
  );
  setText("kpi-participants", fmt(participants));

  // Audience
  const audience = d.sensibilisation.reduce(
    (s, e) => s + (e.audience_touchee || 0),
    0,
  );
  setText("kpi-audience", fmt(audience));

  // Réemploi total
  const reemploiTotal = d.reemploi.reduce(
    (s, e) =>
      s +
      (e.don || 0) +
      (e.reparation || 0) +
      (e.protection || 0) +
      (e.reutilisation || 0),
    0,
  );
  setText("kpi-reemploi", fmt(reemploiTotal));

  // --- Données : Cloud vs Local ---
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

  // --- Réemploi par type ---
  const reemploiByType = {};
  d.reemploi.forEach((e) => {
    const t = e.type_equipement || "Autre";
    const n =
      (e.don || 0) +
      (e.reparation || 0) +
      (e.protection || 0) +
      (e.reutilisation || 0);
    reemploiByType[t] = (reemploiByType[t] || 0) + n;
  });
  setText("kpi-smartphones", fmt(reemploiByType["Smartphone"] || 0));
  setText("kpi-portables", fmt(reemploiByType["Ordinateur portable"] || 0));
  setText("kpi-fixes", fmt(reemploiByType["Ordinateur fixe"] || 0));
  setText("kpi-ecrans", fmt(reemploiByType["Écran"] || 0));

  // --- Recyclage ---
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

  const totalParticipants = s.reduce(
    (acc, e) => acc + (e.participants_reels || 0),
    0,
  );
  const totalAudience = s.reduce(
    (acc, e) => acc + (e.audience_touchee || 0),
    0,
  );
  const totalSensi = totalParticipants + totalAudience;

  setText("kpi-participants-detail", fmt(totalParticipants));
  setText("kpi-audience-detail", fmt(totalAudience));
  setText("kpi-sensi-total", fmt(totalSensi) + " personnes");
  setText("kpi-sensi-sessions", fmt(s.length));

  // --- Répartition par format (5 catégories normalisées) ---
  function normalizeFormat(raw) {
    const s = (raw || "").toLowerCase();
    if (s.includes("webinaire")) return "Webinaires";
    if (s.includes("quizz") || s.includes("quiz")) return "Quizz";
    if (s.includes("fresque")) return "Fresques";
    if (
      s.includes("jeux") ||
      s.includes("jeu") ||
      s.includes("dowino") ||
      s.includes("wokies") ||
      s.includes("numéville") ||
      s.includes("numeville")
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
    while (formatsTbody.firstChild)
      formatsTbody.removeChild(formatsTbody.firstChild);
    const sorted = Object.entries(byFormat)
      .filter(([, v]) => v.sessions > 0)
      .sort((a, b) => b[1].participants - a[1].participants);
    if (sorted.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 2;
      td.style.cssText =
        "text-align:center;color:var(--gray-500);font-style:italic";
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

  // --- Top 5 organisateurs ---
  const byOrg = {};
  s.forEach((e) => {
    const org = e.organisateur || "Inconnu";
    byOrg[org] =
      (byOrg[org] || 0) +
      (e.participants_reels || 0) +
      (e.audience_touchee || 0);
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
      td.style.cssText =
        "text-align:center;color:var(--gray-500);font-style:italic";
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
  const co2Donnees =
    co2GoCloud +
    co2GoLocal +
    co2Emails +
    co2Posts +
    co2FCloud +
    co2FLocal +
    co2Apps;

  setText("co2-go-cloud-kg", fmtCO2(co2GoCloud));
  setText("co2-go-local-kg", fmtCO2(co2GoLocal));
  setText("co2-emails-kg", fmtCO2(co2Emails));
  setText("co2-posts-kg", fmtCO2(co2Posts));
  setText("co2-fichiers-cloud-kg", fmtCO2(co2FCloud));
  setText("co2-fichiers-local-kg", fmtCO2(co2FLocal));
  setText("co2-apps-kg", fmtCO2(co2Apps));
  setText("co2-donnees-total", fmtCO2(co2Donnees));

  // --- Réemploi ---
  let co2Reemploi = 0;
  const co2ReemploiDetail = {};
  d.reemploi.forEach((e) => {
    const t = e.type_equipement || "Autre";
    const n =
      (e.don || 0) +
      (e.reparation || 0) +
      (e.protection || 0) +
      (e.reutilisation || 0);
    const factor = REEMPLOI_FACTOR[t] || 0;
    const co2 = n * factor;
    co2Reemploi += co2;
    co2ReemploiDetail[t] = (co2ReemploiDetail[t] || 0) + co2;
  });

  setText("co2-smartphones", fmtCO2(co2ReemploiDetail["Smartphone"] || 0));
  setText(
    "co2-portables",
    fmtCO2(co2ReemploiDetail["Ordinateur portable"] || 0),
  );
  setText("co2-fixes", fmtCO2(co2ReemploiDetail["Ordinateur fixe"] || 0));
  setText("co2-ecrans", fmtCO2(co2ReemploiDetail["Écran"] || 0));
  setText("co2-tablettes", fmtCO2(co2ReemploiDetail["Tablette"] || 0));
  setText("co2-reemploi-total", fmtCO2(co2Reemploi));

  // --- Recyclage ---
  const poidsTotal = d.recyclage.reduce((s, e) => s + (e.poids_kg || 0), 0);
  const poidsRecycle = poidsTotal * 0.76;
  const co2Recyclage = poidsRecycle * CO2.DEEE_KG;

  setText("co2-poids-recycle", fmt(Math.round(poidsRecycle)) + " kg");
  setText("co2-recyclage-kg", fmtCO2(co2Recyclage));
  setText("co2-recyclage-total", fmtCO2(co2Recyclage));

  // --- Total ---
  const co2Total = co2Donnees + co2Reemploi + co2Recyclage;
  setText("co2-kg", fmtDec(co2Total / 1000000) + " t");
  setText(
    "co2-go-source",
    fmtGo(goCloud) + " cloud + " + fmtGo(goLocal) + " local supprimés",
  );

  // --- Répartition ---
  const total = co2Donnees + co2Reemploi + co2Recyclage || 1;
  const pctD = (co2Donnees / total) * 100;
  const pctR = (co2Reemploi / total) * 100;
  const pctRec = (co2Recyclage / total) * 100;

  setBar("bar-donnees", pctD, "co2-donnees-pct");
  setBar("bar-reemploi", pctR, "co2-reemploi-pct");
  setBar("bar-recyclage", pctRec, "co2-recyclage-pct");

  // --- Widget impactCO2 ---
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
  // Utilise une iframe vers impactco2.fr — contenu contrôlé par un tiers de confiance (ADEME)
  const iframe = document.createElement("iframe");
  iframe.src =
    "https://impactco2.fr/iframes/comparateur/etiquette?value=" +
    encodeURIComponent(value) +
    "&comparisons=voiturethermique,tgv,avion-moyencourrier,streamingvideo&language=fr";
  iframe.style.cssText =
    "border:none;width:100%;min-height:480px;border-radius:8px;display:block";
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
  // --- DCD Données : top 5 par CO₂ ---
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

  // --- DCD Réemploi : top 5 par CO₂ ---
  const reemploiCO2 = {};
  d.reemploi.forEach((e) => {
    const org = e.organisateur || "Inconnu";
    const n =
      (e.don || 0) +
      (e.reparation || 0) +
      (e.protection || 0) +
      (e.reutilisation || 0);
    const factor = REEMPLOI_FACTOR[e.type_equipement] || 0;
    reemploiCO2[org] = (reemploiCO2[org] || 0) + n * factor;
  });
  fillTopTable("top-reemploi-body", reemploiCO2);

  // --- DCD Recyclage : top 5 par poids ---
  const recyclageCO2 = {};
  d.recyclage.forEach((e) => {
    const org = e.organisateur || "Inconnu";
    recyclageCO2[org] =
      (recyclageCO2[org] || 0) + (e.poids_kg || 0) * 0.76 * CO2.DEEE_KG;
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

  // Vider le tbody
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
      datasets: [
        {
          data: Object.values(structCount),
          backgroundColor: palette(Object.keys(structCount).length),
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } },
  });

  // --- Régions top 10 ---
  const regionCount = {};
  d.general.forEach((e) => {
    if (e.region) regionCount[e.region] = (regionCount[e.region] || 0) + 1;
  });
  const topRegions = Object.entries(regionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  charts.regions = new Chart(document.getElementById("chart-regions"), {
    type: "bar",
    data: {
      labels: topRegions.map((r) => r[0]),
      datasets: [
        {
          label: "Nombre de DCD",
          data: topRegions.map((r) => r[1]),
          backgroundColor: "#ec4899",
          borderRadius: 6,
        },
      ],
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
    const n =
      (e.don || 0) +
      (e.reparation || 0) +
      (e.protection || 0) +
      (e.reutilisation || 0);
    reemploiByType[t] = (reemploiByType[t] || 0) + n;
  });
  charts.reemploi = new Chart(document.getElementById("chart-reemploi"), {
    type: "bar",
    data: {
      labels: Object.keys(reemploiByType),
      datasets: [
        {
          label: "Équipements réemployés",
          data: Object.values(reemploiByType),
          backgroundColor: "#a855f7",
          borderRadius: 6,
        },
      ],
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
      datasets: [
        {
          data: Object.values(recyclageByType),
          backgroundColor: palette(Object.keys(recyclageByType).length),
        },
      ],
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
    const n =
      (e.don || 0) +
      (e.reparation || 0) +
      (e.protection || 0) +
      (e.reutilisation || 0);
    co2Reemploi += n * (REEMPLOI_FACTOR[e.type_equipement] || 0);
  });
  const poidsTotal = d.recyclage.reduce((s, e) => s + (e.poids_kg || 0), 0);
  const co2Recyclage = poidsTotal * 0.76 * CO2.DEEE_KG;

  const co2Sources = {
    "Go cloud": (goCloud * CO2.GO_CLOUD) / 1000,
    "Go local": (goLocal * CO2.GO_LOCAL) / 1000,
    Emails: (emails * CO2.EMAIL) / 1000,
    "Fichiers cloud": (fCloud * CO2.FICHIER_CLOUD) / 1000,
    "Fichiers local": (fLocal * CO2.FICHIER_LOCAL) / 1000,
    Apps: (apps * CO2.APP) / 1000,
    Réemploi: co2Reemploi / 1000,
    Recyclage: co2Recyclage / 1000,
  };

  charts.co2 = new Chart(document.getElementById("chart-co2"), {
    type: "bar",
    data: {
      labels: Object.keys(co2Sources),
      datasets: [
        {
          label: "kg CO₂ évités",
          data: Object.values(co2Sources).map((v) => Math.round(v * 10) / 10),
          backgroundColor: [
            "#ec4899",
            "#f9a8d4",
            "#9d174d",
            "#a855f7",
            "#d8b4fe",
            "#6b21a8",
            "#3b82f6",
            "#fb923c",
          ],
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "kg CO₂" } },
      },
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
          {
            label: "Cloud",
            data: [fCloud, goCloud],
            backgroundColor: "#3b82f6",
            borderRadius: 6,
          },
          {
            label: "Local",
            data: [fLocal, goLocal],
            backgroundColor: "#10b981",
            borderRadius: 6,
          },
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
    "#9d174d",
    "#ec4899",
    "#6b21a8",
    "#a855f7",
    "#be185d",
    "#9f1239",
    "#f472b6",
    "#c084fc",
    "#fb7185",
    "#fda4af",
    "#818cf8",
    "#3b82f6",
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
  banner.textContent = "Erreur : " + msg;
  main.prepend(banner);
}
