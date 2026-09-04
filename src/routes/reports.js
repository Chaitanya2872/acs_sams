const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const puppeteer = require('puppeteer-core');
const mongoose = require('mongoose');
const { User } = require('../models/schemas');
const { authenticateToken } = require('../middlewares/auth');
const { getUserRoles, hasRole } = require('../utils/roles');

const router = express.Router();

const COLORS = {
  PRIMARY: 'FF1F4E78',
  SECONDARY: 'FF4F81BD',
  SECTION: 'FFD9E2F3',
  SUBSECTION: 'FFE2F0D9',
  LOCATION: 'FFDDEBF7',
  BORDER: 'FFBFBFBF',
  TEXT: 'FF1F1F1F',
  WHITE: 'FFFFFFFF',
  HIGHLIGHT: 'FFFFF200',
  NOTE: 'FFFCE4D6'
};

const FONTS = {
  TITLE: { name: 'Calibri', size: 14, bold: true },
  HEADER: { name: 'Calibri', size: 11, bold: true },
  BODY: { name: 'Calibri', size: 10 },
  SMALL: { name: 'Calibri', size: 9 }
};

const STRUCTURAL_SECTION = 'STRUCTURAL DISTRESS';
const NON_STRUCTURAL_SECTION = 'NON-STRUCTURAL DISTRESS';

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

const REPORT_PLACEHOLDER = '--';

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_MIME = 'application/pdf';
const WORD_MIME = 'application/msword';

const BROWSER_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  // Windows
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  // Linux / containers
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
  '/snap/bin/chromium',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
].filter(Boolean);

// Guard rails so a structure with hundreds of site photos cannot exhaust memory.
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 60 * 1024 * 1024;
const MAX_EMBEDDED_IMAGES = 300;
const IMAGE_FETCH_TIMEOUT_MS = 15000;

const IMAGE_MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml'
};

const EXCEL_IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif'
};

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
  if (value instanceof Map) {
    return flattenMixedObject(Object.fromEntries(value.entries()));
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

// Mongoose defaults L/B/H and quantity to 0, so 0 means "not captured" here, not "zero metres".
const toDimension = (value) => {
  const num = toNumber(value);
  return num !== null && num > 0 ? num : null;
};

const toCount = (value) => {
  const num = toNumber(value);
  // Preserve an explicitly entered zero. Only old records with no value at all
  // receive the historical default of one.
  return num !== null && num >= 0 ? num : 1;
};

/**
 * Canonical quantity rule taken from the SAMS OUTPUT format:
 * quantity = Nos x product of every dimension that was actually captured.
 * (1 x 1 x 1.5 x 0.3 = 0.45, 5 x 10 = 50, no dimensions at all = Nos.)
 */
const computeQuantity = ({ nos, length, breadth, height }) => {
  const count = toCount(nos);
  return [length, breadth, height]
    .filter((dimension) => dimension !== null && dimension !== undefined)
    .reduce((total, dimension) => total * dimension, count);
};

const inferUnitFromDimensions = ({ length, breadth, height }) => {
  const dimensions = [length, breadth, height].filter((value) => value !== null && value !== undefined);
  if (dimensions.length >= 3) return 'CUM';
  if (dimensions.length === 2) return 'SQM';
  if (dimensions.length === 1) return 'RM';
  return "NO'S";
};

const formatApproxQuantity = (value) => {
  const numeric = toNumber(value);
  if (numeric === null) return '';
  return String(Number(numeric.toFixed(2)));
};

/**
 * Unit / multiplier rules per repair methodology, per the client's Bill of Quantity summary.
 * Cementitious grouting is billed by weight: actual quantity x 3 = KGS.
 */
const REPAIR_METHOD_RULES = [
  { keywords: ['cementitious grouting', 'cement grouting', 'grouting'], units: 'KGS', multiplier: 3 },
  { keywords: ['micro concrete', 'microconcrete', 'concrete jacketing', 'jacketing', 'encasement'], units: 'CUM' },
  {
    keywords: [
      'polymer modified mortar',
      'replastering',
      'replaster',
      'plastering',
      'plaster',
      'repainting',
      'painting',
      'paint'
    ],
    units: 'SQM'
  }
];

const resolveRepairRule = (methodKey) =>
  REPAIR_METHOD_RULES.find((rule) => rule.keywords.some((keyword) => methodKey.includes(keyword))) || null;

/**
 * Sums the quantification rows per repair methodology so the Bill of Quantity summary
 * always reflects exactly what is printed in the quantification table above it.
 */
const summarizeMethodology = (rows) => {
  const summaryMap = new Map();

  rows.forEach((row) => {
    const method = safeText(row.repair_methodology, 'Not Specified');
    const key = method.toLowerCase();
    const rule = resolveRepairRule(key);
    const quantity = toNumber(row.quantity) ?? 0;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        description: method,
        actual: 0,
        multiplier: rule?.multiplier || 1,
        units: rule?.units || row.unit || inferUnitFromDimensions(row)
      });
    }

    const current = summaryMap.get(key);
    current.actual += quantity;
    if (!current.units) current.units = row.unit || inferUnitFromDimensions(row);
  });

  return Array.from(summaryMap.values()).map((item) => {
    const quantity = Number((item.actual * item.multiplier).toFixed(2));
    return {
      description: item.description,
      quantity,
      units: item.units
    };
  });
};

const isAdminUser = (user) => {
  return hasRole(user, 'admin') || hasRole(user, 'AD');
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

  const hasOwnReportAccess =
    hasRole(req.user, 'FE') || getUserRoles(req.user).includes('field_engineer');
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

const formatCoordinate = (value) => {
  const numeric = toNumber(value);
  if (numeric === null) return '';
  return String(Number(numeric.toFixed(6)));
};

const sanitizeWorksheetName = (name, fallback) => {
  const cleaned = safeText(name, fallback).replace(/[\\/*?:[\]]/g, ' ').trim();
  return (cleaned || fallback).slice(0, 31);
};

const getFileExtension = (value) => {
  const source = safeText(value);
  if (!source) return '';

  const normalized = source.split('?')[0].split('#')[0];
  const ext = path.extname(normalized).toLowerCase();
  return ext;
};

const isImageSource = (value) => {
  const source = safeText(value);
  if (!source) return false;
  if (/^data:image\//i.test(source)) return true;

  const ext = getFileExtension(source);
  if (ext) return Boolean(IMAGE_MIME_BY_EXT[ext]);

  // Cloudinary delivery URLs frequently have no extension; treat the image folder as a hint.
  return /\/image\/upload\//i.test(source);
};

const getAttachmentLabel = (value) => {
  const source = safeText(value);
  if (!source) return '';
  if (/^data:/i.test(source)) return 'Embedded file';

  const normalized = source.replace(/\\/g, '/').split('?')[0];
  const name = normalized.split('/').pop();
  try {
    return safeText(decodeURIComponent(name), source);
  } catch (error) {
    return safeText(name, source);
  }
};

// =================== IMAGE LOADING ===================

const imageAssetCache = new Map();
let embeddedImageBytes = 0;
let embeddedImageCount = 0;
let embeddedImageSequence = 0;

const resetImageBudget = () => {
  embeddedImageBytes = 0;
  embeddedImageCount = 0;
  embeddedImageSequence = 0;
  imageAssetCache.clear();
};

const resolveLocalImagePath = (source) => {
  const value = safeText(source);
  if (!value) return null;

  const normalized = value.replace(/\\/g, '/').split('?')[0];
  const relative = normalized.replace(/^\/+/, '');
  const projectRoot = path.resolve(__dirname, '..', '..');

  const candidates = [
    normalized,
    path.resolve(process.cwd(), relative),
    path.resolve(projectRoot, relative),
    path.resolve(projectRoot, 'uploads', path.basename(relative)),
    path.resolve(projectRoot, 'public', relative)
  ];

  return (
    candidates.find((candidate) => {
      try {
        return Boolean(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile();
      } catch (error) {
        return false;
      }
    }) || null
  );
};

const fetchRemoteBinary = (url, redirectsLeft = 4) =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    let request;
    try {
      const client = url.startsWith('https:') ? https : http;
      request = client.get(url, { timeout: IMAGE_FETCH_TIMEOUT_MS }, (response) => {
        const status = response.statusCode || 0;

        if (status >= 300 && status < 400 && response.headers.location && redirectsLeft > 0) {
          response.resume();
          const next = new URL(response.headers.location, url).toString();
          fetchRemoteBinary(next, redirectsLeft - 1).then(finish);
          return;
        }

        if (status !== 200) {
          response.resume();
          finish(null);
          return;
        }

        const chunks = [];
        let size = 0;
        response.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) {
            response.destroy();
            finish(null);
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () =>
          finish({ buffer: Buffer.concat(chunks), contentType: safeText(response.headers['content-type']) })
        );
        response.on('error', () => finish(null));
      });
    } catch (error) {
      finish(null);
      return;
    }

    request.on('timeout', () => {
      request.destroy();
      finish(null);
    });
    request.on('error', () => finish(null));
  });

const normalizeImageMimeType = (contentType, source) => {
  const declared = safeText(contentType).split(';')[0].toLowerCase();
  if (declared.startsWith('image/')) return declared;
  return IMAGE_MIME_BY_EXT[getFileExtension(source)] || 'image/jpeg';
};

/**
 * Resolves a photo reference (Cloudinary URL, /uploads path, data URI) to a real
 * buffer so it can be embedded into Word (MHTML), PDF and Excel exports.
 */
const loadImageAsset = async (source) => {
  const value = safeText(source);
  if (!value) return null;
  if (imageAssetCache.has(value)) return imageAssetCache.get(value);

  const register = (asset) => {
    imageAssetCache.set(value, asset);
    return asset;
  };

  if (embeddedImageCount >= MAX_EMBEDDED_IMAGES || embeddedImageBytes >= MAX_TOTAL_IMAGE_BYTES) {
    return register(null);
  }

  let buffer = null;
  let mimeType = '';

  try {
    const dataUriMatch = value.match(/^data:([^;,]+);base64,(.*)$/i);
    if (dataUriMatch) {
      buffer = Buffer.from(dataUriMatch[2], 'base64');
      mimeType = dataUriMatch[1].toLowerCase();
    } else if (/^https?:\/\//i.test(value)) {
      const fetched = await fetchRemoteBinary(value);
      if (fetched) {
        buffer = fetched.buffer;
        mimeType = normalizeImageMimeType(fetched.contentType, value);
      }
    } else {
      const localPath = resolveLocalImagePath(value);
      if (localPath) {
        const stats = fs.statSync(localPath);
        if (stats.size <= MAX_IMAGE_BYTES) {
          buffer = fs.readFileSync(localPath);
          mimeType = IMAGE_MIME_BY_EXT[getFileExtension(localPath)] || 'image/jpeg';
        }
      }
    }
  } catch (error) {
    buffer = null;
  }

  if (!buffer || !buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    return register(null);
  }

  embeddedImageBytes += buffer.length;
  embeddedImageCount += 1;
  embeddedImageSequence += 1;

  const extension = Object.keys(IMAGE_MIME_BY_EXT).find((ext) => IMAGE_MIME_BY_EXT[ext] === mimeType) || '.jpg';
  const asset = {
    buffer,
    mimeType: mimeType || 'image/jpeg',
    fileName: `sams_image_${String(embeddedImageSequence).padStart(3, '0')}${extension}`,
    dataUri: `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`,
    naturalSize: getImageDimensions(buffer, mimeType || 'image/jpeg')
  };

  return register(asset);
};

/**
 * Reads the true pixel dimensions straight out of the image bytes.
 * MS Word's HTML/MHTML renderer does not understand CSS `object-fit`, so without
 * knowing the real aspect ratio we can only force a box size and Word stretches
 * (distorts) the photo to fill it. Computing width/height here lets us instead emit
 * <img width height> attributes that Word (and every other renderer) honours directly.
 * Supports the formats these reports actually embed: JPEG, PNG, GIF, BMP, WEBP.
 */
const getImageDimensions = (buffer, mimeType) => {
  try {
    if (!buffer || buffer.length < 24) return null;

    if (mimeType === 'image/png' && buffer.readUInt32BE(0) === 0x89504e47) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    if (mimeType === 'image/gif' && buffer.toString('ascii', 0, 3) === 'GIF') {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }

    if (mimeType === 'image/bmp' && buffer.toString('ascii', 0, 2) === 'BM') {
      return { width: buffer.readInt32LE(18), height: Math.abs(buffer.readInt32LE(22)) };
    }

    if (mimeType === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buffer.toString('ascii', 12, 16);
      if (chunk === 'VP8 ') {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
      }
      if (chunk === 'VP8L') {
        const bits = buffer.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === 'VP8X') {
        return {
          width: (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1,
          height: (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1
        };
      }
      return null;
    }

    if (mimeType === 'image/jpeg' && buffer.readUInt16BE(0) === 0xffd8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15 carry the frame dimensions.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
      return null;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Fits `natural` width/height inside a maxWidth x maxHeight box, preserving aspect
 * ratio, so the explicit <img width height> attributes never crop or distort a photo.
 */
const fitWithinBox = (natural, maxWidth, maxHeight) => {
  if (!natural || !natural.width || !natural.height) {
    return { width: maxWidth, height: maxHeight };
  }
  const scale = Math.min(maxWidth / natural.width, maxHeight / natural.height, 1);
  return {
    width: Math.max(1, Math.round(natural.width * scale)),
    height: Math.max(1, Math.round(natural.height * scale))
  };
};

const attachImageAssets = async (rows) => {
  for (const row of rows) {
    // Sequential on purpose: keeps the memory/byte budget deterministic.
    // eslint-disable-next-line no-await-in-loop
    row.asset = await loadImageAsset(row.source);
  }
  return rows;
};

// =================== QUERY HELPERS ===================

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

// =================== DATA COLLECTION ===================

const getCustomComponentEntries = (value) => {
  if (!value) return [];

  const source = value instanceof Map ? Array.from(value.entries()) : Object.entries(value);
  return source.flatMap(([key, entries]) => {
    const arr = Array.isArray(entries) ? entries : entries && typeof entries === 'object' ? [entries] : [];
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
    const rawValue = componentContainer[componentKey];
    const entries = Array.isArray(rawValue) ? rawValue : rawValue && typeof rawValue === 'object' ? [rawValue] : [];
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
  const remarks = safeText(entry?.condition_comment || entry?.inspector_notes || entry?.remarks);
  if (remarks) return remarks;

  const distressTypes = Array.isArray(entry?.distress_types)
    ? entry.distress_types.map((item) => safeText(item)).filter(Boolean).join(', ')
    : '';

  return distressTypes || '';
};

// The component instance schema exposes both `photo` (legacy single) and `photos` (array).
const getEntryPhotos = (entry) => {
  const single = safeText(entry?.photo);
  const many = Array.isArray(entry?.photos) ? entry.photos : [];
  const pdfImages = (Array.isArray(entry?.pdf_files) ? entry.pdf_files : [])
    .map((file) => safeText(file?.file_path || file?.filename))
    .filter((file) => file && isImageSource(file));

  return Array.from(new Set([single, ...many.map((item) => safeText(item)), ...pdfImages].filter(Boolean)));
};

const getEntryDocuments = (entry) =>
  (Array.isArray(entry?.pdf_files) ? entry.pdf_files : [])
    .map((file) => ({
      name: safeText(file?.filename, getAttachmentLabel(file?.file_path)),
      source: safeText(file?.file_path || file?.filename)
    }))
    .filter((file) => file.source && !isImageSource(file.source));

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
  const explicit = safeText(entry?.location_of_distress);
  if (explicit) return explicit;

  const categoryKey = normalizeComponentLookupKey(entry?.category);
  const observationText = categoryKey ? observationLookup.get(categoryKey) : '';
  return safeText(observationText, scopeLabel);
};

const buildDerivedQuantificationRows = (entries, scopeLabel, section) => {
  const rows = [];

  entries.forEach(({ componentLabel, entry }) => {
    const observationText = getObservationText(entry);
    const dimensions = entry?.distress_dimensions || {};
    const number = toNumber(dimensions.number);
    const length = toDimension(dimensions.length);
    const breadth = toDimension(dimensions.breadth);
    const height = toDimension(dimensions.height);
    const repairMethodology = safeText(entry?.repair_methodology);
    const hasDimensions = length !== null || breadth !== null || height !== null;
    const hasContent = Boolean(observationText || hasDimensions || safeText(entry?.repair_methodology));

    if (!hasContent || !repairMethodology) {
      return;
    }

    const quantBase = {
      // A NO'S observation has no physical dimensions; its entered count is
      // the quantity. Older records without `number` retain the prior value.
      nos: number ?? 1,
      length,
      breadth,
      height
    };

    rows.push({
      scopeLabel,
      section,
      category: componentLabel,
      location_of_distress: safeText(observationText, `${componentLabel} - ${scopeLabel}`),
      distress: componentLabel,
      nos: quantBase.nos,
      length,
      breadth,
      height,
      quantity: computeQuantity(quantBase),
      unit: safeText(dimensions.unit) || inferUnitFromDimensions(quantBase),
      repair_methodology: repairMethodology
    });
  });

  return rows;
};

const collectObservationsFromScope = (scopeType, scope, structuralContainer, nonStructuralContainer) => {
  const observations = [];
  const locationLabel = buildLocationLabel(scopeType, scope);

  const appendEntries = (entries, section) => {
    entries.forEach(({ componentLabel, entry }) => {
      const note = getObservationText(entry);
      const distressTypes = Array.isArray(entry?.distress_types)
        ? entry.distress_types.map((item) => safeText(item)).filter(Boolean).join(', ')
        : '';
      const photos = getEntryPhotos(entry);
      const documents = getEntryDocuments(entry);
      const rating = toNumber(entry?.rating);

      if (!note && photos.length === 0 && documents.length === 0 && rating === null) {
        return;
      }

      observations.push({
        location: locationLabel,
        category: section,
        // Only the general component label is shown (e.g. "Beams"), not the specific
        // instance name the field engineer may have entered for that component.
        component: componentLabel,
        remarks: note || '',
        rating,
        photos,
        documents,
        repair_methodology: safeText(entry?.repair_methodology),
        distress: distressTypes || componentLabel
      });
    });
  };

  appendEntries(getComponentEntries(structuralContainer, STRUCTURAL_COMPONENTS), STRUCTURAL_SECTION);
  appendEntries(getComponentEntries(nonStructuralContainer, NON_STRUCTURAL_COMPONENTS), NON_STRUCTURAL_SECTION);

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

  const addRows = (entries, scopeLabel, section, observationLookup) => {
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const length = toDimension(entry.length);
      const breadth = toDimension(entry.breadth);
      const height = toDimension(entry.height);
      const nos = toCount(entry.nos);
      const explicitQuantity = toNumber(entry.quantity);
      const computed = computeQuantity({ nos, length, breadth, height });

      const repairMethodology = safeText(entry.repair_methodology);
      if (!repairMethodology) return;

      rows.push({
        scopeLabel,
        section,
        category: safeText(entry.category, section),
        location_of_distress: resolveQuantificationLocation(entry, observationLookup, scopeLabel),
        distress: safeText(entry.category, section),
        nos,
        length,
        breadth,
        height,
        // Preserve an explicit zero; derive only when quantity was not supplied.
        quantity: explicitQuantity !== null ? explicitQuantity : computed,
        unit: safeText(entry.unit).toUpperCase() || inferUnitFromDimensions({ length, breadth, height }),
        repair_methodology: repairMethodology
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
      addRows(structuralEntries, scopeLabel, STRUCTURAL_SECTION, observationLookup);
    } else {
      rows.push(
        ...buildDerivedQuantificationRows(
          getComponentEntries(structuralContainer, STRUCTURAL_COMPONENTS),
          scopeLabel,
          STRUCTURAL_SECTION
        )
      );
    }

    if (hasSavedNonStructural) {
      addRows(nonStructuralEntries, scopeLabel, NON_STRUCTURAL_SECTION, observationLookup);
    } else {
      rows.push(
        ...buildDerivedQuantificationRows(
          getComponentEntries(nonStructuralContainer, NON_STRUCTURAL_COMPONENTS),
          scopeLabel,
          NON_STRUCTURAL_SECTION
        )
      );
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
      addSavedOrDerivedRows({
        structuralEntries: block.quantifications?.structural,
        nonStructuralEntries: block.quantifications?.non_structural,
        scopeLabel: blockLabel,
        structuralContainer: block.structural_rating,
        nonStructuralContainer: block.non_structural_rating
      });
    });
  });

  let foundationSeen = false;
  return rows.filter((row) => {
    const isFoundation = normalizeComponentLookupKey(row.category || row.distress) === 'foundation';
    if (!isFoundation) return true;
    if (foundationSeen) return false;
    foundationSeen = true;
    return true;
  });
};

// Every field the mobile/web clients have used for "upload multiple files per test format".
const TEST_ATTACHMENT_ARRAY_KEYS = [
  'test_report_pdfs',
  'test_reports',
  'test_files',
  'test_images',
  'attachments',
  'files',
  'documents',
  'images',
  'photos',
  'pdf_files',
  'excel_files'
];

const normalizeAttachment = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const source = safeText(value);
    return source ? { name: getAttachmentLabel(source), source } : null;
  }
  if (typeof value === 'object') {
    const source = safeText(value.file_path || value.url || value.path || value.secure_url || value.filename);
    if (!source) return null;
    return { name: safeText(value.filename || value.name, getAttachmentLabel(source)), source };
  }
  return null;
};

const collectTestAttachments = (entry) => {
  const attachments = [];

  const push = (value) => {
    const attachment = normalizeAttachment(value);
    if (attachment) attachments.push(attachment);
  };

  push(entry?.test_report_pdf);

  TEST_ATTACHMENT_ARRAY_KEYS.forEach((key) => {
    const value = entry?.[key];
    if (Array.isArray(value)) {
      value.forEach(push);
    } else if (value) {
      push(value);
    }
  });

  const seen = new Set();
  return attachments.filter((attachment) => {
    if (seen.has(attachment.source)) return false;
    seen.add(attachment.source);
    return true;
  });
};

const collectTests = (structure) => {
  const tests = [];

  const addTests = (entries, scopeLabel) => {
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const attachments = collectTestAttachments(entry);
      tests.push({
        scopeLabel,
        test_name: safeText(TEST_NAME_LABELS[entry.test_name], safeText(entry.test_name, 'TEST')),
        tested_by: safeText(entry.tested_by),
        test_date: formatDate(entry.test_date),
        remarks: safeText(entry.remarks),
        component_type: safeText(entry.component_type),
        component_id: safeText(entry.component_id),
        result_summary: flattenMixedObject(entry.test_results),
        attachments
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
  const inspectionImages = [];
  observations.forEach((observation) => {
    observation.photos.forEach((photo) => {
      inspectionImages.push({
        serial: inspectionImages.length + 1,
        location: observation.location,
        category: observation.category,
        caption: observation.remarks || observation.component,
        source: photo
      });
    });
  });

  const testingImages = [];
  tests.forEach((test) => {
    test.attachments
      .filter((attachment) => isImageSource(attachment.source))
      .forEach((attachment) => {
        testingImages.push({
          serial: testingImages.length + 1,
          test_name: test.test_name,
          scopeLabel: test.scopeLabel,
          caption: `${test.test_name} - ${test.scopeLabel}`,
          source: attachment.source
        });
      });
  });

  return { inspectionImages, testingImages };
};

const collectFileAttachments = (observations, tests) => {
  const files = [];

  observations.forEach((observation) => {
    observation.documents.forEach((document) => {
      files.push({
        location: observation.location,
        context: observation.component,
        name: document.name,
        source: document.source
      });
    });
  });

  tests.forEach((test) => {
    test.attachments
      .filter((attachment) => !isImageSource(attachment.source))
      .forEach((attachment) => {
        files.push({
          location: test.scopeLabel,
          context: test.test_name,
          name: attachment.name,
          source: attachment.source
        });
      });
  });

  return files;
};

const groupObservationsByLocation = (observations) =>
  observations.reduce((acc, item) => {
    if (!acc.has(item.location)) {
      acc.set(item.location, { structural: [], nonStructural: [] });
    }

    const bucket = item.category === STRUCTURAL_SECTION ? 'structural' : 'nonStructural';
    acc.get(item.location)[bucket].push(item);
    return acc;
  }, new Map());

/**
 * Single line of the OBSERVATIONS table: the inspector remark, prefixed with the
 * component when the remark does not already name it, so nothing is lost.
 */
const buildObservationLine = (item) => {
  const component = safeText(item.component);
  const remarks = safeText(item.remarks);

  if (!remarks) {
    const distress = safeText(item.distress);
    return distress && distress !== component ? `${distress} observed on ${component}` : component || 'N/A';
  }

  const componentToken = component.split('(')[0].trim().toLowerCase();
  if (componentToken && remarks.toLowerCase().includes(componentToken)) {
    return remarks;
  }

  return component ? `${component}: ${remarks}` : remarks;
};

const groupQuantificationsBySection = (rows) => {
  const sections = new Map([
    [STRUCTURAL_SECTION, new Map()],
    [NON_STRUCTURAL_SECTION, new Map()]
  ]);

  rows.forEach((row) => {
    const section = row.section === STRUCTURAL_SECTION ? STRUCTURAL_SECTION : NON_STRUCTURAL_SECTION;
    const groups = sections.get(section);
    const key = safeText(row.distress || row.category, 'OTHER').toUpperCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return Array.from(sections.entries()).filter(([, groups]) => groups.size > 0);
};

const groupTests = (tests) =>
  tests.reduce((acc, test) => {
    if (!acc.has(test.test_name)) acc.set(test.test_name, []);
    acc.get(test.test_name).push(test);
    return acc;
  }, new Map());

// Schema enums are stored as snake_case codes; report readers expect words.
const ACRONYMS = new Set(['rcc', 'uid', 'id', 'nos']);

const prettifyEnum = (value) => {
  const source = safeText(value);
  if (!source) return '';
  return source
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
};

const withUnit = (value, unit) => {
  const text = safeText(value);
  return text ? `${text} ${unit}` : '';
};

const deriveYearOfConstruction = (identity, geometry) => {
  const savedYear = toNumber(geometry.year_of_construction);
  if (savedYear !== null && savedYear > 0) return String(savedYear);
  const age = toNumber(identity.age_of_structure);
  return age !== null && age >= 0 ? String(new Date().getFullYear() - age) : '';
};

const deriveBasementFloorCount = (geometry) => {
  const saved = toNumber(geometry.basement_floors);
  if (saved !== null && saved > 0) return String(saved);
  const floors = Array.isArray(geometry.floors) ? geometry.floors : [];
  const count = floors.filter((floor) => {
    const type = safeText(floor.parking_floor_type).toLowerCase();
    return type.includes('cellar') || type.includes('basement') || toNumber(floor.floor_number) < 0;
  }).length;
  return String(count);
};

const deriveParkingFloorTypes = (geometry) => {
  const direct = prettifyEnum(geometry.parking_floor_type);
  if (direct) return direct;
  const floors = Array.isArray(geometry.floors) ? geometry.floors : [];
  return Array.from(
    new Set(floors.filter((floor) => floor.is_parking_floor).map((floor) => prettifyEnum(floor.parking_floor_type)).filter(Boolean))
  ).join(', ');
};

// The report header used to always print the literal string "SAMS"; it now shows the
// client's name instead, falling back to "SAMS" only when no client name was captured.
const getClientName = (structureExport) => {
  const administrative = structureExport?.structure?.administrative || structureExport?.structure?.administration || {};
  return safeText(administrative.client_name, 'SAMS');
};

/**
 * Structure / location / administrative details, grouped into labelled tables so the
 * report reads as a proper detail sheet rather than one long key-value list.
 * Rows are [label, value] pairs; `{ span: true }` makes a row occupy the full width.
 */
const buildStructureDetailSections = (structureExport, filtersApplied) => {
  const { structure, owner } = structureExport;
  const identity = structure.structural_identity || {};
  const location = structure.location || {};
  // NOTE: the schema field is `administrative`; `administration` is kept as a fallback
  // only because older documents were written with that key.
  const administrative = structure.administrative || structure.administration || {};
  const geometry = structure.geometric_details || {};
  return [
    {
      title: 'STRUCTURE DETAILS',
      rows: [
        ['Structure Name', safeText(location.structure_name)],
        ['Structure ID', safeText(identity.structural_identity_number)],
        ['Type Of Structure', prettifyEnum(identity.type_of_structure)],
        ['Structure Subtype', prettifyEnum(identity.structure_subtype)],
        ['Commercial Subtype', prettifyEnum(identity.commercial_subtype)],
        ['Age Of Structure', withUnit(identity.age_of_structure, 'Years')],
        ['Year Of Construction', deriveYearOfConstruction(identity, geometry)],
        ['Number Of Floors', safeText(geometry.number_of_floors)],
        ['Basement Floors', deriveBasementFloorCount(geometry)],
        ['Structure Length', withUnit(geometry.structure_length, 'M')],
        ['Structure Width', withUnit(geometry.structure_width, 'M')],
        ['Structure Height', withUnit(geometry.structure_height, 'M')],
        ['Parking Type', prettifyEnum(geometry.parking_type || (deriveParkingFloorTypes(geometry) ? 'available' : ''))],
        ['Parking Floor Type', deriveParkingFloorTypes(geometry)]
      ]
    },
    {
      title: 'LOCATION DETAILS',
      rows: [
        ['State Code', safeText(location.state_code)],
        ['District Code', safeText(location.district_code)],
        ['City Name', safeText(location.city_name)],
        ['Location Code', safeText(location.location_code)],
        ['Zip Code', safeText(location.zip_code)],
        ['Latitude', formatCoordinate(location.latitude)],
        ['Longitude', formatCoordinate(location.longitude)],
        ['Address', safeText(location.address), { span: true }]
      ]
    },
    {
      title: 'CLIENT',
      rows: [
        ['Client Name', safeText(administrative.client_name)],
        ['Custodian', safeText(administrative.custodian)],
        ['Engineer Designation', safeText(administrative.engineer_designation)],
        ['Contact Details', safeText(administrative.contact_details)],
        ['Email ID', safeText(administrative.email_id)],
        ['Organization', safeText(administrative.organization || owner?.profile?.organization)],
        ['Inspected By', buildOwnerLabel(owner)],
        ['Employee ID', safeText(owner?.profile?.employee_id)]
      ]
    }
  ];
};

/**
 * Collects everything the renderers need (including downloaded image buffers) once,
 * so the Word / PDF / Excel writers stay synchronous and always agree with each other.
 */
const prepareStructureReport = async (structureExport, filtersApplied) => {
  const observations = collectStructureObservations(structureExport.structure);
  const quantifications = collectQuantifications(structureExport.structure);
  const tests = collectTests(structureExport.structure);
  const { inspectionImages, testingImages } = collectPhotoRows(observations, tests);
  const fileAttachments = collectFileAttachments(observations, tests);

  await attachImageAssets(inspectionImages);
  await attachImageAssets(testingImages);

  const structuralQuantifications = quantifications.filter((row) => row.section === STRUCTURAL_SECTION);
  const nonStructuralQuantifications = quantifications.filter((row) => row.section !== STRUCTURAL_SECTION);

  return {
    ...structureExport,
    filtersApplied: safeText(filtersApplied),
    detailSections: buildStructureDetailSections(structureExport, filtersApplied),
    observations,
    observationGroups: groupObservationsByLocation(observations),
    quantifications,
    quantificationSections: groupQuantificationsBySection(quantifications),
    tests,
    testGroups: groupTests(tests),
    inspectionImages,
    testingImages,
    fileAttachments,
    summary: {
      structural: summarizeMethodology(structuralQuantifications),
      nonStructural: summarizeMethodology(nonStructuralQuantifications),
      combined: summarizeMethodology(quantifications)
    }
  };
};

const prepareStructureReports = async (structures, filtersApplied) => {
  resetImageBudget();
  const prepared = [];
  for (const structureExport of structures) {
    // eslint-disable-next-line no-await-in-loop
    prepared.push(await prepareStructureReport(structureExport, filtersApplied));
  }
  return prepared;
};

const collectReportAssets = (preparedStructures) => {
  const assets = new Map();
  preparedStructures.forEach((prepared) => {
    [...prepared.inspectionImages, ...prepared.testingImages].forEach((row) => {
      if (row.asset && !assets.has(row.asset.fileName)) {
        assets.set(row.asset.fileName, row.asset);
      }
    });
  });
  return Array.from(assets.values());
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

// =================== HTML (WORD + PDF) RENDERING ===================

const QUANT_COLUMN_COUNT = 8;

/**
 * Renders a detail section as a 4-column table (Label | Value | Label | Value),
 * so ~20 fields stay compact and aligned instead of running down the page.
 */
const renderDetailSectionHtml = (section) => {
  const cell = (label, value) =>
    `<td class="detail-label">${escapeHtml(label)}</td><td class="detail-value">${
      escapeHtml(safeText(value, REPORT_PLACEHOLDER))
    }</td>`;

  const rows = [];
  let pending = null;

  section.rows.forEach(([label, value, options]) => {
    if (options?.span) {
      if (pending) {
        rows.push(`<tr>${cell(pending[0], pending[1])}<td>&nbsp;</td><td>&nbsp;</td></tr>`);
        pending = null;
      }
      rows.push(
        `<tr><td class="detail-label">${escapeHtml(label)}</td><td class="detail-value" colspan="3">${
          escapeHtml(safeText(value, REPORT_PLACEHOLDER))
        }</td></tr>`
      );
      return;
    }

    if (pending) {
      rows.push(`<tr>${cell(pending[0], pending[1])}${cell(label, value)}</tr>`);
      pending = null;
    } else {
      pending = [label, value];
    }
  });

  if (pending) {
    rows.push(`<tr>${cell(pending[0], pending[1])}<td>&nbsp;</td><td>&nbsp;</td></tr>`);
  }

  return `
    <table class="detail-table">
      <thead>
        <tr><th colspan="4" class="detail-heading">${escapeHtml(section.title)}</th></tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
};

const renderDetailSectionsHtml = (sections) => sections.map(renderDetailSectionHtml).join('');

/**
 * OBSERVATIONS, in the client's format:
 * Element name | Location of distress, grouped by location and distress category.
 */
const renderObservationsHtml = (observationGroups) => {
  const rows = [
    '<table class="obs-table"><thead><tr><th>Element Name</th><th>Location of Distress</th></tr></thead><tbody>'
  ];

  if (!observationGroups.size) {
    rows.push(`<tr><td>${REPORT_PLACEHOLDER}</td><td>${REPORT_PLACEHOLDER}</td></tr>`);
  }

  observationGroups.forEach((buckets, location) => {
    rows.push(`<tr class="obs-location-row"><td colspan="2">${escapeHtml(location).toUpperCase()}</td></tr>`);

    [
      [STRUCTURAL_SECTION, buckets.structural],
      [NON_STRUCTURAL_SECTION, buckets.nonStructural]
    ].forEach(([sectionLabel, items]) => {
      if (!items.length) return;
      rows.push(`<tr class="obs-category-row"><td colspan="2">${escapeHtml(sectionLabel)}</td></tr>`);
      items.forEach((item) => {
        rows.push(
          `<tr><td>${escapeHtml(safeText(item.component, REPORT_PLACEHOLDER))}</td><td>${escapeHtml(safeText(item.remarks, item.location || REPORT_PLACEHOLDER))}</td></tr>`
        );
      });
    });
  });

  rows.push('</tbody></table>');
  return rows.join('');
};

/**
 * Word has no flexbox, so the 2-up image grid must be a real table.
 */
// Box the images are laid out in; kept in one place so the HTML attributes below and
// the .image-box CSS rule stay in sync.
const IMAGE_BOX_MAX_WIDTH = 280;
const IMAGE_BOX_MAX_HEIGHT = 135;

const renderImageGridHtml = (rows, imageRef) => {
  if (!rows.length) {
    return '<p class="empty-state">No images attached.</p>';
  }

  const cells = rows.map((row) => {
    const src = imageRef(row.asset);
    const caption = safeText(row.caption, 'Untitled');
    const meta = safeText(row.location || row.scopeLabel);
    // Word's HTML renderer ignores CSS object-fit, so the box size must come from real
    // <img width height> attributes (computed from the actual photo) or portrait/landscape
    // photos get stretched to fill the fixed box instead of being scaled proportionally.
    const fitted = fitWithinBox(row.asset?.naturalSize, IMAGE_BOX_MAX_WIDTH, IMAGE_BOX_MAX_HEIGHT);
    const body = src
      ? `<img src="${escapeHtml(src)}" width="${fitted.width}" height="${fitted.height}" alt="${escapeHtml(caption)}" />`
      : `<span class="image-missing">Image could not be embedded (${escapeHtml(getAttachmentLabel(row.source))})</span>`;

    return `
      <td class="image-cell">
        <div class="image-box">${body}</div>
        <div class="caption-title">${escapeHtml(caption)}</div>
        ${meta ? `<div class="caption-meta">${escapeHtml(meta)}</div>` : ''}
      </td>
    `;
  });

  const tableRows = [];
  for (let index = 0; index < cells.length; index += 2) {
    const pair = cells.slice(index, index + 2);
    if (pair.length === 1) pair.push('<td class="image-cell">&nbsp;</td>');
    tableRows.push(`<tr>${pair.join('')}</tr>`);
  }

  return `<table class="image-grid"><tbody>${tableRows.join('')}</tbody></table>`;
};

const renderTestResultsHtml = (testGroups) => {
  if (!testGroups.size) {
    return '<p class="empty-state">No test results recorded.</p>';
  }

  let testIndex = 1;
  const blocks = [];

  testGroups.forEach((rows, testName) => {
    const body = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.scopeLabel)}</td>
            <td>${escapeHtml([row.component_type, row.component_id].filter(Boolean).join(' / '))}</td>
            <td>${escapeHtml(row.tested_by)}</td>
            <td>${escapeHtml(row.test_date)}</td>
            <td>${escapeHtml(row.result_summary)}</td>
            <td>${escapeHtml(row.remarks)}</td>
            <td>${
              row.attachments.length
                ? row.attachments.map((attachment) => escapeHtml(attachment.name)).join('<br />')
                : '&nbsp;'
            }</td>
          </tr>
        `
      )
      .join('');

    blocks.push(`
      <div class="test-block">
        <h3>${testIndex}. ${escapeHtml(testName)}</h3>
        <table class="test-table">
          <thead>
            <tr>
              <th>Location</th><th>Component</th><th>Tested By</th><th>Date</th>
              <th>Result</th><th>Remarks</th><th>Attachments</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `);
    testIndex += 1;
  });

  return blocks.join('');
};

/**
 * QUANTIFICATION, in the client's format: structural and non-structural shown
 * separately, then grouped by component (FOOTINGS / COLUMNS / WALLS / ...).
 */
const renderQuantificationHtml = (quantificationSections) => {
  const header = `
    <thead>
      <tr>
        <th rowspan="2" class="sno-col center">S.No</th>
        <th rowspan="2">Location of Distress</th>
        <th colspan="4" class="center">Distress</th>
        <th rowspan="2" class="center">Length (Rm) /<br />Area (Sqm) /<br />Volume (Cum)</th>
        <th rowspan="2">Repair Methodology</th>
      </tr>
      <tr>
        <th class="center">Nos</th>
        <th class="center">L (M)</th>
        <th class="center">B (M)</th>
        <th class="center">H (M)</th>
      </tr>
    </thead>
  `;

  if (!quantificationSections.length) {
    return `<table class="quant-table">${header}<tbody><tr><td colspan="${QUANT_COLUMN_COUNT}">No quantification entries recorded</td></tr></tbody></table>`;
  }

  const parts = [`<table class="quant-table">${header}<tbody>`];

  quantificationSections.forEach(([sectionLabel, groups]) => {
    parts.push(
      `<tr class="quant-section-row"><td colspan="${QUANT_COLUMN_COUNT}">${escapeHtml(sectionLabel)}</td></tr>`
    );

    groups.forEach((items, groupName) => {
      parts.push(`<tr class="quant-group-row"><td colspan="${QUANT_COLUMN_COUNT}">${escapeHtml(groupName)}</td></tr>`);
      let groupTotal = 0;

      items.forEach((row, index) => {
        groupTotal += toNumber(row.quantity) ?? 0;
        parts.push(`
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

      parts.push(`
        <tr class="quant-total-row">
          <td colspan="6">Total - ${escapeHtml(groupName)}</td>
          <td class="center">${escapeHtml(formatApproxQuantity(groupTotal))}</td>
          <td>&nbsp;</td>
        </tr>
      `);
    });
  });

  parts.push('</tbody></table>');
  return parts.join('');
};

const renderSummaryTableHtml = (summaryRows) => `
  <table class="summary-table">
    <thead>
      <tr>
        <th class="sno-col center">S. No</th>
        <th>Description</th>
        <th class="center" style="width:110px;">Quantity</th>
        <th class="center" style="width:90px;">Units</th>
      </tr>
    </thead>
    <tbody>
      ${
        summaryRows.length
          ? summaryRows
              .map(
                (row, index) => `
                  <tr>
                    <td class="center">${index + 1}</td>
                    <td>${escapeHtml(row.description)}</td>
                    <td class="center">${escapeHtml(String(row.quantity))}</td>
                    <td class="center">${escapeHtml(row.units)}</td>
                  </tr>
                `
              )
              .join('')
          : `<tr><td colspan="4" class="center">No repair quantities recorded</td></tr>`
      }
    </tbody>
  </table>
`;

const renderAttachmentsHtml = (fileAttachments) => {
  if (!fileAttachments.length) {
    return '<p class="empty-state">No additional documents attached.</p>';
  }

  return `
    <table class="attachment-table">
      <thead>
        <tr><th class="sno-col center">S. No</th><th>Location</th><th>Context</th><th>File</th></tr>
      </thead>
      <tbody>
        ${fileAttachments
          .map(
            (file, index) => `
              <tr>
                <td class="center">${index + 1}</td>
                <td>${escapeHtml(file.location)}</td>
                <td>${escapeHtml(file.context)}</td>
                <td><a href="${escapeHtml(file.source)}">${escapeHtml(file.name)}</a></td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
};

const renderSection = (title, body, subtitle = '') => `
  <h2 class="section-title">${escapeHtml(title)}</h2>
  ${subtitle ? `<p class="section-note">${escapeHtml(subtitle)}</p>` : ''}
  ${body}
`;

const renderStructureHtml = (prepared, imageRef) => `
  <section class="report-block">
    <div class="brand">${escapeHtml(getClientName(prepared))}</div>
    <div><span class="highlight-label">REPORT</span></div>
    ${renderDetailSectionsHtml(prepared.detailSections)}
    ${renderSection(
      'OBSERVATIONS',
      renderObservationsHtml(prepared.observationGroups),
      'Observation given in the structural and non-structural shall be reflect in the table and images below the table in the output.'
    )}
    ${renderSection('INSPECTION IMAGES', renderImageGridHtml(prepared.inspectionImages, imageRef))}
    <p class="section-note small-caps">The observation entered during the attaching the photo should reflect with image in small font</p>
    ${renderSection('ANNEXURES', renderAttachmentsHtml(prepared.fileAttachments))}
    ${renderSection('QUANTIFICATION', renderQuantificationHtml(prepared.quantificationSections))}
    ${renderSection(
      'BILL OF QUANTITY SUMMARY - STRUCTURAL',
      renderSummaryTableHtml(prepared.summary.structural),
      'Quantities in the quantification table are summed for each repair methodology type.'
    )}
    ${renderSection('BILL OF QUANTITY SUMMARY - NON-STRUCTURAL', renderSummaryTableHtml(prepared.summary.nonStructural))}
    ${renderSection('BILL OF QUANTITY SUMMARY - TOTAL', renderSummaryTableHtml(prepared.summary.combined))}
  </section>
`;

const REPORT_STYLES = `
  /* Consistent breathing room at the top/bottom of every page, plus a page border.
     "border" + "mso-border-alt"/"mso-padding-alt" on @page is what Word's own HTML
     importer reads to draw a repeating page border in the native .doc it produces. */
  @page WordSection1 {
    size: 21cm 29.7cm;
    margin: 26mm 18mm 26mm 18mm;
    border: 1pt solid #7F7F7F;
    mso-border-alt: solid #7F7F7F 1pt;
    padding: 10mm;
    mso-padding-alt: 10mm 10mm 10mm 10mm;
  }
  div.WordSection1 { page: WordSection1; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #1f1f1f;
    background: #ffffff;
    line-height: 1.35;
  }
  .brand {
    text-align: center;
    font-family: Calibri, Arial, sans-serif;
    font-size: 22pt;
    font-weight: bold;
    margin-bottom: 8pt;
  }
  .highlight-label {
    background: #fff200;
    font-weight: bold;
    font-size: 12pt;
    padding: 2px 6px;
    text-decoration: underline;
  }
  h2.section-title {
    font-size: 13pt;
    font-weight: bold;
    text-decoration: underline;
    margin: 16pt 0 4pt 0;
  }
  h3 { font-size: 11pt; font-weight: normal; margin: 8pt 0 4pt 0; }
  .section-note { font-size: 10pt; margin: 0 0 6pt 0; }
  .small-caps { font-size: 9pt; text-transform: uppercase; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10pt;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #7f7f7f;
    padding: 4px 6px;
    vertical-align: top;
    text-align: left;
  }
  th { font-weight: bold; background: #ffffff; }
  .center { text-align: center; }
  .sno-col { width: 50px; text-align: center; }
  .detail-table { margin-bottom: 8pt; }
  .detail-heading {
    background: #d9e2f3;
    font-weight: bold;
    text-align: center;
    font-size: 11pt;
    letter-spacing: 0.5px;
  }
  .detail-label { font-weight: bold; width: 21%; background: #f7f7f7; }
  .detail-value { width: 29%; }
  .obs-location-row td {
    color: #0070c0;
    font-weight: bold;
    text-align: center;
    font-size: 11pt;
  }
  .obs-category-row td { font-weight: bold; text-align: center; font-size: 10pt; }
  .quant-section-row td {
    background: #d9e2f3;
    font-weight: bold;
    text-align: center;
    font-size: 10pt;
  }
  .quant-group-row td {
    background: #fff200;
    font-weight: bold;
    text-align: center;
    font-size: 10pt;
  }
  .quant-total-row td { font-weight: bold; background: #f2f2f2; }
  .image-grid { border: none; }
  .image-grid td { border: none; width: 50%; text-align: center; vertical-align: top; padding: 6px; }
  .image-box {
    border: 1px solid #999999;
    padding: 3px;
    height: 137px;
    display: table-cell;
    vertical-align: middle;
    text-align: center;
  }
  /* The actual size now comes from the width/height attributes on each <img> tag
     (computed per-photo to preserve aspect ratio); these rules are just a safety net
     for browsers/Chrome-rendered PDF and never override Word's own attribute-based sizing. */
  .image-box img { max-width: 100%; max-height: 135px; }
  .image-missing { font-size: 9pt; font-style: italic; color: #888888; }
  .caption-title { font-size: 9pt; margin-top: 3px; }
  .caption-meta { font-size: 8pt; color: #555555; }
  .empty-state { font-size: 10pt; color: #888888; font-style: italic; margin-bottom: 8pt; }
  .note-block p { font-size: 10pt; margin: 2pt 0; }
  .report-block { page-break-after: always; }
  .report-block:last-child { page-break-after: auto; }
  .page-footer { position: fixed; bottom: -10mm; width: 100%; text-align: center; font-size: 9pt; }
  .page-number:after { content: counter(page); }
  /* Chrome's print-to-PDF path ignores the @page border above, so we repeat a fixed-
     position bordered frame the same way the footer above repeats on every page. */
  .page-border {
    position: fixed;
    top: 6mm;
    left: 6mm;
    right: 6mm;
    bottom: 6mm;
    border: 1pt solid #7F7F7F;
    pointer-events: none;
  }
`;

const buildReportHtml = (preparedStructures, imageRef) => `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>SAMS - Report</title>
    <!--[if gte mso 9]><xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml><![endif]-->
    <style>${REPORT_STYLES}</style>
  </head>
  <body>
    <div class="page-border"></div>
    <div class="page-footer">Page <span class="page-number"></span></div>
    <div class="WordSection1">
      ${preparedStructures.map((prepared) => renderStructureHtml(prepared, imageRef)).join('')}
    </div>
  </body>
</html>`;

// =================== WORD (MHTML) OUTPUT ===================

/**
 * Word only reliably embeds images from an MHTML package (it ignores `data:` URIs
 * in HTML-as-.doc files), so the Word export is built as multipart/related.
 */
const encodeQuotedPrintable = (input) => {
  const bytes = Buffer.from(input, 'utf8');
  const lines = [];
  let line = '';

  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte === 0x0d) continue;
    if (byte === 0x0a) {
      lines.push(line);
      line = '';
      continue;
    }

    const chunk =
      byte >= 33 && byte <= 126 && byte !== 0x3d
        ? String.fromCharCode(byte)
        : `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;

    if (line.length + chunk.length > 73) {
      lines.push(`${line}=`);
      line = '';
    }
    line += chunk;
  }

  lines.push(line);
  return lines.join('\r\n');
};

const MHTML_BASE_LOCATION = 'file:///C:/SAMS/report';

const buildWordMhtml = (html, assets) => {
  const boundary = '----=_NextPart_SAMS_REPORT';
  const parts = [
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; type="text/html"; boundary="${boundary}"`,
    'X-Document-Type: Word.Document',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: quoted-printable',
    `Content-Location: ${MHTML_BASE_LOCATION}/report.htm`,
    '',
    encodeQuotedPrintable(html)
  ];

  assets.forEach((asset) => {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${asset.mimeType}`,
      'Content-Transfer-Encoding: base64',
      `Content-Location: ${MHTML_BASE_LOCATION}/${asset.fileName}`,
      '',
      asset.buffer.toString('base64').replace(/(.{76})/g, '$1\r\n')
    );
  });

  parts.push(`--${boundary}--`, '');
  return parts.join('\r\n');
};

const sendWordDocument = (res, preparedStructures, fileName) => {
  const html = buildReportHtml(preparedStructures, (asset) => (asset ? asset.fileName : ''));
  const assets = collectReportAssets(preparedStructures);
  const buffer = Buffer.from(buildWordMhtml(html, assets), 'utf8');

  res.setHeader('Content-Type', WORD_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
};

// =================== PDF OUTPUT ===================

// SAMS_PDF_RENDERER=auto (default) | browser | pdfkit
const getPdfRendererMode = () => safeText(process.env.SAMS_PDF_RENDERER, 'auto').toLowerCase();

const resolveBrowserExecutablePath = () => {
  if (getPdfRendererMode() === 'pdfkit') return null;
  return BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || null;
};

const PDF_CONTENT_WIDTH = 523;

const ensurePdfSpace = (doc, requiredHeight = 24) => {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + requiredHeight > bottomLimit) {
    doc.addPage();
  }
};

// PDFKit keeps `doc.x` wherever the last positioned draw left it, which silently
// squeezes every following paragraph into a narrow column. Always reset it first.
const pdfResetX = (doc) => {
  doc.x = doc.page.margins.left;
};

const pdfSectionTitle = (doc, title) => {
  ensurePdfSpace(doc, 30);
  pdfResetX(doc);
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000000')
    .text(title, { underline: true, width: PDF_CONTENT_WIDTH });
  pdfResetX(doc);
  doc.moveDown(0.4);
};

const pdfParagraph = (doc, text, options = {}) => {
  ensurePdfSpace(doc, 16);
  pdfResetX(doc);
  doc
    .font(options.font || 'Helvetica')
    .fontSize(options.fontSize || 9)
    .fillColor(options.color || '#000000')
    .text(safeText(text), { width: PDF_CONTENT_WIDTH });
  doc.fillColor('#000000');
  pdfResetX(doc);
};

const pdfKeyValue = (doc, label, value) => {
  ensurePdfSpace(doc, 18);
  pdfResetX(doc);
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#000000')
    .text(`${label}: `, { continued: true, width: PDF_CONTENT_WIDTH });
  doc.font('Helvetica').text(safeText(value, '-'));
  pdfResetX(doc);
};

const pdfTableRow = (doc, columns, widths, options = {}) => {
  const startX = doc.page.margins.left;
  const fontSize = options.fontSize || 8;
  const isHeader = Boolean(options.header);
  const font = isHeader ? 'Helvetica-Bold' : options.font || 'Helvetica';

  doc.font(font).fontSize(fontSize);
  const heights = columns.map((value, index) =>
    doc.heightOfString(safeText(value, ''), { width: widths[index] - 6, align: 'left' })
  );
  const rowHeight = Math.max(options.lineHeight || 12, ...heights) + 6;
  ensurePdfSpace(doc, rowHeight + 2);

  const y = doc.y;
  let currentX = startX;

  columns.forEach((value, index) => {
    const width = widths[index];
    const linkUrl = safeText(options.links && options.links[index]);
    if (options.fill) {
      doc.rect(currentX, y, width, rowHeight).fill(options.fill);
    }
    doc.rect(currentX, y, width, rowHeight).lineWidth(0.5).strokeColor('#BFBFBF').stroke();
    doc
      .font(font)
      .fontSize(fontSize)
      .fillColor(linkUrl ? '#0563C1' : '#000000')
      .text(safeText(value, ''), currentX + 3, y + 3, {
        width: width - 6,
        align: options.align || 'left',
        underline: Boolean(linkUrl)
      });
    // Makes the attachment file name a clickable, openable link in the exported PDF.
    if (linkUrl) {
      doc.link(currentX, y, width, rowHeight, linkUrl);
    }
    doc.fillColor('#000000');
    currentX += width;
  });

  doc.y = y + rowHeight;
  pdfResetX(doc);
};

const pdfBandRow = (doc, text, fillColor) => {
  ensurePdfSpace(doc, 20);
  const y = doc.y;
  const x = doc.page.margins.left;
  doc.rect(x, y, PDF_CONTENT_WIDTH, 15).fill(fillColor);
  doc
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(safeText(text), x, y + 4, { width: PDF_CONTENT_WIDTH, align: 'center' });
  doc.y = y + 17;
  pdfResetX(doc);
};

const renderPdfImageGrid = (doc, rows) => {
  if (!rows.length) {
    pdfParagraph(doc, 'No images attached.', { font: 'Helvetica-Oblique', color: '#888888' });
    doc.moveDown(0.4);
    return;
  }

  const gap = 16;
  const cardWidth = (PDF_CONTENT_WIDTH - gap) / 2;
  const imageHeight = 150;
  const captionHeight = 30;
  const startX = doc.page.margins.left;
  let rowTop = doc.y;

  rows.forEach((row, index) => {
    if (index % 2 === 0) {
      ensurePdfSpace(doc, imageHeight + captionHeight + 12);
      rowTop = doc.y;
    }

    const x = index % 2 === 0 ? startX : startX + cardWidth + gap;
    doc.rect(x, rowTop, cardWidth, imageHeight).lineWidth(0.5).strokeColor('#BFBFBF').stroke();

    let rendered = false;
    if (row.asset) {
      try {
        doc.image(row.asset.buffer, x + 2, rowTop + 2, {
          fit: [cardWidth - 4, imageHeight - 4],
          align: 'center',
          valign: 'center'
        });
        rendered = true;
      } catch (error) {
        rendered = false;
      }
    }

    if (!rendered) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#666666')
        .text('Image could not be embedded', x + 6, rowTop + imageHeight / 2 - 6, {
          width: cardWidth - 12,
          align: 'center'
        });
    }

    doc
      .fillColor('#000000')
      .font('Helvetica')
      .fontSize(8)
      .text(safeText(row.caption, 'Untitled'), x, rowTop + imageHeight + 3, { width: cardWidth, align: 'center' });
    doc
      .fillColor('#555555')
      .fontSize(7)
      .text(safeText(row.location || row.scopeLabel), x, rowTop + imageHeight + 15, {
        width: cardWidth,
        align: 'center'
      });
    doc.fillColor('#000000');

    if (index % 2 === 1 || index === rows.length - 1) {
      doc.y = rowTop + imageHeight + captionHeight + 6;
    }
  });

  pdfResetX(doc);
};

const renderStructurePdf = (doc, prepared, index) => {
  if (index > 0) doc.addPage();

  pdfResetX(doc);
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#1F1F1F')
    .text(getClientName(prepared), { align: 'center', width: PDF_CONTENT_WIDTH });
  pdfResetX(doc);
  doc.moveDown(0.3);

  const labelY = doc.y;
  doc.rect(doc.page.margins.left, labelY, 165, 16).fill('#FFF200');
  doc
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('REPORT', doc.page.margins.left + 4, labelY + 4, { lineBreak: false });
  doc.y = labelY + 22;
  pdfResetX(doc);

  // Structure / location / administrative details as 4-column tables.
  const detailWidths = [110, 152, 110, 151];
  const detailSpanWidths = [110, PDF_CONTENT_WIDTH - 110];

  prepared.detailSections.forEach((section) => {
    pdfBandRow(doc, section.title, '#D9E2F3');

    let pending = null;
    const flush = () => {
      if (!pending) return;
      pdfTableRow(doc, [pending[0], pending[1], '', ''], detailWidths);
      pending = null;
    };

    section.rows.forEach(([label, value, options]) => {
      if (options?.span) {
        flush();
        pdfTableRow(doc, [label, safeText(value, REPORT_PLACEHOLDER)], detailSpanWidths);
        return;
      }
      if (pending) {
        pdfTableRow(doc, [pending[0], safeText(pending[1], REPORT_PLACEHOLDER), label, safeText(value, REPORT_PLACEHOLDER)], detailWidths);
        pending = null;
      } else {
        pending = [label, safeText(value, REPORT_PLACEHOLDER)];
      }
    });

    flush();
    doc.moveDown(0.3);
  });

  doc.moveDown(0.2);

  // OBSERVATIONS
  pdfSectionTitle(doc, 'OBSERVATIONS');
  const obsWidths = [190, PDF_CONTENT_WIDTH - 190];
  pdfTableRow(doc, ['Element Name', 'Location of Distress'], obsWidths, { header: true });
  if (!prepared.observationGroups.size) {
    pdfTableRow(doc, [REPORT_PLACEHOLDER, REPORT_PLACEHOLDER], obsWidths);
  } else {
    prepared.observationGroups.forEach((buckets, location) => {
      pdfBandRow(doc, safeText(location).toUpperCase(), '#DDEBF7');
      [
        [STRUCTURAL_SECTION, buckets.structural],
        [NON_STRUCTURAL_SECTION, buckets.nonStructural]
      ].forEach(([sectionLabel, items]) => {
        if (!items.length) return;
        pdfBandRow(doc, sectionLabel, '#F2F2F2');
        items.forEach((item) => {
          pdfTableRow(doc, [safeText(item.component, REPORT_PLACEHOLDER), safeText(item.remarks, item.location || REPORT_PLACEHOLDER)], obsWidths);
        });
      });
    });
  }

  pdfSectionTitle(doc, 'INSPECTION IMAGES');
  renderPdfImageGrid(doc, prepared.inspectionImages);

  // Documents remain available as annexures even though testing data is excluded.
  pdfSectionTitle(doc, 'ANNEXURES');
  if (!prepared.fileAttachments.length) {
    pdfParagraph(doc, 'No additional documents attached.', { font: 'Helvetica-Oblique', color: '#888888' });
  } else {
    const attachmentWidths = [40, 150, 150, PDF_CONTENT_WIDTH - 340];
    pdfTableRow(doc, ['S. No', 'Location', 'Context', 'File'], attachmentWidths, { header: true });
    prepared.fileAttachments.forEach((file, fileIndex) => {
      pdfTableRow(doc, [String(fileIndex + 1), file.location, file.context, file.name], attachmentWidths, {
        links: [null, null, null, file.source]
      });
    });
  }

  // QUANTIFICATION
  pdfSectionTitle(doc, 'QUANTIFICATION');
  const quantWidths = [30, 128, 32, 32, 32, 32, 88, 149];
  if (!prepared.quantificationSections.length) {
    pdfTableRow(
      doc,
      ['S.No', 'Location of Distress', 'Nos', 'L (M)', 'B (M)', 'H (M)', 'Rm / Sqm / Cum', 'Repair Methodology'],
      quantWidths,
      { header: true }
    );
    pdfTableRow(doc, ['', 'No quantification entries recorded', '', '', '', '', '', ''], quantWidths);
  } else {
    prepared.quantificationSections.forEach(([sectionLabel, groups]) => {
      pdfBandRow(doc, sectionLabel, '#D9E2F3');
      groups.forEach((items, groupName) => {
        pdfBandRow(doc, groupName, '#FFF200');
        pdfTableRow(
          doc,
          ['S.No', 'Location of Distress', 'Nos', 'L (M)', 'B (M)', 'H (M)', 'Rm / Sqm / Cum', 'Repair Methodology'],
          quantWidths,
          { header: true }
        );
        let groupTotal = 0;
        items.forEach((row, rowIndex) => {
          groupTotal += toNumber(row.quantity) ?? 0;
          pdfTableRow(
            doc,
            [
              String(rowIndex + 1),
              row.location_of_distress,
              String(row.nos),
              row.length ?? '',
              row.breadth ?? '',
              row.height ?? '',
              formatApproxQuantity(row.quantity),
              row.repair_methodology
            ],
            quantWidths
          );
        });
        // The label cell spans S.No..H, mirroring the colspan used in the Word/HTML table.
        pdfTableRow(
          doc,
          [`Total - ${groupName}`, formatApproxQuantity(groupTotal), ''],
          [quantWidths.slice(0, 6).reduce((sum, width) => sum + width, 0), quantWidths[6], quantWidths[7]],
          { font: 'Helvetica-Bold' }
        );
      });
    });
  }

  // BOQ SUMMARIES
  const summaryWidths = [40, 313, 90, 80];
  [
    ['BILL OF QUANTITY SUMMARY - STRUCTURAL', prepared.summary.structural],
    ['BILL OF QUANTITY SUMMARY - NON-STRUCTURAL', prepared.summary.nonStructural],
    ['BILL OF QUANTITY SUMMARY - TOTAL', prepared.summary.combined]
  ].forEach(([title, rows]) => {
    pdfSectionTitle(doc, title);
    pdfTableRow(doc, ['S. No', 'Description', 'Quantity', 'Units'], summaryWidths, { header: true });
    if (!rows.length) {
      pdfTableRow(doc, ['', 'No repair quantities recorded', '', ''], summaryWidths);
    } else {
      rows.forEach((row, rowIndex) => {
        pdfTableRow(doc, [String(rowIndex + 1), row.description, String(row.quantity), row.units], summaryWidths);
      });
    }
  });

};

const sendPdfBuffer = (res, buffer, fileName) => {
  res.setHeader('Content-Type', PDF_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
};

const renderPdfWithPdfKit = (preparedStructures) =>
  new Promise((resolve, reject) => {
    // Extra top/bottom margin gives each page breathing room above the title and
    // above/below the footer; left/right stay close to the previous 36pt default.
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 54, bottom: 54, left: 36, right: 36 },
      bufferPages: true
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      preparedStructures.forEach((prepared, index) => renderStructurePdf(doc, prepared, index));
      const pageRange = doc.bufferedPageRange();
      for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
        doc.switchToPage(pageIndex);

        // A border frame on every page, inset slightly inside the page margins.
        const borderInset = 14;
        doc
          .rect(
            borderInset,
            borderInset,
            doc.page.width - borderInset * 2,
            doc.page.height - borderInset * 2
          )
          .lineWidth(0.75)
          .strokeColor('#7F7F7F')
          .stroke();

        doc.font('Helvetica').fontSize(8).fillColor('#555555').text(
          `Page ${pageIndex + 1} of ${pageRange.count}`,
          doc.page.margins.left,
          doc.page.height - 30,
          { width: PDF_CONTENT_WIDTH, align: 'center', lineBreak: false }
        );
      }
      doc.end();
    } catch (error) {
      reject(error);
    }
  });

const renderPdfWithBrowser = async (executablePath, html) => {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' }
    });
    return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};

/**
 * Renders with Chrome/Edge when one is installed (best fidelity) and otherwise falls
 * back to the built-in PDFKit renderer, so PDF download never hard-fails on a server
 * without a browser.
 */
const sendPdfReport = async (res, preparedStructures, fileName) => {
  const executablePath = resolveBrowserExecutablePath();

  if (executablePath) {
    try {
      const html = buildReportHtml(preparedStructures, (asset) => (asset ? asset.dataUri : ''));
      const buffer = await renderPdfWithBrowser(executablePath, html);
      return sendPdfBuffer(res, buffer, fileName);
    } catch (error) {
      console.error('Browser PDF rendering failed, falling back to PDFKit:', error.message);
    }
  }

  const buffer = await renderPdfWithPdfKit(preparedStructures);
  return sendPdfBuffer(res, buffer, fileName);
};

// =================== EXCEL OUTPUT ===================

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

const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const addMergedSectionRow = (worksheet, rowNumber, text, fillColor, columnCount, options = {}) => {
  worksheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
  const cell = worksheet.getCell(rowNumber, 1);
  cell.value = text;
  cell.font = options.font || FONTS.HEADER;
  cell.fill = solidFill(fillColor);
  cell.alignment = { vertical: 'middle', horizontal: options.horizontal || 'left', wrapText: true };
  for (let col = 1; col <= columnCount; col += 1) {
    setCellBorder(worksheet.getCell(rowNumber, col));
  }
  worksheet.getRow(rowNumber).height = 20;
};

const addTableHeader = (worksheet, rowNumber, headers, fillColor = COLORS.SECONDARY) => {
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(rowNumber, index + 1);
    cell.value = header;
    cell.font = { ...FONTS.HEADER, color: { argb: COLORS.WHITE } };
    cell.fill = solidFill(fillColor);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    setCellBorder(cell);
  });
  worksheet.getRow(rowNumber).height = 22;
};

const writeRow = (worksheet, rowNumber, values, options = {}) => {
  values.forEach((value, index) => {
    worksheet.getCell(rowNumber, index + 1).value = value === null || value === undefined ? '' : value;
  });
  styleRowCells(worksheet, rowNumber, 1, values.length, options);
  return rowNumber + 1;
};

// Column 1 doubles as the "S. No" column and the detail-table label column, hence the
// wider-than-usual first column.
const ensureColumns = (worksheet) => {
  worksheet.columns = [
    { width: 14 },
    { width: 34 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
    { width: 18 },
    { width: 30 },
    { width: 14 }
  ];
};

const addExcelObservationSection = (worksheet, startRow, observationGroups) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, 'OBSERVATIONS', COLORS.SECTION, 9);
  row += 1;
  addTableHeader(worksheet, row, ['Element Name', '', '', '', 'Location of Distress', '', '', '', ''], COLORS.PRIMARY);
  worksheet.mergeCells(row, 1, row, 4);
  worksheet.mergeCells(row, 5, row, 9);
  row += 1;

  if (!observationGroups.size) {
    worksheet.getCell(row, 1).value = REPORT_PLACEHOLDER;
    worksheet.getCell(row, 5).value = REPORT_PLACEHOLDER;
    worksheet.mergeCells(row, 1, row, 4);
    worksheet.mergeCells(row, 5, row, 9);
    styleRowCells(worksheet, row, 1, 9);
    return row + 1;
  }

  observationGroups.forEach((buckets, location) => {
    addMergedSectionRow(worksheet, row, safeText(location).toUpperCase(), COLORS.LOCATION, 9, {
      horizontal: 'center'
    });
    row += 1;

    [
      [STRUCTURAL_SECTION, buckets.structural],
      [NON_STRUCTURAL_SECTION, buckets.nonStructural]
    ].forEach(([sectionLabel, items]) => {
      if (!items.length) return;
      addMergedSectionRow(worksheet, row, sectionLabel, COLORS.SUBSECTION, 9, { horizontal: 'center' });
      row += 1;

      items.forEach((item) => {
        worksheet.getCell(row, 1).value = safeText(item.component, REPORT_PLACEHOLDER);
        worksheet.getCell(row, 5).value = safeText(item.remarks, item.location || REPORT_PLACEHOLDER);
        worksheet.mergeCells(row, 1, row, 4);
        worksheet.mergeCells(row, 5, row, 9);
        styleRowCells(worksheet, row, 1, 9);
        row += 1;
      });
    });
  });

  return row;
};

const addExcelImageSection = (workbook, worksheet, startRow, title, rows) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, title, COLORS.SECTION, 9);
  row += 1;
  addTableHeader(worksheet, row, ['S. No', 'Caption', 'Location', 'Image', '', '', 'Source', '', ''], COLORS.PRIMARY);
  worksheet.mergeCells(row, 4, row, 6);
  worksheet.mergeCells(row, 7, row, 9);
  row += 1;

  if (!rows.length) {
    worksheet.getCell(row, 1).value = '';
    worksheet.getCell(row, 2).value = 'No images attached';
    styleRowCells(worksheet, row, 1, 9);
    return row + 1;
  }

  rows.forEach((entry, index) => {
    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = safeText(entry.caption);
    worksheet.getCell(row, 3).value = safeText(entry.location || entry.scopeLabel);
    worksheet.getCell(row, 7).value = safeText(entry.source);
    worksheet.mergeCells(row, 4, row, 6);
    worksheet.mergeCells(row, 7, row, 9);
    styleRowCells(worksheet, row, 1, 9);

    const extension = entry.asset ? EXCEL_IMAGE_EXTENSIONS[entry.asset.mimeType] : null;
    if (extension) {
      try {
        const imageId = workbook.addImage({ buffer: entry.asset.buffer, extension });
        worksheet.getRow(row).height = 90;
        worksheet.addImage(imageId, {
          tl: { col: 3.1, row: row - 1 + 0.1 },
          ext: { width: 160, height: 110 }
        });
      } catch (error) {
        worksheet.getCell(row, 4).value = 'Image could not be embedded';
      }
    } else {
      worksheet.getCell(row, 4).value = entry.asset ? 'Preview unsupported' : 'Image not available';
    }

    row += 1;
  });

  return row;
};

const addExcelTestSection = (worksheet, startRow, testGroups) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, 'TEST RESULTS', COLORS.SECTION, 9);
  row += 1;

  if (!testGroups.size) {
    addTableHeader(
      worksheet,
      row,
      ['S. No', 'Location', 'Component', 'Tested By', 'Date', 'Result', 'Remarks', 'Attachments', ''],
      COLORS.PRIMARY
    );
    row += 1;
    return writeRow(worksheet, row, ['', 'No test results recorded', '', '', '', '', '', '', '']);
  }

  let testIndex = 1;
  testGroups.forEach((testRows, testName) => {
    addMergedSectionRow(worksheet, row, `${testIndex}. ${testName}`, COLORS.SUBSECTION, 9);
    row += 1;
    addTableHeader(
      worksheet,
      row,
      ['S. No', 'Location', 'Component', 'Tested By', 'Date', 'Result', 'Remarks', 'Attachments', ''],
      COLORS.PRIMARY
    );
    worksheet.mergeCells(row, 8, row, 9);
    row += 1;

    testRows.forEach((item, index) => {
      worksheet.getCell(row, 1).value = index + 1;
      worksheet.getCell(row, 2).value = item.scopeLabel;
      worksheet.getCell(row, 3).value = [item.component_type, item.component_id].filter(Boolean).join(' / ');
      worksheet.getCell(row, 4).value = item.tested_by;
      worksheet.getCell(row, 5).value = item.test_date;
      worksheet.getCell(row, 6).value = item.result_summary;
      worksheet.getCell(row, 7).value = item.remarks;
      worksheet.getCell(row, 8).value = item.attachments.map((attachment) => attachment.name).join('\n');
      worksheet.mergeCells(row, 8, row, 9);
      styleRowCells(worksheet, row, 1, 9);
      row += 1;
    });

    testIndex += 1;
  });

  return row;
};

const addExcelAttachmentSection = (worksheet, startRow, fileAttachments) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, 'ANNEXURES', COLORS.SECTION, 9);
  row += 1;
  addTableHeader(worksheet, row, ['S. No', 'Location', 'Context', 'File', '', 'Source', '', '', ''], COLORS.PRIMARY);
  worksheet.mergeCells(row, 4, row, 5);
  worksheet.mergeCells(row, 6, row, 9);
  row += 1;

  if (!fileAttachments.length) {
    return writeRow(worksheet, row, ['', 'No additional documents attached', '', '', '', '', '', '', '']);
  }

  fileAttachments.forEach((file, index) => {
    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = file.location;
    worksheet.getCell(row, 3).value = file.context;
    worksheet.getCell(row, 4).value = { text: file.name, hyperlink: file.source, tooltip: 'Open annexure' };
    worksheet.getCell(row, 6).value = file.source;
    worksheet.mergeCells(row, 4, row, 5);
    worksheet.mergeCells(row, 6, row, 9);
    styleRowCells(worksheet, row, 1, 9);
    row += 1;
  });

  return row;
};

const QUANT_HEADERS = [
  'S. No',
  'Location of Distress',
  'Nos',
  'L (M)',
  'B (M)',
  'H (M)',
  'Length (Rm) / Area (Sqm) / Volume (Cum)',
  'Repair Methodology',
  'Unit'
];

const addExcelQuantificationSection = (worksheet, startRow, quantificationSections) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, 'QUANTIFICATION', COLORS.SECTION, 9);
  row += 1;

  if (!quantificationSections.length) {
    addTableHeader(worksheet, row, QUANT_HEADERS, COLORS.PRIMARY);
    row += 1;
    return writeRow(worksheet, row, ['', 'No quantification entries recorded', '', '', '', '', '', '', '']);
  }

  quantificationSections.forEach(([sectionLabel, groups]) => {
    addMergedSectionRow(worksheet, row, sectionLabel, COLORS.SECTION, 9, { horizontal: 'center' });
    row += 1;

    groups.forEach((items, groupName) => {
      addMergedSectionRow(worksheet, row, groupName, COLORS.HIGHLIGHT, 9, { horizontal: 'center' });
      row += 1;
      addTableHeader(worksheet, row, QUANT_HEADERS, COLORS.PRIMARY);
      row += 1;

      let groupTotal = 0;
      items.forEach((entry, index) => {
        groupTotal += toNumber(entry.quantity) ?? 0;
        row = writeRow(worksheet, row, [
          index + 1,
          entry.location_of_distress,
          entry.nos,
          entry.length ?? '',
          entry.breadth ?? '',
          entry.height ?? '',
          Number(formatApproxQuantity(entry.quantity) || 0),
          entry.repair_methodology,
          entry.unit
        ]);
      });

      row = writeRow(
        worksheet,
        row,
        ['', `Total - ${groupName}`, '', '', '', '', Number(formatApproxQuantity(groupTotal) || 0), '', ''],
        { font: { ...FONTS.BODY, bold: true }, fill: solidFill('FFF2F2F2') }
      );
    });
  });

  return row;
};

const addExcelSummarySection = (worksheet, startRow, title, summaryRows) => {
  let row = startRow;
  addMergedSectionRow(worksheet, row, title, COLORS.SECTION, 9);
  row += 1;
  addTableHeader(worksheet, row, ['S. No', 'Description', 'Quantity', 'Units', '', '', '', '', ''], COLORS.PRIMARY);
  worksheet.mergeCells(row, 4, row, 9);
  row += 1;

  if (!summaryRows.length) {
    return writeRow(worksheet, row, ['', 'No repair quantities recorded', '', '', '', '', '', '', '']);
  }

  summaryRows.forEach((entry, index) => {
    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = entry.description;
    worksheet.getCell(row, 3).value = entry.quantity;
    worksheet.getCell(row, 4).value = entry.units;
    worksheet.mergeCells(row, 4, row, 9);
    styleRowCells(worksheet, row, 1, 9);
    row += 1;
  });

  return row;
};

const addStructureHeader = (worksheet, prepared) => {
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = getClientName(prepared);
  worksheet.getCell('A1').font = FONTS.TITLE;
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  addMergedSectionRow(worksheet, 2, 'REPORT', COLORS.HIGHLIGHT, 9);

  let row = 4;

  // Label | Value | Label | Value across the 9 columns, matching the Word/PDF layout.
  const writeDetailPair = (left, right) => {
    worksheet.getCell(row, 1).value = left[0];
    worksheet.getCell(row, 2).value = safeText(left[1], REPORT_PLACEHOLDER);
    worksheet.mergeCells(row, 2, row, 4);
    if (right) {
      worksheet.getCell(row, 5).value = right[0];
      worksheet.getCell(row, 6).value = safeText(right[1], REPORT_PLACEHOLDER);
      worksheet.mergeCells(row, 6, row, 9);
    } else {
      worksheet.mergeCells(row, 5, row, 9);
    }
    styleRowCells(worksheet, row, 1, 9);
    worksheet.getCell(row, 1).font = { ...FONTS.BODY, bold: true };
    worksheet.getCell(row, 1).fill = solidFill('FFF7F7F7');
    if (right) {
      worksheet.getCell(row, 5).font = { ...FONTS.BODY, bold: true };
      worksheet.getCell(row, 5).fill = solidFill('FFF7F7F7');
    }
    row += 1;
  };

  prepared.detailSections.forEach((section) => {
    addMergedSectionRow(worksheet, row, section.title, COLORS.SECTION, 9, { horizontal: 'center' });
    row += 1;

    let pending = null;
    section.rows.forEach(([label, value, options]) => {
      if (options?.span) {
        if (pending) {
          writeDetailPair(pending, null);
          pending = null;
        }
        worksheet.getCell(row, 1).value = label;
        worksheet.getCell(row, 2).value = safeText(value, REPORT_PLACEHOLDER);
        worksheet.mergeCells(row, 2, row, 9);
        styleRowCells(worksheet, row, 1, 9);
        worksheet.getCell(row, 1).font = { ...FONTS.BODY, bold: true };
        worksheet.getCell(row, 1).fill = solidFill('FFF7F7F7');
        row += 1;
        return;
      }

      if (pending) {
        writeDetailPair(pending, [label, safeText(value)]);
        pending = null;
      } else {
        pending = [label, safeText(value)];
      }
    });

    if (pending) writeDetailPair(pending, null);
    row += 1;
  });

  return row;
};

const writeStructureWorksheet = (workbook, worksheet, prepared) => {
  ensureColumns(worksheet);

  let row = addStructureHeader(worksheet, prepared);
  row = addExcelObservationSection(worksheet, row, prepared.observationGroups) + 1;
  row = addExcelImageSection(workbook, worksheet, row, 'INSPECTION IMAGES', prepared.inspectionImages) + 1;
  row = addExcelAttachmentSection(worksheet, row, prepared.fileAttachments) + 1;
  row = addExcelQuantificationSection(worksheet, row, prepared.quantificationSections) + 1;
  row = addExcelSummarySection(worksheet, row, 'BILL OF QUANTITY SUMMARY - STRUCTURAL', prepared.summary.structural) + 1;
  row =
    addExcelSummarySection(worksheet, row, 'BILL OF QUANTITY SUMMARY - NON-STRUCTURAL', prepared.summary.nonStructural) +
    1;
  addExcelSummarySection(worksheet, row, 'BILL OF QUANTITY SUMMARY - TOTAL', prepared.summary.combined);

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

const sendWorkbook = async (res, workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const normalized = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  res.setHeader('Content-Type', EXCEL_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', String(normalized.length));
  res.send(normalized);
};

const buildExcelReport = (reqUser, preparedStructures, { withIndex = false } = {}) => {
  const workbook = createWorkbook(reqUser);

  let indexSheet = null;
  if (withIndex) {
    indexSheet = workbook.addWorksheet('Report Index');
    indexSheet.columns = [
      { header: 'S. No', key: 'serial', width: 8 },
      { header: 'Structure ID', key: 'structureId', width: 24 },
      { header: 'Owner', key: 'owner', width: 24 },
      { header: 'Location', key: 'location', width: 24 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Worksheet', key: 'worksheet', width: 24 }
    ];
    addTableHeader(indexSheet, 1, ['S. No', 'Structure ID', 'Owner', 'Location', 'Status', 'Worksheet'], COLORS.PRIMARY);
  }

  preparedStructures.forEach((prepared, index) => {
    const structureId = safeText(
      prepared.structure.structural_identity?.structural_identity_number,
      String(prepared.structure._id)
    );
    const sheetName = sanitizeWorksheetName(`${index + 1}_${structureId}`, `Structure_${index + 1}`);
    const worksheet = workbook.addWorksheet(sheetName);
    writeStructureWorksheet(workbook, worksheet, prepared);

    if (indexSheet) {
      indexSheet.addRow({
        serial: index + 1,
        structureId,
        owner: buildOwnerLabel(prepared.owner),
        location: [
          prepared.structure.location?.state_code,
          prepared.structure.location?.district_code,
          prepared.structure.location?.city_name
        ]
          .filter(Boolean)
          .join(' / '),
        status: safeText(prepared.structure.status, 'N/A'),
        worksheet: sheetName
      });
    }
  });

  return workbook;
};

// =================== ROUTES ===================

const sendReport = async ({ res, reqUser, structures, filterSummary, format, baseFileName, withIndex }) => {
  const preparedStructures = await prepareStructureReports(structures, filterSummary);
  const stamp = `${new Date().toISOString().slice(0, 10)}_${Date.now()}`;

  if (isPdfFormat(format)) {
    return sendPdfReport(res, preparedStructures, `${baseFileName}_${stamp}.pdf`);
  }

  if (isWordFormat(format)) {
    return sendWordDocument(res, preparedStructures, `${baseFileName}_${stamp}.doc`);
  }

  const workbook = buildExcelReport(reqUser, preparedStructures, { withIndex });
  return sendWorkbook(res, workbook, `${baseFileName}_${stamp}.xlsx`);
};

const handleExportError = (res, error, message) => {
  console.error(`${message}:`, error);
  if (res.headersSent) {
    return res.end();
  }
  return res.status(error.statusCode || 500).json({
    success: false,
    message,
    error: error.expose || process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
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

    return await sendReport({
      res,
      reqUser: req.user,
      structures,
      filterSummary: buildFilterSummary(req.query),
      format: safeText(req.query.format || req.query.export_format || 'excel').toLowerCase(),
      baseFileName: 'SAMS_Report',
      withIndex: true
    });
  } catch (error) {
    return handleExportError(res, error, 'Failed to generate report export');
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

    return await sendReport({
      res,
      reqUser: req.user,
      structures,
      filterSummary: 'Complete export',
      format: safeText(req.query.format || req.query.export_format || 'excel').toLowerCase(),
      baseFileName: 'SAMS_Complete_Report',
      withIndex: false
    });
  } catch (error) {
    return handleExportError(res, error, 'Failed to generate complete report export');
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
        word_export_supported: true,
        browser_pdf_renderer_available: Boolean(resolveBrowserExecutablePath())
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

    const structureId = safeText(
      structures[0].structure.structural_identity?.structural_identity_number,
      String(structures[0].structure._id)
    );

    return await sendReport({
      res,
      reqUser: req.user,
      structures: [structures[0]],
      filterSummary: buildFilterSummary(req.query),
      format: safeText(req.query.format || req.query.export_format || 'excel').toLowerCase(),
      baseFileName: `SAMS_Structure_Report_${structureId.replace(/[^A-Za-z0-9_-]+/g, '_')}`,
      withIndex: false
    });
  } catch (error) {
    return handleExportError(res, error, 'Failed to generate structure report export');
  }
});

module.exports = router;