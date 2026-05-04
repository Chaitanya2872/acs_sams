const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
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

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

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

const summarizeMethodology = (rows) => {
  const summaryMap = new Map();

  rows.forEach((row) => {
    const method = safeText(row.repair_methodology, 'Not Specified');
    const key = method.toLowerCase();
    const baseQuantity = inferQuantityValue(row);
    let quantity = baseQuantity;
    let units = inferUnit(row);

    if (key.includes('epoxy grouting')) {
      quantity = baseQuantity * 8;
      units = 'KGS';
    } else if (key.includes('cement grouting')) {
      quantity = baseQuantity * 8;
      units = 'KGS';
    }

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

  const addRows = (entries, scopeLabel, category) => {
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      rows.push({
        scopeLabel,
        category,
        location_of_distress: safeText(entry.location_of_distress, scopeLabel),
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

  floors.forEach((floor) => {
    const floorLabel = safeText(floor.floor_label_name, `Floor ${floor.floor_number}`);
    addRows(floor.quantifications?.structural, floorLabel, 'STRUCTURAL DISTRESS');
    addRows(floor.quantifications?.non_structural, floorLabel, 'NON-STRUCTURAL DISTRESS');

    (Array.isArray(floor.flats) ? floor.flats : []).forEach((flat) => {
      const flatLabel = `${floorLabel} / Flat ${safeText(flat.flat_number, flat.flat_id || 'N/A')}`;
      addRows(flat.quantifications?.structural, flatLabel, 'STRUCTURAL DISTRESS');
      addRows(flat.quantifications?.non_structural, flatLabel, 'NON-STRUCTURAL DISTRESS');
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
    ['S. No', 'Location of Distress', 'Distress', 'Nos', 'L (M)', 'B (M)', 'H (M)', 'Quantity', 'Repair Methodology'],
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
      worksheet.getCell(row, 8).value = `${entry.quantity} ${entry.unit}`.trim();
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

  addMergedSectionRow(
    worksheet,
    row,
    'Quantities in the above table are summarized by repair methodology.',
    COLORS.NOTE,
    4
  );
  row += 1;
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
    .fillColor('#1F4E78')
    .text(title, { underline: false });
  doc.moveDown(0.4);
  doc.fillColor('#000000');
};

const pdfKeyValue = (doc, label, value) => {
  ensurePdfSpace(doc, 18);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`${label}: `, { continued: true });
  doc
    .font('Helvetica')
    .text(safeText(value, 'N/A'));
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

const renderStructurePdf = (doc, structureExport, filtersApplied, index, total) => {
  const observations = collectStructureObservations(structureExport.structure);
  const quantifications = collectQuantifications(structureExport.structure);
  const tests = collectTests(structureExport.structure);
  const { inspectionImages, testingImages } = collectPhotoRows(observations, tests);
  const structure = structureExport.structure;

  if (index > 0) doc.addPage();

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#1F1F1F').text('SAMS');
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#1F4E78').text('OUTPUT / REPORT FORMAT');
  doc.moveDown(0.5);
  doc.fillColor('#000000');

  pdfKeyValue(doc, 'Structure ID', structure.structural_identity?.structural_identity_number);
  pdfKeyValue(doc, 'UID', structure.structural_identity?.uid);
  pdfKeyValue(doc, 'Structure Type', structure.structural_identity?.type_of_structure);
  pdfKeyValue(doc, 'Structure Subtype', structure.structural_identity?.structure_subtype);
  pdfKeyValue(doc, 'Owner / Employee', `${buildOwnerLabel(structureExport.owner)}${structureExport.owner?.profile?.employee_id ? ` (${structureExport.owner.profile.employee_id})` : ''}`);
  pdfKeyValue(doc, 'Organization', structureExport.owner?.profile?.organization || structure.administration?.organization);
  pdfKeyValue(
    doc,
    'Location',
    [structure.location?.state_code, structure.location?.district_code, structure.location?.city_name, structure.location?.location_code]
      .filter(Boolean)
      .join(' / ')
  );
  pdfKeyValue(doc, 'Created Date', formatDate(structure.creation_info?.created_date));
  pdfKeyValue(doc, 'Last Updated', formatDate(structure.creation_info?.last_updated_date));
  pdfKeyValue(doc, 'Applied Filters', filtersApplied || 'None');
  pdfKeyValue(doc, 'Report Position', `${index + 1} of ${total}`);
  doc.moveDown(0.6);

  pdfSectionTitle(doc, 'OBSERVATIONS');
  if (!observations.length) {
    pdfBullet(doc, 'No observations recorded');
  } else {
    const grouped = observations.reduce((acc, item) => {
      if (!acc.has(item.location)) acc.set(item.location, []);
      acc.get(item.location).push(item);
      return acc;
    }, new Map());

    grouped.forEach((locationObservations, location) => {
      ensurePdfSpace(doc, 18);
      doc.font('Helvetica-Bold').fontSize(10).text(location.toUpperCase());
      ['STRUCTURAL DISTRESS', 'NON-STRUCTURAL DISTRESS'].forEach((category) => {
        const rows = locationObservations.filter((item) => item.category === category);
        if (!rows.length) return;
        ensurePdfSpace(doc, 16);
        doc.font('Helvetica-Bold').fontSize(9).text(category);
        rows.forEach((item, rowIndex) => {
          pdfBullet(doc, `${rowIndex + 1}. ${item.component}: ${item.remarks}`);
        });
      });
      doc.moveDown(0.3);
    });
  }

  pdfSectionTitle(doc, 'INSPECTION IMAGES');
  if (!inspectionImages.length) {
    pdfBullet(doc, 'No inspection image references attached');
  } else {
    pdfTableRow(doc, ['S. No', 'Caption', 'Location', 'Image Reference'], [40, 170, 140, 150], { header: true });
    inspectionImages.forEach((row, rowIndex) => {
      pdfTableRow(doc, [String(rowIndex + 1), row.caption, row.location, row.source], [40, 170, 140, 150]);
    });
  }

  pdfSectionTitle(doc, 'TEST RESULTS');
  if (!tests.length) {
    pdfBullet(doc, 'No test results recorded');
  } else {
    const groupedTests = tests.reduce((acc, item) => {
      if (!acc.has(item.test_name)) acc.set(item.test_name, []);
      acc.get(item.test_name).push(item);
      return acc;
    }, new Map());

    let testIndex = 1;
    groupedTests.forEach((rows, testName) => {
      ensurePdfSpace(doc, 16);
      doc.font('Helvetica-Bold').fontSize(10).text(`${testIndex}. ${testName}`);
      pdfTableRow(doc, ['S. No', 'Location', 'Component', 'Date', 'Remarks / Result'], [40, 150, 110, 70, 180], { header: true });
      rows.forEach((row, rowIndex) => {
        pdfTableRow(
          doc,
          [
            String(rowIndex + 1),
            row.scopeLabel,
            [row.component_type, row.component_id].filter(Boolean).join(' / '),
            row.test_date || '',
            [row.result_summary, row.remarks].filter(Boolean).join(' | ') || 'N/A'
          ],
          [40, 150, 110, 70, 180]
        );
      });
      testIndex += 1;
      doc.moveDown(0.2);
    });
  }

  pdfSectionTitle(doc, 'TESTING IMAGES');
  if (!testingImages.length) {
    pdfBullet(doc, 'No testing file references attached');
  } else {
    pdfTableRow(doc, ['S. No', 'Test Name', 'Location', 'File Reference'], [40, 170, 150, 140], { header: true });
    testingImages.forEach((row, rowIndex) => {
      pdfTableRow(doc, [String(rowIndex + 1), row.test_name, row.scopeLabel, row.source], [40, 170, 150, 140]);
    });
  }

  pdfSectionTitle(doc, 'QUANTIFICATION');
  if (!quantifications.length) {
    pdfBullet(doc, 'No quantification entries recorded');
  } else {
    const groupedQuantifications = quantifications.reduce((acc, item) => {
      if (!acc.has(item.category)) acc.set(item.category, []);
      acc.get(item.category).push(item);
      return acc;
    }, new Map());

    groupedQuantifications.forEach((rows, category) => {
      ensurePdfSpace(doc, 16);
      doc.font('Helvetica-Bold').fontSize(10).text(category);
      pdfTableRow(
        doc,
        ['S. No', 'Location of Distress', 'Distress', 'Nos', 'L', 'B', 'H', 'Quantity', 'Repair Methodology'],
        [32, 120, 78, 35, 35, 35, 35, 70, 100],
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
            `${row.quantity} ${row.unit}`.trim(),
            row.repair_methodology
          ],
          [32, 120, 78, 35, 35, 35, 35, 70, 100],
          { fontSize: 8 }
        );
      });
      doc.moveDown(0.2);
    });
  }

  pdfSectionTitle(doc, 'REPAIR METHODOLOGY SUMMARY');
  const summaryRows = summarizeMethodology(quantifications);
  if (!summaryRows.length) {
    pdfBullet(doc, 'No methodology summary available');
  } else {
    pdfTableRow(doc, ['S. No', 'Description', 'Quantity', 'Units'], [40, 320, 90, 90], { header: true });
    summaryRows.forEach((row, rowIndex) => {
      pdfTableRow(doc, [String(rowIndex + 1), row.description, String(row.quantity), row.units], [40, 320, 90, 90]);
    });
  }

  doc.moveDown(0.4);
  doc
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor('#555555')
    .text(
      'Note: Observation-to-quantification linkage depends on saved quantification rows. TODO: add explicit observation linkage in the data model if one-to-one traceability is required.'
    );
  doc.fillColor('#000000');
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

    if (requestedFormat === 'pdf') {
      const doc = createPdfDocument();
      structures.forEach((structureExport, index) => {
        renderStructurePdf(doc, structureExport, filterSummary, index, structures.length);
      });
      const fileName = `SAMS_Report_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`;
      return sendPdf(res, doc, fileName);
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
    if (requestedFormat === 'pdf') {
      const doc = createPdfDocument();
      structures.forEach((structureExport, index) => {
        renderStructurePdf(doc, structureExport, 'Complete export', index, structures.length);
      });
      const fileName = `SAMS_Complete_Report_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`;
      return sendPdf(res, doc, fileName);
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

    if (requestedFormat === 'pdf') {
      const doc = createPdfDocument();
      renderStructurePdf(doc, structureExport, buildFilterSummary(req.query), 0, 1);
      const fileName = `SAMS_Structure_Report_${structureId}_${Date.now()}.pdf`;
      return sendPdf(res, doc, fileName);
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
        pdf_export_supported: true
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
