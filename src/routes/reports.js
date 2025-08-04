const express = require('express');
const ExcelJS = require('exceljs');
const { User } = require('../models/schemas'); // Adjust path to your schemas
const { authenticateToken, authorizeRole } = require('../middlewares/auth'); // Use your existing auth
const router = express.Router();
const mongoose = require('mongoose');

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

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Full Report');

      // --------------------- COLUMNS ---------------------
      sheet.columns = [
        { header: 'Structure ID', key: 'structure_id', width: 20 },
        { header: 'UID', key: 'uid', width: 15 },
        { header: 'Structure Type', key: 'type', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'State Code', key: 'state_code', width: 10 },
        { header: 'District Code', key: 'district_code', width: 10 },
        { header: 'City', key: 'city_name', width: 15 },
        { header: 'Location Code', key: 'location_code', width: 10 },
        { header: 'Client Name', key: 'client_name', width: 20 },
        { header: 'Custodian', key: 'custodian', width: 15 },
        { header: 'Engineer Designation', key: 'engineer', width: 15 },
        { header: 'Email ID', key: 'email', width: 20 },
        { header: 'Floors', key: 'total_floors', width: 10 },
        { header: 'Width', key: 'width', width: 10 },
        { header: 'Length', key: 'length', width: 10 },
        { header: 'Height', key: 'height', width: 10 },
        { header: 'Floor No', key: 'floor_number', width: 10 },
        { header: 'Floor Label', key: 'floor_label_name', width: 15 },
        { header: 'Floor Height', key: 'floor_height', width: 10 },
        { header: 'Floor Area', key: 'floor_area', width: 12 },
        { header: 'Floor Notes', key: 'floor_notes', width: 20 },
        { header: 'Flat No', key: 'flat_number', width: 12 },
        { header: 'Flat Type', key: 'flat_type', width: 10 },
        { header: 'Area (sq mt)', key: 'flat_area', width: 10 },
        { header: 'Facing', key: 'facing', width: 10 },
        { header: 'Occupancy', key: 'occupancy', width: 12 },
        { header: 'Flat Notes', key: 'flat_notes', width: 20 },
        { header: 'Beams', key: 'beams', width: 8 },
        { header: 'Columns', key: 'columns', width: 8 },
        { header: 'Slab', key: 'slab', width: 8 },
        { header: 'Foundation', key: 'foundation', width: 10 },
        { header: 'Wiring', key: 'wiring', width: 8 },
        { header: 'Tiles', key: 'tiles', width: 8 },
        { header: 'Sanitary', key: 'sanitary', width: 8 },
        { header: 'Doors/Windows', key: 'doors', width: 10 },
        { header: 'Sewage', key: 'sewage', width: 8 },
        { header: 'Panel Board', key: 'panel', width: 10 },
        { header: 'Water Tank', key: 'tank', width: 10 },
        { header: 'Lift', key: 'lift', width: 8 },
        { header: 'Health Status', key: 'health_status', width: 15 },
        { header: 'Priority', key: 'priority', width: 10 },
        { header: 'Combined Score', key: 'combined_score', width: 15 }
      ];

      // --------------------- ROW DATA ---------------------
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

          if (flats.length === 0) {
            sheet.addRow({
              structure_id: structure.structural_identity?.structural_identity_number,
              uid: structure.structural_identity?.uid,
              type: structure.structural_identity?.type_of_structure,
              status: structure.status,
              floor_number: floor.floor_number,
              floor_label_name: floor.floor_label_name,
              floor_height: floor.floor_height,
              floor_area: floor.total_area_sq_mts,
              floor_notes: floor.floor_notes
            });
            return;
          }

          flats.forEach(flat => {
            sheet.addRow({
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
              floor_notes: floor.floor_notes,
              flat_number: flat.flat_number,
              flat_type: flat.flat_type,
              flat_area: flat.area_sq_mts,
              facing: flat.direction_facing,
              occupancy: flat.occupancy_status,
              flat_notes: flat.flat_notes,
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
            });
          });
        });
      });

      // --------------------- FINALIZE & SEND FILE ---------------------
      const fileName = `SAMS_Full_Structure_Report_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      await workbook.xlsx.write(res);
      res.end();

    } catch (err) {
      console.error('❌ Complete report generation failed:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

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
      const sheet = workbook.addWorksheet('Structure Report');

      // Set columns
      sheet.columns = [
        // Structure level
        { header: 'Structure ID', key: 'structure_id', width: 20 },
        { header: 'UID', key: 'uid', width: 20 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'District', key: 'district', width: 15 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Location Code', key: 'location', width: 15 },
        { header: 'Client', key: 'client', width: 20 },
        { header: 'Custodian', key: 'custodian', width: 20 },
        { header: 'Engineer', key: 'engineer', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Structure Width', key: 'width', width: 15 },
        { header: 'Length', key: 'length', width: 15 },
        { header: 'Height', key: 'height', width: 15 },
        { header: 'Total Floors', key: 'floors_count', width: 12 },

        // Floor + Flat level
        { header: 'Floor No', key: 'floor_no', width: 10 },
        { header: 'Flat No', key: 'flat_no', width: 10 },
        { header: 'Flat Area', key: 'flat_area', width: 12 },
        { header: 'Facing', key: 'facing', width: 12 },
        { header: 'Occupancy', key: 'occupancy', width: 12 },
        { header: 'Flat Notes', key: 'flat_notes', width: 20 },

        // Structural Ratings
        { header: 'Beams', key: 'beams', width: 10 },
        { header: 'Columns', key: 'columns', width: 10 },
        { header: 'Slab', key: 'slab', width: 10 },
        { header: 'Foundation', key: 'foundation', width: 12 },

        // Non-structural Ratings
        { header: 'Wiring', key: 'wiring', width: 10 },
        { header: 'Tiles', key: 'tiles', width: 10 },
        { header: 'Sanitary', key: 'sanitary', width: 10 },
        { header: 'Doors/Windows', key: 'doors', width: 15 },
        { header: 'Sewage', key: 'sewage', width: 10 },
        { header: 'Panel Board', key: 'panel', width: 15 },
        { header: 'Water Tank', key: 'tank', width: 12 },
        { header: 'Lift', key: 'lift', width: 10 },

        // Image URLs
        { header: 'Beam Images', key: 'beam_imgs', width: 30 },
        { header: 'Column Images', key: 'column_imgs', width: 30 },
        { header: 'Slab Images', key: 'slab_imgs', width: 30 },
        { header: 'Foundation Images', key: 'foundation_imgs', width: 30 },
        { header: 'Wiring Images', key: 'wiring_imgs', width: 30 },
        { header: 'Tiles Images', key: 'tiles_imgs', width: 30 },
        { header: 'Sanitary Images', key: 'sanitary_imgs', width: 30 },
        { header: 'Doors/Windows Images', key: 'doors_imgs', width: 30 },
        { header: 'Panel Board Images', key: 'panel_imgs', width: 30 },
        { header: 'Tank Images', key: 'tank_imgs', width: 30 },
        { header: 'Lift Images', key: 'lift_imgs', width: 30 },

        // Overall Rating
        { header: 'Health Status', key: 'health', width: 15 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Combined Score', key: 'score', width: 15 }
      ];

      const floors = structure.geometric_details?.floors || [];

      for (const floor of floors) {
        const flats = floor.flats || [];
        for (const flat of flats) {
          sheet.addRow({
            structure_id: structure.structural_identity?.structural_identity_number,
            uid: structure.structural_identity?.uid,
            type: structure.structural_identity?.type_of_structure,
            status: structure.status,
            city: structure.structural_identity?.city_name,
            district: structure.structural_identity?.district_code,
            state: structure.structural_identity?.state_code,
            location: structure.structural_identity?.location_code,

            client: structure.administration?.client_name,
            custodian: structure.administration?.custodian,
            engineer: structure.administration?.engineer_designation,
            email: structure.administration?.email_id,
            width: structure.geometric_details?.structure_width,
            length: structure.geometric_details?.structure_length,
            height: structure.geometric_details?.structure_height,
            floors_count: structure.geometric_details?.number_of_floors,

            floor_no: floor.floor_number,
            flat_no: flat.flat_number,
            flat_area: flat.area_sq_mts,
            facing: flat.direction_facing,
            occupancy: flat.occupancy_status,
            flat_notes: flat.flat_notes,

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

            beam_imgs: flat.structural_rating?.beams?.photos?.map(p => p.url).join(', ') || '',
            column_imgs: flat.structural_rating?.columns?.photos?.map(p => p.url).join(', ') || '',
            slab_imgs: flat.structural_rating?.slab?.photos?.map(p => p.url).join(', ') || '',
            foundation_imgs: flat.structural_rating?.foundation?.photos?.map(p => p.url).join(', ') || '',
            wiring_imgs: flat.non_structural_rating?.electrical_wiring?.photos?.map(p => p.url).join(', ') || '',
            tiles_imgs: flat.non_structural_rating?.flooring_tiles?.photos?.map(p => p.url).join(', ') || '',
            sanitary_imgs: flat.non_structural_rating?.sanitary_fittings?.photos?.map(p => p.url).join(', ') || '',
            doors_imgs: flat.non_structural_rating?.doors_windows?.photos?.map(p => p.url).join(', ') || '',
            panel_imgs: flat.non_structural_rating?.panel_board?.photos?.map(p => p.url).join(', ') || '',
            tank_imgs: flat.non_structural_rating?.water_tanks?.photos?.map(p => p.url).join(', ') || '',
            lift_imgs: flat.non_structural_rating?.lifts?.photos?.map(p => p.url).join(', ') || '',

            health: flat.flat_overall_rating?.health_status,
            priority: flat.flat_overall_rating?.priority,
            score: flat.flat_overall_rating?.combined_score
          });
        }
      }

      // Format
      sheet.getRow(1).font = { bold: true };
      sheet.eachRow(row => {
        row.alignment = { vertical: 'middle', wrapText: true };
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      const fileName = `SAMS_Full_Report_${structure.structural_identity?.structural_identity_number || structure._id}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      await workbook.xlsx.write(res);
      res.end();

    } catch (err) {
      console.error('❌ Full Structure Export Failed:', err);
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