// ============================================================
//  Carte choroplèthe France + DOM — Digital Cleanup Day
// ============================================================

var GEOJSON_METRO =
  "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions.geojson";

var DOMS = [
  {
    name:   "Guadeloupe",
    url:    "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/971-guadeloupe/departement-971-guadeloupe.geojson",
    center: [-61.41, 16.17],
    scale:  4400,
  },
  {
    name:   "Martinique",
    url:    "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/972-martinique/departement-972-martinique.geojson",
    center: [-61.02, 14.63],
    scale:  7400,
  },
  {
    name:   "La Réunion",
    url:    "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/974-la-reunion/departement-974-la-reunion.geojson",
    center: [55.53, -21.13],
    scale:  6000,
  },
];

// Dimensions SVG et encarts DOM
var W = 680, H = 580;
var INSET_W = 88, INSET_H = 88, INSET_LABEL = 18;
var INSET_GAP = 8;
var INSET_Y = H - INSET_H - INSET_LABEL - 6;  // ~456
// 3 encarts côte à côte en bas à gauche
var INSET_POSITIONS = [
  { x: 8 },
  { x: 8 + INSET_W + INSET_GAP },
  { x: 8 + (INSET_W + INSET_GAP) * 2 },
];

function fmtPct(pct) {
  var rounded = Math.round(pct);
  if (rounded === 0) return pct.toFixed(2) + "%";
  return rounded + "%";
}

async function renderMap(sorted, totalDCD) {
  var svgEl = document.getElementById("map-france");
  if (!svgEl || typeof d3 === "undefined") return;

  svgEl.setAttribute("viewBox", "0 0 " + W + " " + H);

  // 1. Chargement GeoJSON France métro + 3 DOM en parallèle
  var urls = [GEOJSON_METRO].concat(DOMS.map(function (d) { return d.url; }));
  var results;
  try {
    results = await Promise.all(
      urls.map(function (u) { return fetch(u).then(function (r) { return r.json(); }); })
    );
  } catch (e) {
    var msg = document.createElement("p");
    msg.style.cssText = "text-align:center;color:#6b7280;padding:32px";
    msg.textContent = "Carte indisponible (" + e.message + ")";
    svgEl.replaceWith(msg);
    return;
  }

  var metroGeoJSON = results[0];
  var domFeatures  = results.slice(1); // Feature bruts (non-FeatureCollection)

  // 2. Lookup nom → {dcd, pct}
  var lookup = {};
  sorted.forEach(function (r) {
    lookup[r.name] = { dcd: r.dcd, pct: (r.dcd / totalDCD) * 100 };
  });

  var maxPct = Math.max.apply(
    null,
    sorted.map(function (r) { return (r.dcd / totalDCD) * 100; }).concat([1])
  );

  var colorScale = d3.scaleSequential()
    .domain([0, maxPct])
    .interpolator(d3.interpolateRgb("#fce7f3", "#be185d"));

  var svg     = d3.select(svgEl);
  var tooltip = document.getElementById("map-tooltip");

  // ── 3. France métropolitaine ──────────────────────────────

  var projMetro = d3.geoConicConformal()
    .center([2.454071, 46.279229])
    .scale(2900)
    .translate([W / 2 + 20, H / 2 - 20]);

  var pathMetro = d3.geoPath().projection(projMetro);

  svg.selectAll("path.metro")
    .data(metroGeoJSON.features)
    .join("path")
    .attr("class", "metro")
    .attr("d", pathMetro)
    .attr("fill", function (d) {
      var info = lookup[d.properties.nom];
      return info ? colorScale(info.pct) : "#e5e7eb";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("mousemove", function (event, d) {
      showTooltip(tooltip, svgEl, event, d.properties.nom, lookup);
    })
    .on("mouseleave", function () { tooltip.style.display = "none"; });

  // Labels % sur régions métropolitaines
  svg.selectAll("text.metro-label")
    .data(metroGeoJSON.features.filter(function (d) { return lookup[d.properties.nom]; }))
    .join("text")
    .attr("class", "metro-label")
    .attr("transform", function (d) {
      var c = pathMetro.centroid(d);
      return "translate(" + c[0] + "," + c[1] + ")";
    })
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("font-size", "11")
    .attr("font-weight", "700")
    .attr("pointer-events", "none")
    .attr("fill", function (d) {
      return lookup[d.properties.nom].pct > maxPct * 0.55 ? "#fff" : "#9d174d";
    })
    .text(function (d) {
      return fmtPct(lookup[d.properties.nom].pct);
    });

  // ── 4. Encarts DOM ───────────────────────────────────────

  DOMS.forEach(function (domDef, i) {
    var feature = domFeatures[i];
    var pos     = INSET_POSITIONS[i];

    // Cadre de l'encart
    svg.append("rect")
      .attr("x", pos.x)
      .attr("y", INSET_Y)
      .attr("width", INSET_W)
      .attr("height", INSET_H)
      .attr("rx", 6)
      .attr("fill", "#f9fafb")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 1);

    // Étiquette nom
    svg.append("text")
      .attr("x", pos.x + INSET_W / 2)
      .attr("y", INSET_Y + INSET_H + INSET_LABEL - 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "10")
      .attr("fill", "#6b7280")
      .text(domDef.name);

    // Projection centrée sur l'île, translatée dans l'encart
    var projDOM = d3.geoConicConformal()
      .center(domDef.center)
      .scale(domDef.scale)
      .translate([pos.x + INSET_W / 2, INSET_Y + INSET_H / 2]);

    var pathDOM = d3.geoPath().projection(projDOM);

    var info  = lookup[domDef.name];
    var color = info ? colorScale(info.pct) : "#e5e7eb";

    // Zone de clip pour ne pas déborder du cadre
    var clipId = "clip-dom-" + i;
    svg.append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", pos.x)
      .attr("y", INSET_Y)
      .attr("width", INSET_W)
      .attr("height", INSET_H)
      .attr("rx", 6);

    var g = svg.append("g").attr("clip-path", "url(#" + clipId + ")");

    g.append("path")
      .datum(feature)
      .attr("d", pathDOM)
      .attr("fill", color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mousemove", function (event) {
        showTooltip(tooltip, svgEl, event, domDef.name, lookup);
      })
      .on("mouseleave", function () { tooltip.style.display = "none"; });

    // Label % dans l'encart
    if (info) {
      var textColor = info.pct > maxPct * 0.55 ? "#fff" : "#9d174d";
      g.append("text")
        .attr("x", pos.x + INSET_W / 2)
        .attr("y", INSET_Y + INSET_H / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "12")
        .attr("font-weight", "700")
        .attr("pointer-events", "none")
        .attr("fill", textColor)
        .text(fmtPct(info.pct));
    }
  });

  // ── 5. Légende dégradé ───────────────────────────────────

  var grad = document.getElementById("map-legend-gradient");
  if (grad) grad.style.background = "linear-gradient(to right, #fce7f3, #be185d)";
  var legendMax = document.getElementById("map-legend-max");
  if (legendMax) legendMax.textContent = fmtDec(maxPct) + "%";
}

// ── Tooltip ─────────────────────────────────────────────────

function showTooltip(tooltip, svgEl, event, nom, lookup) {
  var info = lookup[nom];
  var pct  = info ? fmtDec(info.pct) + "%" : "—";
  var dcd  = info ? fmt(info.dcd) + " DCD" : "Pas de données";

  while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
  var strong = document.createElement("strong");
  strong.textContent = nom;
  tooltip.appendChild(strong);
  tooltip.appendChild(document.createElement("br"));
  tooltip.appendChild(document.createTextNode(dcd + "  ·  " + pct + " du total"));

  tooltip.style.display = "block";
  var box = svgEl.parentElement.getBoundingClientRect();
  tooltip.style.left = (event.clientX - box.left + 14) + "px";
  tooltip.style.top  = (event.clientY - box.top  - 10) + "px";
}
