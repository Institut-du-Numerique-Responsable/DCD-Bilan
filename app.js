// ============================================================
//  Digital Cleanup Day — Logique de l'application
// ============================================================

let collectedData = {};

// ============================================================
// NAVIGATION ENTRE LES ÉTAPES
// ============================================================

function goToStep2() {
  // Validation étape 1
  const understoodImpacts = document.querySelector('input[name="understoodImpacts"]:checked');
  const cleanupId = document.getElementById('cleanupId').value.trim();
  const organizer = document.getElementById('organizer').value.trim();
  const selectedActions = document.querySelectorAll('input[name="actionType"]:checked');

  if (!understoodImpacts) {
    alert('⚠️ Veuillez répondre à la question Q1 (impacts liés au numérique).');
    return;
  }
  if (!cleanupId) {
    alert('⚠️ Veuillez renseigner le numéro du Digital Cleanup (Q2).');
    return;
  }
  if (!organizer) {
    alert('⚠️ Veuillez renseigner l\'organisateur (Q3).');
    return;
  }
  if (selectedActions.length === 0) {
    alert('⚠️ Veuillez sélectionner au moins un type d\'action.');
    return;
  }

  // Afficher les formulaires correspondants
  const actionForms = document.querySelectorAll('.action-form');
  actionForms.forEach(f => f.classList.add('hidden'));

  selectedActions.forEach(action => {
    const formId = 'form-' + action.value;
    const formEl = document.getElementById(formId);
    if (formEl) formEl.classList.remove('hidden');
  });

  // Changer d'étape
  showStep(2);
}

function goToStep1() {
  showStep(1);
}

function showStep(stepNumber) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

  document.getElementById('step-' + stepNumber).classList.add('active');
  document.getElementById('step-indicator-' + stepNumber).classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// SOUMISSION DU FORMULAIRE
// ============================================================

function submitForm() {
  const understoodImpacts = document.querySelector('input[name="understoodImpacts"]:checked').value === 'true';
  const cleanupId = document.getElementById('cleanupId').value.trim();
  const organizer = document.getElementById('organizer').value.trim();
  const selectedActions = Array.from(document.querySelectorAll('input[name="actionType"]:checked')).map(el => el.value);

  // Construction de l'objet de données
  collectedData = {
    metadata: {
      dateSubmission: new Date().toISOString(),
      cleanupId: cleanupId,
      organizer: organizer,
      understoodImpacts: understoodImpacts,
      actionsRealisees: selectedActions
    },
    sensibilisation: null,
    reemploi: null,
    donnees: null,
    recyclage: null
  };

  // --- SENSIBILISATION ---
  if (selectedActions.includes('sensibilisation')) {
    collectedData.sensibilisation = {
      webinaire: {
        participants: getInt('s_webinaire_participants'),
        audience: getInt('s_webinaire_audience')
      },
      fresqueNumerique: {
        participants: getInt('s_fresque_participants'),
        audience: getInt('s_fresque_audience')
      },
      jeuxNumeville: {
        participants: getInt('s_numeville_participants'),
        audience: getInt('s_numeville_audience')
      },
      jeuxDowino: {
        participants: getInt('s_dowino_participants'),
        audience: getInt('s_dowino_audience')
      },
      jeuxTheWokies: {
        participants: getInt('s_wokies_participants'),
        audience: getInt('s_wokies_audience')
      },
      autreFormat: {
        label: document.getElementById('s_autre_label').value.trim() || null,
        participants: getInt('s_autre_participants'),
        audience: getInt('s_autre_audience')
      }
    };
  }

  // --- RÉEMPLOI ---
  if (selectedActions.includes('reemploi')) {
    collectedData.reemploi = {
      ordinateurFixe: buildReemploi('r_fixe'),
      ecran:          buildReemploi('r_ecran'),
      ordinateurPortable: buildReemploi('r_portable'),
      tablette:       buildReemploi('r_tablette'),
      smartphone:     buildReemploi('r_smartphone')
    };
  }

  // --- DONNÉES ---
  if (selectedActions.includes('donnees')) {
    collectedData.donnees = {
      fichiersSupprimes: {
        emails:      getInt('d_emails'),
        postsSociaux: getInt('d_posts'),
        cloud:       getInt('d_cloud_files'),
        local:       getInt('d_local_files')
      },
      applicationsDesinstallees: getInt('d_apps'),
      goRecuperes: {
        cloud: getFloat('d_go_cloud'),
        local: getFloat('d_go_local')
      }
    };
  }

  // --- RECYCLAGE ---
  if (selectedActions.includes('recyclage')) {
    collectedData.recyclage = {
      ordinateurFixe:     buildRecyclage('rec_fixe'),
      ecran:              buildRecyclage('rec_ecran'),
      ordinateurPortable: buildRecyclage('rec_portable'),
      tablette:           buildRecyclage('rec_tablette'),
      smartphone:         buildRecyclage('rec_smartphone'),
      divers:             buildRecyclage('rec_divers')
    };
  }

  // Affichage du JSON
  document.getElementById('json-output').textContent = JSON.stringify(collectedData, null, 2);

  // Sauvegarder dans localStorage
  saveToLocalStorage(collectedData);

  // Passer à l'étape 3
  showStep(3);
}

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function getInt(id) {
  const val = parseInt(document.getElementById(id)?.value, 10);
  return isNaN(val) ? 0 : val;
}

function getFloat(id) {
  const val = parseFloat(document.getElementById(id)?.value);
  return isNaN(val) ? 0 : val;
}

function buildReemploi(prefix) {
  return {
    don:          getInt(prefix + '_don'),
    reparation:   getInt(prefix + '_reparation'),
    protection:   getInt(prefix + '_protection'),
    reutilisation: getInt(prefix + '_reutilisation')
  };
}

function buildRecyclage(prefix) {
  return {
    quantite: getInt(prefix + '_qte'),
    poidsKg:  getFloat(prefix + '_poids')
  };
}

// ============================================================
// SAUVEGARDE LOCALE (localStorage)
// ============================================================

function saveToLocalStorage(data) {
  const history = JSON.parse(localStorage.getItem('digitalCleanupData') || '[]');
  history.push(data);
  localStorage.setItem('digitalCleanupData', JSON.stringify(history));
  console.log('✅ Données sauvegardées dans localStorage. Total entrées :', history.length);
}

// ============================================================
// TÉLÉCHARGEMENT DU JSON
// ============================================================

function downloadJSON() {
  const blob = new Blob([JSON.stringify(collectedData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `digital-cleanup-${collectedData.metadata.cleanupId || 'data'}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// RÉINITIALISATION DU FORMULAIRE
// ============================================================

function resetForm() {
  document.querySelectorAll('input[type="text"], input[type="number"]').forEach(el => el.value = '');
  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => el.checked = false);
  document.querySelectorAll('.action-form').forEach(f => f.classList.add('hidden'));
  collectedData = {};
  showStep(1);
}
