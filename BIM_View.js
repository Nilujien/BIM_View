import * as THREE from 'three';
import { IFCLoader } from 'web-ifc-three';
import * as WebIFC from 'web-ifc';

// ═════════════════════════════════════════════════════════════════════════════
//  BIM VIEWER — Moteur d'analyse IFC complet et dynamique
//  Pas de maquette par défaut. Tout est extrait du fichier IFC chargé.
// ═════════════════════════════════════════════════════════════════════════════

// ── Résolution défensive des constantes IFC ───────────────────────────────────
// web-ifc@0.0.36 les exporte comme propriétés numériques.
// On les lit avec fallback sur la valeur du standard IFC4.
const W = WebIFC;
function ifc(name, fallback) { return W[name] ?? fallback; }
const IFC_TYPE_NAME_BY_CODE = Object.fromEntries(
  Object.entries(W)
    .filter(([k, v]) => /^IFC[A-Z0-9_]+$/.test(k) && typeof v === 'number')
    .map(([k, v]) => [v, k])
);

// ── Types géométriques (produisent une géométrie Three.js) ────────────────────
const GEOM_TYPES = {
  // Gros-Œuvre / Enveloppe
  IFCWALLSTANDARDCASE:  ifc('IFCWALLSTANDARDCASE',  2502776645),
  IFCWALL:              ifc('IFCWALL',              3701648758),
  IFCWALLTYPE:          ifc('IFCWALLTYPE',          1898987631),
  IFCSLAB:              ifc('IFCSLAB',              1529196076),
  IFCROOF:              ifc('IFCROOF',              2016517767),
  IFCCURTAINWALL:       ifc('IFCCURTAINWALL',       3495092785),
  // Structure
  IFCCOLUMN:            ifc('IFCCOLUMN',            843113511),
  IFCBEAM:              ifc('IFCBEAM',              753842376),
  IFCFOOTING:           ifc('IFCFOOTING',           900683007),
  IFCPILE:              ifc('IFCPILE',              1687234759),
  IFCPLATE:             ifc('IFCPLATE',             3171933400),
  IFCMEMBER:            ifc('IFCMEMBER',            1073191201),
  // Escaliers / Rampes
  IFCSTAIR:             ifc('IFCSTAIR',             331165859),
  IFCSTAIRFLIGHT:       ifc('IFCSTAIRFLIGHT',       4252922144),
  IFCRAMP:              ifc('IFCRAMP',              3824725483),
  IFCRAMPFLIGHT:        ifc('IFCRAMPFLIGHT',        3893378262),
  IFCRAILING:           ifc('IFCRAILING',           2262370178),
  // Menuiseries
  IFCWINDOW:            ifc('IFCWINDOW',            3304561284),
  IFCDOOR:              ifc('IFCDOOR',              395920057),
  // MEP — CVC
  IFCDUCTSEGMENT:       ifc('IFCDUCTSEGMENT',       3588903617),
  IFCDUCTFITTING:       ifc('IFCDUCTFITTING',       869906466),
  IFCAIRHANDLINGUNIT:   ifc('IFCAIRHANDLINGUNIT',   277319702),
  IFCSPACEHEATER:       ifc('IFCSPACEHEATER',       1305183839),
  IFCBOILER:            ifc('IFCBOILER',            32344328),
  IFCCHILLER:           ifc('IFCCHILLER',           3902619387),
  IFCCOIL:              ifc('IFCCOIL',              4136498852),
  IFCFAN:               ifc('IFCFAN',               3415622556),
  IFCUNITARYEQUIPMENT:  ifc('IFCUNITARYEQUIPMENT',  4292641817),
  IFCHUMIDIFIER:        ifc('IFCHUMIDIFIER',        3599934289),
  IFCEVAPORATOR:        ifc('IFCEVAPORATOR',        484807127),
  IFCCONDENSER:         ifc('IFCCONDENSER',         2272882330),
  IFCHEATEXCHANGER:     ifc('IFCHEATEXCHANGER',     3319311131),
  IFCCOMPRESSOR:        ifc('IFCCOMPRESSOR',        3221913625),
  IFCDAMPER:            ifc('IFCDAMPER',            1360408905),
  IFCVALVE:             ifc('IFCVALVE',             4207607924),
  // MEP — Plomberie
  IFCPIPESEGMENT:       ifc('IFCPIPESEGMENT',       4231323485),
  IFCPIPEFITTING:       ifc('IFCPIPEFITTING',       395041908),
  IFCPUMP:              ifc('IFCPUMP',              90941305),
  IFCTANK:              ifc('IFCTANK',              4097777520),
  IFCSANITARYTERMINAL:  ifc('IFCSANITARYTERMINAL',  3053780830),
  IFCWASTETERMINAL:     ifc('IFCWASTETERMINAL',     4217484030),
  IFCFIRESUPPRESSIONTERMINAL: ifc('IFCFIRESUPPRESSIONTERMINAL', 1426591983),
  // MEP — Électricité
  IFCELECTRICDISTRIBUTIONBOARD: ifc('IFCELECTRICDISTRIBUTIONBOARD', 3277789161),
  IFCLIGHTFIXTURE:      ifc('IFCLIGHTFIXTURE',      629592764),
  IFCELECTRICAPPLIANCE: ifc('IFCELECTRICAPPLIANCE', 51545143),
  IFCJUNCTIONBOX:       ifc('IFCJUNCTIONBOX',       2449260625),
  IFCPROTECTIVEDEVICE:  ifc('IFCPROTECTIVEDEVICE',  738039164),
  IFCSENSOR:            ifc('IFCSENSOR',            4086658281),
  IFCACTUATOR:          ifc('IFCACTUATOR',          4288193352),
  IFCALARM:             ifc('IFCALARM',             3087945054),
  IFCELECTRICMOTOR:     ifc('IFCELECTRICMOTOR',     1090812506),
  IFCTRANSFORMER:       ifc('IFCTRANSFORMER',       3825984169),
  IFCCABLESEGMENT:      ifc('IFCCABLESEGMENT',      4217484030),
  IFCCABLEFITTING:      ifc('IFCCABLEFITTING',      2938052489),
  // Espaces
  IFCSPACE:             ifc('IFCSPACE',             3856911033),
  IFCZONE:              ifc('IFCZONE',              1033361043),
  // Mobilier & équipements divers
  IFCFURNISHINGELEMENT: ifc('IFCFURNISHINGELEMENT', 263784265),
  IFCFURNITURE:         ifc('IFCFURNITURE',         1509553395),
  IFCSYSTEMFURNITURELEMENT: ifc('IFCSYSTEMFURNITURELEMENT', 3278254401),
  IFCBUILDINGELEMENTPROXY: ifc('IFCBUILDINGELEMENTPROXY', 1095909175),
  IFCELEMENTASSEMBLY:   ifc('IFCELEMENTASSEMBLY',   412334446),
  IFCBUILDINGELEMENTPART: ifc('IFCBUILDINGELEMENTPART', 2979338954),
  IFCDISCRETEACCESSORY: ifc('IFCDISCRETEACCESSORY', 1335981549),
  IFCPROXY:             ifc('IFCPROXY',             1899726724),
  IFCMEDICALDEVICE:     ifc('IFCMEDICALDEVICE',     1437502449),
  IFCTRANSPORTDEVICE:   ifc('IFCTRANSPORTDEVICE',   3815607619),
  // Finitions
  IFCCOVERING:          ifc('IFCCOVERING',          1973544240),
  IFCCOVERINGTYPE:      ifc('IFCCOVERINGTYPE',      1916426348),
  IFCFLOORINGTYPE:      ifc('IFCFLOORINGTYPE',      3009204131),
};

// ── Types non-géométriques utiles pour l'analyse ──────────────────────────────
const META_TYPES = {
  IFCPROJECT:           ifc('IFCPROJECT',           103090709),
  IFCSITE:              ifc('IFCSITE',              4097777520),
  IFCBUILDING:          ifc('IFCBUILDING',          4031249490),
  IFCBUILDINGSTOREY:    ifc('IFCBUILDINGSTOREY',    3124254112),
  IFCRELCONTAINEDINSPATIALSTRUCTURE: ifc('IFCRELCONTAINEDINSPATIALSTRUCTURE', 3242617779),
  IFCRELAGGREGATES:     ifc('IFCRELAGGREGATES',     2551354335),
  IFCRELDEFINESBYTYPE:  ifc('IFCRELDEFINESBYTYPE',  781010003),
  IFCRELDEFINESBYPROPERTIES: ifc('IFCRELDEFINESBYPROPERTIES', 4186316022),
  IFCMATERIAL:          ifc('IFCMATERIAL',          1440319273),
  IFCMATERIALLAYERSET:  ifc('IFCMATERIALLAYERSET',  3303938423),
};

// ── Classification : typeNum → calque métier ─────────────────────────────────
// Tableaux hissés en constantes de module (perf : ne sont plus recréés à chaque appel)
const _CL_GO     = new Set([GEOM_TYPES.IFCWALLSTANDARDCASE, GEOM_TYPES.IFCWALL, GEOM_TYPES.IFCSLAB, GEOM_TYPES.IFCROOF, GEOM_TYPES.IFCCURTAINWALL]);
const _CL_STRUCT = new Set([GEOM_TYPES.IFCCOLUMN, GEOM_TYPES.IFCBEAM, GEOM_TYPES.IFCFOOTING, GEOM_TYPES.IFCPILE, GEOM_TYPES.IFCPLATE, GEOM_TYPES.IFCMEMBER, GEOM_TYPES.IFCSTAIR, GEOM_TYPES.IFCSTAIRFLIGHT, GEOM_TYPES.IFCRAMP, GEOM_TYPES.IFCRAMPFLIGHT, GEOM_TYPES.IFCRAILING]);
const _CL_CVC    = new Set([GEOM_TYPES.IFCDUCTSEGMENT, GEOM_TYPES.IFCDUCTFITTING, GEOM_TYPES.IFCAIRHANDLINGUNIT, GEOM_TYPES.IFCSPACEHEATER, GEOM_TYPES.IFCBOILER, GEOM_TYPES.IFCCHILLER, GEOM_TYPES.IFCCOIL, GEOM_TYPES.IFCFAN, GEOM_TYPES.IFCUNITARYEQUIPMENT, GEOM_TYPES.IFCHUMIDIFIER, GEOM_TYPES.IFCEVAPORATOR, GEOM_TYPES.IFCCONDENSER, GEOM_TYPES.IFCHEATEXCHANGER, GEOM_TYPES.IFCCOMPRESSOR, GEOM_TYPES.IFCDAMPER, GEOM_TYPES.IFCVALVE]);
const _CL_PLB    = new Set([GEOM_TYPES.IFCPIPESEGMENT, GEOM_TYPES.IFCPIPEFITTING, GEOM_TYPES.IFCPUMP, GEOM_TYPES.IFCTANK, GEOM_TYPES.IFCSANITARYTERMINAL, GEOM_TYPES.IFCWASTETERMINAL, GEOM_TYPES.IFCFIRESUPPRESSIONTERMINAL]);
const _CL_ELEC   = new Set([GEOM_TYPES.IFCELECTRICDISTRIBUTIONBOARD, GEOM_TYPES.IFCLIGHTFIXTURE, GEOM_TYPES.IFCELECTRICAPPLIANCE, GEOM_TYPES.IFCJUNCTIONBOX, GEOM_TYPES.IFCPROTECTIVEDEVICE, GEOM_TYPES.IFCSENSOR, GEOM_TYPES.IFCACTUATOR, GEOM_TYPES.IFCALARM, GEOM_TYPES.IFCELECTRICMOTOR, GEOM_TYPES.IFCTRANSFORMER, GEOM_TYPES.IFCCABLESEGMENT, GEOM_TYPES.IFCCABLEFITTING]);
const _CL_SPACE  = new Set([GEOM_TYPES.IFCSPACE, GEOM_TYPES.IFCZONE]);
const _CL_FURN   = new Set([GEOM_TYPES.IFCFURNISHINGELEMENT, GEOM_TYPES.IFCFURNITURE, GEOM_TYPES.IFCSYSTEMFURNITURELEMENT, GEOM_TYPES.IFCMEDICALDEVICE, GEOM_TYPES.IFCTRANSPORTDEVICE]);
const _CL_GENERIC = new Set([
  GEOM_TYPES.IFCBUILDINGELEMENTPROXY,
  GEOM_TYPES.IFCELEMENTASSEMBLY,
  GEOM_TYPES.IFCBUILDINGELEMENTPART,
  GEOM_TYPES.IFCDISCRETEACCESSORY,
  GEOM_TYPES.IFCPROXY,
]);
const _CL_FIN    = new Set([GEOM_TYPES.IFCCOVERING, GEOM_TYPES.IFCCOVERINGTYPE, GEOM_TYPES.IFCFLOORINGTYPE]);

function classifyType(n) {
  if (_CL_GO.has(n))     return 'Gros-Œuvre';
  if (_CL_STRUCT.has(n)) return 'Structure';
  if (n === GEOM_TYPES.IFCWINDOW) return 'Fenêtres';
  if (n === GEOM_TYPES.IFCDOOR)   return 'Portes';
  if (_CL_CVC.has(n))   return 'MEP — CVC';
  if (_CL_PLB.has(n))   return 'MEP — Plomberie';
  if (_CL_ELEC.has(n))  return 'MEP — Électricité';
  if (_CL_SPACE.has(n)) return 'Espaces';
  if (_CL_FURN.has(n))  return 'Mobilier';
  if (_CL_GENERIC.has(n)) return 'Objets génériques';
  if (_CL_FIN.has(n))   return 'Finitions';
  return null;
}

function looksLikeFurniture(...parts) {
  const txt = parts
    .filter(Boolean)
    .map(v => String(v).toLowerCase())
    .join(' ');
  if (!txt) return false;
  return /(mobilier|furniture|furnishing|chair|table|desk|sofa|cabinet|armoire|meuble|lit|bed|seating|seat|banquette|bureau|chaise|fauteuil|canape|canapé)/.test(txt);
}

function resolveLayerName(typeNum, name, objectType, familyName) {
  const base = classifyType(typeNum);
  if (base === 'Objets génériques' && looksLikeFurniture(name, objectType, familyName)) {
    return 'Mobilier';
  }
  if (!base && looksLikeFurniture(name, objectType, familyName)) {
    return 'Mobilier';
  }
  return base || `IFC_${typeNum}`;
}

// ── Définitions visuelles par calque ─────────────────────────────────────────
const LAYER_DEFS = {
  'Gros-Œuvre':        { color: 0xaedcff, emissive: 0x141820, icon: '🏗', shininess: 12 },
  'Structure':         { color: 0x7a8898, emissive: 0x0c1018, icon: '🔩', shininess: 8  },
  'Fenêtres':          { color: 0x9dd4f0, emissive: 0x051015, icon: '🪟', transparent: true, opacity: 0.45, shininess: 90 },
  'Portes':            { color: 0xc8a06a, emissive: 0x1a1008, icon: '🚪', shininess: 22 },
  'MEP — CVC':         { color: 0xff8c42, emissive: 0x1a0a00, icon: '🌡', shininess: 45 },
  'MEP — Plomberie':   { color: 0x42a5f5, emissive: 0x001525, icon: '🔧', shininess: 65 },
  'MEP — Électricité': { color: 0xffe566, emissive: 0x1a1500, icon: '⚡', shininess: 55 },
  'Espaces':           { color: 0x7777ee, emissive: 0x06061a, icon: '📐', transparent: true, opacity: 0.08, shininess: 0  },
  'Mobilier':          { color: 0xd4a574, emissive: 0x1a1008, icon: '🪑', shininess: 28 },
  'Finitions':         { color: 0xe8dfc0, emissive: 0x181408, icon: '🎨', shininess: 10 },
};
// Couleurs supplémentaires pour calques dynamiques inconnus
const EXTRA_COLORS = [0xe74c3c,0x2ecc71,0x9b59b6,0xf39c12,0x1abc9c,0xe91e63,0x00bcd4,0xff5722];
let _extraColorIdx = 0;
function layerDef(name) {
  if (LAYER_DEFS[name]) return LAYER_DEFS[name];
  const c = EXTRA_COLORS[_extraColorIdx++ % EXTRA_COLORS.length];
  LAYER_DEFS[name] = { color: c, emissive: 0x080808, icon: '📦', shininess: 15 };
  return LAYER_DEFS[name];
}
// ── Plan de coupe — déclaré tôt pour être injecté dans chaque matériau dès sa création
const sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
let sectionActive = false;

function layerMat(layerName) {
  const l = layerDef(layerName);
  return new THREE.MeshPhongMaterial({
    color: l.color, emissive: l.emissive,
    transparent: l.transparent || false,
    opacity: l.opacity ?? 1.0,
    shininess: l.shininess ?? 20,
    side: THREE.DoubleSide,           // DoubleSide partout : sections nettes
    clippingPlanes: sectionActive ? [sectionPlane] : [],
    clipShadows: true,
  });
}

// ── Three.js ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bim-canvas');
const wrap   = document.getElementById('canvas-wrap');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0d0f14);
renderer.localClippingEnabled = true; // Obligatoire : doit être actif dès le départ
// Active le clipping local dès le départ — obligatoire pour que les matériaux l'honorent
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d0f14, 0.005);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
camera.position.set(30, 25, 40);

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const sun = new THREE.DirectionalLight(0xfff8e8, 1.1);
sun.position.set(80, 120, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { near:0.5, far:800, left:-80, right:80, top:80, bottom:-80 });
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9ab4d8, 0.3);
fill.position.set(-50, 30, -30);
scene.add(fill);

const grid = new THREE.GridHelper(500, 100, 0x161e2a, 0x111820);
grid.material.transparent = true; grid.material.opacity = 0.45;
scene.add(grid);

// Sol désactivé : le plan de sol n'est plus ajouté à la scène

// ── IFC Loader ────────────────────────────────────────────────────────────────
const ifcLoader = new IFCLoader();
let ifcReady = false;

async function initIFC() {
  try {
    await ifcLoader.ifcManager.setWasmPath('https://cdn.jsdelivr.net/npm/web-ifc@0.0.36/', true);
    if (typeof ifcLoader.ifcManager.applyWebIfcConfig === 'function')
      await ifcLoader.ifcManager.applyWebIfcConfig({ USE_FAST_BOOLS: true });
    if (typeof ifcLoader.ifcManager.parser?.setupOptionalCategories === 'function')
      await ifcLoader.ifcManager.parser.setupOptionalCategories({ [GEOM_TYPES.IFCSPACE]: true });
    ifcReady = true;
    console.log('[BIM] IFC WASM ready');
  } catch(e) {
    console.warn('[BIM] WASM warning (non-fatal):', e.message);
    ifcReady = true;
  }
}

// ── Stores ────────────────────────────────────────────────────────────────────
const BIMObjects = {}; // objId → { mesh, name, type(layer), props, expressID, modelID, familyType, storey }
const Groups     = {}; // layerName   → mesh[]
const Families   = {}; // familyName  → expressID[]
const Storeys    = {}; // storeyName  → expressID[]
let modelID_current = null;
let ifcModelLoaded  = false;
let modelMesh_current = null;
let selectedId      = null;
let wireframeMode   = false;
let xrayMode        = false;
let totalTris       = 0;
let projectInfo     = {};
let leftTab         = 'layers';

// ── État avancé: Isolation, Recherche, Hiérarchie ─────────────────────────────
let isolationActive = false;
let isolatedObjects = new Set(); // IDs des objets isolés
const visibilityStateBeforeIsolation = {}; // Pour restaurer l'état
let searchResults = [];
let currentSearchIndex = 0;
const spatialHierarchy = {}; // Structure hiérarchique IFC

// ═════════════════════════════════════════════════════════════════════════════
//  CHARGEMENT IFC
// ═════════════════════════════════════════════════════════════════════════════
async function loadIFCFile(input) {
  const file = input?.files?.[0];
  if (!file) return;
  await loadIFCFromFile(file);
}

function isSupportedIFCFile(file) {
  if (!file?.name) return false;
  const name = file.name.toLowerCase();
  return name.endsWith('.ifc') || name.endsWith('.ifczip');
}

async function loadIFCFromFile(file) {
  if (!file || !isSupportedIFCFile(file)) {
    setLoadingMsg('⚠ Fichier non supporté (utilisez .ifc ou .ifczip)');
    document.getElementById('loading').style.display = 'flex';
    setTimeout(() => document.getElementById('loading').style.display = 'none', 2200);
    return;
  }

  // ── Nettoyage du modèle précédent ─────────────────────────────────────────
  if (ifcModelLoaded && modelID_current !== null) {
    try { await ifcLoader.ifcManager.close(modelID_current); } catch {}
    // Nettoyage complet de la scène : retire tous les meshes (subsets et mesh racine)
    Object.values(BIMObjects).forEach(o => {
      try {
        if (o.mesh && o.mesh.parent) o.mesh.parent.remove(o.mesh);
      } catch {}
    });
    // Supprime aussi tous les enfants de la scène qui sont des subsets orphelins ou le mesh racine IFC
    scene.traverse(obj => {
      if (obj.isMesh && obj.userData?.id && !BIMObjects[obj.userData.id]) {
        try { obj.parent.remove(obj); } catch {}
      }
      // Supprime le mesh racine du modèle précédent s'il existe (nom générique ou tag IFCModel)
      if (obj.isMesh && (obj.name === 'IFCModel' || obj.type === 'Mesh' || obj.userData?.ifcModel)) {
        try { obj.parent.remove(obj); } catch {}
      }
    });
    for (const k in BIMObjects) delete BIMObjects[k];
    for (const k in Groups)     delete Groups[k];
    for (const k in Families)   delete Families[k];
    for (const k in Storeys)    delete Storeys[k];
    for (const k in _storeyIndex) delete _storeyIndex[k];
    _storeyIndexBuilt = false;
    // Réinitialiser les calques dynamiques ajoutés
    Object.keys(LAYER_DEFS).forEach(k => {
      if (!['Gros-Œuvre','Structure','Fenêtres','Portes','MEP — CVC','MEP — Plomberie','MEP — Électricité','Espaces','Mobilier','Finitions'].includes(k))
        delete LAYER_DEFS[k];
    });
    _extraColorIdx = 0;
    selectedId = null; totalTris = 0; projectInfo = {};
    modelMesh_current = null;
    showPropPanel(null);
  }

  document.getElementById('loading').style.display = 'flex';
  if (!ifcReady) { setLoadingMsg('Init WASM…'); await initIFC(); }

  try {
    setLoadingMsg('Lecture du fichier…');
    const data = new Uint8Array(await file.arrayBuffer());

    setLoadingMsg('Parsing IFC via WASM…');
    const model = await ifcLoader.ifcManager.parse(data);
    modelID_current = model.modelID;
    ifcModelLoaded  = true;
    modelMesh_current = model.mesh;
    // Le mesh racine du modèle est ajouté à la scène — il contient toute la géo
    scene.add(model.mesh);

    setLoadingMsg('Informations projet…');
    await readProjectInfo(model.modelID);

    setLoadingMsg('Arbre spatial (niveaux)…');
    await readSpatialStructure(model.modelID);

    setLoadingMsg('Index spatial (niveaux)…');
    await buildStoreyIndex(model.modelID);

    setLoadingMsg('Extraction des éléments…');
    await extractElements(model.modelID, model.mesh, setLoadingMsg);
    // Après extraction, masquer le mesh racine pour éviter la duplication visuelle
    if (model.mesh) {
      model.mesh.visible = false;
    }

    setLoadingMsg('Construction des calques…');
    leftTab = 'layers';
    buildPanel();
    updateStats();
    fitCameraToModel();

    // Construire la hiérarchie spatiale en arrière-plan
    buildSpatialHierarchy().catch(e => console.warn('[BIM] Hiérarchie:', e));

    document.getElementById('loading').style.display = 'none';
    document.getElementById('stat-format').textContent = `IFC — ${file.name}`;
    showProjectBanner(file.name);

  } catch(e) {
    console.error('[BIM] Load error:', e);
    setLoadingMsg('⚠ ' + (e.message || String(e)));
    setTimeout(() => document.getElementById('loading').style.display = 'none', 5000);
  }
}

function setupIFCDragDrop() {
  const dropOverlay = document.getElementById('ifc-drop-overlay');
  let dragDepth = 0;

  const setDropUI = active => {
    wrap.classList.toggle('drag-over', active);
    if (dropOverlay) dropOverlay.classList.toggle('active', active);
  };

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    window.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  wrap.addEventListener('dragenter', e => {
    e.preventDefault();
    dragDepth++;
    setDropUI(true);
  });

  wrap.addEventListener('dragover', e => {
    e.preventDefault();
    setDropUI(true);
  });

  wrap.addEventListener('dragleave', e => {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) setDropUI(false);
  });

  wrap.addEventListener('drop', async e => {
    e.preventDefault();
    dragDepth = 0;
    setDropUI(false);

    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    await loadIFCFromFile(files[0]);
  });
}

// ── Lecture des infos projet ──────────────────────────────────────────────────
async function readProjectInfo(mid) {
  const mgr = ifcLoader.ifcManager;
  const safe = v => v?.value ?? v ?? '—';
  try {
    const pids = await mgr.getAllItemsOfType(mid, META_TYPES.IFCPROJECT, false);
    if (pids?.length) {
      const p = await mgr.getItemProperties(mid, pids[0], false);
      projectInfo.name        = safe(p?.Name)        || safe(p?.LongName) || '—';
      projectInfo.description = safe(p?.Description) || '—';
      projectInfo.phase       = safe(p?.Phase)        || '—';
    }
  } catch {}
  try {
    const sids = await mgr.getAllItemsOfType(mid, META_TYPES.IFCSITE, false);
    if (sids?.length) {
      const s = await mgr.getItemProperties(mid, sids[0], false);
      projectInfo.site = safe(s?.Name) || safe(s?.LongName) || '—';
    }
  } catch {}
  try {
    const bids = await mgr.getAllItemsOfType(mid, META_TYPES.IFCBUILDING, false);
    if (bids?.length) {
      const b = await mgr.getItemProperties(mid, bids[0], false);
      projectInfo.building    = safe(b?.Name)        || safe(b?.LongName) || '—';
      projectInfo.buildingRef = safe(b?.BuildingAddress) || '—';
    }
  } catch {}
}

// ── Lecture arbre spatial → Storeys ──────────────────────────────────────────
async function readSpatialStructure(mid) {
  const mgr = ifcLoader.ifcManager;
  try {
    // Lire tous les BuildingStoreys directement
    const sids = await mgr.getAllItemsOfType(mid, META_TYPES.IFCBUILDINGSTOREY, false);
    for (const sid of (sids || [])) {
      const sp = await mgr.getItemProperties(mid, sid, false);
      const sname = strVal(sp?.Name) || strVal(sp?.LongName) || `Niveau #${sid}`;
      if (!Storeys[sname]) Storeys[sname] = [];
      Storeys[sname]._storeyExpressID = sid;
    }
  } catch(e) { console.warn('[BIM] storeys:', e.message); }
}

// ── Extraction de tous les éléments ──────────────────────────────────────────
function collectExpressIDsFromMesh(mesh) {
  const ids = new Set();
  if (!mesh) return [];
  mesh.traverse(node => {
    if (!node?.isMesh || !node.geometry) return;
    const a = node.geometry.getAttribute('expressID')
           || node.geometry.getAttribute('expressId')
           || node.geometry.getAttribute('ifcExpressID');
    if (!a || !a.count) return;
    for (let i = 0; i < a.count; i++) {
      const val = a.getX(i);
      if (Number.isFinite(val) && val > 0) ids.add(val);
    }
  });
  return [...ids];
}

async function extractElements(mid, modelMesh, progress) {
  const mgr  = ifcLoader.ifcManager;
  let expressIDs = collectExpressIDsFromMesh(modelMesh);

  // Fallback si l'attribut expressID n'est pas présent dans la géométrie
  if (!expressIDs.length) {
    const fallbackTypes = [...new Set(Object.values(GEOM_TYPES))];
    for (const typeNum of fallbackTypes) {
      try {
        const ids = await mgr.getAllItemsOfType(mid, typeNum, false);
        (ids || []).forEach(id => expressIDs.push(id));
      } catch {}
    }
    expressIDs = [...new Set(expressIDs)];
  }

  let done = 0;
  for (const eid of expressIDs) {
    const objId = `ifc_${eid}`;
    if (BIMObjects[objId]) {
      done++;
      if (done % 100 === 0 || done === expressIDs.length) progress(`Extraction… ${done}/${expressIDs.length} éléments`);
      continue;
    }

    try {
      const props = await mgr.getItemProperties(mid, eid, false);
      let typeNum = null;
      try {
        if (typeof mgr.getIfcType === 'function') typeNum = mgr.getIfcType(mid, eid);
      } catch {}
      if (typeof typeNum !== 'number') typeNum = props?.type;

      const typeLabel = ifcTypeName(typeNum);
      const name  = strVal(props?.Name) || strVal(props?.LongName)
                 || strVal(props?.Description) || `${typeLabel} #${eid}`;
      const objectType = strVal(props?.ObjectType) || strVal(props?.Tag) || '';
      const tag        = strVal(props?.Tag) || '';

      let familyName  = objectType;
      let familyProps = {};
      try {
        const typeRels = await mgr.getTypeProperties(mid, eid, false);
        if (typeRels?.length) {
          const tr  = typeRels[0];
          const fn  = strVal(tr?.Name) || strVal(tr?.LongName);
          if (fn) familyName = fn;
          if (tr?.Description?.value) familyProps['Desc. famille'] = tr.Description.value;
          if (tr?.ApplicableOccurrence?.value) familyProps['Occurrence'] = tr.ApplicableOccurrence.value;
        }
      } catch {}

      const layerName = resolveLayerName(typeNum, name, objectType, familyName);
      if (!Groups[layerName]) Groups[layerName] = [];

      const psets = {};
      try {
        const psData = await mgr.getPropertySets(mid, eid, true);
        for (const ps of (psData || [])) {
          const psName = strVal(ps?.Name) || 'Pset';
          for (const prop of (ps?.HasProperties || [])) {
            const k = strVal(prop?.Name);
            const v = prop?.NominalValue?.value ?? prop?.Value?.value;
            if (k && v != null) psets[`${psName}::${k}`] = String(v);
          }
          for (const qty of (ps?.Quantities || [])) {
            const k = strVal(qty?.Name);
            const v = qty?.LengthValue?.value  ?? qty?.AreaValue?.value
                   ?? qty?.VolumeValue?.value  ?? qty?.WeightValue?.value
                   ?? qty?.CountValue?.value   ?? qty?.TimeValue?.value;
            if (k && v != null) psets[`${psName}::${k}`] = fmtQty(k, v);
          }
        }
      } catch {}

      let materiaux = '';
      try {
        const matData = await mgr.getMaterialsProperties(mid, eid, true);
        const names = (matData || [])
          .map(m => strVal(m?.Name) || strVal(m?.Category))
          .filter(Boolean);
        if (names.length) materiaux = names.join(', ');
      } catch {}

      const _sn = findStorey(mid, eid);
      const storeyName = _sn || '—';

      if (familyName) {
        if (!Families[familyName]) Families[familyName] = [];
        Families[familyName].push(eid);
      }
      if (storeyName !== '—') {
        if (!Storeys[storeyName]) Storeys[storeyName] = [];
        Storeys[storeyName].push(eid);
      }

      const subset = mgr.createSubset({
        modelID: mid, ids: [eid], scene,
        removePrevious: false, customID: objId,
        material: layerMat(layerName),
      });
      if (!subset) {
        done++;
        if (done % 100 === 0 || done === expressIDs.length) progress(`Extraction… ${done}/${expressIDs.length} éléments`);
        continue;
      }
      subset.userData = { id: objId, name, layer: layerName, expressID: eid };

      const finalProps = {
        'Type IFC':   typeLabel,
        'Nom':        name,
        ...(objectType && objectType !== name ? { 'Type objet': objectType } : {}),
        ...(tag && tag !== name && tag !== objectType ? { 'Repère': tag } : {}),
        ...(familyName && familyName !== name && familyName !== objectType ? { 'Famille / Type': familyName } : {}),
        ...(materiaux ? { 'Matériaux': materiaux } : {}),
        'Niveau':     storeyName,
        'ExpressID':  eid,
        ...familyProps,
        ...psets,
      };

      BIMObjects[objId] = {
        mesh: subset, name,
        type: layerName,
        props: finalProps,
        expressID: eid, modelID: mid,
        familyType: familyName,
        storey: storeyName,
      };
      Groups[layerName].push(subset);
      const g = subset.geometry;
      if (g?.index) totalTris += g.index.count / 3;

    } catch {}

    done++;
    if (done % 100 === 0 || done === expressIDs.length) progress(`Extraction… ${done}/${expressIDs.length} éléments`);
  }
}

// ── Index storey : construit une seule fois, O(1) ensuite ────────────────────
const _storeyIndex = {}; // expressID → storeyName
let   _storeyIndexBuilt = false;

async function buildStoreyIndex(mid) {
  if (_storeyIndexBuilt) return;
  _storeyIndexBuilt = true;
  try {
    const mgr  = ifcLoader.ifcManager;
    const rels  = await mgr.getAllItemsOfType(mid, META_TYPES.IFCRELCONTAINEDINSPATIALSTRUCTURE, false);
    for (const relID of (rels || [])) {
      try {
        const rel    = await mgr.getItemProperties(mid, relID, false);
        const elems  = rel?.RelatedElements;
        if (!Array.isArray(elems)) continue;
        const containerRef = rel?.RelatingStructure;
        const containerID  = containerRef?.value ?? containerRef;
        if (!containerID) continue;
        const cp  = await mgr.getItemProperties(mid, containerID, false);
        const sn  = strVal(cp?.Name) || strVal(cp?.LongName) || `Niveau #${containerID}`;
        for (const e of elems) {
          const id = e?.value ?? e;
          if (typeof id === 'number') _storeyIndex[id] = sn;
        }
      } catch {}
    }
  } catch(e) { console.warn('[BIM] storeyIndex:', e.message); }
}

function findStorey(mid, eid) {
  return _storeyIndex[eid] ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function strVal(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (val?.value !== undefined) return String(val.value).trim();
  return '';
}
function fmtQty(key, val) {
  const k = key.toLowerCase();
  if (k.includes('area'))   return `${(+val).toFixed(2)} m²`;
  if (k.includes('volume')) return `${(+val).toFixed(3)} m³`;
  if (k.includes('length') || k.includes('height') || k.includes('width') || k.includes('depth') || k.includes('perimeter'))
                             return `${(+val).toFixed(3)} m`;
  if (k.includes('weight')) return `${(+val).toFixed(1)} kg`;
  if (k.includes('count'))  return String(Math.round(+val));
  return String(Math.round(+val * 1000) / 1000);
}
function ifcTypeName(n) {
  if (typeof n !== 'number') return 'IFC_UNKNOWN';
  if (IFC_TYPE_NAME_BY_CODE[n]) return IFC_TYPE_NAME_BY_CODE[n];
  for (const [k, v] of Object.entries(GEOM_TYPES)) if (v === n) return k;
  for (const [k, v] of Object.entries(META_TYPES)) if (v === n) return k;
  return `IFC_${n}`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  PANNEAU GAUCHE — Calques / Familles / Niveaux
// ═════════════════════════════════════════════════════════════════════════════
function buildPanel() {
  // Onglets
  const tabs = document.getElementById('left-tabs');
  if (tabs) {
    const nf = Object.keys(Families).length;
    const ns = Object.keys(Storeys).filter(k => !k.startsWith('_')).length;
    const nh = spatialHierarchy.sites ? spatialHierarchy.sites.length : 0;
    tabs.innerHTML = `
      <button class="ltab ${leftTab==='layers'  ?'active':''}"  id="tab-layers">Calques</button>
      <button class="ltab ${leftTab==='families'?'active':''}" id="tab-families">Familles <span class="tbadge">${nf}</span></button>
      <button class="ltab ${leftTab==='storeys' ?'active':''}"  id="tab-storeys">Niveaux <span class="tbadge">${ns}</span></button>
      <button class="ltab ${leftTab==='hierarchy'?'active':''}" id="tab-hierarchy">Hiérarchie</button>`;
    document.getElementById('tab-layers')    ?.addEventListener('click', () => { leftTab='layers';    buildPanel(); });
    document.getElementById('tab-families')  ?.addEventListener('click', () => { leftTab='families';  buildPanel(); });
    document.getElementById('tab-storeys')   ?.addEventListener('click', () => { leftTab='storeys';   buildPanel(); });
    document.getElementById('tab-hierarchy') ?.addEventListener('click', () => { leftTab='hierarchy'; buildPanel(); });
  }

  const list = document.getElementById('layer-list');
  list.innerHTML = '';
  // Add expand/collapse all buttons for layers tab
  if (leftTab === 'layers') {
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;justify-content:flex-end;';
    const btnCollapse = document.createElement('button');
    btnCollapse.textContent = '− Réduire tout';
    btnCollapse.title = 'Réduire tous les groupes';
    btnCollapse.style.cssText = 'padding:2px 10px;font-size:11px;border-radius:4px;border:1px solid var(--border);background:var(--panel2);color:var(--muted);cursor:pointer;';
    btnCollapse.addEventListener('click', () => {
      list.querySelectorAll('.layer-group').forEach(grp => grp.classList.remove('open'));
    });
    const btnExpand = document.createElement('button');
    btnExpand.textContent = '+ Développer tout';
    btnExpand.title = 'Développer tous les groupes';
    btnExpand.style.cssText = 'padding:2px 10px;font-size:11px;border-radius:4px;border:1px solid var(--border);background:var(--panel2);color:var(--muted);cursor:pointer;';
    btnExpand.addEventListener('click', () => {
      list.querySelectorAll('.layer-group').forEach(grp => grp.classList.add('open'));
    });
    controls.appendChild(btnCollapse);
    controls.appendChild(btnExpand);
    list.appendChild(controls);
    renderLayersTab(list);
  }
  if (leftTab === 'families')  renderFamiliesTab(list);
  if (leftTab === 'storeys')   renderStoreysTab(list);
  if (leftTab === 'hierarchy') renderSpatialHierarchyTab(list);
}

// ── Onglet Calques ────────────────────────────────────────────────────────────
function renderLayersTab(list) {
  const names = Object.keys(Groups).sort();
  if (!names.length) { showWelcome(list); return; }

  names.forEach(name => {
    const items = Groups[name];
    const def   = layerDef(name);
    const hex   = '#' + def.color.toString(16).padStart(6,'0');

    const grp = document.createElement('div');
    grp.className = 'layer-group open';

    const hdr = document.createElement('div');
    hdr.className = 'layer-group-header';

    // Insert color picker button directly in action span
    hdr.innerHTML += `
      <span>${def.icon} ${name}</span>
      <span style="font-size:10px;color:#6b7280;margin-left:4px">${items.length}</span>
      <span style="margin-left:auto;display:flex;gap:4px;align-items:center">
        <button class="layer-color-btn" title="Changer la couleur du calque" style="background:${hex}"></button>
        <span class="toggle-eye">👁</span>
        <button class="focus-btn" style="display:flex" title="Centrer sur le calque">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M3 12h2M19 12h2M12 3v2M12 19v2"/><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/></svg>
        </button>
      </span>
      <span class="layer-arrow">▶</span>`;

    // Setup color picker button
    const actionSpan = hdr.querySelector('span[style*="margin-left:auto"]');
    const colorBtn = actionSpan.querySelector('.layer-color-btn');
    // Create hidden color input
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = hex;
    colorInput.style.position = 'absolute';
    colorInput.style.opacity = 0;
    colorInput.style.pointerEvents = 'auto';
    colorInput.style.left = '0';
    colorInput.style.top = '0';
    colorInput.style.width = '100%';
    colorInput.style.height = '100%';
    colorBtn.appendChild(colorInput);

    // Only stopPropagation for colorBtn events, not preventDefault
    ['mousedown','mouseup','click'].forEach(evt => {
      colorBtn.addEventListener(evt, e => { e.stopPropagation(); });
    });
    colorBtn.addEventListener('click', () => {
      colorInput.click();
    });
    colorInput.addEventListener('click', e => { e.stopPropagation(); });
    colorInput.addEventListener('input', e => {
      e.stopPropagation();
      const newColor = colorInput.value;
      colorBtn.style.background = newColor;
      // Update layer color in LAYER_DEFS
      const rgb = parseInt(newColor.replace('#',''), 16);
      LAYER_DEFS[name].color = rgb;
      // Update color for all objects in layer
      Groups[name]?.forEach(mesh => {
        if (mesh.material) mesh.material.color.set(rgb);
      });
    });

    // Setup other actions
    const eye = actionSpan.querySelector('.toggle-eye');
    eye.addEventListener('click', e => { e.stopPropagation(); toggleLayer(name, eye); });
    actionSpan.querySelector('.focus-btn').addEventListener('click', e => { e.stopPropagation(); focusGroup(name); });
    hdr.addEventListener('click', () => grp.classList.toggle('open'));
    grp.appendChild(hdr);
    // (Removed duplicate setup, only use actionSpan context)

    const body = document.createElement('div');
    body.className = 'layer-items';
    addMeshRows(body, items, 25);
    grp.appendChild(body);
    list.appendChild(grp);
  });
}

// ── Onglet Familles ───────────────────────────────────────────────────────────
function renderFamiliesTab(list) {
  const names = Object.keys(Families).sort();
  if (!names.length) {
    list.innerHTML = `<div style="padding:20px;color:#4b5563;font-size:11px;text-align:center">
      Aucune famille / type détecté<br><span style="font-size:9px;color:#374151">Vérifiez que le fichier contient<br>des IfcRelDefinesByType</span></div>`;
    return;
  }

  // Grouper les familles par calque pour plus de lisibilité
  const byLayer = {};
  for (const fname of names) {
    const eid = Families[fname][0];
    const obj = BIMObjects[`ifc_${eid}`];
    const lname = obj?.type || 'Autres';
    if (!byLayer[lname]) byLayer[lname] = [];
    byLayer[lname].push(fname);
  }

  for (const [lname, fnames] of Object.entries(byLayer).sort()) {
    const def = layerDef(lname);
    const sec = document.createElement('div');
    sec.style.cssText = 'padding:6px 10px 2px;font-size:9px;font-family:"Space Mono",monospace;color:#4b5563;letter-spacing:1px;text-transform:uppercase;border-top:1px solid #1a1e28;margin-top:4px';
    sec.textContent = `${def.icon} ${lname}`;
    list.appendChild(sec);

    fnames.forEach(fname => {
      const ids = Families[fname];
      const grp = document.createElement('div');
      grp.className = 'layer-group';

      const hdr = document.createElement('div');
      hdr.className = 'layer-group-header';
      hdr.innerHTML = `
        <div class="layer-dot" style="background:#6366f1"></div>
        <span style="font-size:11px" title="${fname}">${fname || '(sans nom)'}</span>
        <span style="font-size:10px;color:#6b7280;margin-left:4px">${ids.length}</span>
        <button class="focus-btn" style="display:flex;margin-left:auto" title="Centrer sur cette famille">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M3 12h2M19 12h2M12 3v2M12 19v2"/><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/></svg>
        </button>
        <span class="layer-arrow">▶</span>`;
      hdr.querySelector('.focus-btn').addEventListener('click', e => { e.stopPropagation(); focusByExpressIDs(ids); });
      hdr.addEventListener('click', () => grp.classList.toggle('open'));
      grp.appendChild(hdr);

      const body = document.createElement('div');
      body.className = 'layer-items';
      const meshes = ids.map(id => BIMObjects[`ifc_${id}`]?.mesh).filter(Boolean);
      addMeshRows(body, meshes, 15);
      grp.appendChild(body);
      list.appendChild(grp);
    });
  }
}

// ── Onglet Niveaux ────────────────────────────────────────────────────────────
function renderStoreysTab(list) {
  const names = Object.keys(Storeys).filter(k => !k.startsWith('_')).sort();
  if (!names.length) {
    list.innerHTML = `<div style="padding:20px;color:#4b5563;font-size:11px;text-align:center">
      Aucun niveau (IfcBuildingStorey) détecté</div>`;
    return;
  }
  names.forEach(sname => {
    const ids = Storeys[sname].filter(v => typeof v === 'number');
    const grp = document.createElement('div');
    grp.className = 'layer-group open';

    const hdr = document.createElement('div');
    hdr.className = 'layer-group-header';
    hdr.innerHTML = `
      <div class="layer-dot" style="background:#00e5c0"></div>
      <span>🏢 ${sname}</span>
      <span style="font-size:10px;color:#6b7280;margin-left:4px">${ids.length} élém.</span>
      <button class="focus-btn" style="display:flex;margin-left:auto" title="Centrer sur le niveau">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M3 12h2M19 12h2M12 3v2M12 19v2"/><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/></svg>
      </button>
      <span class="layer-arrow">▶</span>`;
    hdr.querySelector('.focus-btn').addEventListener('click', e => { e.stopPropagation(); focusByExpressIDs(ids); });
    hdr.addEventListener('click', () => grp.classList.toggle('open'));
    grp.appendChild(hdr);

    const body = document.createElement('div');
    body.className = 'layer-items';
    const meshes = ids.map(id => BIMObjects[`ifc_${id}`]?.mesh).filter(Boolean);
    addMeshRows(body, meshes, 20);
    grp.appendChild(body);
    list.appendChild(grp);
  });
}

// ── Lignes d'items ────────────────────────────────────────────────────────────
function addMeshRows(container, meshes, limit) {
  meshes.slice(0, limit).forEach(mesh => {
    const id  = mesh?.userData?.id;
    const obj = BIMObjects[id];
    if (!obj) return;
    const item = document.createElement('div');
    item.className = 'layer-item';
    item.dataset.id = id;
    item.innerHTML = `
      <span class="layer-item-label" title="${obj.name}">${obj.name}</span>
      <button class="focus-btn" title="Centrer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M3 12h2M19 12h2M12 3v2M12 19v2"/><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/></svg>
      </button>`;
    item.querySelector('.focus-btn').addEventListener('click', e => { e.stopPropagation(); focusObject(id, item.querySelector('.focus-btn')); });
    item.addEventListener('click', () => selectObject(id, item));
    container.appendChild(item);
  });
  if (meshes.length > limit) {
    const more = document.createElement('div');
    more.className = 'layer-item';
    more.style.cssText = 'color:var(--muted);font-style:italic;cursor:default;font-size:10px';
    more.textContent = `+ ${meshes.length - limit} éléments…`;
    container.appendChild(more);
  }
}

function showWelcome(list) {
  list.innerHTML = `<div class="welcome-screen">
    <div style="font-size:32px;text-align:center;margin-bottom:12px">📂</div>
    <div style="text-align:center;color:#6b7280;margin-bottom:16px;line-height:1.6">
      Ouvrez un fichier <strong style="color:#3d8eff">IFC</strong><br>pour démarrer l'analyse
    </div>
    <div class="feat">
      <span>✓</span> IFC2x3 · IFC4 · IFC4x3<br>
      <span>✓</span> Architecte · Structure · MEP<br>
      <span>✓</span> PropertySets (Pset_*)<br>
      <span>✓</span> BaseQuantities (m², m³…)<br>
      <span>✓</span> Familles &amp; Types IFC<br>
      <span>✓</span> Matériaux (IfcMaterial)<br>
      <span>✓</span> Arbre spatial &amp; niveaux<br>
      <span>✓</span> Sélection · Coupe · X-Ray
    </div>
  </div>`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  SÉLECTION + PANNEAU PROPRIÉTÉS
// ═════════════════════════════════════════════════════════════════════════════
const origMats = {};
let hoveredId = null;
const origMatsHover = {};
// Variables pour la transition fluide du hover
let hoverTransitionProgress = 0;  // 0 à 1
let hoverTransitionTarget = 0;    // 0 ou 1
let hoverTransitionStartTime = 0;
const HOVER_TRANSITION_DURATION = 200; // ms
const _selectionViz = {
  outline: null,
  worldCenter: new THREE.Vector3(),
  screenTarget: new THREE.Vector2(),
  screenSmooth: new THREE.Vector2(),
  anchorBox: new THREE.Box3(),
  lastTs: 0,
};

function clearSelectionViz() {
  const label = document.getElementById('highlight-label');
  if (label) {
    label.classList.remove('visible');
    label.style.display = 'none';
    label.style.transform = 'translate3d(-9999px, -9999px, 0) translate(-50%, -50%)';
    label.textContent = '';
  }
  if (_selectionViz.outline) {
    if (_selectionViz.outline.parent) _selectionViz.outline.parent.remove(_selectionViz.outline);
    _selectionViz.outline.geometry?.dispose?.();
    _selectionViz.outline.material?.dispose?.();
    _selectionViz.outline = null;
  }
}

function clearHoverViz() {
  if (hoveredId && hoveredId !== selectedId && BIMObjects[hoveredId]) {
    const obj = BIMObjects[hoveredId];
    if (origMatsHover[hoveredId]) {
      obj.mesh.material = origMatsHover[hoveredId];
      delete origMatsHover[hoveredId];
    }
    // Supprimer l'outline du hover
    if (obj.mesh.userData.hoverOutlineElem) {
      scene.remove(obj.mesh.userData.hoverOutlineElem);
      obj.mesh.userData.hoverOutlineElem.geometry?.dispose?.();
      obj.mesh.userData.hoverOutlineElem.material?.dispose?.();
      delete obj.mesh.userData.hoverOutlineElem;
    }
  }
  hoveredId = null;
  hoverTransitionTarget = 0;
  hoverTransitionStartTime = performance.now();
}

function buildHoverOutline(mesh) {
  if (!mesh?.geometry) return null;
  const edges = new THREE.EdgesGeometry(mesh.geometry, 28);
  const mat = new THREE.LineBasicMaterial({
    color: 0x3d8eff,
    transparent: true,
    opacity: 0.4,
    depthTest: false,
    depthWrite: false,
  });
  const line = new THREE.LineSegments(edges, mat);
  line.matrix.copy(mesh.matrixWorld);
  line.matrixAutoUpdate = false;
  line.renderOrder = 998;
  line.userData = { hoverOutline: true };
  return line;
}

function setHoverViz(id) {
  if (id === selectedId) return; // Ne pas hover sur l'objet sélectionné
  if (id === hoveredId) return; // Déjà hovering
  
  clearHoverViz();
  
  const obj = BIMObjects[id];
  if (!obj) return;
  
  hoveredId = id;
  if (!origMatsHover[id]) origMatsHover[id] = obj.mesh.material;
  const hoverMat = obj.mesh.material.clone();
  hoverMat.emissive = new THREE.Color(0x3d8eff);
  hoverMat.emissiveIntensity = 0; // Commencer à 0, sera interpolé progressivement
  if (hoverMat.color) hoverMat.color.offsetHSL(0, 0.03, 0.06); // Changement plus visible
  obj.mesh.material = hoverMat;
  
  // Ajouter un outline léger
  const outline = buildHoverOutline(obj.mesh);
  if (outline) {
    scene.add(outline);
    obj.mesh.userData.hoverOutlineElem = outline;
  }
  
  // Lancer la transition fluide
  hoverTransitionTarget = 1;
  hoverTransitionStartTime = performance.now();
}

function updateSelectionLabel() {
  const label = document.getElementById('highlight-label');
  if (!label || !selectedId || !BIMObjects[selectedId]) return;

  const obj = BIMObjects[selectedId];
  
  // Utiliser la même méthode que focusObject pour obtenir la bounding box précise
  const preciseBox = getPreciseBoxForExpressID(obj.expressID);
  const box = preciseBox || new THREE.Box3().expandByObject(obj.mesh);
  
  if (box.isEmpty()) {
    label.classList.remove('visible');
    label.style.display = 'none';
    return;
  }

  // Positionner l'étiquette au sommet de l'objet (point le plus haut)
  const center = new THREE.Vector3();
  box.getCenter(center);
  _selectionViz.worldCenter.set(center.x, box.max.y, center.z);

  const p = _selectionViz.worldCenter.clone().project(camera);
  if (p.z < -1 || p.z > 1) {
    label.classList.remove('visible');
    label.style.display = 'none';
    return;
  }

  const x = (p.x * 0.5 + 0.5) * wrap.clientWidth;
  const y = (-p.y * 0.5 + 0.5) * wrap.clientHeight;

  _selectionViz.screenTarget.set(x, y);
  if (_selectionViz.lastTs === 0) {
    _selectionViz.screenSmooth.copy(_selectionViz.screenTarget);
  } else {
    _selectionViz.screenSmooth.lerp(_selectionViz.screenTarget, 0.22);
  }

  // Décalage de 120% vers le haut pour placer l'étiquette au-dessus de l'objet
  label.style.transform = `translate3d(${_selectionViz.screenSmooth.x.toFixed(2)}px, ${_selectionViz.screenSmooth.y.toFixed(2)}px, 0) translate(-50%, -120%)`;
  label.style.display = 'block';
  label.classList.add('visible');
}

function buildSelectionOutline(mesh) {
  if (!mesh?.geometry) return null;
  const edges = new THREE.EdgesGeometry(mesh.geometry, 28);
  const mat = new THREE.LineBasicMaterial({
    color: 0x00e5c0,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false,
  });
  const line = new THREE.LineSegments(edges, mat);
  line.matrix.copy(mesh.matrixWorld);
  line.matrixAutoUpdate = false;
  line.renderOrder = 999;
  line.userData = { selectionOutline: true };
  return line;
}

function setSelectionViz(obj) {
  clearSelectionViz();
  if (!obj?.mesh) return;

  const label = document.getElementById('highlight-label');
  if (label) {
    label.textContent = `${obj.name} · ${obj.type}`;
  }

  _selectionViz.anchorBox.makeEmpty().expandByObject(obj.mesh);
  _selectionViz.anchorBox.getCenter(_selectionViz.worldCenter);
  const p = _selectionViz.worldCenter.clone().project(camera);
  _selectionViz.screenTarget.set((p.x * 0.5 + 0.5) * wrap.clientWidth, (-p.y * 0.5 + 0.5) * wrap.clientHeight);
  _selectionViz.screenSmooth.copy(_selectionViz.screenTarget);
  _selectionViz.lastTs = 0;

  const outline = buildSelectionOutline(obj.mesh);
  if (outline) {
    _selectionViz.outline = outline;
    scene.add(outline);
  }
  updateSelectionLabel();
}

function selectObject(id, listItem) {
  // Nettoyer le hover précédent
  clearHoverViz();
  
  // Désélectionner le précédent
  if (selectedId && BIMObjects[selectedId]) {
    if (origMats[selectedId]) BIMObjects[selectedId].mesh.material = origMats[selectedId];
  }
  document.querySelectorAll('.layer-item.selected').forEach(el => el.classList.remove('selected'));

  if (selectedId === id) {
    selectedId = null;
    clearSelectionViz();
    showPropPanel(null);
    return;
  }

  selectedId = id;
  const obj = BIMObjects[id];
  if (!obj) {
    clearSelectionViz();
    return;
  }

  // Highlight
  if (!origMats[id]) origMats[id] = obj.mesh.material;
  const hl = obj.mesh.material.clone();
  hl.emissive = new THREE.Color(0x3d8eff);
  hl.emissiveIntensity = 0.85;
  if (hl.color) hl.color.offsetHSL(0, 0.02, 0.08);
  obj.mesh.material = hl;

  if (listItem) listItem.classList.add('selected');
  else document.querySelector(`.layer-item[data-id="${id}"]`)?.classList.add('selected');

  setSelectionViz(obj);
  showPropPanel(obj);
}

function showPropPanel(obj) {
  const panel = document.getElementById('prop-content');
  if (!obj) {
    panel.innerHTML = `<div class="no-selection">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 3l18 18M10.5 10.677a2 2 0 0 0 2.823 2.823"/>
        <path d="M7.362 7.561C5.68 8.74 4.279 10.42 3 12c1.889 2.991 5.282 6 9 6 1.55 0 3.043-.523 4.395-1.35M12 6c3.784 0 6.979 3.337 9 6a15.3 15.3 0 0 1-1.194 1.532"/>
      </svg>
      <p>Cliquez un élément<br>pour voir ses propriétés IFC</p>
    </div>`;
    return;
  }

  const def   = layerDef(obj.type);
  const hex   = def.color.toString(16).padStart(6,'0');

  // Grouper les props par Pset (séparateur "::")
  const identity = {}, psetGroups = {};
  for (const [k, v] of Object.entries(obj.props || {})) {
    const sep = k.indexOf('::');
    if (sep > -1) {
      const grp = k.slice(0, sep);
      if (!psetGroups[grp]) psetGroups[grp] = {};
      psetGroups[grp][k.slice(sep + 2)] = v;
    } else {
      identity[k] = v;
    }
  }

  function rows(data) {
    return Object.entries(data)
      .map(([k, v]) => `<tr><td title="${k}"><span class="prop-cell" title="${k}">${k}</span></td><td title="${v}"><span class="prop-cell" title="${v}">${v}</span></td></tr>`)
      .join('');
  }

  function sectionBlock(title, contentHtml) {
    return `<div class="prop-section">
      <div class="prop-head">
        <div class="prop-label" title="${title}">${title}</div>
        <button class="prop-toggle" type="button" title="Plier / Déplier" aria-label="Plier ou déplier la section" aria-expanded="true">▾</button>
      </div>
      <div class="prop-content-inner">${contentHtml}</div>
    </div>`;
  }

  let html = sectionBlock('Élément sélectionné', `
      <div class="prop-name">${obj.name}</div>
      <div class="prop-badges">
        <span class="prop-badge" title="${obj.type}" style="font-size:9px;font-family:'Space Mono',monospace;color:#${hex};background:rgba(${hexRgb(def.color)},0.13);padding:2px 9px;border-radius:10px">${obj.type}</span>
        ${obj.storey && obj.storey!=='—' ? `<span class="prop-badge" title="${obj.storey}" style="font-size:9px;font-family:'Space Mono',monospace;color:#00e5c0;background:rgba(0,229,192,0.1);padding:2px 9px;border-radius:10px">🏢 ${obj.storey}</span>` : ''}
        ${obj.familyType ? `<span class="prop-badge" title="${obj.familyType}" style="font-size:9px;font-family:'Space Mono',monospace;color:#9ca3af;background:rgba(156,163,175,0.1);padding:2px 9px;border-radius:10px">📦 ${obj.familyType}</span>` : ''}
      </div>
    `);

  if (Object.keys(identity).length) {
    html += sectionBlock('Identité IFC', `<table class="prop-table">${rows(identity)}</table>`);
  }
  for (const [grpName, grpData] of Object.entries(psetGroups)) {
    if (!Object.keys(grpData).length) continue;
    html += sectionBlock(grpName, `<table class="prop-table">${rows(grpData)}</table>`);
  }

  panel.innerHTML = html;

  panel.querySelectorAll('.prop-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.prop-section');
      if (!section) return;
      section.classList.toggle('collapsed');
      const expanded = !section.classList.contains('collapsed');
      btn.setAttribute('aria-expanded', String(expanded));
    });
  });
}

function hexRgb(hex) {
  return `${(hex>>16)&0xff},${(hex>>8)&0xff},${hex&0xff}`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  ISOLATION D'OBJETS
// ═════════════════════════════════════════════════════════════════════════════
function isolateObject(id) {
  if (!BIMObjects[id]) return;
  
  // Sauvegarder l'état de visibilité actuel
  Object.values(BIMObjects).forEach(obj => {
    visibilityStateBeforeIsolation[obj.mesh.uuid] = obj.mesh.visible;
  });
  
  // Masquer tous les objets sauf celui sélectionné
  Object.keys(BIMObjects).forEach(objId => {
    BIMObjects[objId].mesh.visible = (objId === id);
  });
  
  isolatedObjects.clear();
  isolatedObjects.add(id);
  isolationActive = true;
  
  updateIsolationUI();
  console.log(`[BIM] Isolation: objet ${id}`);
}

function isolateGroup(groupName) {
  const meshes = Groups[groupName];
  if (!meshes || !meshes.length) return;
  
  // Sauvegarder l'état
  Object.values(BIMObjects).forEach(obj => {
    visibilityStateBeforeIsolation[obj.mesh.uuid] = obj.mesh.visible;
  });
  
  // Masquer tout
  Object.values(BIMObjects).forEach(obj => {
    obj.mesh.visible = false;
  });
  
  // Afficher uniquement le groupe
  meshes.forEach(m => m.visible = true);
  
  isolatedObjects.clear();
  meshes.forEach(m => {
    if (m.userData?.id) isolatedObjects.add(m.userData.id);
  });
  
  isolationActive = true;
  updateIsolationUI();
  console.log(`[BIM] Isolation: groupe "${groupName}" (${meshes.length} objets)`);
}

function exitIsolation() {
  if (!isolationActive) return;
  
  // Restaurer l'état de visibilité
  Object.values(BIMObjects).forEach(obj => {
    const savedState = visibilityStateBeforeIsolation[obj.mesh.uuid];
    if (savedState !== undefined) {
      obj.mesh.visible = savedState;
    }
  });
  
  isolationActive = false;
  isolatedObjects.clear();
  for (const uuid in visibilityStateBeforeIsolation) {
    delete visibilityStateBeforeIsolation[uuid];
  }
  
  updateIsolationUI();
  console.log('[BIM] Sortie du mode isolation');
}

function updateIsolationUI() {
  let btn = document.getElementById('isolation-exit-btn');
  
  if (isolationActive) {
    if (!btn) {
      // Créer le bouton de sortie d'isolation
      btn = document.createElement('button');
      btn.id = 'isolation-exit-btn';
      btn.className = 'isolation-exit-btn';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Quitter l'isolation (${isolatedObjects.size} objet${isolatedObjects.size > 1 ? 's' : ''})
      `;
      btn.addEventListener('click', exitIsolation);
      document.querySelector('.canvas-wrap').appendChild(btn);
    } else {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Quitter l'isolation (${isolatedObjects.size} objet${isolatedObjects.size > 1 ? 's' : ''})
      `;
    }
  } else {
    if (btn) btn.remove();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  RECHERCHE AVANCÉE
// ═════════════════════════════════════════════════════════════════════════════
function performSearch(query) {
  searchResults = [];
  currentSearchIndex = 0;
  
  if (!query || query.length < 2) {
    updateSearchUI();
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  
  // Recherche dans tous les objets
  Object.entries(BIMObjects).forEach(([id, obj]) => {
    let score = 0;
    let matchedFields = [];
    
    // Nom
    if (obj.name && obj.name.toLowerCase().includes(lowerQuery)) {
      score += 10;
      matchedFields.push('nom');
    }
    
    // Type (layer)
    if (obj.type && obj.type.toLowerCase().includes(lowerQuery)) {
      score += 8;
      matchedFields.push('type');
    }
    
    // Famille
    if (obj.familyType && obj.familyType.toLowerCase().includes(lowerQuery)) {
      score += 7;
      matchedFields.push('famille');
    }
    
    // Niveau
    if (obj.storey && obj.storey.toLowerCase().includes(lowerQuery)) {
      score += 6;
      matchedFields.push('niveau');
    }
    
    // Propriétés
    if (obj.props) {
      for (const [key, value] of Object.entries(obj.props)) {
        const keyLower = key.toLowerCase();
        const valueLower = String(value).toLowerCase();
        if (keyLower.includes(lowerQuery) || valueLower.includes(lowerQuery)) {
          score += 3;
          if (!matchedFields.includes('propriété')) matchedFields.push('propriété');
        }
      }
    }
    
    if (score > 0) {
      searchResults.push({ id, obj, score, matchedFields });
    }
  });
  
  // Trier par score décroissant
  searchResults.sort((a, b) => b.score - a.score);
  
  updateSearchUI();
  console.log(`[BIM] Recherche "${query}": ${searchResults.length} résultats`);
}

function navigateSearchResults(direction) {
  if (!searchResults.length) return;
  
  if (direction === 'next') {
    currentSearchIndex = (currentSearchIndex + 1) % searchResults.length;
  } else {
    currentSearchIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
  }
  
  const result = searchResults[currentSearchIndex];
  selectObject(result.id, null);
  focusObject(result.id);
  
  updateSearchUI();
}

function updateSearchUI() {
  const resultsEl = document.getElementById('search-results');
  const inputEl = document.getElementById('search-input');
  
  if (!resultsEl || !inputEl) return;
  
  if (searchResults.length === 0) {
    resultsEl.style.display = 'none';
    resultsEl.textContent = '';
  } else {
    resultsEl.style.display = 'flex';
    const current = searchResults[currentSearchIndex];
    const matchInfo = current.matchedFields.join(', ');
    resultsEl.innerHTML = `
      <span>${currentSearchIndex + 1} / ${searchResults.length}</span>
      <span style="color:#6b7280;font-size:10px;margin-left:8px">${matchInfo}</span>
      <button id="search-prev" title="Résultat précédent" style="margin-left:auto">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <button id="search-next" title="Résultat suivant">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    `;
    
    document.getElementById('search-prev')?.addEventListener('click', () => navigateSearchResults('prev'));
    document.getElementById('search-next')?.addEventListener('click', () => navigateSearchResults('next'));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  HIÉRARCHIE SPATIALE
// ═════════════════════════════════════════════════════════════════════════════
async function buildSpatialHierarchy() {
  if (!ifcModelLoaded || !modelID_current) return;
  
  const ifcAPI = ifcLoader.ifcManager.ifcAPI;
  
  try {
    // Lire la structure spatiale IFC
    const sites = await ifcAPI.GetLineIDsWithType(modelID_current, GEOM_TYPES.IFCSITE || 3327091369);
    const buildings = await ifcAPI.GetLineIDsWithType(modelID_current, GEOM_TYPES.IFCBUILDING || 4031249490);
    const storeys = await ifcAPI.GetLineIDsWithType(modelID_current, GEOM_TYPES.IFCBUILDINGSTOREY || 3124254112);
    const spaces = await ifcAPI.GetLineIDsWithType(modelID_current, GEOM_TYPES.IFCSPACE || 3856911033);
    
    spatialHierarchy.sites = [];
    
    // Construire la hiérarchie
    for (let i = 0; i < sites.size(); i++) {
      const siteID = sites.get(i);
      const siteProps = await ifcAPI.GetLine(modelID_current, siteID);
      
      const site = {
        id: siteID,
        name: siteProps.Name?.value || siteProps.LongName?.value || `Site ${siteID}`,
        type: 'IFCSITE',
        buildings: []
      };
      
      // Trouver les bâtiments de ce site
      for (let j = 0; j < buildings.size(); j++) {
        const buildingID = buildings.get(j);
        const buildingProps = await ifcAPI.GetLine(modelID_current, buildingID);
        
        const building = {
          id: buildingID,
          name: buildingProps.Name?.value || buildingProps.LongName?.value || `Bâtiment ${buildingID}`,
          type: 'IFCBUILDING',
          storeys: []
        };
        
        // Trouver les niveaux de ce bâtiment
        for (let k = 0; k < storeys.size(); k++) {
          const storeyID = storeys.get(k);
          const storeyProps = await ifcAPI.GetLine(modelID_current, storeyID);
          
          const storey = {
            id: storeyID,
            name: storeyProps.Name?.value || storeyProps.LongName?.value || `Niveau ${storeyID}`,
            type: 'IFCBUILDINGSTOREY',
            elevation: storeyProps.Elevation || 0,
            spaces: [],
            elements: []
          };
          
          // Trouver les espaces de ce niveau
          for (let l = 0; l < spaces.size(); l++) {
            const spaceID = spaces.get(l);
            const spaceProps = await ifcAPI.GetLine(modelID_current, spaceID);
            
            const space = {
              id: spaceID,
              name: spaceProps.Name?.value || spaceProps.LongName?.value || `Espace ${spaceID}`,
              type: 'IFCSPACE'
            };
            
            storey.spaces.push(space);
          }
          
          // Associer les éléments au niveau
          Object.values(BIMObjects).forEach(obj => {
            if (obj.storey === storey.name) {
              storey.elements.push(obj);
            }
          });
          
          building.storeys.push(storey);
        }
        
        // Trier les niveaux par élévation
        building.storeys.sort((a, b) => b.elevation - a.elevation);
        
        site.buildings.push(building);
      }
      
      spatialHierarchy.sites.push(site);
    }
    
    console.log('[BIM] Hiérarchie spatiale construite:', spatialHierarchy);
    
  } catch (e) {
    console.warn('[BIM] Impossible de construire la hiérarchie spatiale:', e);
  }
}

function renderSpatialHierarchyTab(list) {
  if (!spatialHierarchy.sites || spatialHierarchy.sites.length === 0) {
    list.innerHTML = `<div style="padding:20px;color:#4b5563;font-size:11px;text-align:center">
      Hiérarchie spatiale non disponible<br>
      <button id="build-hierarchy-btn" style="margin-top:12px;padding:6px 12px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px">
        Construire la hiérarchie
      </button>
    </div>`;
    document.getElementById('build-hierarchy-btn')?.addEventListener('click', async () => {
      await buildSpatialHierarchy();
      buildPanel();
    });
    return;
  }
  
  // Afficher l'arborescence
  spatialHierarchy.sites.forEach(site => {
    const siteGroup = createHierarchyNode(site.name, '🌍', site.buildings.reduce((sum, b) => sum + b.storeys.reduce((s, st) => s + st.elements.length, 0), 0), '#10b981');
    
    site.buildings.forEach(building => {
      const buildingGroup = createHierarchyNode(
        building.name, 
        '🏢', 
        building.storeys.reduce((sum, st) => sum + st.elements.length, 0),
        '#3b82f6'
      );
      buildingGroup.style.marginLeft = '16px';
      
      building.storeys.forEach(storey => {
        const storeyGroup = createHierarchyNode(
          `${storey.name} (${storey.elevation.toFixed(2)}m)`,
          '📐',
          storey.elements.length,
          '#00e5c0'
        );
        storeyGroup.style.marginLeft = '32px';
        
        storeyGroup.querySelector('.hierarchy-header').addEventListener('click', () => {
          const expressIDs = storey.elements.map(e => e.expressID).filter(Boolean);
          if (expressIDs.length) focusByExpressIDs(expressIDs);
        });
        
        if (storey.spaces.length > 0) {
          storey.spaces.forEach(space => {
            const spaceNode = createHierarchyNode(space.name, '📦', 0, '#9ca3af');
            spaceNode.style.marginLeft = '48px';
            storeyGroup.appendChild(spaceNode);
          });
        }
        
        buildingGroup.appendChild(storeyGroup);
      });
      
      siteGroup.appendChild(buildingGroup);
    });
    
    list.appendChild(siteGroup);
  });
}

function createHierarchyNode(name, icon, count, color) {
  const node = document.createElement('div');
  node.className = 'hierarchy-node';
  node.innerHTML = `
    <div class="hierarchy-header" style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-radius:6px;transition:all 0.15s">
      <span style="font-size:14px">${icon}</span>
      <span style="flex:1;font-size:11px;font-weight:500">${name}</span>
      <span style="font-size:10px;color:#6b7280">${count} élém.</span>
      <div class="layer-dot" style="background:${color};width:6px;height:6px"></div>
    </div>
  `;
  
  node.querySelector('.hierarchy-header').addEventListener('mouseenter', function() {
    this.style.background = 'rgba(61, 142, 255, 0.1)';
  });
  node.querySelector('.hierarchy-header').addEventListener('mouseleave', function() {
    this.style.background = 'transparent';
  });
  
  return node;
}

// ── Raycast ───────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const allMeshes = Object.values(BIMObjects).map(o => o.mesh).filter(m => m.visible);
  const hits = raycaster.intersectObjects(allMeshes, true);
  
  if (hits.length) {
    let node = hits[0].object;
    while (node && !node.userData?.id) node = node.parent;
    if (node?.userData?.id && selectedId !== node.userData.id) {
      setHoverViz(node.userData.id);
      canvas.style.cursor = 'pointer';
      return;
    }
  }
  clearHoverViz();
  canvas.style.cursor = '';
});

canvas.addEventListener('click', e => {
  if (isDragging) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  // On interroge tous les meshes visibles (inclus les enfants des subsets)
  const allMeshes = Object.values(BIMObjects).map(o => o.mesh).filter(m => m.visible);
  const hits = raycaster.intersectObjects(allMeshes, true);
  if (hits.length) {
    let node = hits[0].object;
    while (node && !node.userData?.id) node = node.parent;
    if (node?.userData?.id) { selectObject(node.userData.id, null); return; }
  }
  selectObject(null, null);
});

// ═════════════════════════════════════════════════════════════════════════════
//  CONTRÔLES CAMÉRA
// ═════════════════════════════════════════════════════════════════════════════
let mode      = 'orbit';
let isDragging = false;
let lastMouse  = { x:0, y:0 };
let sph = { theta: 0.6, phi: 0.85, r: 60 };
let target = new THREE.Vector3(0, 5, 0);

function camUpdate() {
  camera.position.set(
    target.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
    target.y + sph.r * Math.cos(sph.phi),
    target.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
  );
  camera.lookAt(target);
  document.getElementById('compass-arrow').style.transform =
    `translateX(-50%) translateY(-100%) rotate(${-sph.theta*180/Math.PI}deg)`;
}
camUpdate();

canvas.addEventListener('mousedown', e => {
  isDragging = false;
  lastMouse = { x: e.clientX, y: e.clientY };
  canvas.style.cursor = 'grabbing';
  const scale = sph.r / 40;
  const onMove = ev => {
    const dx = ev.clientX - lastMouse.x, dy = ev.clientY - lastMouse.y;
    if (Math.abs(dx)+Math.abs(dy) > 2) isDragging = true;
    lastMouse = { x: ev.clientX, y: ev.clientY };
    if (e.button === 0) {
      sph.theta -= dx * 0.005;
      sph.phi    = Math.max(0.04, Math.min(Math.PI-0.04, sph.phi - dy*0.005));
    } else if (e.button === 2) {
      const right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
      target.addScaledVector(right, -dx * 0.025 * scale);
      target.addScaledVector(camera.up,  dy * 0.025 * scale);
    }
    camUpdate();
  };
  const onUp = () => { canvas.style.cursor=''; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  sph.r = Math.max(0.1, Math.min(5000, sph.r * (1 + e.deltaY * 0.0008)));
  camUpdate();
}, { passive: false });

// ── Fly-to ────────────────────────────────────────────────────────────────────
let flyAnim = null;
function flyTo(newTarget, newR, newPhi, newTheta) {
  const st=target.clone(), sr=sph.r, sp=sph.phi, sth=sph.theta;
  let dt = newTheta - sth;
  while (dt >  Math.PI) dt -= 2*Math.PI;
  while (dt < -Math.PI) dt += 2*Math.PI;
  const dur=750, t0=performance.now();
  if (flyAnim) cancelAnimationFrame(flyAnim);
  const ease = t => t<0.5?2*t*t:-1+(4-2*t)*t;
  function tick(now) {
    const t=Math.min((now-t0)/dur,1), e=ease(t);
    target.lerpVectors(st, newTarget, e);
    sph.r     = sr  + (newR   - sr)  * e;
    sph.phi   = sp  + (newPhi  - sp) * e;
    sph.theta = sth + dt * e;
    camUpdate();
    if (t<1) flyAnim=requestAnimationFrame(tick); else flyAnim=null;
  }
  flyAnim = requestAnimationFrame(tick);
}

function getFitDistanceForBox(box, padding = 1.22) {
  const size = new THREE.Vector3();
  box.getSize(size);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);

  const fitHeight = size.y / (2 * Math.tan(vFov / 2));
  const fitWidth  = size.x / (2 * Math.tan(hFov / 2));
  const fitDepth  = size.z * 0.7;

  const dist = Math.max(fitHeight, fitWidth, fitDepth);
  return Math.max(dist * padding, 0.35);
}

function flyToBox(box, phi = 0.75, theta = sph.theta) {
  if (!box || box.isEmpty()) return;
  const c = new THREE.Vector3();
  box.getCenter(c);
  const r = getFitDistanceForBox(box);

  const size = new THREE.Vector3();
  box.getSize(size);
  camera.far = Math.max(camera.far, r + size.length() * 12, 1000);
  camera.updateProjectionMatrix();

  flyTo(c, r, phi, theta);
}

function getPreciseBoxForExpressID(expressID) {
  if (!modelMesh_current || typeof expressID !== 'number') return null;

  const box = new THREE.Box3();
  let found = false;
  const point = new THREE.Vector3();

  modelMesh_current.updateWorldMatrix(true, true);
  modelMesh_current.traverse(node => {
    if (!node?.isMesh || !node.geometry) return;
    const geom = node.geometry;
    const pos = geom.getAttribute('position');
    const ids = geom.getAttribute('expressID')
             || geom.getAttribute('expressId')
             || geom.getAttribute('ifcExpressID');
    if (!pos || !ids || !pos.count || !ids.count) return;

    node.updateWorldMatrix(true, false);
    const wm = node.matrixWorld;

    for (let i = 0; i < pos.count; i++) {
      if (ids.getX(i) !== expressID) continue;
      point.fromBufferAttribute(pos, i).applyMatrix4(wm);
      box.expandByPoint(point);
      found = true;
    }
  });

  return found && !box.isEmpty() ? box : null;
}

function focusObject(id) {
  const obj = BIMObjects[id]; if (!obj) return;

  const preciseBox = getPreciseBoxForExpressID(obj.expressID);
  const box = preciseBox || new THREE.Box3().expandByObject(obj.mesh);

  if (box.isEmpty()) {
    console.warn('[BIM] focusObject: bounding box vide pour', id);
    return;
  }

  const c = new THREE.Vector3();
  box.getCenter(c);
  // Distance de focus calculée à partir de la taille réelle de la bounding box.
  // - `getFitDistanceForBox(box, padding)` renvoie la distance minimale pour cadrer l'objet
  //   (en tenant compte de la hauteur, largeur et profondeur visibles dans le frustum caméra).
  // - Si `preciseBox` existe, la box est issue des sommets réellement rattachés à l'`expressID`
  //   (plus fiable), donc on applique un padding un peu plus faible (`1.18`).
  // - Sinon on utilise une box plus générique (`expandByObject`), potentiellement moins précise,
  //   donc on ajoute plus de marge (`1.26`) pour éviter un cadrage trop serré.
  // - Augmenter ces valeurs éloigne la caméra ; les réduire rapproche la caméra.
  const r = getFitDistanceForBox(box, preciseBox ? 2 : 2);
  // Animation de focus vers l'objet sélectionné :
  // - `c`         : nouvelle cible orbitale (centre de la box de l'objet).
  // - `r`         : nouveau rayon orbital (distance caméra ↔ cible), calculé pour cadrer l'objet.
  // - `0.7`       : angle polaire `phi` d'arrivée (inclinaison de vue), valeur intermédiaire
  //                 qui évite une vue trop zénithale ou trop rasante.
  // - `sph.theta` : azimut conservé (on garde l'orientation horizontale actuelle),
  //                 ce qui réduit la désorientation utilisateur pendant le zoom.
  // Le mouvement est interpolé par `flyTo` (durée/easing) pour un déplacement fluide.
  flyTo(c, r, 0.7, sph.theta);
}
function focusGroup(name) {
  const ms=Groups[name]; if (!ms?.length) return;
  const box=new THREE.Box3(); ms.forEach(m=>{if(m.visible)box.expandByObject(m);});
  if(box.isEmpty())return;
  flyToBox(box, 0.75, sph.theta);
}
function focusByExpressIDs(ids) {
  const box=new THREE.Box3();
  ids.forEach(eid=>{const o=BIMObjects[`ifc_${eid}`]; if(o?.mesh?.visible)box.expandByObject(o.mesh);});
  if(box.isEmpty())return;
  flyToBox(box, 0.75, sph.theta);
}
function fitCameraToModel() {
  const box=new THREE.Box3();
  Object.values(BIMObjects).forEach(o=>box.expandByObject(o.mesh));
  if(box.isEmpty())return;
  const c=new THREE.Vector3(), sz=new THREE.Vector3();
  box.getCenter(c); box.getSize(sz);
  flyToBox(box, 0.75, 0.6);
  // Ajuster le far de la caméra au modèle
  camera.far = sz.length() * 20;
  camera.updateProjectionMatrix();
  // Ajuster le plan de coupe
  sectionPlane.constant = c.y + sz.y * 0.5;
}

// ═════════════════════════════════════════════════════════════════════════════
//  TOOLBAR
// ═════════════════════════════════════════════════════════════════════════════
function toggleLayer(name, eyeEl) {
  const wasVis = Groups[name]?.some(m => m.visible);
  Groups[name]?.forEach(m => m.visible = !wasVis);
  eyeEl.classList.toggle('hidden', wasVis);
}
function setMode(m) {
  mode = m;
  document.querySelectorAll('.toolbar-btn[id^="btn-"]').forEach(b=>b.classList.remove('active'));
  document.getElementById('btn-'+m)?.classList.add('active');
}
function resetCamera() { sph={theta:0.6,phi:0.85,r:60}; target.set(0,5,0); camUpdate(); }
function setView(v) {
  if(v==='top')  {sph.phi=0.08; sph.r=Math.max(sph.r,30);}
  if(v==='front'){sph.phi=Math.PI/2; sph.theta=0;}
  if(v==='iso')  {sph.phi=0.75; sph.theta=0.8;}
  camUpdate();
}
function toggleWireframe() {
  wireframeMode=!wireframeMode;
  document.getElementById('btn-wire')?.classList.toggle('active',wireframeMode);
  Object.values(BIMObjects).forEach(o=>{o.mesh.material.wireframe=wireframeMode;});
}
function toggleXRay() {
  xrayMode=!xrayMode;
  document.getElementById('btn-xray')?.classList.toggle('active',xrayMode);
  Object.values(BIMObjects).forEach(o=>{
    const l=layerDef(o.type);
    o.mesh.material.transparent=xrayMode||(l.transparent||false);
    o.mesh.material.opacity    =xrayMode?0.15:(l.opacity??1.0);
  });
}
function applySectionToAllMats() {
  const planes = sectionActive ? [sectionPlane] : [];
  Object.values(BIMObjects).forEach(o => {
    const mats = Array.isArray(o.mesh.material) ? o.mesh.material : [o.mesh.material];
    mats.forEach(mat => {
      mat.clippingPlanes = planes;
      mat.needsUpdate = true;
    });
  });
}
function updateSectionSlider() {
  const slider = document.getElementById('section-slider');
  if (!slider) return;
  slider.style.display = sectionActive ? 'flex' : 'none';
}
function toggleSection() {
  sectionActive = !sectionActive;
  document.getElementById('btn-section')?.classList.toggle('active', sectionActive);
  // Ajuster la constante du plan à la hauteur actuelle du modèle si on active
  if (sectionActive) {
    const box = new THREE.Box3();
    Object.values(BIMObjects).forEach(o => { if (o.mesh.visible) box.expandByObject(o.mesh); });
    if (!box.isEmpty()) {
      const mid = (box.min.y + box.max.y) / 2;
      sectionPlane.constant = mid;
      const slider = document.getElementById('section-slider-input');
      if (slider) {
        slider.min   = box.min.y.toFixed(2);
        slider.max   = box.max.y.toFixed(2);
        slider.step  = ((box.max.y - box.min.y) / 200).toFixed(3);
        slider.value = mid.toFixed(2);
      }
    }
  }
  applySectionToAllMats();
  updateSectionSlider();
}

// ── Bandeau projet ────────────────────────────────────────────────────────────
function showProjectBanner(fname) {
  let b=document.getElementById('proj-banner');
  if(!b){
    b=document.createElement('div'); 
    b.id='proj-banner';
    wrap.appendChild(b);
  }
  const nb=Object.keys(BIMObjects).length;
  const nf=Object.keys(Families).length;
  const ns=Object.keys(Storeys).filter(k=>!k.startsWith('_')).length;
  const nl=Object.keys(Groups).length;
  b.innerHTML=`
    <span style="color:#3d8eff;font-weight:700">${projectInfo.name||fname}</span>
    ${projectInfo.building&&projectInfo.building!=='—'?`<span>Bâtiment : <b style="color:#e8eaf0">${projectInfo.building}</b></span>`:''}
    ${projectInfo.site&&projectInfo.site!=='—'?`<span>Site : <b style="color:#e8eaf0">${projectInfo.site}</b></span>`:''}
    ${projectInfo.phase&&projectInfo.phase!=='—'?`<span>Phase : <b style="color:#e8eaf0">${projectInfo.phase}</b></span>`:''}
    <span>Niveaux : <b style="color:#00e5c0">${ns}</b></span>
    <span>Calques : <b style="color:#00e5c0">${nl}</b></span>
    <span>Familles : <b style="color:#00e5c0">${nf}</b></span>
    <span>Éléments : <b style="color:#00e5c0">${nb}</b></span>`;
}

// ── Stats barre de statut ──────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('stat-objects').textContent = Object.keys(BIMObjects).length;
  document.getElementById('stat-tris').textContent    = Math.round(totalTris).toLocaleString('fr');
  document.getElementById('obj-count').textContent    = Object.keys(BIMObjects).length;
}
function setLoadingMsg(msg) {
  const p=document.querySelector('#loading p'); if(p) p.textContent=msg;
}

// ═════════════════════════════════════════════════════════════════════════════
//  RESIZE + RENDER LOOP
// ═════════════════════════════════════════════════════════════════════════════
function resize(w, h) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

let _resizeRaf = 0;
new ResizeObserver(entries => {
  cancelAnimationFrame(_resizeRaf);
  _resizeRaf = requestAnimationFrame(() => {
    const { width, height } = entries[0].contentRect;
    if (width > 0 && height > 0) resize(width, height);
  });
}).observe(wrap);
resize(wrap.clientWidth, wrap.clientHeight);
function updateHoverTransition() {
  if (hoverTransitionTarget === hoverTransitionProgress) return; // Pas de changement
  
  const elapsed = performance.now() - hoverTransitionStartTime;
  const progress = Math.min(elapsed / HOVER_TRANSITION_DURATION, 1);
  hoverTransitionProgress = hoverTransitionTarget === 1 
    ? progress 
    : 1 - progress;
  
  // Appliquer l'emissiveIntensity interpolée au hover material actuel
  if (hoveredId && BIMObjects[hoveredId]) {
    const obj = BIMObjects[hoveredId];
    if (obj.mesh.material) {
      obj.mesh.material.emissiveIntensity = hoverTransitionProgress * 0.58;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  _selectionViz.lastTs = performance.now();
  updateSelectionLabel();
  updateHoverTransition();
  renderer.render(scene,camera);
}
animate();

// ═════════════════════════════════════════════════════════════════════════════
//  BOOT
// ═════════════════════════════════════════════════════════════════════════════
async function init() {
  document.getElementById('btn-orbit') ?.addEventListener('click', ()=>setMode('orbit'));
  document.getElementById('btn-pan')   ?.addEventListener('click', ()=>setMode('pan'));
  document.getElementById('btn-zoom')  ?.addEventListener('click', ()=>setMode('zoom'));
  document.getElementById('btn-section')?.addEventListener('click', toggleSection);
  document.getElementById('btn-reset') ?.addEventListener('click', resetCamera);
  document.getElementById('btn-wire')  ?.addEventListener('click', toggleWireframe);
  document.getElementById('btn-xray')  ?.addEventListener('click', toggleXRay);
  document.getElementById('hud-top')   ?.addEventListener('click', ()=>setView('top'));
  document.getElementById('hud-front') ?.addEventListener('click', ()=>setView('front'));
  document.getElementById('hud-iso')   ?.addEventListener('click', ()=>setView('iso'));
  document.getElementById('ifc-file')  ?.addEventListener('change', e=>loadIFCFile(e.target));
  setupIFCDragDrop();

  // Touche F pour zoomer sur l'objet sélectionné
  // Touche I pour isoler l'objet sélectionné
  // Touche Escape pour quitter l'isolation
  document.addEventListener('keydown', e => {
    if (e.key === 'f' || e.key === 'F') {
      if (selectedId) focusObject(selectedId);
    }
    if (e.key === 'i' || e.key === 'I') {
      if (selectedId && !isolationActive) {
        isolateObject(selectedId);
      }
    }
    if (e.key === 'Escape') {
      if (isolationActive) {
        exitIsolation();
      }
    }
  });

  // Menu contextuel (clic droit)
  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    
    // Supprimer le menu existant s'il y en a un
    document.getElementById('context-menu')?.remove();
    
    if (!selectedId) return;
    
    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.className = 'context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    
    const obj = BIMObjects[selectedId];
    const layer = obj?.type;
    
    menu.innerHTML = `
      <div class="context-menu-item" id="ctx-isolate-object">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        Isoler cet objet
      </div>
      ${layer ? `<div class="context-menu-item" id="ctx-isolate-layer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
        </svg>
        Isoler le calque "${layer}"
      </div>` : ''}
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" id="ctx-focus">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>
        </svg>
        Zoomer sur l'objet (F)
      </div>
    `;
    
    document.body.appendChild(menu);
    
    // Gestionnaires d'événements
    document.getElementById('ctx-isolate-object')?.addEventListener('click', () => {
      isolateObject(selectedId);
      menu.remove();
    });
    
    document.getElementById('ctx-isolate-layer')?.addEventListener('click', () => {
      if (layer) isolateGroup(layer);
      menu.remove();
    });
    
    document.getElementById('ctx-focus')?.addEventListener('click', () => {
      focusObject(selectedId);
      menu.remove();
    });
    
    // Fermer le menu au clic ailleurs
    const closeMenu = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  });

  // Recherche
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
      }, 300); // Debounce de 300ms
    });
    
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && searchResults.length > 0) {
        navigateSearchResults('next');
      }
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchResults = [];
        updateSearchUI();
      }
    });
  }

  initIFC().catch(e=>console.warn('[BIM] WASM:', e.message));

  document.getElementById('loading').style.display = 'none';
  // Écran d'accueil
  buildPanel();
}

init().catch(e=>{
  console.error('[BIM] init:', e);
  document.getElementById('loading').style.display='none';
});

// Expose au slider HTML (hors module)
window.applySection = applySectionToAllMats;
window.sectionPlane = sectionPlane;
// Mise à jour de l'affichage de la valeur du slider
document.getElementById('section-slider-input')?.addEventListener('input', function() {
  document.getElementById('section-val').textContent = parseFloat(this.value).toFixed(2) + ' m';
});
