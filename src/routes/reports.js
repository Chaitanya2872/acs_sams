const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const mongoose = require('mongoose');
const { User } = require('../models/schemas');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

const COLORS = {
  PRIMARY: 'FF1F4E78',
  SECONDARY: 'FF4F81BD',
  SECTION: 'FFD9E2F3',
  SUBSECTION: 'FFE2F0D9',
  BORDER: 'FFBFBFBF',
  TEXT: 'FF1F1F1F',
  WHITE: 'FFFFFFFF',
  NOTE: 'FFFCE4D6'
};

const FONTS = {
  TITLE: { name: 'Calibri', size: 14, bold: true },
  HEADER: { name: 'Calibri', size: 11, bold: true },
  BODY: { name: 'Calibri', size: 10 },
  SMALL: { name: 'Calibri', size: 9 }
};

const STRUCTURAL_COMPONENTS = [
  ['beams', 'Beams'],
  ['columns', 'Columns'],
  ['slab', 'Slab'],
  ['foundation', 'Foundation'],
  ['roof_truss', 'Roof Truss'],
  ['connections', 'Connections'],
  ['bracings', 'Bracings'],
  ['purlins', 'Purlins'],
  ['channels', 'Channels'],
  ['steel_flooring', 'Steel Flooring']
];

const NON_STRUCTURAL_COMPONENTS = [
  ['brick_plaster', 'Brick / Plaster'],
  ['doors_windows', 'Doors / Windows'],
  ['flooring_tiles', 'Flooring / Tiles'],
  ['walls', 'Walls'],
  ['paintings', 'Paintings'],
  ['electrical_wiring', 'Electrical Wiring'],
  ['sanitary_fittings', 'Sanitary Fittings'],
  ['railings', 'Railings'],
  ['water_tanks', 'Water Tanks'],
  ['plumbing', 'Plumbing'],
  ['sewage_system', 'Sewage System'],
  ['panel_board', 'Panel Board'],
  ['lifts', 'Lifts'],
  ['walls_cladding', 'Walls / Cladding'],
  ['industrial_flooring', 'Industrial Flooring'],
  ['ventilation', 'Ventilation'],
  ['electrical_system', 'Electrical System'],
  ['fire_safety', 'Fire Safety'],
  ['drainage', 'Drainage'],
  ['overhead_cranes', 'Overhead Cranes'],
  ['loading_docks', 'Loading Docks'],
  ['cladding_partition_panels', 'Cladding / Partition Panels'],
  ['roof_sheeting', 'Roof Sheeting'],
  ['chequered_plate', 'Chequered Plate'],
  ['flooring', 'Flooring'],
  ['panel_board_transformer', 'Panel Board / Transformer'],
  ['lift', 'Lift']
];

const TEST_NAME_LABELS = {
  rebound_hammer: 'REBOUND HAMMER TEST',
  ultra_pulse_velocity: 'ULTRAPULSE VELOCITY TEST',
  half_cell_potential: 'HALF CELL POTENTIAL TEST',
  carbonation_depth: 'CARBONATION DEPTH TEST',
  cover_meter: 'COVER METER TEST',
  core_cutting: 'CORE CUTTING TEST',
  pull_out: 'PULLOUT TEST',
  chemical_analysis: 'CHEMICAL ANALYSIS TEST',
  ultrasonic_thickness_gauge: 'ULTRASONIC THICKNESS GAUGE TEST',
  magnetic_particle: 'MAGNETIC PARTICLE TEST',
  liquid_penetration: 'LIQUID PENETRATION TEST',
  hardness_test: 'HARDNESS TEST',
  custom: 'CUSTOM TEST'
};

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_MIME = 'application/pdf';
const WORD_MIME = 'application/msword';

const BROWSER_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

const isPdfFormat = (format) => format === 'pdf';
const isWordFormat = (format) => ['word', 'doc', 'docx'].includes(format);

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const escapeHtml = (value) =>
  safeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const flattenMixedObject = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => flattenMixedObject(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, current]) => current !== null && current !== undefined && current !== '')
      .map(([key, current]) => `${key}: ${flattenMixedObject(current)}`)
      .join(' | ');
  }
  return String(value);
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const inferQuantityValue = (entry) => {
  const explicit = toNumber(entry.quantity);
  if (explicit !== null) return explicit;

  const length = toNumber(entry.length);
  const breadth = toNumber(entry.breadth);
  const height = toNumber(entry.height);
  const nos = toNumber(entry.nos) || 1;

  if (length !== null && breadth !== null && height !== null) {
    return nos * length * breadth * height;
  }

  if (length !== null && breadth !== null) {
    return nos * length * breadth;
  }

  if (length !== null) {
    return nos * length;
  }

  return nos;
};

const inferUnit = (entry) => {
  const provided = safeText(entry.unit).toUpperCase();
  if (provided) return provided;

  const breadth = toNumber(entry.breadth);
  const height = toNumber(entry.height);
  if (height !== null) return 'CUM';
  if (breadth !== null) return 'SQM';
  if (toNumber(entry.length) !== null) return 'RM';
  return "NO'S";
};

const formatApproxQuantity = (value) => {
  const numeric = toNumber(value);
  if (numeric === null) return '';
  return String(Number(numeric.toFixed(2)));
};

const calculateMethodologySummaryValue = (row, methodKey) => {
  const nos = toNumber(row.nos) || 1;
  const length = toNumber(row.length);
  const breadth = toNumber(row.breadth);
  const height = toNumber(row.height);
  const safeLength = length ?? 0;
  const safeBreadth = breadth ?? 0;
  const safeHeight = height ?? 0;

  if (methodKey.includes('epoxy grouting') || methodKey.includes('cement grouting')) {
    return {
      quantity: safeLength * 8 || nos * 8,
      units: 'KGS'
    };
  }

  if (
    methodKey.includes('micro concrete') ||
    methodKey.includes('concrete jacketing') ||
    methodKey.includes('encasement')
  ) {
    return {
      quantity: nos * (safeLength || 1) * (safeBreadth || 1) * (safeHeight || 1),
      units: 'CUM'
    };
  }

  if (
    methodKey.includes('polymer modified mortar') ||
    methodKey.includes('replaster') ||
    methodKey.includes('replastering') ||
    methodKey.includes('repainting') ||
    methodKey.includes('painting') ||
    methodKey.includes('plaster')
  ) {
    return {
      quantity: nos * (safeLength || 1) * (safeBreadth || 1),
      units: 'SQM'
    };
  }

  if (
    methodKey.includes('replacement of') ||
    methodKey.includes('replacement ') ||
    methodKey.includes('pipe') ||
    methodKey.includes('piping')
  ) {
    if (length !== null) {
      return {
        quantity: nos * safeLength,
        units: 'RM'
      };
    }

    return {
      quantity: nos,
      units: "NO'S"
    };
  }

  return {
    quantity: inferQuantityValue(row),
    units: inferUnit(row)
  };
};

const summarizeMethodology = (rows) => {
  const summaryMap = new Map();

  rows.forEach((row) => {
    const method = safeText(row.repair_methodology, 'Not Specified');
    const key = method.toLowerCase();
    const { quantity, units } = calculateMethodologySummaryValue(row, key);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        description: method,
        quantity: 0,
        units
      });
    }

    const current = summaryMap.get(key);
    current.quantity += quantity;
    if (!current.units) current.units = units;
  });

  return Array.from(summaryMap.values()).map((item) => ({
    ...item,
    quantity: Number(item.quantity.toFixed(2))
  }));
};

const isAdminUser = (user) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return ['admin', 'AD'].includes(user?.role) || roles.includes('admin') || roles.includes('AD');
};

const canViewAllStructures = (user) => {
  return isAdminUser(user) || Boolean(user?.permissions?.can_view_all_structures);
};

const checkExportPermissions = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const hasOwnReportAccess = ['FE', 'field_engineer'].includes(req.user.role);
  const hasPermission =
    isAdminUser(req.user) ||
    hasOwnReportAccess ||
    Boolean(req.user.permissions?.can_export_reports);
  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions to export reports'
    });
  }

  return next();
};

const buildOwnerLabel = (userInfo) => {
  const firstName = safeText(userInfo?.profile?.first_name);
  const lastName = safeText(userInfo?.profile?.last_name);
  const fullName = safeText(`${firstName} ${lastName}`.trim());
  return fullName || safeText(userInfo?.username) || safeText(userInfo?.email) || 'N/A';
};

const sanitizeWorksheetName = (name, fallback) => {
  const cleaned = safeText(name, fallback).replace(/[\\/*?:[\]]/g, ' ').trim();
  return (cleaned || fallback).slice(0, 31);
};

const getUserMatch = (reqUser, query) => {
  const match = { is_active: true };

  if (!canViewAllStructures(reqUser)) {
    match._id = new mongoose.Types.ObjectId(reqUser.userId);
    return match;
  }

  if (query.user_id && mongoose.Types.ObjectId.isValid(query.user_id)) {
    match._id = new mongoose.Types.ObjectId(query.user_id);
  }

  if (query.employee_id) {
    match['profile.employee_id'] = query.employee_id;
  }

  if (query.organization) {
    match['profile.organization'] = new RegExp(query.organization, 'i');
  }

  return match;
};

const getStructureMatch = (query) => {
  const match = {};

  if (query.structure_id) {
    if (mongoose.Types.ObjectId.isValid(query.structure_id)) {
      match['structures._id'] = new mongoose.Types.ObjectId(query.structure_id);
    } else {
      match['structures.structural_identity.structural_identity_number'] = query.structure_id;
    }
  }

  if (query.structure_ids) {
    const rawIds = query.structure_ids
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const objectIds = rawIds
      .filter((value) => mongoose.Types.ObjectId.isValid(value))
      .map((value) => new mongoose.Types.ObjectId(value));
    const structureNumbers = rawIds.filter((value) => !mongoose.Types.ObjectId.isValid(value));

    if (objectIds.length > 0 || structureNumbers.length > 0) {
      const filters = [];
      if (objectIds.length > 0) filters.push({ 'structures._id': { $in: objectIds } });
      if (structureNumbers.length > 0) {
        filters.push({
          'structures.structural_identity.structural_identity_number': { $in: structureNumbers }
        });
      }
      match.$or = [...(match.$or || []), ...filters];
    }
  }

  if (query.state_code) match['structures.location.state_code'] = safeText(query.state_code).toUpperCase();
  if (query.district_code) match['structures.location.district_code'] = safeText(query.district_code);
  if (query.city_name) match['structures.location.city_name'] = new RegExp(query.city_name, 'i');
  if (query.location_code) match['structures.location.location_code'] = safeText(query.location_code).toUpperCase();
  if (query.type_of_structure) match['structures.structural_identity.type_of_structure'] = query.type_of_structure;
  if (query.structure_subtype) match['structures.structural_identity.structure_subtype'] = query.structure_subtype;
  if (query.status) match['structures.status'] = query.status;
  if (query.health_status) {
    match['structures.geometric_details.floors.floor_overall_rating.health_status'] = query.health_status;
  }
  if (query.priority) {
    match['structures.geometric_details.floors.floor_overall_rating.priority'] = query.priority;
  }

  if (query.date_from || query.date_to) {
    const dateRange = {};
    if (query.date_from) {
      const fromDate = new Date(query.date_from);
      if (!Number.isNaN(fromDate.getTime())) dateRange.$gte = fromDate;
    }
    if (query.date_to) {
      const toDate = new Date(query.date_to);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        dateRange.$lte = toDate;
      }
    }
    if (Object.keys(dateRange).length > 0) {
      match['structures.creation_info.created_date'] = dateRange;
    }
  }

  return match;
};

const buildAggregationPipeline = (reqUser, query = {}, singleStructureMatch = null) => {
  const userMatch = getUserMatch(reqUser, query);
  const structureMatch = singleStructureMatch || getStructureMatch(query);

  return [
    { $match: userMatch },
    { $unwind: '$structures' },
    { $match: structureMatch },
    {
      $project: {
        owner: {
          _id: '$_id',
          username: '$username',
          email: '$email',
          role: '$role',
          profile: '$profile'
        },
        structure: '$structures'
      }
    }
  ];
};

const fetchStructuresForExport = async (reqUser, query = {}, singleStructureMatch = null) => {
  return User.aggregate(buildAggregationPipeline(reqUser, query, singleStructureMatch));
};

const getCustomComponentEntries = (value) => {
  if (!value) return [];

  const source = value instanceof Map ? Array.from(value.entries()) : Object.entries(value);
  return source.flatMap(([key, entries]) => {
    const arr = Array.isArray(entries) ? entries : [];
    return arr.map((entry) => ({
      componentKey: key,
      componentLabel: safeText(entry?.name, key),
      entry
    }));
  });
};

const getComponentEntries = (componentContainer, componentMap) => {
  if (!componentContainer) return [];

  const namedEntries = componentMap.flatMap(([componentKey, componentLabel]) => {
    const entries = Array.isArray(componentContainer[componentKey]) ? componentContainer[componentKey] : [];
    return entries.map((entry) => ({ componentKey, componentLabel, entry }));
  });

  return namedEntries.concat(getCustomComponentEntries(componentContainer.custom_components));
};

const buildLocationLabel = (scopeType, scope) => {
  if (scopeType === 'floor') {
    return safeText(scope.floor_label_name, `Floor ${scope.floor_number}`);
  }
  if (scopeType === 'flat') {
    const floorLabel = safeText(scope.floorLabel, `Floor ${scope.floor_number}`);
    return `${floorLabel} / Flat ${safeText(scope.flat_number, scope.flat_id || 'N/A')}`;
  }
  if (scopeType === 'block') {
    const floorLabel = safeText(scope.floorLabel, `Floor ${scope.floor_number}`);
    return `${floorLabel} / Block ${safeText(scope.block_name || scope.block_number, scope.block_id || 'N/A')}`;
  }
  return 'Structure';
};

const normalizeComponentLookupKey = (value) =>
  safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

const getObservationText = (entry) => {
  const remarks = safeText(entry?.inspector_notes || entry?.condition_comment || entry?.remarks);
  if (remarks) return remarks;

  const distressTypes = Array.isArray(entry?.distress_types)
    ? entry.distress_types.map((item) => safeText(item)).filter(Boolean).join(', ')
    : '';

  return distressTypes || '';
};

const buildObservationLookup = (structuralContainer, nonStructuralContainer) => {
  const lookup = new Map();

  const addEntries = (entries) => {
    entries.forEach(({ componentKey, componentLabel, entry }) => {
      const observationText = getObservationText(entry);
      if (!observationText) return;

      [componentKey, componentLabel, entry?.name].forEach((alias) => {
        const key = normalizeComponentLookupKey(alias);
        if (key && !lookup.has(key)) {
          lookup.set(key, observationText);
        }
      });
    });
  };

  addEntries(getComponentEntries(structuralContainer, STRUCTURAL_COMPONENTS));
  addEntries(getComponentEntries(nonStructuralContainer, NON_STRUCTURAL_COMPONENTS));

  return lookup;
};

const resolveQuantificationLocation = (entry, observationLookup, scopeLabel) => {
  const categoryKey = normalizeComponentLookupKey(entry?.category);
  const observationText = categoryKey ? observationLookup.get(categoryKey) : '';
  return safeText(observationText, safeText(entry?.location_of_distress, scopeLabel));
};

const buildDerivedQuantificationRows = (entries, scopeLabel) => {
  const rows = [];

  entries.forEach(({ componentLabel, entry }) => {
    const observationText = getObservationText(entry);
    const dimensions = entry?.distress_dimensions || {};
    const length = toNumber(dimensions.length);
    const breadth = toNumber(dimensions.breadth);
    const height = toNumber(dimensions.height);
    const repairMethodology = safeText(entry?.repair_methodology, 'Not Specified');
    const hasDimensions = length !== null || breadth !== null || height !== null;
    const hasContent = Boolean(observationText || hasDimensions || safeText(entry?.repair_methodology));

    if (!hasContent) {
      return;
    }

    const quantBase = {
      nos: 1,
      length,
      breadth,
      height
    };

    rows.push({
      scopeLabel,
      category: componentLabel,
      location_of_distress: safeText(observationText, componentLabel),
      distress: componentLabel,
      nos: quantBase.nos,
      length: quantBase.length,
      breadth: quantBase.breadth,
      height: quantBase.height,
      quantity: inferQuantityValue(quantBase),
      unit: inferUnit(quantBase),
      repair_methodology: repairMethodology
    });
  });

  return rows;
};

const collectScopeDerivedQuantifications = (scopeLabel, structuralContainer, nonStructuralContainer) =>
  buildDerivedQuantificationRows(getComponentEntries(structuralContainer, STRUCTURAL_COMPONENTS), scopeLabel)
    .concat(buildDerivedQuantificationRows(getComponentEntries(nonStructuralContainer, NON_STRUCTURAL_COMPONENTS), scopeLabel));

const collectDerivedQuantificationsForContainer = (scopeLabel, container, componentMap) =>
  buildDerivedQuantificationRows(getComponentEntries(container, componentMap), scopeLabel);

const collectObservationsFromScope = (scopeType, scope, structuralContainer, nonStructuralContainer) => {
  const observations = [];
  const locationLabel = buildLocationLabel(scopeType, scope);

  const appendEntries = (entries, category) => {
    entries.forEach(({ componentLabel, entry }) => {
      const remarks = safeText(entry?.inspector_notes || entry?.condition_comment || entry?.remarks);
      const distressTypes = Array.isArray(entry?.distress_types) ? entry.distress_types.join(', ') : '';
      const note = remarks || distressTypes;
      const photos = Array.isArray(entry?.photos) ? entry.photos.filter(Boolean) : [];

      if (!note && photos.length === 0) {
        return;
      }

      observations.push({
        location: locationLabel,
        category,
        component: componentLabel,
        remarks: note || `${componentLabel} observation recorded`,
        photos,
        repair_methodology: safeText(entry?.repair_methodology),
        distress: distressTypes || componentLabel
      });
    });
  };

  appendEntries(getComponentEntries(structuralContainer, STRUCTURAL_COMPONENTS), 'STRUCTURAL DISTRESS');
  appendEntries(getComponentEntries(nonStructuralContainer, NON_STRUCTURAL_COMPONENTS), 'NON-STRUCTURAL DISTRESS');

  return observations;
};

const collectStructureObservations = (structure) => {
  const observations = [];
  const floors = Array.isArray(structure?.geometric_details?.floors) ? structure.geometric_details.floors : [];

  floors.forEach((floor) => {
    observations.push(
      ...collectObservationsFromScope('floor', floor, floor.structural_rating, floor.non_structural_rating)
    );

    const flats = Array.isArray(floor.flats) ? floor.flats : [];
    flats.forEach((flat) => {
      observations.push(
        ...collectObservationsFromScope(
          'flat',
          { ...flat, floor_number: floor.floor_number, floorLabel: floor.floor_label_name },
          flat.structural_rating,
          flat.non_structural_rating
        )
      );
    });

    const blocks = Array.isArray(floor.blocks) ? floor.blocks : [];
    blocks.forEach((block) => {
      observations.push(
        ...collectObservationsFromScope(
          'block',
          { ...block, floor_number: floor.floor_number, floorLabel: floor.floor_label_name },
          block.structural_rating,
          block.non_structural_rating
        )
      );
    });
  });

  return observations;
};

const collectQuantifications = (structure) => {
  const rows = [];
  const floors = Array.isArray(structure?.geometric_details?.floors) ? structure.geometric_details.floors : [];

  const addRows = (entries, scopeLabel, category, observationLookup) => {
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      rows.push({
        scopeLabel,
        category,
        location_of_distress: resolveQuantificationLocation(entry, observationLookup, scopeLabel),
        distress: safeText(entry.category, category),
        nos: toNumber(entry.nos) ?? 1,
        length: toNumber(entry.length),
        breadth: toNumber(entry.breadth),
        height: toNumber(entry.height),
        quantity: inferQuantityValue(entry),
        unit: inferUnit(entry),
        repair_methodology: safeText(entry.repair_methodology, 'Not Specified')
      });
    });
  };

  const addSavedOrDerivedRows = ({
    structuralEntries,
    nonStructuralEntries,
    scopeLabel,
    structuralContainer,
    nonStructuralContainer
  }) => {
    const observationLookup = buildObservationLookup(structuralContainer, nonStructuralContainer);
    const hasSavedStructural = Array.isArray(structuralEntries) && structuralEntries.length > 0;
    const hasSavedNonStructural = Array.isArray(nonStructuralEntries) && nonStructuralEntries.length > 0;

    if (hasSavedStructural) {
      addRows(structuralEntries, scopeLabel, 'STRUCTURAL DISTRESS', observationLookup);
    } else {
      rows.push(...collectDerivedQuantificationsForContainer(scopeLabel, structuralContainer, STRUCTURAL_COMPONENTS));
    }

    if (hasSavedNonStructural) {
      addRows(nonStructuralEntries, scopeLabel, 'NON-STRUCTURAL DISTRESS', observationLookup);
    } else {
      rows.push(...collectDerivedQuantificationsForContainer(scopeLabel, nonStructuralContainer, NON_STRUCTURAL_COMPONENTS));
    }
  };

  floors.forEach((floor) => {
    const floorLabel = safeText(floor.floor_label_name, `Floor ${floor.floor_number}`);
    addSavedOrDerivedRows({
      structuralEntries: floor.quantifications?.structural,
      nonStructuralEntries: floor.quantifications?.non_structural,
      scopeLabel: floorLabel,
      structuralContainer: floor.structural_rating,
      nonStructuralContainer: floor.non_structural_rating
    });

    (Array.isArray(floor.flats) ? floor.flats : []).forEach((flat) => {
      const flatLabel = `${floorLabel} / Flat ${safeText(flat.flat_number, flat.flat_id || 'N/A')}`;
      addSavedOrDerivedRows({
        structuralEntries: flat.quantifications?.structural,
        nonStructuralEntries: flat.quantifications?.non_structural,
        scopeLabel: flatLabel,
        structuralContainer: flat.structural_rating,
        nonStructuralContainer: flat.non_structural_rating
      });
    });

    (Array.isArray(floor.blocks) ? floor.blocks : []).forEach((block) => {
      const blockLabel = `${floorLabel} / Block ${safeText(block.block_name || block.block_number, block.block_id || 'N/A')}`;
      rows.push(...collectScopeDerivedQuantifications(blockLabel, block.structural_rating, block.non_structural_rating));
    });
  });

  return rows;
};

const collectTests = (structure) => {
  const tests = [];

  const addTests = (entries, scopeLabel) => {
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      tests.push({
        scopeLabel,
        test_name: safeText(TEST_NAME_LABELS[entry.test_name], safeText(entry.test_name, 'TEST')),
        tested_by: safeText(entry.tested_by),
        test_date: formatDate(entry.test_date),
        remarks: safeText(entry.remarks),
        component_type: safeText(entry.component_type),
        component_id: safeText(entry.component_id),
        result_summary: flattenMixedObject(entry.test_results),
        attachment: safeText(entry.test_report_pdf?.file_path || entry.test_report_pdf?.filename)
      });
    });
  };

  addTests(structure.structure_test_results, 'Structure');

  const floors = Array.isArray(structure?.geometric_details?.floors) ? structure.geometric_details.floors : [];
  floors.forEach((floor) => {
    const floorLabel = safeText(floor.floor_label_name, `Floor ${floor.floor_number}`);
    addTests(floor.test_results, floorLabel);

    (Array.isArray(floor.flats) ? floor.flats : []).forEach((flat) => {
      addTests(flat.test_results, `${floorLabel} / Flat ${safeText(flat.flat_number, flat.flat_id || 'N/A')}`);
    });

    (Array.isArray(floor.blocks) ? floor.blocks : []).forEach((block) => {
      addTests(
        block.test_results,
        `${floorLabel} / Block ${safeText(block.block_name || block.block_number, block.block_id || 'N/A')}`
      );
    });
  });

  return tests;
};

const collectPhotoRows = (observations, tests) => {
  const inspectionImages = observations.flatMap((observation) =>
    observation.photos.map((photo, index) => ({
      location: observation.location,
      caption: observation.remarks || observation.component,
      source: photo,
      serial: index + 1
    }))
  );

  const testingImages = tests
    .filter((test) => test.attachment)
    .map((test, index) => ({
      serial: index + 1,
      test_name: test.test_name,
      scopeLabel: test.scopeLabel,
      source: test.attachment
    }));

  return { inspectionImages, testingImages };
};

const setCellBorder = (cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.BORDER } },
    left: { style: 'thin', color: { argb: COLORS.BORDER } },
    bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
    right: { style: 'thin', color: { argb: COLORS.BORDER } }
  };
};

const styleRowCells = (worksheet, rowNumber, fromCol, toCol, options = {}) => {
  for (let col = fromCol; col <= toCol; col += 1) {
    const cell = worksheet.getCell(rowNumber, col);
    cell.font = options.font || FONTS.BODY;
    cell.alignment = options.alignment || { vertical: 'middle', wrapText: true };
    if (options.fill) cell.fill = options.fill;
    setCellBorder(cell);
  }
};

const addMergedSectionRow = (worksheet, rowNumber, text, fillColor, columnCount) => {
  worksheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
  const cell = worksheet.getCell(rowNumber, 1);
  cell.value = text;
  cell.font = FONTS.HEADER;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  setCellBorder(cell);
  worksheet.getRow(rowNumber).height = 20;
};

const addTableHeader = (worksheet, rowNumber, headers, fillColor = COLORS.SECONDARY) => {
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(rowNumber, index + 1);
    cell.value = header;
    cell.font = { ...FONTS.HEADER, color: { argb: COLORS.WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    setCellBorder(cell);
  });
  worksheet.getRow(rowNumber).height = 22;
};

const ensureColumns = (worksheet) => {
  worksheet.columns = [
    { width: 8 },
    { width: 34 },
    { width: 20 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 16 },
    { width: 30 }
  ];
};

const addObservationSection = (worksheet, startRow, observations) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, 'OBSERVATIONS', COLORS.SECTION, 3);
  row += 1;
  addTableHeader(worksheet, row, ['S. No', 'Location / Remarks', 'Category'], COLORS.PRIMARY);
  row += 1;

  if (observations.length === 0) {
    worksheet.addRow(['', 'No observations recorded', '']);
    styleRowCells(worksheet, row, 1, 3);
    return row + 1;
  }

  const grouped = observations.reduce((acc, item) => {
    if (!acc.has(item.location)) acc.set(item.location, []);
    acc.get(item.location).push(item);
    return acc;
  }, new Map());

  grouped.forEach((locationObservations, location) => {
    addMergedSectionRow(worksheet, row, safeText(location).toUpperCase(), COLORS.SUBSECTION, 3);
    row += 1;

    ['STRUCTURAL DISTRESS', 'NON-STRUCTURAL DISTRESS'].forEach((category) => {
      const categoryRows = locationObservations.filter((item) => item.category === category);
      if (categoryRows.length === 0) return;

      addMergedSectionRow(worksheet, row, category, COLORS.SUBSECTION, 3);
      row += 1;

      categoryRows.forEach((item, index) => {
        worksheet.getCell(row, 1).value = index + 1;
        worksheet.getCell(row, 2).value = `${item.component}: ${item.remarks}`;
        worksheet.getCell(row, 3).value = category;
        styleRowCells(worksheet, row, 1, 3);
        row += 1;
      });
    });
  });

  return row;
};

const addImageSection = (worksheet, startRow, title, rows, isTesting = false) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, title, COLORS.SECTION, 4);
  row += 1;

  const headers = isTesting
    ? ['S. No', 'Test Name', 'Location', 'File Reference']
    : ['S. No', 'Caption', 'Location', 'Image Reference'];
  addTableHeader(worksheet, row, headers, COLORS.PRIMARY);
  row += 1;

  if (rows.length === 0) {
    worksheet.addRow(['', 'No files attached', '', '']);
    styleRowCells(worksheet, row, 1, 4);
    return row + 1;
  }

  rows.forEach((entry, index) => {
    worksheet.getCell(row, 1).value = index + 1;
    if (isTesting) {
      worksheet.getCell(row, 2).value = entry.test_name;
      worksheet.getCell(row, 3).value = entry.scopeLabel;
      worksheet.getCell(row, 4).value = entry.source;
    } else {
      worksheet.getCell(row, 2).value = entry.caption;
      worksheet.getCell(row, 3).value = entry.location;
      worksheet.getCell(row, 4).value = entry.source;
    }
    styleRowCells(worksheet, row, 1, 4);
    row += 1;
  });

  return row;
};

const addTestSection = (worksheet, startRow, tests) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, 'TEST RESULTS', COLORS.SECTION, 6);
  row += 1;

  if (tests.length === 0) {
    addTableHeader(worksheet, row, ['S. No', 'Test Name', 'Location', 'Tested By', 'Date', 'Remarks / Result'], COLORS.PRIMARY);
    row += 1;
    worksheet.addRow(['', 'No test results recorded', '', '', '', '']);
    styleRowCells(worksheet, row, 1, 6);
    return row + 1;
  }

  const grouped = tests.reduce((acc, item) => {
    if (!acc.has(item.test_name)) acc.set(item.test_name, []);
    acc.get(item.test_name).push(item);
    return acc;
  }, new Map());

  let testIndex = 1;
  grouped.forEach((testRows, testName) => {
    addMergedSectionRow(worksheet, row, `${testIndex}. ${testName}`, COLORS.SUBSECTION, 6);
    row += 1;
    addTableHeader(worksheet, row, ['S. No', 'Location', 'Component', 'Tested By', 'Date', 'Remarks / Result'], COLORS.PRIMARY);
    row += 1;

    testRows.forEach((item, index) => {
      worksheet.getCell(row, 1).value = index + 1;
      worksheet.getCell(row, 2).value = item.scopeLabel;
      worksheet.getCell(row, 3).value = [item.component_type, item.component_id].filter(Boolean).join(' / ');
      worksheet.getCell(row, 4).value = item.tested_by || 'N/A';
      worksheet.getCell(row, 5).value = item.test_date || '';
      worksheet.getCell(row, 6).value = [item.result_summary, item.remarks].filter(Boolean).join(' | ') || 'N/A';
      styleRowCells(worksheet, row, 1, 6);
      row += 1;
    });

    testIndex += 1;
  });

  return row;
};

const addQuantificationSection = (worksheet, startRow, quantifications) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, 'QUANTIFICATION', COLORS.SECTION, 9);
  row += 1;
  addTableHeader(
    worksheet,
    row,
    ['S. No', 'Location of Distress', 'Distress', 'Nos', 'L', 'B', 'H', 'Length / Area / Volume', 'Repair Methodology'],
    COLORS.PRIMARY
  );
  row += 1;

  if (quantifications.length === 0) {
    worksheet.addRow(['', 'No quantification entries recorded', '', '', '', '', '', '', '']);
    styleRowCells(worksheet, row, 1, 9);
    return row + 1;
  }

  const grouped = quantifications.reduce((acc, item) => {
    if (!acc.has(item.category)) acc.set(item.category, []);
    acc.get(item.category).push(item);
    return acc;
  }, new Map());

  grouped.forEach((entries, category) => {
    addMergedSectionRow(worksheet, row, category, COLORS.SUBSECTION, 9);
    row += 1;

    entries.forEach((entry, index) => {
      worksheet.getCell(row, 1).value = index + 1;
      worksheet.getCell(row, 2).value = entry.location_of_distress;
      worksheet.getCell(row, 3).value = entry.distress;
      worksheet.getCell(row, 4).value = entry.nos;
      worksheet.getCell(row, 5).value = entry.length ?? '';
      worksheet.getCell(row, 6).value = entry.breadth ?? '';
      worksheet.getCell(row, 7).value = entry.height ?? '';
      worksheet.getCell(row, 8).value = formatApproxQuantity(entry.quantity);
      worksheet.getCell(row, 9).value = entry.repair_methodology;
      styleRowCells(worksheet, row, 1, 9);
      row += 1;
    });
  });

  return row;
};

const addMethodologySummary = (worksheet, startRow, quantifications) => {
  let row = startRow;
  const summaryRows = summarizeMethodology(quantifications);

  addTableHeader(worksheet, row, ['S. No', 'Description', 'Quantity', 'Units'], COLORS.PRIMARY);
  row += 1;

  if (summaryRows.length === 0) {
    worksheet.addRow(['', 'No methodology summary available', '', '']);
    styleRowCells(worksheet, row, 1, 4);
    return row + 1;
  }

  summaryRows.forEach((entry, index) => {
    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = entry.description;
    worksheet.getCell(row, 3).value = entry.quantity;
    worksheet.getCell(row, 4).value = entry.units;
    styleRowCells(worksheet, row, 1, 4);
    row += 1;
  });

  addMergedSectionRow(
    worksheet,
    row,
    'Note: Observation-to-quantification linkage depends on saved quantification rows. TODO: add explicit observation linkage in the data model if the client needs one-to-one traceability.',
    COLORS.NOTE,
    4
  );

  return row + 1;
};

const addStructureHeader = (worksheet, structureExport, filtersApplied) => {
  const { structure, owner } = structureExport;

  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = 'SAMS';
  worksheet.getCell('A1').font = FONTS.TITLE;
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = 'OUTPUT / REPORT FORMAT';
  worksheet.getCell('A2').font = FONTS.HEADER;
  worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SECTION } };
  worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };

  const summaryRows = [
    ['Structure ID', safeText(structure.structural_identity?.structural_identity_number, 'N/A')],
    ['UID', safeText(structure.structural_identity?.uid, 'N/A')],
    ['Structure Type', safeText(structure.structural_identity?.type_of_structure, 'N/A')],
    ['Structure Subtype', safeText(structure.structural_identity?.structure_subtype, 'N/A')],
    ['Owner / Employee', `${buildOwnerLabel(owner)}${owner?.profile?.employee_id ? ` (${owner.profile.employee_id})` : ''}`],
    ['Organization', safeText(owner?.profile?.organization || structure.administration?.organization, 'N/A')],
    ['Location', [structure.location?.state_code, structure.location?.district_code, structure.location?.city_name, structure.location?.location_code].filter(Boolean).join(' / ') || 'N/A'],
    ['Created Date', formatDate(structure.creation_info?.created_date) || 'N/A'],
    ['Last Updated', formatDate(structure.creation_info?.last_updated_date) || 'N/A'],
    ['Applied Filters', filtersApplied || 'None']
  ];

  let row = 4;
  summaryRows.forEach(([label, value]) => {
    worksheet.getCell(row, 1).value = label;
    worksheet.getCell(row, 2).value = value;
    styleRowCells(worksheet, row, 1, 2, {
      fill: row % 2 === 0
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } }
        : undefined
    });
    worksheet.getCell(row, 1).font = { ...FONTS.BODY, bold: true };
    row += 1;
  });

  return row + 1;
};

const buildFilterSummary = (query = {}) => {
  const keys = [
    'user_id',
    'employee_id',
    'organization',
    'structure_id',
    'structure_ids',
    'state_code',
    'district_code',
    'city_name',
    'location_code',
    'type_of_structure',
    'structure_subtype',
    'status',
    'date_from',
    'date_to'
  ];

  const parts = keys
    .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== '')
    .map((key) => `${key}=${query[key]}`);

  return parts.join(', ');
};

const ensurePdfSpace = (doc, requiredHeight = 24) => {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + requiredHeight > bottomLimit) {
    doc.addPage();
  }
};

const pdfSectionTitle = (doc, title) => {
  ensurePdfSpace(doc, 26);
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000000')
    .text(title, { underline: true });
  doc.moveDown(0.4);
  doc.fillColor('#000000');
};

const pdfHighlightLabel = (doc, text) => {
  const label = safeText(text, '');
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = doc.widthOfString(label, { font: 'Helvetica-Bold', size: 12 }) + 8;
  const height = 16;

  ensurePdfSpace(doc, height + 4);
  doc.rect(x, y, width, height).fill('#FFF200');
  doc
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(label, x + 4, y + 3, { lineBreak: false });
  doc.y = y + height + 6;
};

const pdfKeyValue = (doc, label, value) => {
  ensurePdfSpace(doc, 18);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`${label}: `, { continued: true });
  doc
    .font('Helvetica')
    .text(safeText(value, ''));
};

const pdfBullet = (doc, text, indent = 14) => {
  ensurePdfSpace(doc, 20);
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(`• ${safeText(text, 'N/A')}`, { indent });
};

const pdfTableRow = (doc, columns, widths, options = {}) => {
  const startX = doc.page.margins.left;
  const lineHeight = options.lineHeight || 14;
  const font = options.font || 'Helvetica';
  const fontSize = options.fontSize || 9;
  const isHeader = Boolean(options.header);

  const heights = columns.map((value, index) => {
    const width = widths[index] - 6;
    return doc.heightOfString(safeText(value, ''), { width, align: 'left' });
  });
  const rowHeight = Math.max(lineHeight, ...heights) + 6;
  ensurePdfSpace(doc, rowHeight + 2);

  let currentX = startX;
  columns.forEach((value, index) => {
    const width = widths[index];
    doc
      .rect(currentX, doc.y, width, rowHeight)
      .lineWidth(0.5)
      .strokeColor('#BFBFBF')
      .stroke();

    doc
      .font(isHeader ? 'Helvetica-Bold' : font)
      .fontSize(fontSize)
      .fillColor('#000000')
      .text(safeText(value, ''), currentX + 3, doc.y + 3, {
        width: width - 6,
        align: 'left'
      });

    currentX += width;
  });

  doc.y += rowHeight;
};

const groupObservationsForPdf = (observations) =>
  observations.reduce((acc, item) => {
    if (!acc.has(item.location)) {
      acc.set(item.location, { structural: [], nonStructural: [] });
    }

    const bucket = item.category === 'STRUCTURAL DISTRESS' ? 'structural' : 'nonStructural';
    acc.get(item.location)[bucket].push(item);
    return acc;
  }, new Map());

const groupTestsForPdf = (tests) =>
  tests.reduce((acc, test) => {
    if (!acc.has(test.test_name)) acc.set(test.test_name, []);
    acc.get(test.test_name).push(test);
    return acc;
  }, new Map());

const groupQuantificationsForPdf = (rows) =>
  rows.reduce((acc, row) => {
    const key = safeText(row.distress, 'OTHER');
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());

const getPdfImagePath = (source) => {
  const value = safeText(source);
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return null;
  if (fs.existsSync(value)) return value;
  return null;
};

const renderPdfImageGrid = (doc, rows, type) => {
  if (!rows.length) {
    return;
  }

  const gap = 16;
  const cardWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - gap) / 2;
  const imageHeight = 150;
  const captionHeight = 34;
  const cardHeight = imageHeight + captionHeight;
  const startX = doc.page.margins.left;

  rows.forEach((row, index) => {
    if (index % 2 === 0) {
      ensurePdfSpace(doc, cardHeight + 20);
    }

    const x = index % 2 === 0 ? startX : startX + cardWidth + gap;
    const y = doc.y;
    const title = type === 'inspection' ? row.caption : row.test_name;
    const meta = type === 'inspection' ? row.location : row.scopeLabel;
    const imagePath = getPdfImagePath(row.source);

    doc.rect(x, y, cardWidth, imageHeight).lineWidth(0.5).strokeColor('#BFBFBF').stroke();

    if (imagePath) {
      try {
        doc.image(imagePath, x + 2, y + 2, {
          fit: [cardWidth - 4, imageHeight - 4],
          align: 'center',
          valign: 'center'
        });
      } catch (error) {
        doc.font('Helvetica').fontSize(9).fillColor('#666666').text('Image could not be rendered', x + 8, y + 68, {
          width: cardWidth - 16,
          align: 'center'
        });
      }
    } else {
      doc.font('Helvetica').fontSize(9).fillColor('#666666').text('Image not available in export', x + 8, y + 68, {
        width: cardWidth - 16,
        align: 'center'
      });
    }

    doc
      .fillColor('#000000')
      .font('Helvetica')
      .fontSize(9)
      .text(safeText(title, 'Untitled'), x, y + imageHeight + 4, {
        width: cardWidth,
        align: 'center'
      });
    doc
      .fillColor('#555555')
      .fontSize(8)
      .text(safeText(meta, ''), x, y + imageHeight + 16, {
        width: cardWidth,
        align: 'center'
      });

    if (index % 2 === 1 || index === rows.length - 1) {
      doc.y = y + cardHeight + 10;
    }
  });
  doc.fillColor('#000000');
};

const renderStructurePdf = (doc, structureExport, filtersApplied, index, total) => {
  const observations = collectStructureObservations(structureExport.structure);
  const quantifications = collectQuantifications(structureExport.structure);
  const tests = collectTests(structureExport.structure);
  const { inspectionImages, testingImages } = collectPhotoRows(observations, tests);
  const structure = structureExport.structure;
  const summaryRows = summarizeMethodology(quantifications);
  const ownerEmployee = [
    buildOwnerLabel(structureExport.owner),
    structureExport.owner?.profile?.employee_id ? `(${structureExport.owner.profile.employee_id})` : ''
  ].filter(Boolean).join(' ');

  if (index > 0) doc.addPage();

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#1F1F1F').text('SAMS', { align: 'center' });
  doc.moveDown(0.2);
  pdfHighlightLabel(doc, 'OUTPUT / REPORT FORMAT:');
  doc.fillColor('#000000');

  pdfKeyValue(doc, 'Structure ID', structure.structural_identity?.structural_identity_number || '');
  pdfKeyValue(doc, 'UID', structure.structural_identity?.uid || '');
  pdfKeyValue(doc, 'Structure Type', structure.structural_identity?.type_of_structure || '');
  pdfKeyValue(doc, 'Structure Subtype', structure.structural_identity?.structure_subtype || '');
  pdfKeyValue(doc, 'Owner / Employee', ownerEmployee || '');
  pdfKeyValue(doc, 'Organization', structureExport.owner?.profile?.organization || structure.administration?.organization || '');
  pdfKeyValue(
    doc,
    'Location',
    [structure.location?.state_code, structure.location?.district_code, structure.location?.city_name, structure.location?.location_code]
      .filter(Boolean)
      .join(' / ')
  );
  pdfKeyValue(doc, 'Created Date', formatDate(structure.creation_info?.created_date) || '');
  pdfKeyValue(doc, 'Last Updated', formatDate(structure.creation_info?.last_updated_date) || '');
  pdfKeyValue(doc, 'Applied Filters', filtersApplied || '');
  doc.moveDown(0.6);

  pdfSectionTitle(doc, 'OBSERVATIONS');
  if (!observations.length) {
    pdfTableRow(doc, ['S. No', 'Location/Remarks'], [60, 475], { header: true });
  } else {
    const grouped = groupObservationsForPdf(observations);
    pdfTableRow(doc, ['S. No', 'Location/Remarks'], [60, 475], { header: true });

    grouped.forEach((locationRows, location) => {
      pdfTableRow(doc, ['', location.toUpperCase()], [60, 475], { header: true });
      [
        ['STRUCTURAL DISTRESS', locationRows.structural],
        ['NON-STRUCTURAL DISTRESS', locationRows.nonStructural]
      ].forEach(([label, rows]) => {
        if (!rows.length) return;
        pdfTableRow(doc, ['', label], [60, 475], { header: true });
        rows.forEach((item, rowIndex) => {
          const text = item.remarks ? `${item.component}: ${item.remarks}` : item.component;
          pdfTableRow(doc, [String(rowIndex + 1), text], [60, 475], { fontSize: 9 });
        });
      });
    });
  }

  pdfSectionTitle(doc, 'INSPECTION IMAGES');
  renderPdfImageGrid(doc, inspectionImages, 'inspection');

  pdfSectionTitle(doc, 'TEST RESULTS');
  if (!tests.length) {
    doc.moveDown(0.1);
  } else {
    const groupedTests = groupTestsForPdf(tests);

    let testIndex = 1;
    groupedTests.forEach((rows, testName) => {
      ensurePdfSpace(doc, 18);
      doc.font('Helvetica').fontSize(12).fillColor('#000000').text(`${testIndex}. ${testName}`);
      pdfTableRow(doc, ['Location', 'Component', 'Date', 'Result', 'Remarks', 'Attachment'], [120, 100, 55, 110, 85, 65], { header: true, fontSize: 8 });
      rows.forEach((row, rowIndex) => {
        pdfTableRow(
          doc,
          [
            row.scopeLabel,
            [row.component_type, row.component_id].filter(Boolean).join(' / '),
            row.test_date || '',
            row.result_summary || '',
            row.remarks || '',
            row.attachment || ''
          ],
          [120, 100, 55, 110, 85, 65],
          { fontSize: 8 }
        );
      });
      testIndex += 1;
      doc.moveDown(0.2);
    });
  }

  pdfSectionTitle(doc, 'TESTING IMAGES');
  renderPdfImageGrid(doc, testingImages, 'testing');

  pdfSectionTitle(doc, 'QUANTIFICATION');
  if (!quantifications.length) {
    doc.moveDown(0.1);
  } else {
    const groupedQuantifications = groupQuantificationsForPdf(quantifications);
    groupedQuantifications.forEach((rows, category) => {
      ensurePdfSpace(doc, 18);
      const startX = doc.page.margins.left;
      const y = doc.y;
      doc.rect(startX, y, 535, 16).fill('#FFF200');
      doc
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(category, startX, y + 4, { width: 535, align: 'center' });
      doc.y = y + 18;
      pdfTableRow(
        doc,
        ['S. No', 'Location of Distress', 'Distress', 'Nos', 'L', 'B', 'H', 'Length / Area / Volume', 'Repair Methodology'],
        [32, 120, 78, 35, 35, 35, 35, 90, 75],
        { header: true, fontSize: 8 }
      );
      rows.forEach((row, rowIndex) => {
        pdfTableRow(
          doc,
          [
            String(rowIndex + 1),
            row.location_of_distress,
            row.distress,
            String(row.nos),
            row.length ?? '',
            row.breadth ?? '',
            row.height ?? '',
            formatApproxQuantity(row.quantity),
            row.repair_methodology
          ],
          [32, 120, 78, 35, 35, 35, 35, 90, 75],
          { fontSize: 8 }
        );
      });
      doc.moveDown(0.2);
    });
  }

  pdfSectionTitle(doc, 'REPAIR METHODOLOGY SUMMARY');
  if (!summaryRows.length) {
    pdfTableRow(doc, ['S. No', 'Description', 'Quantity', 'Units'], [40, 320, 90, 90], { header: true });
    pdfTableRow(doc, ['', '', '', ''], [40, 320, 90, 90]);
  } else {
    pdfTableRow(doc, ['S. No', 'Description', 'Quantity', 'Units'], [40, 320, 90, 90], { header: true });
    summaryRows.forEach((row, rowIndex) => {
      pdfTableRow(doc, [String(rowIndex + 1), row.description, String(row.quantity), row.units], [40, 320, 90, 90]);
    });
  }

};

const writeStructureWorksheet = (worksheet, structureExport, filtersApplied) => {
  ensureColumns(worksheet);

  const observations = collectStructureObservations(structureExport.structure);
  const quantifications = collectQuantifications(structureExport.structure);
  const tests = collectTests(structureExport.structure);
  const { inspectionImages, testingImages } = collectPhotoRows(observations, tests);

  let row = addStructureHeader(worksheet, structureExport, filtersApplied);
  row = addObservationSection(worksheet, row, observations);
  row += 1;
  row = addImageSection(worksheet, row, 'INSPECTION IMAGES', inspectionImages, false);
  row += 1;
  row = addTestSection(worksheet, row, tests);
  row += 1;
  row = addImageSection(worksheet, row, 'TESTING IMAGES', testingImages, true);
  row += 1;
  row = addQuantificationSection(worksheet, row, quantifications);
  row += 1;
  addMethodologySummary(worksheet, row, quantifications);

  worksheet.views = [{ state: 'frozen', ySplit: 3 }];
};

const createWorkbook = (reqUser) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = safeText(reqUser?.username || reqUser?.email, 'SAMS');
  workbook.lastModifiedBy = safeText(reqUser?.username || reqUser?.email, 'SAMS');
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
};

const createPdfDocument = () =>
  new PDFDocument({
    size: 'A4',
    margin: 36,
    bufferPages: true
  });

const sendWorkbook = async (res, workbook, fileName) => {
  res.setHeader('Content-Type', EXCEL_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
};

const sendPdf = (res, doc, fileName) =>
  new Promise((resolve, reject) => {
    res.setHeader('Content-Type', PDF_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.on('error', reject);
    res.on('finish', resolve);
    doc.pipe(res);
    doc.end();
  });

const renderWordTable = (headers, rows, options = {}) => `
  <table class="${options.className || ''}">
    <thead>
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${
        rows.length
          ? rows
              .map(
                (row) => `<tr>${row.map((cell) => `<td>${cell === null ? '&nbsp;' : escapeHtml(cell) || '&nbsp;'}</td>`).join('')}</tr>`
              )
              .join('')
          : `<tr><td colspan="${headers.length}">&nbsp;</td></tr>`
      }
    </tbody>
  </table>
`;

const renderWordSection = (title, body, subtitle = '') => `
  <h2 class="section-title">${escapeHtml(title)}</h2>
  ${subtitle ? `<p class="section-note">${escapeHtml(subtitle)}</p>` : ''}
  ${body}
`;

const toWordImageSource = (value) => {
  const source = safeText(value);
  if (!source) return '';
  if (/^https?:\/\//i.test(source) || /^data:/i.test(source)) return source;
  return encodeURI(`file:///${source.replace(/\\/g, '/')}`);
};

const groupObservationsForWord = (observations) =>
  observations.reduce((acc, item) => {
    if (!acc.has(item.location)) {
      acc.set(item.location, {
        structural: [],
        nonStructural: []
      });
    }

    const bucket = item.category === 'STRUCTURAL DISTRESS' ? 'structural' : 'nonStructural';
    acc.get(item.location)[bucket].push(item);
    return acc;
  }, new Map());

const groupTestsForWord = (tests) =>
  tests.reduce((acc, test) => {
    if (!acc.has(test.test_name)) acc.set(test.test_name, []);
    acc.get(test.test_name).push(test);
    return acc;
  }, new Map());

const groupQuantificationsForWord = (rows) =>
  rows.reduce((acc, row) => {
    const key = safeText(row.distress, 'OTHER');
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());

const renderWordImageGrid = (rows, type) => {
  if (!rows.length) {
    return `<p class="empty-state"></p>`;
  }

  return `
    <div class="image-grid">
      ${rows
        .map((row) => {
          const imageSrc = toWordImageSource(row.source);
          const caption = type === 'inspection' ? row.caption : row.test_name;

          return `
            <div class="image-card">
              <div class="image-box">
              ${
                imageSrc
                  ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(caption)}" />`
                  : 'Image not available in export'
              }
              </div>
              <div class="caption-title">${escapeHtml(caption)}</div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
};

const renderObservationSectionWord = (observations) => {
  const grouped = groupObservationsForWord(observations);

  if (!grouped.size) {
    return '<table><thead><tr><th class="sno-col">S. No</th><th>Location/Remarks</th></tr></thead><tbody></tbody></table>';
  }

  const rows = ['<table><thead><tr><th class="sno-col">S. No</th><th>Location/Remarks</th></tr></thead><tbody>'];
  grouped.forEach((group, location) => {
    rows.push(`<tr class="obs-location-row"><td colspan="2">${escapeHtml(location)}</td></tr>`);

    const categories = [
      ['STRUCTURAL DISTRESS', group.structural],
      ['NON-STRUCTURAL DISTRESS', group.nonStructural]
    ];

    categories.forEach(([label, items]) => {
      if (!items.length) return;
      rows.push(`<tr class="obs-category-row"><td colspan="2">${escapeHtml(label)}</td></tr>`);
      items.forEach((item, index) => {
        const text = item.remarks ? `${item.component}: ${item.remarks}` : item.component;
        rows.push(`<tr><td class="sno-col center">${index + 1}</td><td>${escapeHtml(text)}</td></tr>`);
      });
    });
  });
  rows.push('</tbody></table>');
  return rows.join('');
};

const renderTestResultsWord = (tests) => {
  const grouped = groupTestsForWord(tests);

  if (!grouped.size) {
    return '<p class="empty-state"></p>';
  }

  let testIndex = 1;
  return Array.from(grouped.entries())
    .map(([testName, rows]) => {
      const table = renderWordTable(
        ['Location', 'Component', 'Date', 'Result', 'Remarks', 'Attachment'],
        rows.map((row) => [
          row.scopeLabel,
          [row.component_type, row.component_id].filter(Boolean).join(' / '),
          row.test_date || '',
          row.result_summary || '',
          row.remarks || '',
          row.attachment || ''
        ]),
        { className: 'test-table' }
      );

      const section = `<div class="test-block"><h3>${testIndex}. ${escapeHtml(testName)}</h3>${table}</div>`;
      testIndex += 1;
      return section;
    })
    .join('');
};

const renderSummaryTableWord = (summaryRows) =>
  `
    <table>
      <thead>
        <tr>
          <th style="width:50px;" class="center">S. No</th>
          <th>Description</th>
          <th style="width:100px;" class="center">Quantity</th>
          <th style="width:100px;" class="center">Units</th>
        </tr>
      </thead>
      <tbody>
        ${
          summaryRows.length
            ? summaryRows
                .map(
                  (row, rowIndex) => `
                    <tr>
                      <td class="center">${rowIndex + 1}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td class="center">${escapeHtml(String(row.quantity))}</td>
                      <td class="center">${escapeHtml(row.units)}</td>
                    </tr>
                  `
                )
                .join('')
            : `
              <tr>
                <td class="center">&nbsp;</td>
                <td>&nbsp;</td>
                <td class="center">&nbsp;</td>
                <td class="center">&nbsp;</td>
              </tr>
            `
        }
      </tbody>
    </table>
  `;

const renderQuantificationWord = (quantifications) => {
  const grouped = groupQuantificationsForWord(quantifications);

  if (!grouped.size) {
    return '<p class="empty-state"></p>';
  }

  const rows = [
    `
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width:50px;" class="center">S.No</th>
          <th rowspan="2">Location of Distress</th>
          <th colspan="4" style="text-align:center;">Distress</th>
          <th rowspan="2" style="text-align:center;">Length (Rm) / Area (Sqm) / Volume (Cum)</th>
          <th rowspan="2">Repair Methodology</th>
        </tr>
        <tr>
          <th class="center">Nos</th>
          <th class="center">L</th>
          <th class="center">B</th>
          <th class="center">H</th>
        </tr>
      </thead>
      <tbody>
    `
  ];

  grouped.forEach((items, groupName) => {
    rows.push(`<tr class="quant-group-row"><td colspan="8">${escapeHtml(groupName)}</td></tr>`);
    items.forEach((row, index) => {
      rows.push(`
        <tr>
          <td class="center">${index + 1}</td>
          <td>${escapeHtml(row.location_of_distress)}</td>
          <td class="center">${escapeHtml(String(row.nos))}</td>
          <td class="center">${escapeHtml(row.length ?? '')}</td>
          <td class="center">${escapeHtml(row.breadth ?? '')}</td>
          <td class="center">${escapeHtml(row.height ?? '')}</td>
          <td class="center">${escapeHtml(formatApproxQuantity(row.quantity))}</td>
          <td>${escapeHtml(row.repair_methodology)}</td>
        </tr>
      `);
    });
  });

  rows.push('</tbody></table>');
  return rows.join('');
};

const renderSummaryNoteList = () => '';

const renderStructureWord = (structureExport, filtersApplied, index, total) => {
  const observations = collectStructureObservations(structureExport.structure);
  const quantifications = collectQuantifications(structureExport.structure);
  const tests = collectTests(structureExport.structure);
  const { inspectionImages, testingImages } = collectPhotoRows(observations, tests);
  const structure = structureExport.structure;
  const summaryRows = summarizeMethodology(quantifications);
  const ownerEmployee = [
    buildOwnerLabel(structureExport.owner),
    structureExport.owner?.profile?.employee_id ? `(${structureExport.owner.profile.employee_id})` : ''
  ].filter(Boolean).join(' ');

  const summaryItems = [
    ['Structure ID', structure.structural_identity?.structural_identity_number || ''],
    ['UID', structure.structural_identity?.uid || ''],
    ['Structure Type', structure.structural_identity?.type_of_structure || ''],
    ['Structure Subtype', structure.structural_identity?.structure_subtype || ''],
    ['Owner / Employee', ownerEmployee || ''],
    ['Organization', structureExport.owner?.profile?.organization || structure.administration?.organization || ''],
    ['Location', [structure.location?.state_code, structure.location?.district_code, structure.location?.city_name, structure.location?.location_code].filter(Boolean).join(' / ')],
    ['Created Date', formatDate(structure.creation_info?.created_date) || ''],
    ['Last Updated', formatDate(structure.creation_info?.last_updated_date) || ''],
    ['Applied Filters', filtersApplied || '']
  ];

  return `
    <section class="report-block">
      <div class="brand">SAMS</div>
      <div><span class="highlight-label">OUTPUT / REPORT FORMAT:</span></div>
      <table class="meta-table">
        <tbody>
          ${summaryItems.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${value ? escapeHtml(value) : '&nbsp;'}</td></tr>`).join('')}
        </tbody>
      </table>
      ${renderWordSection(
        'OBSERVATIONS',
        renderObservationSectionWord(observations),
        'Observation given in the structural and non-structural shall be reflect in the table and images below the table in the output.'
      )}
      ${renderWordSection('INSPECTION IMAGES', renderWordImageGrid(inspectionImages, 'inspection'))}
      <p class="section-note" style="font-size:9pt; text-transform:uppercase; margin-bottom:14px;">The observation entered during the attaching the photo should reflect with image in small font</p>
      ${renderWordSection(
        'TEST RESULTS',
        renderTestResultsWord(tests),
        'Provision for uploading multiple IMAGE OR PDF OR EXCEL files for each testing format.'
      )}
      <p class="section-note" style="margin-bottom:14px;">Images attached during the testing should reflect below the test results in the output.</p>
      ${renderWordSection(
        'TESTING IMAGES',
        renderWordImageGrid(testingImages, 'testing')
      )}
      ${renderWordSection('QUANTIFICATION', renderQuantificationWord(quantifications))}
      ${renderWordSection(
        'REPAIR METHODOLOGY SUMMARY',
        renderSummaryTableWord(summaryRows) + renderSummaryNoteList()
      )}
    </section>
  `;
};

const buildWordDocument = (structures, filtersApplied) => `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>SAMS - Output / Report Format</title>
      <style>
        @page {
          size: A4;
          margin: 18mm 16mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #1f1f1f;
          background: #fff;
          padding: 0;
          max-width: 820px;
          margin: 0 auto;
          line-height: 1.4;
        }
        .brand {
          text-align: center;
          font-family: Calibri, Arial, sans-serif;
          font-size: 22pt;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }
        .highlight-label {
          display: inline-block;
          background: #fff200;
          font-weight: 700;
          font-size: 12pt;
          padding: 2px 6px;
          margin-bottom: 18px;
          text-decoration: underline;
        }
        h2.section-title {
          font-size: 13pt;
          font-weight: 700;
          text-decoration: underline;
          margin: 22px 0 6px;
          font-family: 'Times New Roman', Times, serif;
        }
        .section-note {
          font-size: 10pt;
          margin-bottom: 10px;
          color: #1f1f1f;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 10pt;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #7f7f7f;
          padding: 5px 7px;
          vertical-align: top;
          text-align: left;
        }
        th {
          font-weight: 700;
          background: #fff;
        }
        .obs-location-row td {
          color: #0070c0;
          font-weight: 700;
          text-align: center;
          font-size: 11pt;
          background: #fff;
        }
        .obs-category-row td {
          font-weight: 700;
          text-align: center;
          font-size: 10pt;
          background: #fff;
        }
        .sno-col { width: 60px; text-align: center; }
        .image-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin: 14px 0;
        }
        .image-card {
          flex: 0 0 calc(50% - 10px);
          text-align: center;
          break-inside: avoid;
        }
        .image-box {
          width: 100%;
          height: 220px;
          border: 1px solid #999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          color: #888;
          font-size: 10pt;
          font-style: italic;
        }
        .image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .caption-title { font-size: 10pt; margin-top: 5px; }
        .quant-group-row td {
          background: #fff200;
          font-weight: 700;
          text-align: center;
          font-size: 10pt;
        }
        .note-block { margin-top: 8px; }
        .note-block p { font-size: 10pt; margin: 3px 0; }
        .summary-note {
          background: #fce4d6;
          padding: 5px 8px;
          font-size: 10pt;
          margin-bottom: 8px;
          border: 1px solid #f2b98a;
        }
        .empty-state { font-size: 10pt; color: #888; padding: 6px 0; font-style: italic; }
        .test-block { margin-bottom: 14px; }
        .test-block h3 { font-size: 11pt; font-weight: 400; margin-bottom: 6px; }
        .center { text-align: center; }
        .meta-table td:first-child { font-weight: 700; width: 160px; }
        .meta-table td:last-child { width: auto; }
        .report-block { page-break-after: always; break-after: page; }
        .report-block:last-child { page-break-after: auto; break-after: auto; }
        @media print {
          body { padding: 0; max-width: none; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${structures.map((structureExport, index) => renderStructureWord(structureExport, filtersApplied, index, structures.length)).join('')}
    </body>
  </html>
`;

const resolveBrowserExecutablePath = () => {
  const executablePath = BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) {
    throw new Error('Chrome or Edge executable not found for HTML-to-PDF rendering');
  }
  return executablePath;
};

const sendWordDocument = (res, content, fileName) => {
  res.setHeader('Content-Type', WORD_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(content);
};

const sendPdfFromHtml = async (res, html, fileName) => {
  const browser = await puppeteer.launch({
    executablePath: resolveBrowserExecutablePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm'
      }
    });
    const normalizedPdfBuffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    res.setHeader('Content-Type', PDF_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(normalizedPdfBuffer.length));
    res.send(normalizedPdfBuffer);
  } finally {
    await browser.close();
  }
};

router.get('/structures/download', authenticateToken, checkExportPermissions, async (req, res) => {
  try {
    const structures = await fetchStructuresForExport(req.user, req.query);
    if (!structures.length) {
      return res.status(404).json({
        success: false,
        message: 'No structures found matching the criteria'
      });
    }

    const filterSummary = buildFilterSummary(req.query);
    const requestedFormat = safeText(req.query.format || req.query.export_format || 'excel').toLowerCase();

    if (isPdfFormat(requestedFormat)) {
      const html = buildWordDocument(structures, filterSummary);
      const fileName = `SAMS_Report_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`;
      return sendPdfFromHtml(res, html, fileName);
    }

    if (isWordFormat(requestedFormat)) {
      const fileName = `SAMS_Report_${new Date().toISOString().slice(0, 10)}_${Date.now()}.doc`;
      return sendWordDocument(res, buildWordDocument(structures, filterSummary), fileName);
    }

    const workbook = createWorkbook(req.user);
    const indexSheet = workbook.addWorksheet('Report Index');
    indexSheet.columns = [
      { header: 'S. No', key: 'serial', width: 8 },
      { header: 'Structure ID', key: 'structureId', width: 24 },
      { header: 'Owner', key: 'owner', width: 24 },
      { header: 'Location', key: 'location', width: 24 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Worksheet', key: 'worksheet', width: 24 }
    ];
    addTableHeader(indexSheet, 1, ['S. No', 'Structure ID', 'Owner', 'Location', 'Status', 'Worksheet'], COLORS.PRIMARY);

    structures.forEach((structureExport, index) => {
      const structureId = safeText(
        structureExport.structure.structural_identity?.structural_identity_number,
        String(structureExport.structure._id)
      );
      const sheetName = sanitizeWorksheetName(`${index + 1}_${structureId}`, `Structure_${index + 1}`);
      const worksheet = workbook.addWorksheet(sheetName);
      writeStructureWorksheet(worksheet, structureExport, filterSummary);

      indexSheet.addRow({
        serial: index + 1,
        structureId,
        owner: buildOwnerLabel(structureExport.owner),
        location: [
          structureExport.structure.location?.state_code,
          structureExport.structure.location?.district_code,
          structureExport.structure.location?.city_name
        ].filter(Boolean).join(' / '),
        status: safeText(structureExport.structure.status, 'N/A'),
        worksheet: sheetName
      });
    });

    const fileName = `SAMS_Report_${new Date().toISOString().slice(0, 10)}_${Date.now()}.xlsx`;
    return sendWorkbook(res, workbook, fileName);
  } catch (error) {
    console.error('Report export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report export',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/structures/complete-download', authenticateToken, checkExportPermissions, async (req, res) => {
  try {
    const structures = await fetchStructuresForExport(req.user, {});
    if (!structures.length) {
      return res.status(404).json({
        success: false,
        message: 'No structures found'
      });
    }

    const requestedFormat = safeText(req.query.format || req.query.export_format || 'excel').toLowerCase();
    if (isPdfFormat(requestedFormat)) {
      const html = buildWordDocument(structures, 'Complete export');
      const fileName = `SAMS_Complete_Report_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`;
      return sendPdfFromHtml(res, html, fileName);
    }

    if (isWordFormat(requestedFormat)) {
      const fileName = `SAMS_Complete_Report_${new Date().toISOString().slice(0, 10)}_${Date.now()}.doc`;
      return sendWordDocument(res, buildWordDocument(structures, 'Complete export'), fileName);
    }

    const workbook = createWorkbook(req.user);
    structures.forEach((structureExport, index) => {
      const structureId = safeText(
        structureExport.structure.structural_identity?.structural_identity_number,
        String(structureExport.structure._id)
      );
      const worksheet = workbook.addWorksheet(
        sanitizeWorksheetName(`${index + 1}_${structureId}`, `Structure_${index + 1}`)
      );
      writeStructureWorksheet(worksheet, structureExport, 'Complete export');
    });

    const fileName = `SAMS_Complete_Report_${new Date().toISOString().slice(0, 10)}_${Date.now()}.xlsx`;
    return sendWorkbook(res, workbook, fileName);
  } catch (error) {
    console.error('Complete report export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate complete report export',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/structures/:id/download', authenticateToken, checkExportPermissions, async (req, res) => {
  try {
    const { id } = req.params;
    const structureMatch = mongoose.Types.ObjectId.isValid(id)
      ? { 'structures._id': new mongoose.Types.ObjectId(id) }
      : { 'structures.structural_identity.structural_identity_number': id };

    const structures = await fetchStructuresForExport(req.user, req.query, structureMatch);
    if (!structures.length) {
      return res.status(404).json({
        success: false,
        message: 'Structure not found'
      });
    }

    const structureExport = structures[0];
    const structureId = safeText(
      structureExport.structure.structural_identity?.structural_identity_number,
      String(structureExport.structure._id)
    );
    const requestedFormat = safeText(req.query.format || req.query.export_format || 'excel').toLowerCase();

    if (isPdfFormat(requestedFormat)) {
      const html = buildWordDocument([structureExport], buildFilterSummary(req.query));
      const fileName = `SAMS_Structure_Report_${structureId}_${Date.now()}.pdf`;
      return sendPdfFromHtml(res, html, fileName);
    }

    if (isWordFormat(requestedFormat)) {
      const fileName = `SAMS_Structure_Report_${structureId}_${Date.now()}.doc`;
      return sendWordDocument(res, buildWordDocument([structureExport], buildFilterSummary(req.query)), fileName);
    }

    const workbook = createWorkbook(req.user);
    const worksheet = workbook.addWorksheet(sanitizeWorksheetName(structureId, 'Structure Report'));
    writeStructureWorksheet(worksheet, structureExport, buildFilterSummary(req.query));

    const fileName = `SAMS_Structure_Report_${structureId}_${Date.now()}.xlsx`;
    return sendWorkbook(res, workbook, fileName);
  } catch (error) {
    console.error('Single structure report export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate structure report export',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/structures/metadata', authenticateToken, checkExportPermissions, async (req, res) => {
  try {
    const userMatch = getUserMatch(req.user, req.query);

    const [metadata] = await User.aggregate([
      { $match: userMatch },
      {
        $facet: {
          structures: [
            { $unwind: '$structures' },
            {
              $group: {
                _id: null,
                states: { $addToSet: '$structures.location.state_code' },
                districts: { $addToSet: '$structures.location.district_code' },
                cities: { $addToSet: '$structures.location.city_name' },
                location_codes: { $addToSet: '$structures.location.location_code' },
                structure_types: { $addToSet: '$structures.structural_identity.type_of_structure' },
                structure_subtypes: { $addToSet: '$structures.structural_identity.structure_subtype' },
                statuses: { $addToSet: '$structures.status' },
                total_structures: { $sum: 1 },
                min_created_date: { $min: '$structures.creation_info.created_date' },
                max_created_date: { $max: '$structures.creation_info.created_date' }
              }
            }
          ],
          users: [
            {
              $project: {
                _id: 1,
                username: 1,
                email: 1,
                employee_id: '$profile.employee_id',
                organization: '$profile.organization',
                full_name: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ['$profile.first_name', ''] },
                        ' ',
                        { $ifNull: ['$profile.last_name', ''] }
                      ]
                    }
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    const structureMetadata = metadata?.structures?.[0] || {};
    const users = Array.isArray(metadata?.users) ? metadata.users : [];

    return res.json({
      success: true,
      data: {
        states: (structureMetadata.states || []).filter(Boolean).sort(),
        districts: (structureMetadata.districts || []).filter(Boolean).sort(),
        cities: (structureMetadata.cities || []).filter(Boolean).sort(),
        location_codes: (structureMetadata.location_codes || []).filter(Boolean).sort(),
        structure_types: (structureMetadata.structure_types || []).filter(Boolean).sort(),
        structure_subtypes: (structureMetadata.structure_subtypes || []).filter(Boolean).sort(),
        statuses: (structureMetadata.statuses || []).filter(Boolean).sort(),
        total_structures: structureMetadata.total_structures || 0,
        date_range: {
          from: structureMetadata.min_created_date || null,
          to: structureMetadata.max_created_date || null
        },
        users,
        organizations: Array.from(new Set(users.map((user) => user.organization).filter(Boolean))).sort(),
        pdf_export_supported: true,
        word_export_supported: true
      },
      message: 'Report metadata retrieved successfully'
    });
  } catch (error) {
    console.error('Report metadata error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get report metadata'
    });
  }
});

module.exports = router;
