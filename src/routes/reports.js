const express = require('express');
const ExcelJS = require('exceljs');
const { User } = require('../models/schemas'); // Adjust path to your schemas
const { authenticateToken, authorizeRole } = require('../middlewares/auth'); // Use your existing auth
const router = express.Router();

// =================== MIDDLEWARE FOR REPORTS ===================

// Middleware to check export permissions
const checkExportPermissions = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has export permissions or is admin
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

// =================== REPORTS API ENDPOINTS ===================

/**
 * @route GET /api/reports/structures/download
 * @desc Download structure details report in Excel format
 * @access Private (Authenticated users with export permissions)
 */
router.get('/structures/download', 
  authenticateToken,      // Use your existing auth middleware
  checkExportPermissions, // Check export permissions
  async (req, res) => {
  try {
    console.log('📊 Structure report export requested by:', req.user.email);

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

    // User-specific filters
    if (user_id) {
      userQuery._id = user_id;
    }

    // For non-admin users, only show their own structures
    if (req.user.role !== 'admin') {
      userQuery._id = req.user.userId;
    }

    // Structure-specific filters
    if (structure_ids) {
      const ids = structure_ids.split(',').map(id => id.trim());
      structureFilters['structures._id'] = { $in: ids };
    }

    if (state_code) {
      structureFilters['structures.structural_identity.state_code'] = state_code.toUpperCase();
    }

    if (district_code) {
      structureFilters['structures.structural_identity.district_code'] = district_code;
    }

    if (city_name) {
      structureFilters['structures.structural_identity.city_name'] = new RegExp(city_name, 'i');
    }

    if (type_of_structure) {
      structureFilters['structures.structural_identity.type_of_structure'] = type_of_structure;
    }

    if (status) {
      structureFilters['structures.status'] = status;
    }

    if (health_status) {
      structureFilters['structures.overall_structural_rating.health_status'] = health_status;
    }

    if (priority) {
      structureFilters['structures.overall_structural_rating.priority'] = priority;
    }

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

    console.log('🔍 Aggregation pipeline:', JSON.stringify(aggregationPipeline, null, 2));

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
    
    // Set workbook properties
    workbook.creator = req.user.username || req.user.email;
    workbook.lastModifiedBy = req.user.username || req.user.email;
    workbook.created = new Date();
    workbook.modified = new Date();

    // =================== SHEET 1: SUMMARY REPORT ===================
    
    const summarySheet = workbook.addWorksheet('Summary Report', {
      properties: { tabColor: { argb: 'FF0066CC' } }
    });

    // Summary headers
    summarySheet.columns = [
      { header: 'S.No', key: 'serial', width: 8 },
      { header: 'Structure ID', key: 'structure_id', width: 20 },
      { header: 'UID', key: 'uid', width: 15 },
      { header: 'State', key: 'state', width: 12 },
      { header: 'District', key: 'district', width: 12 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Structure Type', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Health Status', key: 'health_status', width: 12 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Total Floors', key: 'floors', width: 10 },
      { header: 'Total Flats', key: 'flats', width: 10 },
      { header: 'Structural Rating', key: 'structural_rating', width: 15 },
      { header: 'Non-Structural Rating', key: 'non_structural_rating', width: 18 },
      { header: 'Overall Score', key: 'overall_score', width: 12 },
      { header: 'Created Date', key: 'created_date', width: 15 },
      { header: 'Last Updated', key: 'updated_date', width: 15 }
    ];

    // Style the header row
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };

    // Add summary data
    results.forEach((result, index) => {
      const structure = result.structure;
      const totalFlats = structure.geometric_details?.floors?.reduce((total, floor) => 
        total + (floor.flats?.length || 0), 0) || 0;

      summarySheet.addRow({
        serial: index + 1,
        structure_id: structure.structural_identity?.structural_identity_number || 'N/A',
        uid: structure.structural_identity?.uid || 'N/A',
        state: structure.structural_identity?.state_code || 'N/A',
        district: structure.structural_identity?.district_code || 'N/A',
        city: structure.structural_identity?.city_name || 'N/A',
        location: structure.structural_identity?.location_code || 'N/A',
        type: structure.structural_identity?.type_of_structure || 'N/A',
        status: structure.status || 'N/A',
        health_status: structure.overall_structural_rating?.health_status || 'N/A',
        priority: structure.overall_structural_rating?.priority || 'N/A',
        floors: structure.geometric_details?.number_of_floors || 0,
        flats: totalFlats,
        structural_rating: structure.overall_structural_rating?.overall_average || 'N/A',
        non_structural_rating: structure.overall_non_structural_rating?.overall_average || 'N/A',
        overall_score: structure.final_health_assessment?.overall_score || 'N/A',
        created_date: structure.creation_info?.created_date ? 
          new Date(structure.creation_info.created_date).toLocaleDateString() : 'N/A',
        updated_date: structure.creation_info?.last_updated_date ? 
          new Date(structure.creation_info.last_updated_date).toLocaleDateString() : 'N/A'
      });
    });

    // =================== ADD MORE SHEETS AS NEEDED ===================
    // (You can add the other sheets from the original code here if needed)

    // =================== APPLY STYLING ===================
    
    workbook.eachSheet((sheet) => {
      // Auto-fit columns
      sheet.columns.forEach((column) => {
        if (column.header) {
          const maxLength = Math.max(
            column.header.length,
            10 // minimum width
          );
          column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        }
      });

      // Add borders to all cells with data
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Alternate row coloring
          if (rowNumber > 1 && rowNumber % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' }
            };
          }
        });
      });
    });

    // =================== GENERATE AND SEND FILE ===================
    
    const fileName = `SAMS_Structure_Report_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Write to response
    await workbook.xlsx.write(res);
    
    // Log the export activity
    console.log(`📊 Structure report exported by user ${req.user.email} - ${results.length} structures`);
    
    res.end();

  } catch (error) {
    console.error('💥 Structure report export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate structure report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

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
    
    // For non-admin users, only show their own structures
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