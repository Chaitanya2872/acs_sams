const asyncHandler = require('express-async-handler');
const Inspection = require('../models/Inspection');
const Structure = require('../models/Structure');
const fileUploadService = require('../services/fileUploadService');

// @desc    Create new inspection
// @route   POST /api/inspections
// @access  Private/Inspector
const createInspection = asyncHandler(async (req, res) => {
    const { structureId, inspectionType, findings, overallCondition, maintenanceRequired, estimatedCost, nextInspectionDate, notes } = req.body;

    // Check if structure exists and user has permission
    const structure = await Structure.findById(structureId);
    if (!structure) {
        return res.status(404).json({
            success: false,
            message: 'Structure not found'
        });
    }

    // Check if user is assigned inspector or admin
    if (req.user.role !== 'admin' && structure.inspectorId?.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to inspect this structure'
        });
    }

    const inspection = await Inspection.create({
        structureId,
        inspectorId: req.user.id,
        inspectionType,
        findings,
        overallCondition,
        maintenanceRequired,
        estimatedCost,
        nextInspectionDate,
        notes
    });

    await inspection.populate([
        { path: 'structureId', select: 'administrationDetails.popularNameOfStructure structuralIdentityNumber' },
        { path: 'inspectorId', select: 'name email designation' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Inspection created successfully',
        data: inspection
    });
});

// @desc    Get all inspections
// @route   GET /api/inspections
// @access  Private
const getInspections = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, inspectionType, structureId } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Apply filters based on user role
    if (req.user.role === 'inspector') {
        query.inspectorId = req.user.id;
    } else if (req.user.role === 'user') {
        // Get structures created by user
        const userStructures = await Structure.find({ createdBy: req.user.id }).select('_id');
        const structureIds = userStructures.map(s => s._id);
        query.structureId = { $in: structureIds };
    }

    // Apply additional filters
    if (status) query.status = status;
    if (inspectionType) query.inspectionType = inspectionType;
    if (structureId) query.structureId = structureId;

    const inspections = await Inspection.find(query)
        .populate('structureId', 'administrationDetails.popularNameOfStructure structuralIdentityNumber')
        .populate('inspectorId', 'name email designation')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await Inspection.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            inspections,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalInspections: total,
                hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
                hasPrevPage: parseInt(page) > 1
            }
        }
    });
});

// @desc    Get single inspection
// @route   GET /api/inspections/:id
// @access  Private
const getInspection = asyncHandler(async (req, res) => {
    let query = { _id: req.params.id };

    const inspection = await Inspection.findOne(query)
        .populate('structureId')
        .populate('inspectorId', 'name email designation');

    if (!inspection) {
        return res.status(404).json({
            success: false,
            message: 'Inspection not found'
        });
    }

    // Check permissions
    if (req.user.role === 'user' && inspection.structureId.createdBy.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this inspection'
        });
    }

    if (req.user.role === 'inspector' && inspection.inspectorId._id.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this inspection'
        });
    }

    res.status(200).json({
        success: true,
        data: inspection
    });
});

// @desc    Update inspection
// @route   PUT /api/inspections/:id
// @access  Private/Inspector
const updateInspection = asyncHandler(async (req, res) => {
    let inspection = await Inspection.findById(req.params.id);

    if (!inspection) {
        return res.status(404).json({
            success: false,
            message: 'Inspection not found'
        });
    }

    // Check if user is authorized to update
    if (req.user.role !== 'admin' && inspection.inspectorId.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to update this inspection'
        });
    }

    inspection = await Inspection.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate([
        { path: 'structureId', select: 'administrationDetails.popularNameOfStructure structuralIdentityNumber' },
        { path: 'inspectorId', select: 'name email designation' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Inspection updated successfully',
        data: inspection
    });
});

// @desc    Delete inspection
// @route   DELETE /api/inspections/:id
// @access  Private/Admin
const deleteInspection = asyncHandler(async (req, res) => {
    const inspection = await Inspection.findById(req.params.id);

    if (!inspection) {
        return res.status(404).json({
            success: false,
            message: 'Inspection not found'
        });
    }

    await Inspection.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Inspection deleted successfully'
    });
});

// @desc    Upload images for inspection findings
// @route   POST /api/inspections/:id/upload-images
// @access  Private/Inspector
const uploadInspectionImages = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No images provided'
        });
    }

    const { findingIndex } = req.body;
    if (findingIndex === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Finding index is required'
        });
    }

    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
        return res.status(404).json({
            success: false,
            message: 'Inspection not found'
        });
    }

    // Check authorization
    if (req.user.role !== 'admin' && inspection.inspectorId.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to upload images for this inspection'
        });
    }

    // Upload images
    const uploadedImages = await fileUploadService.uploadMultipleImages(req.files, {
        folder: `sams/inspections/${req.params.id}/findings`,
        prefix: `finding_${findingIndex}`
    });

    const imageUrls = uploadedImages.map(img => img.url);

    // Update inspection with new image URLs
    if (inspection.findings[findingIndex]) {
        inspection.findings[findingIndex].images = [
            ...(inspection.findings[findingIndex].images || []),
            ...imageUrls
        ];
        await inspection.save();
    }

    res.status(200).json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
            images: imageUrls,
            details: uploadedImages
        }
    });
});

// @desc    Approve inspection
// @route   PUT /api/inspections/:id/approve
// @access  Private/Admin
const approveInspection = asyncHandler(async (req, res) => {
    const inspection = await Inspection.findByIdAndUpdate(
        req.params.id,
        { status: 'approved' },
        { new: true }
    ).populate([
        { path: 'structureId', select: 'administrationDetails.popularNameOfStructure' },
        { path: 'inspectorId', select: 'name email designation' }
    ]);

    if (!inspection) {
        return res.status(404).json({
            success: false,
            message: 'Inspection not found'
        });
    }

    // Update structure status
    await Structure.findByIdAndUpdate(inspection.structureId._id, {
        status: 'approved',
        inspectionRequired: false
    });

    res.status(200).json({
        success: true,
        message: 'Inspection approved successfully',
        data: inspection
    });
});

// @desc    Complete inspection
// @route   PUT /api/inspections/:id/complete
// @access  Private/Inspector
const completeInspection = asyncHandler(async (req, res) => {
    const inspection = await Inspection.findById(req.params.id);

    if (!inspection) {
        return res.status(404).json({
            success: false,
            message: 'Inspection not found'
        });
    }

    // Check authorization
    if (req.user.role !== 'admin' && inspection.inspectorId.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to complete this inspection'
        });
    }

    inspection.status = 'completed';
    await inspection.save();

    res.status(200).json({
        success: true,
        message: 'Inspection marked as completed',
        data: inspection
    });
});

// @desc    Get inspection statistics
// @route   GET /api/inspections/stats
// @access  Private
const getInspectionStats = asyncHandler(async (req, res) => {
    let matchQuery = {};

    // Apply filters based on user role
    if (req.user.role === 'inspector') {
        matchQuery.inspectorId = req.user.id;
    } else if (req.user.role === 'user') {
        const userStructures = await Structure.find({ createdBy: req.user.id }).select('_id');
        const structureIds = userStructures.map(s => s._id);
        matchQuery.structureId = { $in: structureIds };
    }

    const stats = await Inspection.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalInspections: { $sum: 1 },
                completedInspections: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                approvedInspections: {
                    $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                },
                inProgressInspections: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                },
                routineInspections: {
                    $sum: { $cond: [{ $eq: ['$inspectionType', 'routine'] }, 1, 0] }
                },
                detailedInspections: {
                    $sum: { $cond: [{ $eq: ['$inspectionType', 'detailed'] }, 1, 0] }
                },
                maintenanceRequired: {
                    $sum: { $cond: ['$maintenanceRequired', 1, 0] }
                }
            }
        }
    ]);

    const result = stats[0] || {
        totalInspections: 0,
        completedInspections: 0,
        approvedInspections: 0,
        inProgressInspections: 0,
        routineInspections: 0,
        detailedInspections: 0,
        maintenanceRequired: 0
    };

    res.status(200).json({
        success: true,
        data: result
    });
});

module.exports = {
    createInspection,
    getInspections,
    getInspection,
    updateInspection,
    deleteInspection,
    uploadInspectionImages,
    approveInspection,
    completeInspection,
    getInspectionStats
};