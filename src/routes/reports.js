const express = require('express');
const ExcelJS = require('exceljs');
const { User } = require('../models/schemas'); // Adjust path to your schemas
const { authenticateToken, authorizeRole } = require('../middlewares/auth'); // Use your existing auth
const router = express.Router();
const mongoose = require('mongoose');

// =================== EXCEL STYLING CONSTANTS ===================

const COLORS = {
  PRIMARY: 'FF2E86AB',      // Professional blue
  SECONDARY: 'FF1B998B',    // Teal accent
  SUCCESS: 'FF52B788',      // Green
  WARNING: 'FFFBB13C',      // Yellow
  DANGER: 'FFFF6B6B',       // Red
  LIGHT_GRAY: 'FFF8F9FA',   // Light background
  DARK_GRAY: 'FF495057',    // Dark text
  WHITE: 'FFFFFFFF'
};

const FONTS = {
  HEADER: { name: 'Segoe UI', size: 12, bold: true },
  SUBHEADER: { name: 'Segoe UI', size: 11, bold: true },
  BODY: { name: 'Segoe UI', size: 10 },
  SMALL: { name: 'Segoe UI', size: 9 }
};

// =================== UTILITY FUNCTIONS ===================

const createHeaderStyle = (color = COLORS.PRIMARY) => ({
  font: { ...FONTS.HEADER, color: { argb: COLORS.WHITE } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color } },
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  border: {
    top: { style: 'medium' },
    left: { style: 'medium' },
    bottom: { style: 'medium' },
    right: { style: 'medium' }
  }
});

const createSubHeaderStyle = (color = COLORS.SECONDARY) => ({
  font: { ...FONTS.SUBHEADER, color: { argb: COLORS.WHITE } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color } },
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  }
});

const createDataCellStyle = (isAlternate = false) => ({
  font: FONTS.BODY,
  fill: isAlternate ? 
    { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_GRAY } } : 
    undefined,
  alignment: { vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
  }
});

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': case 'good': case 'completed': return COLORS.SUCCESS;
    case 'pending': case 'in progress': case 'moderate': return COLORS.WARNING;
    case 'inactive': case 'poor': case 'critical': return COLORS.DANGER;
    default: return COLORS.DARK_GRAY;
  }
};

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': case 'urgent': return COLORS.DANGER;
    case 'medium': case 'moderate': return COLORS.WARNING;
    case 'low': return COLORS.SUCCESS;
    default: return COLORS.DARK_GRAY;
  }
};

// =================== MIDDLEWARE FOR REPORTS ===================

const checkExportPermissions = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = req.user;
    const hasPermission = user.role === 'admin' || 
                         user.role === 'supervisor' ||
                         (user.permissions && user.permissions.can_export_reports);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to export reports'
      });
    }

    console.log('✅ Export permission granted for user:', user.email);
    next();
  } catch (error) {
    console.error('Export permission check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Permission check failed'
    });
  }
};

// =================== ENHANCED REPORT ENDPOINTS ===================

/**
 * @route GET /api/reports/structures/download
 * @desc Download enhanced structure details report in Excel format
 * @access Private (Authenticated users with export permissions)
 */
router.get('/structures/download', 
  authenticateToken,
  checkExportPermissions,
  async (req, res) => {
  try {
    console.log('📊 Enhanced structure report export requested by:', req.user.email);

    // =================== QUERY PARAMETERS EXTRACTION ===================
    const {
      user_id,
      structure_ids,
      state_code,
      district_code,
      city_name,
      type_of_structure,
      status,
      health_status,
      priority,
      date_from,
      date_to,
      include_photos = false,
      format = 'detailed'
    } = req.query;

    // =================== BUILD QUERY FILTERS ===================
    let userQuery = { is_active: true };
    let structureFilters = {};

    if (user_id) userQuery._id = user_id;
    if (req.user.role !== 'admin') userQuery._id = req.user.userId;

    if (structure_ids) {
      const ids = structure_ids.split(',').map(id => id.trim());
      structureFilters['structures._id'] = { $in: ids };
    }

    if (state_code) structureFilters['structures.structural_identity.state_code'] = state_code.toUpperCase();
    if (district_code) structureFilters['structures.structural_identity.district_code'] = district_code;
    if (city_name) structureFilters['structures.structural_identity.city_name'] = new RegExp(city_name, 'i');
    if (type_of_structure) structureFilters['structures.structural_identity.type_of_structure'] = type_of_structure;
    if (status) structureFilters['structures.status'] = status;
    if (health_status) structureFilters['structures.overall_structural_rating.health_status'] = health_status;
    if (priority) structureFilters['structures.overall_structural_rating.priority'] = priority;

    if (date_from || date_to) {
      const dateFilter = {};
      if (date_from) dateFilter.$gte = new Date(date_from);
      if (date_to) dateFilter.$lte = new Date(date_to);
      structureFilters['structures.creation_info.created_date'] = dateFilter;
    }

    // =================== DATABASE QUERY ===================
    const aggregationPipeline = [
      { $match: userQuery },
      { $unwind: '$structures' },
      { $match: structureFilters },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user_info'
        }
      },
      {
        $project: {
          user_info: { $arrayElemAt: ['$user_info', 0] },
          structure: '$structures'
        }
      }
    ];

    const results = await User.aggregate(aggregationPipeline);

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No structures found matching the criteria'
      });
    }

    console.log('📊 Found', results.length, 'structures for export');

    // =================== EXCEL WORKBOOK CREATION ===================
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = req.user.username || req.user.email;
    workbook.lastModifiedBy = req.user.username || req.user.email;
    workbook.created = new Date();
    workbook.modified = new Date();

    // =================== ENHANCED SUMMARY SHEET ===================
    const summarySheet = workbook.addWorksheet('📊 Structure Summary', {
      properties: { tabColor: { argb: COLORS.PRIMARY } }
    });

    // Create grouped columns for better organization
    const columnGroups = [
      {
        title: 'STRUCTURE IDENTIFICATION',
        color: COLORS.PRIMARY,
        columns: [
          { header: 'S.No', key: 'serial', width: 8 },
          { header: 'Structure ID', key: 'structure_id', width: 18 },
          { header: 'UID', key: 'uid', width: 16 },
          { header: 'Type', key: 'type', width: 14 }
        ]
      },
      {
        title: 'LOCATION DETAILS',
        color: COLORS.SECONDARY,
        columns: [
          { header: 'State', key: 'state', width: 12 },
          { header: 'District', key: 'district', width: 12 },
          { header: 'City', key: 'city', width: 15 },
          { header: 'Location Code', key: 'location', width: 12 }
        ]
      },
      {
        title: 'STRUCTURE METRICS',
        color: COLORS.SUCCESS,
        columns: [
          { header: 'Total Floors', key: 'floors', width: 10 },
          { header: 'Total Units', key: 'flats', width: 10 },
          { header: 'Status', key: 'status', width: 12 }
        ]
      },
      {
        title: 'HEALTH ASSESSMENT',
        color: COLORS.WARNING,
        columns: [
          { header: 'Health Status', key: 'health_status', width: 14 },
          { header: 'Priority Level', key: 'priority', width: 12 },
          { header: 'Overall Score', key: 'overall_score', width: 12 }
        ]
      },
      {
        title: 'RATINGS',
        color: COLORS.DANGER,
        columns: [
          { header: 'Structural Rating', key: 'structural_rating', width: 15 },
          { header: 'Non-Structural Rating', key: 'non_structural_rating', width: 18 }
        ]
      },
      {
        title: 'TIMELINE',
        color: COLORS.DARK_GRAY,
        columns: [
          { header: 'Created Date', key: 'created_date', width: 15 },
          { header: 'Last Updated', key: 'updated_date', width: 15 }
        ]
      }
    ];

    // Create header rows
    let currentCol = 1;
    
    // Group headers (row 1)
    columnGroups.forEach(group => {
      const startCol = currentCol;
      const endCol = currentCol + group.columns.length - 1;
      summarySheet.mergeCells(1, startCol, 1, endCol);
      
      const groupCell = summarySheet.getCell(1, startCol);
      groupCell.value = group.title;
      Object.assign(groupCell, createHeaderStyle(group.color));
      groupCell.font = { ...FONTS.HEADER, size: 11 };
      
      currentCol += group.columns.length;
    });

    // Column headers (row 2)
    currentCol = 1;
    columnGroups.forEach(group => {
      group.columns.forEach(col => {
        const headerCell = summarySheet.getCell(2, currentCol);
        headerCell.value = col.header;
        Object.assign(headerCell, createSubHeaderStyle());
        summarySheet.getColumn(currentCol).width = col.width;
        summarySheet.getColumn(currentCol).key = col.key;
        currentCol++;
      });
    });

    // Set row heights
    summarySheet.getRow(1).height = 25;
    summarySheet.getRow(2).height = 20;

    // Add data with enhanced styling
    results.forEach((result, index) => {
      const structure = result.structure;
      const totalFlats = structure.geometric_details?.floors?.reduce((total, floor) => 
        total + (floor.flats?.length || 0), 0) || 0;

      const rowNum = index + 3; // Start from row 3
      const isAlternate = index % 2 === 1;

      const rowData = {
        serial: index + 1,
        structure_id: structure.structural_identity?.structural_identity_number || 'N/A',
        uid: structure.structural_identity?.uid || 'N/A',
        type: structure.structural_identity?.type_of_structure || 'N/A',
        state: structure.structural_identity?.state_code || 'N/A',
        district: structure.structural_identity?.district_code || 'N/A',
        city: structure.structural_identity?.city_name || 'N/A',
        location: structure.structural_identity?.location_code || 'N/A',
        floors: structure.geometric_details?.number_of_floors || 0,
        flats: totalFlats,
        status: structure.status || 'N/A',
        health_status: structure.overall_structural_rating?.health_status || 'N/A',
        priority: structure.overall_structural_rating?.priority || 'N/A',
        overall_score: structure.final_health_assessment?.overall_score || 'N/A',
        structural_rating: structure.overall_structural_rating?.overall_average || 'N/A',
        non_structural_rating: structure.overall_non_structural_rating?.overall_average || 'N/A',
        created_date: structure.creation_info?.created_date ? 
          new Date(structure.creation_info.created_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
          }) : 'N/A',
        updated_date: structure.creation_info?.last_updated_date ? 
          new Date(structure.creation_info.last_updated_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
          }) : 'N/A'
      };

      summarySheet.addRow(rowData);
      
      // Apply row styling
      const row = summarySheet.getRow(rowNum);
      row.height = 18;
      
      row.eachCell((cell, colNumber) => {
        Object.assign(cell, createDataCellStyle(isAlternate));
        
        // Special styling for status columns
        if (cell.value === rowData.status) {
          cell.font = { ...FONTS.BODY, bold: true, color: { argb: getStatusColor(rowData.status) } };
        }
        if (cell.value === rowData.priority) {
          cell.font = { ...FONTS.BODY, bold: true, color: { argb: getPriorityColor(rowData.priority) } };
        }
        if (cell.value === rowData.health_status) {
          cell.font = { ...FONTS.BODY, bold: true, color: { argb: getStatusColor(rowData.health_status) } };
        }
        
        // Numeric cell alignment
        if (typeof cell.value === 'number') {
          cell.alignment = { ...cell.alignment, horizontal: 'center' };
        }
      });
    });

    // Add summary statistics at the bottom
    const statsRow = results.length + 4;
    summarySheet.mergeCells(statsRow, 1, statsRow, 4);
    const statsCell = summarySheet.getCell(statsRow, 1);
    statsCell.value = `📈 SUMMARY: Total Structures: ${results.length} | Generated: ${new Date().toLocaleString()}`;
    Object.assign(statsCell, {
      font: { ...FONTS.BODY, bold: true, color: { argb: COLORS.DARK_GRAY } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } },
      alignment: { vertical: 'middle', horizontal: 'left' }
    });

    // =================== DETAILED STRUCTURE SHEET ===================
    if (format === 'detailed') {
      const detailSheet = workbook.addWorksheet('🏗️ Detailed Analysis', {
        properties: { tabColor: { argb: COLORS.SECONDARY } }
      });

      // Detailed column structure
      detailSheet.columns = [
        // Structure Info
        { header: 'Structure ID', key: 'structure_id', width: 18 },
        { header: 'Floor No.', key: 'floor_no', width: 10 },
        { header: 'Unit No.', key: 'flat_no', width: 12 },
        { header: 'Unit Type', key: 'flat_type', width: 12 },
        { header: 'Area (m²)', key: 'flat_area', width: 12 },
        { header: 'Occupancy', key: 'occupancy', width: 12 },
        
        // Structural Components
        { header: 'Beams', key: 'beams', width: 10 },
        { header: 'Columns', key: 'columns', width: 10 },
        { header: 'Slab', key: 'slab', width: 10 },
        { header: 'Foundation', key: 'foundation', width: 12 },
        
        // Non-Structural Components
        { header: 'Electrical', key: 'wiring', width: 10 },
        { header: 'Flooring', key: 'tiles', width: 10 },
        { header: 'Sanitary', key: 'sanitary', width: 10 },
        { header: 'Doors/Windows', key: 'doors', width: 12 },
        { header: 'Sewage', key: 'sewage', width: 10 },
        { header: 'Panel Board', key: 'panel', width: 12 },
        { header: 'Water Tank', key: 'tank', width: 12 },
        { header: 'Elevators', key: 'lift', width: 10 },
        
        // Overall Assessment
        { header: 'Health Status', key: 'health', width: 14 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Score', key: 'score', width: 10 }
      ];

      // Style detailed sheet headers
      detailSheet.getRow(1).font = { ...FONTS.HEADER, color: { argb: COLORS.WHITE } };
      detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SECONDARY } };
      detailSheet.getRow(1).height = 22;

      // Add detailed data
      let detailRowIndex = 2;
      results.forEach((result) => {
        const structure = result.structure;
        const floors = structure.geometric_details?.floors || [];

        floors.forEach(floor => {
          const flats = floor.flats || [];
          flats.forEach(flat => {
            const rowData = {
              structure_id: structure.structural_identity?.structural_identity_number,
              floor_no: floor.floor_number,
              flat_no: flat.flat_number,
              flat_type: flat.flat_type,
              flat_area: flat.area_sq_mts,
              occupancy: flat.occupancy_status,
              beams: flat.structural_rating?.beams?.rating,
              columns: flat.structural_rating?.columns?.rating,
              slab: flat.structural_rating?.slab?.rating,
              foundation: flat.structural_rating?.foundation?.rating,
              wiring: flat.non_structural_rating?.electrical_wiring?.rating,
              tiles: flat.non_structural_rating?.flooring_tiles?.rating,
              sanitary: flat.non_structural_rating?.sanitary_fittings?.rating,
              doors: flat.non_structural_rating?.doors_windows?.rating,
              sewage: flat.non_structural_rating?.sewage_system?.rating,
              panel: flat.non_structural_rating?.panel_board?.rating,
              tank: flat.non_structural_rating?.water_tanks?.rating,
              lift: flat.non_structural_rating?.lifts?.rating,
              health: flat.flat_overall_rating?.health_status,
              priority: flat.flat_overall_rating?.priority,
              score: flat.flat_overall_rating?.combined_score
            };

            detailSheet.addRow(rowData);
            
            // Apply styling
            const row = detailSheet.getRow(detailRowIndex);
            const isAlternate = detailRowIndex % 2 === 0;
            
            row.eachCell((cell) => {
              Object.assign(cell, createDataCellStyle(isAlternate));
              
              // Rating-based coloring
              if (typeof cell.value === 'number' && cell.value >= 1 && cell.value <= 5) {
                if (cell.value <= 2) cell.font = { ...FONTS.BODY, color: { argb: COLORS.DANGER } };
                else if (cell.value <= 3) cell.font = { ...FONTS.BODY, color: { argb: COLORS.WARNING } };
                else cell.font = { ...FONTS.BODY, color: { argb: COLORS.SUCCESS } };
              }
            });
            
            detailRowIndex++;
          });
        });
      });
    }

    // =================== FINALIZE AND SEND ===================
    const fileName = `SAMS_Enhanced_Report_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    await workbook.xlsx.write(res);
    
    console.log(`📊 Enhanced structure report exported by user ${req.user.email} - ${results.length} structures`);
    res.end();

  } catch (error) {
    console.error('💥 Enhanced structure report export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate enhanced structure report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// =================== COMPLETE DOWNLOAD WITH ENHANCED STYLING ===================
router.get('/structures/complete-download',
  authenticateToken,
  checkExportPermissions,
  async (req, res) => {
    try {
      const results = await User.aggregate([
        { $match: { _id: req.user.userId, is_active: true } },
        { $unwind: '$structures' },
        {
          $project: {
            structure: '$structures',
            user_email: '$email',
            username: '$username'
          }
        }
      ]);

      if (!results || results.length === 0) {
        return res.status(404).json({ success: false, message: 'No structures found' });
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('🏢 Complete Structure Report', {
        properties: { tabColor: { argb: COLORS.PRIMARY } }
      });

      // Enhanced column structure with better organization
      const columnConfig = [
        // Structure Identity Group
        { header: 'Structure ID', key: 'structure_id', width: 20, group: 'identity' },
        { header: 'UID', key: 'uid', width: 16, group: 'identity' },
        { header: 'Type', key: 'type', width: 14, group: 'identity' },
        { header: 'Status', key: 'status', width: 12, group: 'identity' },
        
        // Location Group
        { header: 'State', key: 'state_code', width: 10, group: 'location' },
        { header: 'District', key: 'district_code', width: 12, group: 'location' },
        { header: 'City', key: 'city_name', width: 15, group: 'location' },
        { header: 'Location', key: 'location_code', width: 12, group: 'location' },
        
        // Administration Group
        { header: 'Client', key: 'client_name', width: 20, group: 'admin' },
        { header: 'Custodian', key: 'custodian', width: 18, group: 'admin' },
        { header: 'Engineer', key: 'engineer', width: 18, group: 'admin' },
        { header: 'Email', key: 'email', width: 25, group: 'admin' },
        
        // Geometry Group
        { header: 'Floors', key: 'total_floors', width: 8, group: 'geometry' },
        { header: 'Width (m)', key: 'width', width: 10, group: 'geometry' },
        { header: 'Length (m)', key: 'length', width: 10, group: 'geometry' },
        { header: 'Height (m)', key: 'height', width: 10, group: 'geometry' },
        
        // Unit Details Group
        { header: 'Floor#', key: 'floor_number', width: 8, group: 'unit' },
        { header: 'Floor Name', key: 'floor_label_name', width: 12, group: 'unit' },
        { header: 'Floor Height', key: 'floor_height', width: 10, group: 'unit' },
        { header: 'Floor Area', key: 'floor_area', width: 10, group: 'unit' },
        { header: 'Unit#', key: 'flat_number', width: 10, group: 'unit' },
        { header: 'Unit Type', key: 'flat_type', width: 12, group: 'unit' },
        { header: 'Unit Area', key: 'flat_area', width: 10, group: 'unit' },
        { header: 'Facing', key: 'facing', width: 10, group: 'unit' },
        { header: 'Occupancy', key: 'occupancy', width: 12, group: 'unit' },
        
        // Structural Assessment Group
        { header: 'Beams', key: 'beams', width: 8, group: 'structural' },
        { header: 'Columns', key: 'columns', width: 8, group: 'structural' },
        { header: 'Slab', key: 'slab', width: 8, group: 'structural' },
        { header: 'Foundation', key: 'foundation', width: 10, group: 'structural' },
        
        // Non-Structural Assessment Group
        { header: 'Electrical', key: 'wiring', width: 10, group: 'non_structural' },
        { header: 'Flooring', key: 'tiles', width: 10, group: 'non_structural' },
        { header: 'Sanitary', key: 'sanitary', width: 10, group: 'non_structural' },
        { header: 'Doors/Win', key: 'doors', width: 10, group: 'non_structural' },
        { header: 'Sewage', key: 'sewage', width: 8, group: 'non_structural' },
        { header: 'Panel', key: 'panel', width: 10, group: 'non_structural' },
        { header: 'Water Tank', key: 'tank', width: 10, group: 'non_structural' },
        { header: 'Elevator', key: 'lift', width: 10, group: 'non_structural' },
        
        // Overall Assessment Group
        { header: 'Health Status', key: 'health_status', width: 14, group: 'assessment' },
        { header: 'Priority', key: 'priority', width: 10, group: 'assessment' },
        { header: 'Combined Score', key: 'combined_score', width: 12, group: 'assessment' }
      ];

      sheet.columns = columnConfig;

      // Apply enhanced header styling
      const headerRow = sheet.getRow(1);
      headerRow.height = 25;
      
      columnConfig.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        let groupColor;
        
        switch (col.group) {
          case 'identity': groupColor = COLORS.PRIMARY; break;
          case 'location': groupColor = COLORS.SECONDARY; break;
          case 'admin': groupColor = COLORS.SUCCESS; break;
          case 'geometry': groupColor = COLORS.WARNING; break;
          case 'unit': groupColor = '#FF8B5A'; break;
          case 'structural': groupColor = COLORS.DANGER; break;
          case 'non_structural': groupColor = '#FF6B9D'; break;
          case 'assessment': groupColor = COLORS.DARK_GRAY; break;
          default: groupColor = COLORS.PRIMARY;
        }
        
        Object.assign(cell, createHeaderStyle(groupColor));
      });

      // Add data with enhanced formatting
      let rowIndex = 2;
      results.forEach(({ structure }) => {
        const floors = structure?.geometric_details?.floors || [];

        if (floors.length === 0) {
          sheet.addRow({
            structure_id: structure.structural_identity?.structural_identity_number,
            uid: structure.structural_identity?.uid,
            type: structure.structural_identity?.type_of_structure,
            status: structure.status
          });
          return;
        }

        floors.forEach(floor => {
          const flats = floor.flats || [];

          flats.forEach(flat => {
            const rowData = {
              structure_id: structure.structural_identity?.structural_identity_number,
              uid: structure.structural_identity?.uid,
              type: structure.structural_identity?.type_of_structure,
              status: structure.status,
              state_code: structure.structural_identity?.state_code,
              district_code: structure.structural_identity?.district_code,
              city_name: structure.structural_identity?.city_name,
              location_code: structure.structural_identity?.location_code,
              client_name: structure.administration?.client_name,
              custodian: structure.administration?.custodian,
              engineer: structure.administration?.engineer_designation,
              email: structure.administration?.email_id,
              total_floors: structure.geometric_details?.number_of_floors,
              width: structure.geometric_details?.structure_width,
              length: structure.geometric_details?.structure_length,
              height: structure.geometric_details?.structure_height,
              floor_number: floor.floor_number,
              floor_label_name: floor.floor_label_name,
              floor_height: floor.floor_height,
              floor_area: floor.total_area_sq_mts,
              flat_number: flat.flat_number,
              flat_type: flat.flat_type,
              flat_area: flat.area_sq_mts,
              facing: flat.direction_facing,
              occupancy: flat.occupancy_status,
              beams: flat.structural_rating?.beams?.rating,
              columns: flat.structural_rating?.columns?.rating,
              slab: flat.structural_rating?.slab?.rating,
              foundation: flat.structural_rating?.foundation?.rating,
              wiring: flat.non_structural_rating?.electrical_wiring?.rating,
              tiles: flat.non_structural_rating?.flooring_tiles?.rating,
              sanitary: flat.non_structural_rating?.sanitary_fittings?.rating,
              doors: flat.non_structural_rating?.doors_windows?.rating,
              sewage: flat.non_structural_rating?.sewage_system?.rating,
              panel: flat.non_structural_rating?.panel_board?.rating,
              tank: flat.non_structural_rating?.water_tanks?.rating,
              lift: flat.non_structural_rating?.lifts?.rating,
              health_status: flat.flat_overall_rating?.health_status,
              priority: flat.flat_overall_rating?.priority,
              combined_score: flat.flat_overall_rating?.combined_score
            };

            sheet.addRow(rowData);
            
            // Apply enhanced row styling
            const row = sheet.getRow(rowIndex);
            row.height = 18;
            const isAlternate = rowIndex % 2 === 0;
            
            row.eachCell((cell, colNumber) => {
              Object.assign(cell, createDataCellStyle(isAlternate));
              
              // Apply conditional formatting based on data type and value
              const columnKey = columnConfig[colNumber - 1]?.key;
              
              // Rating-based color coding for structural and non-structural ratings
              if (['beams', 'columns', 'slab', 'foundation', 'wiring', 'tiles', 'sanitary', 'doors', 'sewage', 'panel', 'tank', 'lift'].includes(columnKey)) {
                if (typeof cell.value === 'number') {
                  if (cell.value <= 2) {
                    cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.DANGER } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6E6' } };
                  } else if (cell.value <= 3) {
                    cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.WARNING } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E6' } };
                  } else {
                    cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.SUCCESS } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
                  }
                  cell.alignment = { ...cell.alignment, horizontal: 'center' };
                }
              }
              
              // Status-based color coding
              if (columnKey === 'status') {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: getStatusColor(cell.value) } };
              }
              
              if (columnKey === 'priority') {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: getPriorityColor(cell.value) } };
              }
              
              if (columnKey === 'health_status') {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: getStatusColor(cell.value) } };
              }
              
              // Numeric values center alignment
              if (typeof cell.value === 'number') {
                cell.alignment = { ...cell.alignment, horizontal: 'center' };
              }
              
              // Long text values
              if (typeof cell.value === 'string' && cell.value.length > 20) {
                cell.alignment = { ...cell.alignment, wrapText: true };
              }
            });
            
            rowIndex++;
          });
        });
      });

      // Add freeze panes for better navigation
      sheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }];

      // Add auto-filter
      sheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(65 + columnConfig.length - 1)}1`
      };

      const fileName = `SAMS_Complete_Enhanced_Report_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      await workbook.xlsx.write(res);
      res.end();

    } catch (err) {
      console.error('❌ Enhanced complete report generation failed:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// =================== SINGLE STRUCTURE ENHANCED REPORT ===================
router.get('/structures/:id/download',
  authenticateToken,
  checkExportPermissions,
  async (req, res) => {
    try {
      const { id } = req.params;

      const matchStage = mongoose.Types.ObjectId.isValid(id)
        ? { 'structures._id': new mongoose.Types.ObjectId(id) }
        : { 'structures.structural_identity.structural_identity_number': id };

      const results = await User.aggregate([
        { $match: { is_active: true, ...(req.user.role !== 'admin' && { _id: req.user.userId }) } },
        { $unwind: '$structures' },
        { $match: matchStage },
        { $project: { structure: '$structures' } }
      ]);

      if (!results || results.length === 0) {
        return res.status(404).json({ success: false, message: 'Structure not found' });
      }

      const structure = results[0].structure;
      const workbook = new ExcelJS.Workbook();
      
      // =================== STRUCTURE OVERVIEW SHEET ===================
      const overviewSheet = workbook.addWorksheet('📋 Structure Overview', {
        properties: { tabColor: { argb: COLORS.PRIMARY } }
      });

      // Create overview with key-value pairs
      const overviewData = [
        ['STRUCTURE IDENTIFICATION', ''],
        ['Structure ID', structure.structural_identity?.structural_identity_number || 'N/A'],
        ['UID', structure.structural_identity?.uid || 'N/A'],
        ['Type', structure.structural_identity?.type_of_structure || 'N/A'],
        ['Status', structure.status || 'N/A'],
        ['', ''],
        ['LOCATION DETAILS', ''],
        ['State', structure.structural_identity?.state_code || 'N/A'],
        ['District', structure.structural_identity?.district_code || 'N/A'],
        ['City', structure.structural_identity?.city_name || 'N/A'],
        ['Location Code', structure.structural_identity?.location_code || 'N/A'],
        ['', ''],
        ['ADMINISTRATION', ''],
        ['Client Name', structure.administration?.client_name || 'N/A'],
        ['Custodian', structure.administration?.custodian || 'N/A'],
        ['Engineer', structure.administration?.engineer_designation || 'N/A'],
        ['Email', structure.administration?.email_id || 'N/A'],
        ['', ''],
        ['GEOMETRY', ''],
        ['Total Floors', structure.geometric_details?.number_of_floors || 'N/A'],
        ['Structure Width (m)', structure.geometric_details?.structure_width || 'N/A'],
        ['Structure Length (m)', structure.geometric_details?.structure_length || 'N/A'],
        ['Structure Height (m)', structure.geometric_details?.structure_height || 'N/A']
      ];

      overviewData.forEach((row, index) => {
        const excelRow = overviewSheet.addRow(row);
        
        if (row[1] === '') { // Section headers
          excelRow.getCell(1).font = { ...FONTS.HEADER, color: { argb: COLORS.WHITE } };
          excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PRIMARY } };
          excelRow.height = 25;
          overviewSheet.mergeCells(index + 1, 1, index + 1, 2);
        } else if (row[0] !== '' && row[1] !== '') { // Data rows
          excelRow.getCell(1).font = { ...FONTS.BODY, bold: true };
          excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_GRAY } };
          excelRow.getCell(2).font = FONTS.BODY;
        }
        
        excelRow.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      overviewSheet.getColumn(1).width = 25;
      overviewSheet.getColumn(2).width = 30;

      // =================== DETAILED ASSESSMENT SHEET ===================
      const detailSheet = workbook.addWorksheet('🔍 Detailed Assessment', {
        properties: { tabColor: { argb: COLORS.SECONDARY } }
      });

      // Enhanced column structure with better grouping
      const detailColumns = [
        // Location Info
        { header: 'Floor#', key: 'floor_no', width: 8 },
        { header: 'Unit#', key: 'flat_no', width: 10 },
        { header: 'Unit Type', key: 'flat_type', width: 12 },
        { header: 'Area (m²)', key: 'flat_area', width: 10 },
        { header: 'Facing', key: 'facing', width: 10 },
        { header: 'Occupancy', key: 'occupancy', width: 12 },
        
        // Structural Components (with visual indicators)
        { header: '🏗️ Beams', key: 'beams', width: 10 },
        { header: '🏗️ Columns', key: 'columns', width: 10 },
        { header: '🏗️ Slab', key: 'slab', width: 10 },
        { header: '🏗️ Foundation', key: 'foundation', width: 12 },
        
        // Non-Structural Components (with visual indicators)
        { header: '⚡ Electrical', key: 'wiring', width: 10 },
        { header: '🏠 Flooring', key: 'tiles', width: 10 },
        { header: '🚿 Sanitary', key: 'sanitary', width: 10 },
        { header: '🚪 Doors/Win', key: 'doors', width: 12 },
        { header: '🌊 Sewage', key: 'sewage', width: 10 },
        { header: '⚡ Panel', key: 'panel', width: 10 },
        { header: '💧 Tank', key: 'tank', width: 10 },
        { header: '🛗 Elevator', key: 'lift', width: 10 },
        
        // Overall Assessment
        { header: '📊 Health', key: 'health', width: 12 },
        { header: '⚠️ Priority', key: 'priority', width: 10 },
        { header: '🎯 Score', key: 'score', width: 10 }
      ];

      detailSheet.columns = detailColumns;

      // Apply multi-color header styling
      const detailHeaderRow = detailSheet.getRow(1);
      detailHeaderRow.height = 28;
      
      detailColumns.forEach((col, index) => {
        const cell = detailHeaderRow.getCell(index + 1);
        let headerColor;
        
        if (index < 6) headerColor = COLORS.PRIMARY; // Basic info
        else if (index < 10) headerColor = COLORS.DANGER; // Structural
        else if (index < 18) headerColor = COLORS.WARNING; // Non-structural
        else headerColor = COLORS.SUCCESS; // Assessment
        
        Object.assign(cell, createHeaderStyle(headerColor));
      });

      const floors = structure.geometric_details?.floors || [];
      let detailRowIndex = 2;

      for (const floor of floors) {
        const flats = floor.flats || [];
        for (const flat of flats) {
          const rowData = {
            floor_no: floor.floor_number,
            flat_no: flat.flat_number,
            flat_type: flat.flat_type,
            flat_area: flat.area_sq_mts,
            facing: flat.direction_facing,
            occupancy: flat.occupancy_status,
            beams: flat.structural_rating?.beams?.rating,
            columns: flat.structural_rating?.columns?.rating,
            slab: flat.structural_rating?.slab?.rating,
            foundation: flat.structural_rating?.foundation?.rating,
            wiring: flat.non_structural_rating?.electrical_wiring?.rating,
            tiles: flat.non_structural_rating?.flooring_tiles?.rating,
            sanitary: flat.non_structural_rating?.sanitary_fittings?.rating,
            doors: flat.non_structural_rating?.doors_windows?.rating,
            sewage: flat.non_structural_rating?.sewage_system?.rating,
            panel: flat.non_structural_rating?.panel_board?.rating,
            tank: flat.non_structural_rating?.water_tanks?.rating,
            lift: flat.non_structural_rating?.lifts?.rating,
            health: flat.flat_overall_rating?.health_status,
            priority: flat.flat_overall_rating?.priority,
            score: flat.flat_overall_rating?.combined_score
          };

          detailSheet.addRow(rowData);
          
          // Enhanced row styling with conditional formatting
          const row = detailSheet.getRow(detailRowIndex);
          row.height = 20;
          const isAlternate = detailRowIndex % 2 === 0;
          
          row.eachCell((cell, colNumber) => {
            Object.assign(cell, createDataCellStyle(isAlternate));
            
            // Rating-based conditional formatting with progress bar effect
            if (typeof cell.value === 'number' && cell.value >= 1 && cell.value <= 5) {
              const percentage = (cell.value / 5) * 100;
              
              if (cell.value <= 2) {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.WHITE } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DANGER } };
              } else if (cell.value <= 3) {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.DARK_GRAY } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.WARNING } };
              } else {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.WHITE } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SUCCESS } };
              }
              
              cell.alignment = { ...cell.alignment, horizontal: 'center' };
            }
            
            // Status-based styling
            if (typeof cell.value === 'string') {
              if (['critical', 'poor', 'high'].includes(cell.value.toLowerCase())) {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.DANGER } };
              } else if (['moderate', 'medium', 'fair'].includes(cell.value.toLowerCase())) {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.WARNING } };
              } else if (['good', 'excellent', 'low'].includes(cell.value.toLowerCase())) {
                cell.font = { ...FONTS.BODY, bold: true, color: { argb: COLORS.SUCCESS } };
              }
            }
          });
          
          detailRowIndex++;
        }
      }

      // Add freeze panes and auto-filter
      detailSheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
      detailSheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(65 + detailColumns.length - 1)}1`
      };

      // =================== SUMMARY STATISTICS SHEET ===================
      const statsSheet = workbook.addWorksheet('📈 Statistics', {
        properties: { tabColor: { argb: COLORS.SUCCESS } }
      });

      // Calculate statistics
      const totalFloors = floors.length;
      const totalUnits = floors.reduce((sum, floor) => sum + (floor.flats?.length || 0), 0);
      const avgStructuralRating = floors.reduce((sum, floor) => {
        const floorAvg = floor.flats?.reduce((flatSum, flat) => {
          const ratings = [
            flat.structural_rating?.beams?.rating,
            flat.structural_rating?.columns?.rating,
            flat.structural_rating?.slab?.rating,
            flat.structural_rating?.foundation?.rating
          ].filter(r => r !== undefined);
          return flatSum + (ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0);
        }, 0) || 0;
        return sum + (floor.flats?.length > 0 ? floorAvg / floor.flats.length : 0);
      }, 0) / (totalFloors || 1);

      const statsData = [
        ['📊 STRUCTURE STATISTICS', ''],
        ['Total Floors', totalFloors],
        ['Total Units', totalUnits],
        ['Average Structural Rating', avgStructuralRating.toFixed(2)],
        ['Structure Area (m²)', structure.geometric_details?.structure_width * structure.geometric_details?.structure_length || 'N/A'],
        ['', ''],
        ['📋 REPORT DETAILS', ''],
        ['Generated By', req.user.email],
        ['Generation Date', new Date().toLocaleString()],
        ['Report Version', '2.0 Enhanced']
      ];

      statsData.forEach((row, index) => {
        const excelRow = statsSheet.addRow(row);
        
        if (row[1] === '') {
          excelRow.getCell(1).font = { ...FONTS.HEADER, color: { argb: COLORS.WHITE } };
          excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SUCCESS } };
          excelRow.height = 25;
          statsSheet.mergeCells(index + 1, 1, index + 1, 2);
        } else if (row[0] !== '') {
          excelRow.getCell(1).font = { ...FONTS.BODY, bold: true };
          excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_GRAY } };
          excelRow.getCell(2).font = FONTS.BODY;
        }
        
        excelRow.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      statsSheet.getColumn(1).width = 25;
      statsSheet.getColumn(2).width = 20;

      const fileName = `SAMS_Enhanced_Structure_${structure.structural_identity?.structural_identity_number || structure._id}_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      await workbook.xlsx.write(res);
      res.end();

    } catch (err) {
      console.error('❌ Enhanced Single Structure Export Failed:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * @route GET /api/reports/structures/metadata
 * @desc Get metadata for structure reports (for UI filters)
 * @access Private
 */
router.get('/structures/metadata', 
  authenticateToken,
  checkExportPermissions,
  async (req, res) => {
  try {
    console.log('📊 Report metadata requested by:', req.user.email);

    let userQuery = { is_active: true };
    
    if (req.user.role !== 'admin') {
      userQuery._id = req.user.userId;
    }

    const metadata = await User.aggregate([
      { $match: userQuery },
      { $unwind: '$structures' },
      {
        $group: {
          _id: null,
          states: { $addToSet: '$structures.structural_identity.state_code' },
          districts: { $addToSet: '$structures.structural_identity.district_code' },
          cities: { $addToSet: '$structures.structural_identity.city_name' },
          structure_types: { $addToSet: '$structures.structural_identity.type_of_structure' },
          statuses: { $addToSet: '$structures.status' },
          health_statuses: { $addToSet: '$structures.overall_structural_rating.health_status' },
          priorities: { $addToSet: '$structures.overall_structural_rating.priority' },
          total_structures: { $sum: 1 },
          date_range: {
            $push: {
              min: { $min: '$structures.creation_info.created_date' },
              max: { $max: '$structures.creation_info.created_date' }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: metadata[0] || {
        states: [],
        districts: [],
        cities: [],
        structure_types: [],
        statuses: [],
        health_statuses: [],
        priorities: [],
        total_structures: 0,
        date_range: []
      },
      message: 'Report metadata retrieved successfully'
    });

  } catch (error) {
    console.error('💥 Report metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report metadata'
    });
  }
});

module.exports = router;