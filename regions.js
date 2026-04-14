// ============================================================
//  Regions — Digital Cleanup Day
//  Charge data.json et affiche la participation par région
// ============================================================

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
  Écran: CO2.ECRAN,
  Tablette: CO2.TABLETTE,
};

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyXNApqKuItrVAOtxeB-W05rjiIW8Slk3cmREJsVBXxrq4oFJi01JpaOJMea52c3DFB/exec";

document.addEventListener("DOMContentLoaded", () => loadRegions());

async function loadRegions() {
  showLoader(true);
  try {
    const data = await fetchData();
    render(data);
    showLoader(false);
  } catch (err) {
    showLoader(false);
    showError(err.message);
  }
}

async function fetchData() {
  // Essayer getRawData live d'abord, puis fallback data.json
  try {
    const resp = await fetch(APPS_SCRIPT_URL + "?action=getRawData");
    if (resp.ok) {
      const json = await resp.json();
      if (json && Array.isArray(json.general)) {
        console.log("Régions : données brutes depuis Google Sheets (live)");
        return json;
      }
    }
  } catch (e) {
    console.warn("getRawData indisponible, fallback sur data.json", e);
  }
  const resp = await fetch("data.json");
  if (!resp.ok) throw new Error("Impossible de charger les données");
  return resp.json();
}

function render(data) {
  // Agrégation par région
  const regions = {};

  data.general.forEach((e) => {
    const r = e.region || "Non renseignée";
    if (!regions[r])
      regions[r] = {
        dcd: 0,
        orgs: new Set(),
        donnees: 0,
        reemploi: 0,
        recyclage: 0,
        co2: 0,
      };
    regions[r].dcd += 1;
    regions[r].orgs.add(e.organisateur);
    const actions = (e.actions || "").split(",").map((a) => a.trim());
    if (actions.includes("donnees")) regions[r].donnees++;
    if (actions.includes("reemploi")) regions[r].reemploi++;
    if (actions.includes("recyclage")) regions[r].recyclage++;
  });

  // CO₂ données par région
  data.donnees.forEach((e) => {
    const r = e.region || "Non renseignée";
    if (!regions[r])
      regions[r] = {
        dcd: 0,
        orgs: new Set(),
        donnees: 0,
        reemploi: 0,
        recyclage: 0,
        co2: 0,
      };
    regions[r].co2 +=
      (e.go_cloud || 0) * CO2.GO_CLOUD +
      (e.go_local || 0) * CO2.GO_LOCAL +
      (e.emails || 0) * CO2.EMAIL +
      (e.posts || 0) * CO2.EMAIL +
      (e.fichiers_cloud || 0) * CO2.FICHIER_CLOUD +
      (e.fichiers_local || 0) * CO2.FICHIER_LOCAL +
      (e.apps || 0) * CO2.APP;
  });

  // CO₂ réemploi par région
  data.reemploi.forEach((e) => {
    const r = e.region || "Non renseignée";
    if (!regions[r])
      regions[r] = {
        dcd: 0,
        orgs: new Set(),
        donnees: 0,
        reemploi: 0,
        recyclage: 0,
        co2: 0,
      };
    const n =
      (e.don || 0) +
      (e.reparation || 0) +
      (e.protection || 0) +
      (e.reutilisation || 0);
    regions[r].co2 += n * (REEMPLOI_FACTOR[e.type_equipement] || 0);
  });

  // CO₂ recyclage par région
  data.recyclage.forEach((e) => {
    const r = e.region || "Non renseignée";
    if (!regions[r])
      regions[r] = {
        dcd: 0,
        orgs: new Set(),
        donnees: 0,
        reemploi: 0,
        recyclage: 0,
        co2: 0,
      };
    regions[r].co2 += (e.poids_kg || 0) * 0.76 * CO2.DEEE_KG;
  });

  // KPIs nationaux
  const allRegions = Object.keys(regions);
  const totalDCD = allRegions.reduce((s, r) => s + regions[r].dcd, 0);
  const totalOrgs = new Set(allRegions.flatMap((r) => [...regions[r].orgs]))
    .size;
  const totalCO2 = allRegions.reduce((s, r) => s + regions[r].co2, 0);

  setText("kpi-nb-regions", String(allRegions.length));
  setText("kpi-nb-dcd", fmt(totalDCD));
  setText("kpi-nb-orgs", fmt(totalOrgs));
  setText("kpi-co2-total", fmtDec(totalCO2 / 1000) + " kg");
  setText("last-update-date", data.exportDate || "—");

  // Tri par DCD décroissant
  const sorted = allRegions
    .map((r) => ({ name: r, ...regions[r], orgCount: regions[r].orgs.size }))
    .sort((a, b) => b.dcd - a.dcd);

  // Carte choroplèthe (seulement les régions métropolitaines connues)
  renderMap(
    sorted.filter((r) => r.name !== "Non renseignée"),
    totalDCD,
  );

  // Graphique
  const canvas = document.getElementById("chart-regions-full");
  if (canvas) {
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: sorted.map((r) => r.name),
        datasets: [
          {
            label: "Nombre de DCD",
            data: sorted.map((r) => r.dcd),
            backgroundColor: "#ec4899",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: "Nombre de DCD" },
          },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  // Tableau détaillé
  const tbody = document.getElementById("regions-table-body");
  if (!tbody) return;

  sorted.forEach((r) => {
    const tr = document.createElement("tr");

    const cells = [
      r.name,
      fmt(r.dcd),
      fmt(r.orgCount),
      fmt(r.donnees),
      fmt(r.reemploi),
      fmt(r.recyclage),
      fmtCO2(r.co2),
    ];

    cells.forEach((text, i) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (i === 0) td.style.fontWeight = "600";
      if (i === cells.length - 1) {
        td.style.fontWeight = "700";
        td.style.color = "var(--pink)";
      }
      if (i > 0) td.style.textAlign = "right";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
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

function fmtCO2(grams) {
  const kg = grams / 1000;
  if (kg >= 1000) return fmtDec(kg / 1000) + " t CO₂";
  if (kg >= 1) return fmtDec(kg) + " kg CO₂";
  return Math.round(grams) + " g CO₂";
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
