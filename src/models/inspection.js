const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
    structureId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Structure',
        required: true
    },
    inspectorId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    inspectionType: {
        type: String,
        enum: ['routine', 'detailed'],
        required: true
    },
    inspectionDate: {
        type: Date,
        default: Date.now
    },
    findings: [{
        component: {
            type: String,
            required: true
        },
        condition: {
            type: String,
            required: true
        },
        recommendations: String,
        images: [String],
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        }
    }],
    overallCondition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
        required: true
    },
    maintenanceRequired: {
        type: Boolean,
        default: false
    },
    estimatedCost: Number,
    nextInspectionDate: Date,
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'approved'],
        default: 'in_progress'
    },
    notes: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Inspection', inspectionSchema);


// State codes as per RTO
