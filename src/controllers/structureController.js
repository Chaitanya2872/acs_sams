// @ts-nocheck
const { User } = require('../models/schemas');
const { hasPrivilegedAccess } = require('../middlewares/auth'); 
const StructureNumberGenerator = require('../utils/StructureNumberGenerator');
const cloudinary = require('../config/cloudinary');
const {
  sendSuccessResponse,
  sendErrorResponse,
  sendCreatedResponse,
  sendUpdatedResponse,
  sendPaginatedResponse
} = require('../utils/responseHandler');
const { MESSAGES, PAGINATION } = require('../utils/constants');

const normalizePhotoList = (photosInput, photoInput) => {
  const fromArray = Array.isArray(photosInput)
    ? photosInput
    : [];
  const fromSingle = typeof photoInput === 'string' && photoInput.trim() !== ''
    ? [photoInput]
    : [];
  const fromLegacyPhotoArray = Array.isArray(photoInput)
    ? photoInput
    : [];

  const combined = [...fromArray, ...fromSingle, ...fromLegacyPhotoArray]
    .filter((photo) => typeof photo === 'string' && photo.trim() !== '')
    .map((photo) => photo.trim());

  return Array.from(new Set(combined));
};

const normalizeDistressTypes = (distressTypesInput) => {
  const allowedDistressTypes = new Set(['physical', 'chemical', 'mechanical', 'none']);
  const raw = Array.isArray(distressTypesInput)
    ? distressTypesInput.flat(Infinity)
    : [distressTypesInput];

  const normalized = raw
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => allowedDistressTypes.has(value));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
};

class StructureController {
  constructor() {
    this.structureNumberGenerator = new StructureNumberGenerator();
    this._cloudinaryMissingConfigLogged = false;
    
    // Bind all methods to maintain 'this' context
    this.initializeStructure = this.initializeStructure.bind(this);
    
    // Location Screen
    this.saveLocationScreen = this.saveLocationScreen.bind(this);
    this.getLocationScreen = this.getLocationScreen.bind(this);
    this.updateLocationScreen = this.updateLocationScreen.bind(this);
    
    // Administrative Screen
    this.saveAdministrativeScreen = this.saveAdministrativeScreen.bind(this);
    this.getAdministrativeScreen = this.getAdministrativeScreen.bind(this);
    this.updateAdministrativeScreen = this.updateAdministrativeScreen.bind(this);

    // Geometric Details
    this.saveGeometricDetails = this.saveGeometricDetails.bind(this);
    this.getGeometricDetails = this.getGeometricDetails.bind(this);
    this.updateGeometricDetails = this.updateGeometricDetails.bind(this);

    // Flat-level bulk component ratings
  this.saveFlatStructuralComponentsBulk = this.saveFlatStructuralComponentsBulk.bind(this);
  this.saveFlatNonStructuralComponentsBulk = this.saveFlatNonStructuralComponentsBulk.bind(this);
  
  // Floor-level bulk component ratings
  this.saveFloorStructuralComponentsBulk = this.saveFloorStructuralComponentsBulk.bind(this);
  this.saveFloorNonStructuralComponentsBulk = this.saveFloorNonStructuralComponentsBulk.bind(this);
  this.getFloorStructuralComponents = this.getFloorStructuralComponents.bind(this);
  this.getFloorNonStructuralComponents = this.getFloorNonStructuralComponents.bind(this);

  this.getFloorRatings = this.getFloorRatings.bind(this);
  this.saveFloorRatings = this.saveFloorRatings.bind(this);
  this.saveFloorStructuralComponents = this.saveFloorStructuralComponents.bind(this);
  this.saveFloorNonStructuralComponents = this.saveFloorNonStructuralComponents.bind(this);
  this.hasFloorStructuralRating = this.hasFloorStructuralRating.bind(this);
 this.hasFloorNonStructuralRating = this.hasFloorNonStructuralRating.bind(this);
this.calculateComponentAverage = this.calculateComponentAverage.bind(this);
this.calculateNonStructuralAverages = this.calculateNonStructuralAverages.bind(this);
this.countComponentsWithPhotos = this.countComponentsWithPhotos.bind(this);
this.countLowRatedComponents = this.countLowRatedComponents.bind(this);
this.extractFloorRatingImages = this.extractFloorRatingImages.bind(this);

// In the constructor, add these lines:
this.getAvailableComponentsBySubtype = this.getAvailableComponentsBySubtype.bind(this);
this.validateComponentForSubtype = this.validateComponentForSubtype.bind(this);
this.validateComponentsForStructureType = this.validateComponentsForStructureType.bind(this);
  
  // Block-level bulk component ratings
  this.saveBlockStructuralComponentsBulk = this.saveBlockStructuralComponentsBulk.bind(this);
  this.saveBlockNonStructuralComponentsBulk = this.saveBlockNonStructuralComponentsBulk.bind(this);
  
  // Helper calculation methods (if not already bound)
  this.calculateBlockStructuralAverage = this.calculateBlockStructuralAverage.bind(this);
  this.calculateBlockNonStructuralAverage = this.calculateBlockNonStructuralAverage.bind(this);
  this.calculateBlockCombinedRating = this.calculateBlockCombinedRating.bind(this);
    
    // Floors Management
    this.addFloors = this.addFloors.bind(this);
    this.getFloors = this.getFloors.bind(this);
    this.getFloorById = this.getFloorById.bind(this);
    this.updateFloor = this.updateFloor.bind(this);
    this.deleteFloor = this.deleteFloor.bind(this);
    
    // Flats Management
    this.addFlatsToFloor = this.addFlatsToFloor.bind(this);
    this.getFlatsInFloor = this.getFlatsInFloor.bind(this);
    this.getFlatById = this.getFlatById.bind(this);
    this.updateFlat = this.updateFlat.bind(this);
    this.deleteFlat = this.deleteFlat.bind(this);
    
    // Flat Ratings (ONLY flat-level ratings)
    this.saveFlatCombinedRatings = this.saveFlatCombinedRatings.bind(this);
    this.getFlatCombinedRatings = this.getFlatCombinedRatings.bind(this);
    this.updateFlatCombinedRatings = this.updateFlatCombinedRatings.bind(this);
    
    // Legacy individual ratings (kept for backward compatibility)
    this.saveFlatStructuralRating = this.saveFlatStructuralRating.bind(this);
    this.getFlatStructuralRating = this.getFlatStructuralRating.bind(this);
    this.updateFlatStructuralRating = this.updateFlatStructuralRating.bind(this);
    this.saveFlatNonStructuralRating = this.saveFlatNonStructuralRating.bind(this);
    this.getFlatNonStructuralRating = this.getFlatNonStructuralRating.bind(this);
    this.updateFlatNonStructuralRating = this.updateFlatNonStructuralRating.bind(this);

  this.getAllStructures = this.getAllStructures.bind(this);
  this.getStructureDetails = this.getStructureDetails.bind(this);
  this.getAllImages = this.getAllImages.bind(this);
  this.getStructureImages = this.getStructureImages.bind(this);
  this.getUserImageStats = this.getUserImageStats.bind(this);

  this.submitForTesting = this.submitForTesting.bind(this);
this.startTesting = this.startTesting.bind(this);
this.completeTesting = this.completeTesting.bind(this);
this.startValidation = this.startValidation.bind(this);
this.completeValidation = this.completeValidation.bind(this);
this.approveStructure = this.approveStructure.bind(this);
this.getWorkflowHistory = this.getWorkflowHistory.bind(this);
this.buildWorkflowTimeline = this.buildWorkflowTimeline.bind(this);
    
    // Bulk Operations
    this.saveBulkRatings = this.saveBulkRatings.bind(this);
    this.getBulkRatings = this.getBulkRatings.bind(this);
    this.updateBulkRatings = this.updateBulkRatings.bind(this);
    
    // Structure Management
    this.getStructureProgress = this.getStructureProgress.bind(this);
    this.submitStructure = this.submitStructure.bind(this);
    this.validateStructureNumber = this.validateStructureNumber.bind(this);
    this.getLocationStructureStats = this.getLocationStructureStats.bind(this);
    
    // Remarks Management
    this.addRemark = this.addRemark.bind(this);
    this.updateRemark = this.updateRemark.bind(this);
    this.getRemarks = this.getRemarks.bind(this);
    this.deleteRemark = this.deleteRemark.bind(this);
    this.deleteStructure = this.deleteStructure.bind(this);
    
    // Geometric details helper
    this.getParkingFloorTypes = this.getParkingFloorTypes.bind(this);

 this.submitForTesting = this.submitForTesting.bind(this);
 this.startTesting = this.startTesting.bind(this);
 this.completeTesting = this.completeTesting.bind(this);
 this.startValidation = this.startValidation.bind(this);
 this.completeValidation = this.completeValidation.bind(this);
 this.approveStructure = this.approveStructure.bind(this);
 this.getWorkflowHistory = this.getWorkflowHistory.bind(this);
this.buildWorkflowTimeline = this.buildWorkflowTimeline.bind(this);
this.buildStatusDisplay = this.buildStatusDisplay.bind(this);
this.convertPhotoDataUrisToCloudinary = this.convertPhotoDataUrisToCloudinary.bind(this);
this.uploadInlineImageToCloudinary = this.uploadInlineImageToCloudinary.bind(this);
this.isDataImageUri = this.isDataImageUri.bind(this);
this.isCloudinaryConfigured = this.isCloudinaryConfigured.bind(this);
  }

  // =================== UTILITY METHODS ===================
 async findUserStructure(userId, structureId, requestUser = null) {
  // If requestUser is provided and has privileged access, search across all users
  if (requestUser && hasPrivilegedAccess(requestUser)) {
    console.log('🔓 Privileged user accessing structure:', structureId);
    return await this.findStructureAcrossUsers(structureId);
  }
  
  // Regular user - only search their own structures
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const structure = user.structures.id(structureId);
  if (!structure) {
    throw new Error('Structure not found');
  }
  
  return { user, structure };
}

  // Find structure across all users (for remarks functionality and privileged access)
  async findStructureAcrossUsers(structureId) {
    const users = await User.find({ 'structures._id': structureId });
    
    for (const user of users) {
      const structure = user.structures.id(structureId);
      if (structure) {
        return { user, structure };
      }
    }
    
    throw new Error('Structure not found');
  }

  generateFloorId() {
    return `floor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateFlatId() {
    return `flat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ✅ NEW: Generate unique component ID
  generateComponentId(componentType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${componentType}_${timestamp}_${random}`;
  }

  isDataImageUri(value) {
    return (
      typeof value === 'string' &&
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value.trim())
    );
  }

  isCloudinaryConfigured() {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  async uploadInlineImageToCloudinary(imageValue, folder = 'sams/structures') {
    const normalizedValue = typeof imageValue === 'string' ? imageValue.trim() : '';
    if (!this.isDataImageUri(normalizedValue)) {
      return normalizedValue;
    }

    if (!this.isCloudinaryConfigured()) {
      if (!this._cloudinaryMissingConfigLogged) {
        console.warn('⚠️ Cloudinary credentials are missing. Keeping inline image data as-is.');
        this._cloudinaryMissingConfigLogged = true;
      }
      return normalizedValue;
    }

    const uploadResult = await cloudinary.uploader.upload(normalizedValue, {
      folder,
      resource_type: 'image'
    });

    return uploadResult?.secure_url || normalizedValue;
  }

  async convertPhotoDataUrisToCloudinary(payload, options = {}) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const folder = options.folder || 'sams/structures';
    const uploadCache = new Map();

    const uploadWithCache = async (photoValue) => {
      if (typeof photoValue !== 'string') {
        return photoValue;
      }

      const normalizedValue = photoValue.trim();
      if (!this.isDataImageUri(normalizedValue)) {
        return normalizedValue;
      }

      if (!uploadCache.has(normalizedValue)) {
        uploadCache.set(
          normalizedValue,
          this.uploadInlineImageToCloudinary(normalizedValue, folder)
        );
      }

      return uploadCache.get(normalizedValue);
    };

    const walk = async (node) => {
      if (Array.isArray(node)) {
        const transformedItems = await Promise.all(node.map((item) => walk(item)));
        node.splice(0, node.length, ...transformedItems);
        return node;
      }

      if (!node || typeof node !== 'object') {
        return node;
      }

      if (Array.isArray(node.photos)) {
        const rawPhotos = node.photos
          .filter((photo) => typeof photo === 'string')
          .map((photo) => photo.trim())
          .filter((photo) => photo !== '');

        const convertedPhotos = await Promise.all(rawPhotos.map((photo) => uploadWithCache(photo)));
        node.photos = Array.from(new Set(convertedPhotos.filter((photo) => typeof photo === 'string' && photo.trim() !== '')));
      }

      if (Object.prototype.hasOwnProperty.call(node, 'photo')) {
        if (Array.isArray(node.photo)) {
          const rawPhotoArray = node.photo
            .filter((photo) => typeof photo === 'string')
            .map((photo) => photo.trim())
            .filter((photo) => photo !== '');

          const convertedPhotoArray = await Promise.all(rawPhotoArray.map((photo) => uploadWithCache(photo)));
          node.photo = Array.from(new Set(convertedPhotoArray.filter((photo) => typeof photo === 'string' && photo.trim() !== '')));
        } else if (typeof node.photo === 'string' && node.photo.trim() !== '') {
          node.photo = await uploadWithCache(node.photo);
        }
      }

      const childKeys = Object.keys(node).filter((key) => key !== 'photo' && key !== 'photos');
      for (const key of childKeys) {
        node[key] = await walk(node[key]);
      }

      return node;
    };

    await walk(payload);
    return payload;
  }

  // =================== STRUCTURE INITIALIZATION ===================
async initializeStructure(req, res) {
  try {
    console.log('🚀 Initializing new structure...');
    console.log('👤 User:', req.user.userId, req.user.email);
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }

    console.log('👤 User found, current structures:', user.structures.length);

    // Generate a valid UID (8-12 alphanumeric characters)
    const generateValidUID = () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const uid = `${random}${timestamp}`.substring(0, 12);
      console.log('🔑 Generated UID:', uid, 'Length:', uid.length);
      return uid;
    };
    
    // Generate temporary structural_identity_number
    // Pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z0-9]{2}[0-9]{3}$/
    // Format: XX00TEMP0T001
    // XX = State code (2 letters)
    // 00 = District code (2 digits)
    // TEMP = City code (4 letters)
    // 0T = Location code (2 alphanumeric)
    // 001 = Structure number (3 digits)
    const generateTempStructuralID = () => {
      const random3Digits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `XX00TEMP0T${random3Digits}`;  // Total: 15 chars matching pattern
    };

    const uid = generateValidUID();
    const tempStructuralID = generateTempStructuralID();

    // Create structure with all required fields
    const newStructure = {
      structural_identity: {
        uid: uid,
        structural_identity_number: tempStructuralID,    // Matches: [A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z0-9]{2}[0-9]{3}
        type_of_structure: 'residential',                // Required
        structure_subtype: 'rcc',                        // ⭐ NEW - Required, default to RCC
        age_of_structure: 0                              // ⭐ NEW - Required, default to 0
      },
      location: {
        structure_name: '',
        zip_code: '000000',                              // Required, 6 digits
        state_code: 'XX',                                // Required, 2 letters
        district_code: '00',                             // Required, 2 digits
        city_name: 'TEMP',                               // Required, max 4 chars ⭐
        location_code: 'XX',                             // Required, max 2 chars
        longitude: 0,                                    // Required
        latitude: 0,                                     // Required
        address: ''
      },
      administrative_details: {},
      geometric_details: {
        floors: []
      },
      creation_info: {
        created_date: new Date(),
        last_updated_date: new Date(),
        version: 1
      },
      status: 'draft'
    };

    console.log('📝 Structure object created with valid temporary values');
    console.log('   UID:', uid);
    console.log('   Temp Structural ID:', tempStructuralID);
    console.log('   Structure Subtype:', newStructure.structural_identity.structure_subtype);
    console.log('   Age:', newStructure.structural_identity.age_of_structure);
    console.log('   City Name (max 4 chars):', newStructure.location.city_name);

    user.structures.push(newStructure);
    
    console.log('💾 Saving user with new structure...');
    await user.save();

    const createdStructure = user.structures[user.structures.length - 1];
    
    console.log('✅ Structure initialized successfully:', {
      id: createdStructure._id,
      uid: createdStructure.structural_identity.uid,
      structural_identity_number: createdStructure.structural_identity.structural_identity_number,
      status: createdStructure.status
    });
    
    return sendCreatedResponse(res, {
      structure_id: createdStructure._id,
      uid: createdStructure.structural_identity.uid,
      structural_identity_number: createdStructure.structural_identity.structural_identity_number,
      status: createdStructure.status,
      total_structures: user.structures.length,
      message: 'Structure initialized successfully. Please complete location details.'
    }, 'Structure initialized successfully');

  } catch (error) {
    console.error('❌ Structure initialization error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    if (error.errors) {
      console.error('❌ Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    return sendErrorResponse(res, 500, 'Failed to initialize structure', error.message);
  }
}

  // =================== SCREEN 1: LOCATION ===================
async saveLocationScreen(req, res) {
  try {
    const { id } = req.params;
    const { 
      structure_name, 
      zip_code, 
      state_code, 
      district_code, 
      city_name, 
      location_code, 
      type_of_structure, 
      structure_subtype,        // ⭐ NEW
      age_of_structure,         // ⭐ NEW
      commercial_subtype, 
      longitude, 
      latitude, 
      address 
    } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // ⭐ Validate structure_subtype
    if (!structure_subtype || !['rcc', 'steel'].includes(structure_subtype)) {
      return sendErrorResponse(res, 400, 'Structure subtype is required and must be either "rcc" or "steel"');
    }
    
    // ⭐ Validate age_of_structure
    if (age_of_structure === undefined || age_of_structure === null) {
      return sendErrorResponse(res, 400, 'Age of structure is required');
    }
    
    if (age_of_structure < 0 || age_of_structure > 100) {
      return sendErrorResponse(res, 400, 'Age of structure must be between 0 and 100 years');
    }
    
    // Validate commercial subtype requirement
    if (type_of_structure === 'commercial' && !commercial_subtype) {
      return sendErrorResponse(res, 400, 'Commercial subtype is required for commercial structures');
    }
    
    // Get next sequence number for this location
    const nextSequence = await this.getNextSequenceForLocation(
      state_code, district_code, city_name, location_code
    );
    
    // Generate structural identity number and components
    const generatedNumbers = this.structureNumberGenerator.generateStructureNumber({
      state_code,
      district_code, 
      city_name,
      location_code,
      type_of_structure
    }, nextSequence);
    
    console.log('🔢 Generated structural_identity_number:', generatedNumbers.structural_identity_number);
    console.log('   Length:', generatedNumbers.structural_identity_number.length);
    console.log('   Structure sequence:', generatedNumbers.components.structure_sequence);
    
    // ⚠️ CRITICAL FIX: Ensure structure sequence is only 3 digits
    // Schema pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z0-9]{2}[0-9]{3}$/
    let structureSequence = generatedNumbers.components.structure_sequence;
    
    // If sequence is more than 3 digits, trim it
    if (structureSequence.length > 3) {
      console.warn('⚠️ Structure sequence too long:', structureSequence);
      structureSequence = structureSequence.slice(-3); // Keep last 3 digits
      console.log('🔧 Trimmed to 3 digits:', structureSequence);
    }
    
    // Rebuild the structural identity number with correct length
    const fixedStructuralId = 
      state_code + 
      district_code + 
      city_name + 
      location_code + 
      structureSequence;
    
    console.log('✅ Final structural_identity_number:', fixedStructuralId);
    console.log('   Length:', fixedStructuralId.length, '(should be 15)');
    
    // Validate the final format
    const structuralIdPattern = /^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z0-9]{2}[0-9]{3}$/;
    if (!structuralIdPattern.test(fixedStructuralId)) {
      console.error('❌ Structural ID does not match pattern!');
      return sendErrorResponse(res, 500, 'Failed to generate valid structural identity number');
    }
    
    // Build structural identity object
    const structuralIdentity = {
      uid: structure.structural_identity.uid,
      structure_name: structure_name || '',
      structural_identity_number: fixedStructuralId,  // ⭐ Using fixed version
      zip_code: zip_code,
      state_code: state_code,
      district_code: district_code,
      city_name: city_name,
      location_code: location_code,
      structure_number: structureSequence,  // ⭐ Using trimmed 3-digit version
      type_of_structure: type_of_structure,
      type_code: generatedNumbers.components.type_code,
      structure_subtype: structure_subtype,        // ⭐ NEW
      age_of_structure: parseInt(age_of_structure) // ⭐ NEW
    };
    
    // Only add commercial_subtype if structure is commercial
    if (type_of_structure === 'commercial') {
      structuralIdentity.commercial_subtype = commercial_subtype;
    }
    
    structure.structural_identity = structuralIdentity;
    
    // Update location with all required fields
    structure.location = {
      structure_name: structure_name || '',
      zip_code: zip_code,
      state_code: state_code,
      district_code: district_code,
      city_name: city_name,
      location_code: location_code,
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      address: address || ''
    };
    
    structure.creation_info.last_updated_date = new Date();
    
    // ✅ Now using correct enum value
    structure.status = 'location_completed';
    
    await user.save();
    
    console.log(`✅ Structure saved successfully`);
    console.log(`   Structural ID: ${fixedStructuralId}`);
    console.log(`   Structure Subtype: ${structure_subtype}`);
    console.log(`   Age: ${age_of_structure} years`);
    console.log(`   Status: ${structure.status}`);
    
    return sendSuccessResponse(res, 200, {
      structure_id: id,
      uid: structure.structural_identity.uid,
      structure_name: structure.structural_identity.structure_name,
      structural_identity_number: structure.structural_identity.structural_identity_number,
      type_of_structure: structure.structural_identity.type_of_structure,
      structure_subtype: structure.structural_identity.structure_subtype,     // ⭐ NEW
      age_of_structure: structure.structural_identity.age_of_structure,       // ⭐ NEW
      commercial_subtype: structure.structural_identity.commercial_subtype,
      location: structure.location,
      formatted_display: generatedNumbers.formatted_display,
      status: structure.status,
      message: 'Location details saved successfully'
    });

  } catch (error) {
    console.error('❌ Location save error:', error);
    return sendErrorResponse(res, 500, 'Failed to save location details', error.message);
  }
}



  async getLocationScreen(req, res) {
  try {
    const { id } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    sendSuccessResponse(res, 200, {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      structural_identity: {
        ...structure.structural_identity?.toObject?.() || structure.structural_identity || {},
        structure_subtype: structure.structural_identity?.structure_subtype || 'rcc',  // ⭐ NEW
        age_of_structure: structure.structural_identity?.age_of_structure || 0         // ⭐ NEW
      },
      location: structure.location || { 
        longitude: null,
        latitude: null,
        address: ''
      }
    });

  } catch (error) {
    console.error('❌ Location get error:', error);
    return sendErrorResponse(res, 500, 'Failed to get location details', error.message);
  }
}

  async updateLocationScreen(req, res) {
    return this.saveLocationScreen(req, res);
  }

  // =================== SCREEN 2: ADMINISTRATIVE ===================
 

async saveAdministrativeScreen(req, res) {
  try {
    const { id } = req.params;
    const { client_name, custodian, engineer_designation, contact_details, email_id } = req.body;

    const { user, structure } =
      await this.findUserStructure(req.user.userId, id, req.user);

    structure.administrative = {   // ✅ USE SCHEMA FIELD NAME
      client_name,
      custodian,
      engineer_designation,
      contact_details,
      email_id
    };

    structure.creation_info.last_updated_date = new Date();
    structure.status = 'admin_completed';

    user.markModified('structures'); // 🔥 CRITICAL
    await user.save();               // 🔥 REQUIRED

    return sendSuccessResponse(res, 'Administrative details saved successfully', {
      structure_id: id,
      uid: structure.structural_identity.uid,
      administrative: structure.administrative,
      status: structure.status
    });

  } catch (error) {
    console.error('❌ Administrative save error:', error);
    return sendErrorResponse(res, 'Failed to save administrative details', 500, error.message);
  }
}
  async getAdministrativeScreen(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      sendSuccessResponse(res, 'Administrative details retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        administrative: structure.administrative || {}
      });

    } catch (error) {
      console.error('❌ Administrative get error:', error);
      sendErrorResponse(res, 'Failed to get administrative details', 500, error.message);
    }
  }

  async updateAdministrativeScreen(req, res) {
    return this.saveAdministrativeScreen(req, res);
  }

  // =================== SCREEN 3: GEOMETRIC DETAILS ===================
  async saveGeometricDetails(req, res) {
  try {
    const { id } = req.params;
    const { 
      number_of_floors, structure_width, structure_length, structure_height,
      has_parking_floors, number_of_parking_floors 
    } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const structureType = structure.structural_identity?.type_of_structure;
    const commercialSubtype = structure.structural_identity?.commercial_subtype;
    
    // Apply parking logic for residential and commercial+residential structures
    const needsParkingOption = structureType === 'residential' || 
                               commercialSubtype === 'commercial_residential';
    
    structure.geometric_details = {
      ...structure.geometric_details,
      number_of_floors: parseInt(number_of_floors),
      structure_width: parseFloat(structure_width),
      structure_length: parseFloat(structure_length),
      structure_height: parseFloat(structure_height)
    };
    
    // Auto-create parking floors if specified
    if (needsParkingOption && has_parking_floors && number_of_parking_floors > 0) {
      const existingParkingFloors = structure.geometric_details.floors?.filter(
        f => f.is_parking_floor
      ) || [];
      
      const parkingFloorsToAdd = parseInt(number_of_parking_floors) - existingParkingFloors.length;
      
      if (parkingFloorsToAdd > 0) {
        for (let i = 0; i < parkingFloorsToAdd; i++) {
          const floorNumber = -(existingParkingFloors.length + i + 1); // Negative for basement parking
          const parkingFloor = {
            floor_id: this.generateFloorId(),
            floor_number: floorNumber,
            is_parking_floor: true,
            floor_label_name: `Parking Level ${Math.abs(floorNumber)}`,
            floor_height: 3, // Default parking height
            total_area_sq_mts: structure_width * structure_length,
            number_of_flats: 0,
            number_of_blocks: 0,
            flats: [],
            blocks: [],
            floor_notes: 'Auto-generated parking floor'
          };
          
          structure.geometric_details.floors = structure.geometric_details.floors || [];
          structure.geometric_details.floors.push(parkingFloor);
        }
      }
    }
    
    structure.creation_info.last_updated_date = new Date();
    structure.status = 'geometric_completed';
    await user.save();
    
    sendSuccessResponse(res, 'Geometric details saved successfully', {
      structure_id: id,
      uid: structure.structural_identity.uid,
      structure_type: structureType,
      commercial_subtype: commercialSubtype,
      geometric_details: {
        number_of_floors: structure.geometric_details.number_of_floors,
        structure_width: structure.geometric_details.structure_width,
        structure_length: structure.geometric_details.structure_length,
        structure_height: structure.geometric_details.structure_height,
        total_area: structure.geometric_details.structure_width * structure.geometric_details.structure_length,
        total_floors_created: structure.geometric_details.floors?.length || 0
      },
      status: structure.status
    });

  } catch (error) {
    console.error('❌ Geometric details save error:', error);
    sendErrorResponse(res, 'Failed to save geometric details', 500, error.message);
  }
}

  async getGeometricDetails(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const geometricData = structure.geometric_details || {};
      
      sendSuccessResponse(res, 'Geometric details retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        geometric_details: {
          number_of_floors: geometricData.number_of_floors,
          structure_width: geometricData.structure_width,
          structure_length: geometricData.structure_length,
          structure_height: geometricData.structure_height,
          total_area: geometricData.structure_width && geometricData.structure_length ? 
            geometricData.structure_width * geometricData.structure_length : null
        }
      });

    } catch (error) {
      console.error('❌ Geometric details get error:', error);
      sendErrorResponse(res, 'Failed to get geometric details', 500, error.message);
    }
  }

  /**
   * Get available parking floor types
   * @route GET /api/structures/parking-floor-types
   * @access Private
   */
  async getParkingFloorTypes(req, res) {
    try {
      const parkingFloorTypes = [
        { value: 'stilt', label: 'Stilt (Ground Level Parking)' },
        { value: 'cellar', label: 'Cellar (Single Level Below Ground)' },
        { value: 'subcellar_1', label: 'Subcellar 1 (First Level Below Cellar)' },
        { value: 'subcellar_2', label: 'Subcellar 2 (Second Level Below Cellar)' },
        { value: 'subcellar_3', label: 'Subcellar 3 (Third Level Below Cellar)' },
        { value: 'subcellar_4', label: 'Subcellar 4 (Fourth Level Below Cellar)' },
        { value: 'subcellar_5', label: 'Subcellar 5 (Fifth Level Below Cellar)' }
      ];

      sendSuccessResponse(res, 'Parking floor types retrieved successfully', {
        parking_floor_types: parkingFloorTypes
      });
    } catch (error) {
      console.error('❌ Error fetching parking floor types:', error);
      sendErrorResponse(res, 'Failed to fetch parking floor types', 500, error.message);
    }
  }

  async addBlocksToFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const { blocks } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    if (structure.structural_identity?.type_of_structure !== 'industrial') {
      return sendErrorResponse(res, 'Blocks can only be added to industrial structures', 400);
    }
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }

    const createdBlocks = [];
    
    blocks.forEach((blockData, index) => {
      const blockId = this.generateBlockId();
      const newBlock = {
        block_id: blockId,
        block_number: blockData.block_number || `B${floor.floor_number}-${String(index + 1).padStart(2, '0')}`,
        block_name: blockData.block_name || `Block ${index + 1}`,
        block_type: blockData.block_type || 'manufacturing',
        area_sq_mts: blockData.area_sq_mts || null,
        // Initialize empty rating structures for industrial components
        structural_rating: {
          beams: { rating: null, condition_comment: '', photos: [] },
          columns: { rating: null, condition_comment: '', photos: [] },
          slab: { rating: null, condition_comment: '', photos: [] },
          foundation: { rating: null, condition_comment: '', photos: [] },
          roof_truss: { rating: null, condition_comment: '', photos: [] }
        },
        non_structural_rating: {
          walls_cladding: { rating: null, condition_comment: '', photos: [] },
          industrial_flooring: { rating: null, condition_comment: '', photos: [] },
          ventilation: { rating: null, condition_comment: '', photos: [] },
          electrical_system: { rating: null, condition_comment: '', photos: [] },
          fire_safety: { rating: null, condition_comment: '', photos: [] },
          drainage: { rating: null, condition_comment: '', photos: [] },
          overhead_cranes: { rating: null, condition_comment: '', photos: [] },
          loading_docks: { rating: null, condition_comment: '', photos: [] }
        },
        block_notes: blockData.block_notes || ''
      };
      
      floor.blocks = floor.blocks || [];
      floor.blocks.push(newBlock);
      createdBlocks.push({
        block_id: blockId,
        block_number: newBlock.block_number,
        block_name: newBlock.block_name,
        block_type: newBlock.block_type,
        area_sq_mts: newBlock.area_sq_mts
      });
    });
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendCreatedResponse(res, {
      structure_id: id,
      floor_id: floorId,
      blocks_added: createdBlocks.length,
      blocks: createdBlocks
    }, `${createdBlocks.length} block(s) added successfully`);

  } catch (error) {
    console.error('❌ Add blocks error:', error);
    sendErrorResponse(res, 'Failed to add blocks', 500, error.message);
  }
}

async saveBlockRatings(req, res) {
  try {
    const { id, floorId, blockId } = req.params;
    const { structural_rating, non_structural_rating } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    if (structure.structural_identity?.type_of_structure !== 'industrial') {
      return sendErrorResponse(res, 'Block ratings are only for industrial structures', 400);
    }
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const block = floor.blocks?.find(b => b.block_id === blockId);
    if (!block) {
      return sendErrorResponse(res, 'Block not found', 404);
    }
    
    const inspectionDate = new Date();
    
    // ✅ FIXED: Update structural ratings for industrial components with IDs
    if (structural_rating) {
      block.structural_rating = {
        beams: this.createRatingComponent(structural_rating.beams, inspectionDate, 'beams'),
        columns: this.createRatingComponent(structural_rating.columns, inspectionDate, 'columns'),
        slab: this.createRatingComponent(structural_rating.slab, inspectionDate, 'slab'),
        foundation: this.createRatingComponent(structural_rating.foundation, inspectionDate, 'foundation'),
        roof_truss: this.createRatingComponent(structural_rating.roof_truss, inspectionDate, 'roof_truss')
      };
      
      // Calculate block structural average
      const structuralRatings = [
        block.structural_rating.beams?.rating,
        block.structural_rating.columns?.rating,
        block.structural_rating.slab?.rating,
        block.structural_rating.foundation?.rating,
        block.structural_rating.roof_truss?.rating
      ].filter(r => r);
      
      if (structuralRatings.length > 0) {
        block.structural_rating.overall_average = this.calculateAverage(structuralRatings);
        block.structural_rating.health_status = this.getHealthStatus(block.structural_rating.overall_average);
        block.structural_rating.assessment_date = inspectionDate;
      }
    }
    
    // ✅ FIXED: Update non-structural ratings for industrial components with IDs
    if (non_structural_rating) {
      block.non_structural_rating = {
        walls_cladding: this.createRatingComponent(non_structural_rating.walls_cladding, inspectionDate, 'walls_cladding'),
        industrial_flooring: this.createRatingComponent(non_structural_rating.industrial_flooring, inspectionDate, 'industrial_flooring'),
        ventilation: this.createRatingComponent(non_structural_rating.ventilation, inspectionDate, 'ventilation'),
        electrical_system: this.createRatingComponent(non_structural_rating.electrical_system, inspectionDate, 'electrical_system'),
        fire_safety: this.createRatingComponent(non_structural_rating.fire_safety, inspectionDate, 'fire_safety'),
        drainage: this.createRatingComponent(non_structural_rating.drainage, inspectionDate, 'drainage'),
        overhead_cranes: this.createRatingComponent(non_structural_rating.overhead_cranes, inspectionDate, 'overhead_cranes'),
        loading_docks: this.createRatingComponent(non_structural_rating.loading_docks, inspectionDate, 'loading_docks')
      };
      
      // Calculate block non-structural average
      const nonStructuralRatings = [
        block.non_structural_rating.walls_cladding?.rating,
        block.non_structural_rating.industrial_flooring?.rating,
        block.non_structural_rating.ventilation?.rating,
        block.non_structural_rating.electrical_system?.rating,
        block.non_structural_rating.fire_safety?.rating,
        block.non_structural_rating.drainage?.rating,
        block.non_structural_rating.overhead_cranes?.rating,
        block.non_structural_rating.loading_docks?.rating
      ].filter(r => r);
      
      if (nonStructuralRatings.length > 0) {
        block.non_structural_rating.overall_average = this.calculateAverage(nonStructuralRatings);
        block.non_structural_rating.assessment_date = inspectionDate;
      }
    }
    
    // Calculate block overall rating
    if (block.structural_rating?.overall_average && block.non_structural_rating?.overall_average) {
      const structuralWeight = 0.7;
      const nonStructuralWeight = 0.3;
      
      const combinedScore = (block.structural_rating.overall_average * structuralWeight) + 
                           (block.non_structural_rating.overall_average * nonStructuralWeight);
      
      block.block_overall_rating = {
        combined_score: Math.round(combinedScore * 10) / 10,
        health_status: this.getHealthStatus(combinedScore),
        priority: this.getPriority(combinedScore),
        last_assessment_date: inspectionDate
      };
    }
    
    structure.creation_info.last_updated_date = new Date();
    structure.status = 'ratings_in_progress';
    await user.save();
    
    sendSuccessResponse(res, 'Block ratings saved successfully', {
      structure_id: id,
      floor_id: floorId,
      block_id: blockId,
      block_number: block.block_number,
      block_name: block.block_name,
      block_ratings: {
        structural_rating: block.structural_rating,
        non_structural_rating: block.non_structural_rating,
        block_overall_rating: block.block_overall_rating
      }
    });

  } catch (error) {
    console.error('❌ Save block ratings error:', error);
    sendErrorResponse(res, 'Failed to save block ratings', 500, error.message);
  }
}
  async updateGeometricDetails(req, res) {
    return this.saveGeometricDetails(req, res);
  }

  // =================== FLOORS MANAGEMENT ===================
  async addFloors(req, res) {
    try {
      const { id } = req.params;
      const { floors } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      if (!structure.geometric_details) {
        return sendErrorResponse(res, 'Please save geometric details first', 400);
      }

      const createdFloors = [];
      
      floors.forEach((floorData, index) => {
        const floorId = this.generateFloorId();
        
        // Validate parking floor data and inherit geometric-level parking_floor_type
        const isParkingFloor = floorData.is_parking_floor === true;
        const inheritedParkingType = structure.geometric_details?.parking_floor_type || null;
        const parkingFloorType = isParkingFloor ? (floorData.parking_floor_type || inheritedParkingType) : undefined;
        if (isParkingFloor && !parkingFloorType) {
          throw new Error(`Parking floor type is required when is_parking_floor is true (Floor ${floorData.floor_number || (index + 1)})`);
        }

        const newFloor = {
          floor_id: floorId,
          floor_number: floorData.floor_number || (index + 1),
          is_parking_floor: isParkingFloor,
          parking_floor_type: parkingFloorType,
          floor_height: floorData.floor_height || null,
          total_area_sq_mts: floorData.total_area_sq_mts || null,
          floor_label_name: floorData.floor_label_name || `Floor ${floorData.floor_number || (index + 1)}`,
          number_of_flats: floorData.number_of_flats || 0,
          flats: [],
          floor_notes: floorData.floor_notes || ''
        };
        
        structure.geometric_details.floors.push(newFloor);
        createdFloors.push({
          floor_id: floorId,
          floor_number: newFloor.floor_number,
          is_parking_floor: newFloor.is_parking_floor,
          parking_floor_type: newFloor.parking_floor_type,
          floor_label_name: newFloor.floor_label_name
        });
      });
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendCreatedResponse(res, {
        structure_id: id,
        floors_added: createdFloors.length,
        floors: createdFloors
      }, `${createdFloors.length} floor(s) added successfully`);

    } catch (error) {
      console.error('❌ Add floors error:', error);
      sendErrorResponse(res, 'Failed to add floors', 500, error.message);
    }
  }

  async getFloors(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floors = structure.geometric_details?.floors || [];
      const floorsData = floors.map(floor => ({
        floor_id: floor.floor_id,
        mongodb_id: floor._id,
        floor_number: floor.floor_number,
       
        is_parking_floor: floor.is_parking_floor || false,
        parking_floor_type: floor.parking_floor_type || null,
        floor_height: floor.floor_height,
        total_area_sq_mts: floor.total_area_sq_mts,
        floor_label_name: floor.floor_label_name,
        number_of_flats: floor.flats ? floor.flats.length : 0,
        floor_notes: floor.floor_notes
      }));
      
      sendSuccessResponse(res, 'Floors retrieved successfully', {
        structure_id: id,
        total_floors: floorsData.length,
        floors: floorsData
      });

    } catch (error) {
      console.error('❌ Get floors error:', error);
      sendErrorResponse(res, 'Failed to get floors', 500, error.message);
    }
  }

  async getFloorById(req, res) {
    try {
      const { id, floorId } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      sendSuccessResponse(res, 'Floor details retrieved successfully', {
        structure_id: id,
        floor: {
          floor_id: floor.floor_id,
          mongodb_id: floor._id,
          floor_number: floor.floor_number,
          is_parking_floor: floor.is_parking_floor || false,
          parking_floor_type: floor.parking_floor_type || null,
          floor_height: floor.floor_height,
          total_area_sq_mts: floor.total_area_sq_mts,
          floor_label_name: floor.floor_label_name,
          number_of_flats: floor.flats ? floor.flats.length : 0,
          floor_notes: floor.floor_notes,
          flats: floor.flats || []
        }
      });

    } catch (error) {
      console.error('❌ Get floor error:', error);
      sendErrorResponse(res, 'Failed to get floor details', 500, error.message);
    }
  }

  async updateFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const updateData = req.body;

    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);

    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }

    // Update only allowed keys
    Object.keys(updateData).forEach(key => {
      // Skip 'flats' if not a parking floor
      if (key === 'flats' && floor.is_parking_floor === false) return;

      if (updateData[key] !== undefined) {
        floor[key] = updateData[key];
      }
    });

    structure.creation_info.last_updated_date = new Date();
    await user.save();

    sendUpdatedResponse(res, {
      structure_id: id,
      floor_id: floorId,
      updated_floor: {
        floor_id: floor.floor_id,
        floor_number: floor.floor_number,
        floor_label_name: floor.floor_label_name,
        is_parking_floor: floor.is_parking_floor,
        parking_floor_type: floor.parking_floor_type
      }
    }, 'Floor updated successfully');

  } catch (error) {
    console.error('❌ Update floor error:', error);
    sendErrorResponse(res, 'Failed to update floor', 500, error.message);
  }
}


  async deleteFloor(req, res) {
    try {
      const { id, floorId } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floorIndex = structure.geometric_details?.floors?.findIndex(
        floor => floor.floor_id === floorId
      );
      
      if (floorIndex === -1) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      structure.geometric_details.floors.splice(floorIndex, 1);
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendSuccessResponse(res, 'Floor deleted successfully', {
        structure_id: id,
        deleted_floor_id: floorId
      });

    } catch (error) {
      console.error('❌ Delete floor error:', error);
      sendErrorResponse(res, 'Failed to delete floor', 500, error.message);
    }
  }

  // =================== FLATS MANAGEMENT ===================
async addFlatsToFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const { flats } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }

    const createdFlats = [];
    
    flats.forEach((flatData, index) => {
      const flatId = this.generateFlatId();
      const newFlat = {
        flat_id: flatId,
        flat_number: flatData.flat_number || `F${floor.floor_number}-${String(index + 1).padStart(2, '0')}`,
        flat_type: flatData.flat_type || '2bhk',
        area_sq_mts: flatData.area_sq_mts || null,
        direction_facing: flatData.direction_facing || 'north',
        occupancy_status: flatData.occupancy_status || 'occupied',
        flat_notes: flatData.flat_notes || ''
        // ✅ REMOVED: Don't initialize rating structures!
        // Let the schema handle it with default: undefined
      };
      
      floor.flats.push(newFlat);
      createdFlats.push({
        flat_id: flatId,
        flat_number: newFlat.flat_number,
        flat_type: newFlat.flat_type,
        area_sq_mts: newFlat.area_sq_mts
      });
    });
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendCreatedResponse(res, {
      structure_id: id,
      floor_id: floorId,
      flats_added: createdFlats.length,
      flats: createdFlats
    }, `${createdFlats.length} flat(s) added successfully`);

  } catch (error) {
    console.error('❌ Add flats error:', error);
    sendErrorResponse(res, 'Failed to add flats', 500, error.message);
  }
}

 async getFlatsInFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);

    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }

    const flatsData = floor.flats.map(flat => ({
      flat_id: flat.flat_id,
      mongodb_id: flat._id,
      flat_number: flat.flat_number,
      flat_type: flat.flat_type,
      area_sq_mts: flat.area_sq_mts,
      direction_facing: flat.direction_facing,
      occupancy_status: flat.occupancy_status,
      flat_notes: flat.flat_notes,

      // Indicators
      has_structural_ratings: this.hasStructuralRating(flat),
      has_non_structural_ratings: this.hasNonStructuralRating(flat),

      // Detailed ratings
      structural_rating: flat.structural_rating || this.getDefaultStructuralRating(),
      non_structural_rating: flat.non_structural_rating || this.getDefaultNonStructuralRating(),

      // Overall rating summary
      flat_overall_rating: flat.flat_overall_rating || null,
      health_status: flat.flat_overall_rating?.health_status || null,
      priority: flat.flat_overall_rating?.priority || null,
      combined_score: flat.flat_overall_rating?.combined_score || null
    }));

    sendSuccessResponse(res, 'Flats retrieved successfully', {
      structure_id: id,
      floor_id: floorId,
      floor_number: floor.floor_number,
      total_flats: flatsData.length,
      flats: flatsData
    });

  } catch (error) {
    console.error('❌ Get flats error:', error);
    sendErrorResponse(res, 'Failed to get flats', 500, error.message);
  }
}


  async getFlatById(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      sendSuccessResponse(res, 'Flat details retrieved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat: {
          flat_id: flat.flat_id,
          mongodb_id: flat._id,
          flat_number: flat.flat_number,
          flat_type: flat.flat_type,
          area_sq_mts: flat.area_sq_mts,
          direction_facing: flat.direction_facing,
          occupancy_status: flat.occupancy_status,
          flat_notes: flat.flat_notes,
          structural_rating: flat.structural_rating || {},
          non_structural_rating: flat.non_structural_rating || {},
          flat_overall_rating: flat.flat_overall_rating || null
        }
      });

    } catch (error) {
      console.error('❌ Get flat error:', error);
      sendErrorResponse(res, 'Failed to get flat details', 500, error.message);
    }
  }

  async updateFlat(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const updateData = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      Object.keys(updateData).forEach(key => {
        if (!['structural_rating', 'non_structural_rating'].includes(key) && updateData[key] !== undefined) {
          flat[key] = updateData[key];
        }
      });
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendUpdatedResponse(res, {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        updated_flat: {
          flat_id: flat.flat_id,
          flat_number: flat.flat_number,
          flat_type: flat.flat_type
        }
      }, 'Flat updated successfully');

    } catch (error) {
      console.error('❌ Update flat error:', error);
      sendErrorResponse(res, 'Failed to update flat', 500, error.message);
    }
  }

  async deleteFlat(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flatIndex = floor.flats.findIndex(flat => flat.flat_id === flatId);
      if (flatIndex === -1) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      floor.flats.splice(flatIndex, 1);
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendSuccessResponse(res, 'Flat deleted successfully', {
        structure_id: id,
        floor_id: floorId,
        deleted_flat_id: flatId
      });

    } catch (error) {
      console.error('❌ Delete flat error:', error);
      sendErrorResponse(res, 'Failed to delete flat', 500, error.message);
    }
  }

  // =================== FLAT RATINGS (ONLY flat-level) ===================
// =================== FLAT-LEVEL RATINGS ===================
async saveFlatCombinedRatings(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { structural_rating, non_structural_rating } = req.body;

    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);

    const type = structure.structural_identity?.type_of_structure;
    const subtype = structure.structural_identity?.commercial_subtype;

    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) return sendErrorResponse(res, 'Floor not found', 404);

    const flat = floor.flats?.find(fl => fl.flat_id === flatId);
    if (!flat) return sendErrorResponse(res, 'Flat not found', 404);

    // Check if flat ratings are allowed
    if (
      type === 'residential' ||
      (type === 'commercial' && subtype === 'commercial_residential')
    ) {
      const inspectionDate = new Date();

      // ✅ FIXED: Create arrays of component instances
      if (structural_rating) {
        flat.structural_rating = {
          // Wrap each component in an array
          beams: structural_rating.beams ? [this.createRatingComponent(structural_rating.beams, inspectionDate, 'beams')].filter(Boolean) : [],
          columns: structural_rating.columns ? [this.createRatingComponent(structural_rating.columns, inspectionDate, 'columns')].filter(Boolean) : [],
          slab: structural_rating.slab ? [this.createRatingComponent(structural_rating.slab, inspectionDate, 'slab')].filter(Boolean) : [],
          foundation: structural_rating.foundation ? [this.createRatingComponent(structural_rating.foundation, inspectionDate, 'foundation')].filter(Boolean) : [],
        };

        // Calculate average from all components
        const ratings = [
          structural_rating.beams?.rating,
          structural_rating.columns?.rating,
          structural_rating.slab?.rating,
          structural_rating.foundation?.rating
        ].filter(r => r);

        if (ratings.length > 0) {
          flat.structural_rating.overall_average = this.calculateAverage(ratings);
          flat.structural_rating.health_status = this.getHealthStatus(flat.structural_rating.overall_average);
          flat.structural_rating.assessment_date = inspectionDate;
        }
      }

      // ✅ FIXED: Create arrays of component instances
      if (non_structural_rating) {
        flat.non_structural_rating = {
          brick_plaster: non_structural_rating.brick_plaster ? [this.createRatingComponent(non_structural_rating.brick_plaster, inspectionDate, 'brick_plaster')].filter(Boolean) : [],
          doors_windows: non_structural_rating.doors_windows ? [this.createRatingComponent(non_structural_rating.doors_windows, inspectionDate, 'doors_windows')].filter(Boolean) : [],
          flooring_tiles: non_structural_rating.flooring_tiles ? [this.createRatingComponent(non_structural_rating.flooring_tiles, inspectionDate, 'flooring_tiles')].filter(Boolean) : [],
          electrical_wiring: non_structural_rating.electrical_wiring ? [this.createRatingComponent(non_structural_rating.electrical_wiring, inspectionDate, 'electrical_wiring')].filter(Boolean) : [],
          sanitary_fittings: non_structural_rating.sanitary_fittings ? [this.createRatingComponent(non_structural_rating.sanitary_fittings, inspectionDate, 'sanitary_fittings')].filter(Boolean) : [],
          railings: non_structural_rating.railings ? [this.createRatingComponent(non_structural_rating.railings, inspectionDate, 'railings')].filter(Boolean) : [],
          water_tanks: non_structural_rating.water_tanks ? [this.createRatingComponent(non_structural_rating.water_tanks, inspectionDate, 'water_tanks')].filter(Boolean) : [],
          plumbing: non_structural_rating.plumbing ? [this.createRatingComponent(non_structural_rating.plumbing, inspectionDate, 'plumbing')].filter(Boolean) : [],
          sewage_system: non_structural_rating.sewage_system ? [this.createRatingComponent(non_structural_rating.sewage_system, inspectionDate, 'sewage_system')].filter(Boolean) : [],
          panel_board: non_structural_rating.panel_board ? [this.createRatingComponent(non_structural_rating.panel_board, inspectionDate, 'panel_board')].filter(Boolean) : [],
          lifts: non_structural_rating.lifts ? [this.createRatingComponent(non_structural_rating.lifts, inspectionDate, 'lifts')].filter(Boolean) : []
        };

        const ratings = [
          non_structural_rating.brick_plaster?.rating,
          non_structural_rating.doors_windows?.rating,
          non_structural_rating.flooring_tiles?.rating,
          non_structural_rating.electrical_wiring?.rating,
          non_structural_rating.sanitary_fittings?.rating,
          non_structural_rating.railings?.rating,
          non_structural_rating.water_tanks?.rating,
          non_structural_rating.plumbing?.rating,
          non_structural_rating.sewage_system?.rating,
          non_structural_rating.panel_board?.rating,
          non_structural_rating.lifts?.rating
        ].filter(r => r);

        if (ratings.length > 0) {
          flat.non_structural_rating.overall_average = this.calculateAverage(ratings);
          flat.non_structural_rating.assessment_date = inspectionDate;
        }
      }

      // Combined flat rating
      if (flat.structural_rating?.overall_average && flat.non_structural_rating?.overall_average) {
        const combinedScore =
          (flat.structural_rating.overall_average * 0.7) +
          (flat.non_structural_rating.overall_average * 0.3);

        flat.flat_overall_rating = {
          combined_score: Math.round(combinedScore * 10) / 10,
          health_status: this.getHealthStatus(combinedScore),
          priority: this.getPriority(combinedScore),
          last_assessment_date: inspectionDate
        };
      }

      structure.creation_info.last_updated_date = new Date();
      structure.status = 'ratings_in_progress';
      await user.save();

      return sendSuccessResponse(res, 'Flat ratings saved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        flat_ratings: {
          structural_rating: flat.structural_rating,
          non_structural_rating: flat.non_structural_rating,
          flat_overall_rating: flat.flat_overall_rating
        }
      });
    }

    return sendErrorResponse(res, 'Flat ratings not allowed for this structure/floor type', 400);

  } catch (err) {
    console.error('❌ Flat ratings error:', err);
    sendErrorResponse(res, 'Failed to save flat ratings', 500, err.message);
  }
}


async getFlatCombinedRatings(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const flat = floor.flats.find(f => f.flat_id === flatId);
    if (!flat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // ✅ Helper function to convert array format to single object (backward compatible)
    const convertArrayToSingle = (componentArray) => {
      if (!componentArray || !Array.isArray(componentArray) || componentArray.length === 0) {
        return { rating: null, condition_comment: '', photo: '', photos: [], inspection_date: null };
      }
      // Return first item for backward compatibility
      const component = componentArray[0];
      const componentPhotos = normalizePhotoList(component.photos, component.photo);
      return {
        rating: component.rating || null,
        condition_comment: component.condition_comment || '',
        photo: componentPhotos[0] || '',
        photos: componentPhotos,
        inspection_date: component.inspection_date || null,
        inspector_notes: component.inspector_notes || '',
        _id: component._id,
        name: component.name
      };
    };
    
    // Convert structural ratings
    const structuralRating = {
      beams: convertArrayToSingle(flat.structural_rating?.beams),
      columns: convertArrayToSingle(flat.structural_rating?.columns),
      slab: convertArrayToSingle(flat.structural_rating?.slab),
      foundation: convertArrayToSingle(flat.structural_rating?.foundation),
      overall_average: flat.structural_rating?.overall_average || null,
      health_status: flat.structural_rating?.health_status || null,
      assessment_date: flat.structural_rating?.assessment_date || null
    };
    
    // Convert non-structural ratings
    const nonStructuralRating = {
      brick_plaster: convertArrayToSingle(flat.non_structural_rating?.brick_plaster),
      doors_windows: convertArrayToSingle(flat.non_structural_rating?.doors_windows),
      flooring_tiles: convertArrayToSingle(flat.non_structural_rating?.flooring_tiles),
      electrical_wiring: convertArrayToSingle(flat.non_structural_rating?.electrical_wiring),
      sanitary_fittings: convertArrayToSingle(flat.non_structural_rating?.sanitary_fittings),
      railings: convertArrayToSingle(flat.non_structural_rating?.railings),
      water_tanks: convertArrayToSingle(flat.non_structural_rating?.water_tanks),
      plumbing: convertArrayToSingle(flat.non_structural_rating?.plumbing),
      sewage_system: convertArrayToSingle(flat.non_structural_rating?.sewage_system),
      panel_board: convertArrayToSingle(flat.non_structural_rating?.panel_board),
      lifts: convertArrayToSingle(flat.non_structural_rating?.lifts),
      overall_average: flat.non_structural_rating?.overall_average || null,
      assessment_date: flat.non_structural_rating?.assessment_date || null
    };
    
    sendSuccessResponse(res, 'Flat ratings retrieved successfully', {
      structural_rating: structuralRating,
      non_structural_rating: nonStructuralRating,
      flat_overall_rating: flat.flat_overall_rating || null
    });

  } catch (error) {
    console.error('❌ Get flat combined ratings error:', error);
    sendErrorResponse(res, 'Failed to get flat ratings', 500, error.message);
  }
}

// =================== HELPER METHOD ===================
// ✅ Updated to handle optional fields
createRatingComponent(ratingData, inspectionDate, componentName) {
  // Validate input - return null if no rating provided
  if (!ratingData || !ratingData.rating) {
    console.log(`⚠️  No rating data provided for component: ${componentName}`);
    return null;
  }

  // Validate rating value
  const rating = parseInt(ratingData.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    console.error(`❌ Invalid rating value for ${componentName}: ${ratingData.rating}`);
    return null;
  }

  // ✅ Generate component ID if not provided
  let componentId;
  if (ratingData.component_id && ratingData.component_id.trim() !== '') {
    componentId = ratingData.component_id.trim().substring(0, 100);
  } else {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    componentId = `${componentName}_${timestamp}_${randomString}`;
  }

  // ✅ Generate display name if not provided
  let displayName;
  if (ratingData.component_name && ratingData.component_name.trim() !== '') {
    displayName = ratingData.component_name.trim().substring(0, 100);
  } else if (ratingData.name && ratingData.name.trim() !== '') {
    displayName = ratingData.name.trim().substring(0, 100);
  } else {
    displayName = componentName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // ✅ Normalize photos input (supports both `photo` and `photos`)
  const photos = normalizePhotoList(ratingData.photos, ratingData.photo).slice(0, 50);
  const photoUrl = photos[0] || '';

  const conditionComment = ratingData.condition_comment 
    ? ratingData.condition_comment.trim().substring(0, 1000) 
    : '';

  const inspectorNotes = ratingData.inspector_notes 
    ? ratingData.inspector_notes.trim().substring(0, 2000) 
    : '';

  // ✅ Create the rating component object
  const ratingComponent = {
    _id: componentId,
    name: displayName,
    rating: rating,
    photo: photoUrl,  // Can be empty string now
    photos: photos,
    condition_comment: conditionComment,
    inspection_date: inspectionDate || new Date(),
    inspector_notes: inspectorNotes
  };

  console.log(`✅ Created rating component for ${componentName}:`, {
    _id: componentId,
    name: displayName,
    rating: rating,
    has_photo: !!photoUrl
  });

  return ratingComponent;
}


/**
 * NEW METHOD 4: getAvailableComponentsBySubtype
 * Location: Add after location methods
 * Purpose: Return valid components based on structure type
 */
getAvailableComponentsBySubtype(structureSubtype, structureType) {
  let availableComponents = {
    structural: [],
    non_structural: []
  };

  if (structureSubtype === 'rcc') {
    availableComponents.structural = [
      { key: 'beams', label: 'Beams', category: 'structural' },
      { key: 'columns', label: 'Columns', category: 'structural' },
      { key: 'slab', label: 'Slab', category: 'structural' },
      { key: 'foundation', label: 'Foundation', category: 'structural' },
      { key: 'roof_truss', label: 'Roof Truss', category: 'structural' }
    ];

    if (structureType === 'industrial') {
      availableComponents.non_structural = [
        { key: 'walls_cladding', label: 'Walls/Cladding' },
        { key: 'industrial_flooring', label: 'Industrial Flooring' },
        { key: 'ventilation', label: 'Ventilation' },
        { key: 'electrical_system', label: 'Electrical System' },
        { key: 'fire_safety', label: 'Fire Safety' },
        { key: 'drainage', label: 'Drainage' },
        { key: 'overhead_cranes', label: 'Overhead Cranes' },
        { key: 'loading_docks', label: 'Loading Docks' }
      ];
    } else {
      availableComponents.non_structural = [
        { key: 'brick_plaster', label: 'Brick/Plaster' },
        { key: 'doors_windows', label: 'Doors & Windows' },
        { key: 'flooring_tiles', label: 'Flooring/Tiles' },
        { key: 'electrical_wiring', label: 'Electrical Wiring' },
        { key: 'sanitary_fittings', label: 'Sanitary Fittings' },
        { key: 'railings', label: 'Railings' },
        { key: 'water_tanks', label: 'Water Tanks' },
        { key: 'plumbing', label: 'Plumbing' },
        { key: 'sewage_system', label: 'Sewage System' },
        { key: 'panel_board', label: 'Panel Board' },
        { key: 'lifts', label: 'Lifts' }
      ];
    }
  } else if (structureSubtype === 'steel') {
    availableComponents.structural = [
      { key: 'foundation', label: 'Foundation (RCC)' },
      { key: 'columns', label: 'Columns (Steel)' },
      { key: 'beams', label: 'Beams (Steel)' },
      { key: 'roof_truss', label: 'Roof Trusses' },
      { key: 'steel_flooring', label: 'Steel Flooring' },
      { key: 'connections', label: 'Connections' },
      { key: 'bracings', label: 'Bracings' },
      { key: 'purlins', label: 'Purlins' },
      { key: 'channels', label: 'Channels' }
    ];

    availableComponents.non_structural = [
      { key: 'cladding_partition_panels', label: 'Cladding/Partition Panels' },
      { key: 'roof_sheeting', label: 'Roof Sheeting' },
      { key: 'chequered_plate', label: 'Chequered Plate' },
      { key: 'doors_windows', label: 'Doors & Windows' },
      { key: 'flooring', label: 'Flooring' },
      { key: 'electrical_wiring', label: 'Electrical Wiring' },
      { key: 'sanitary_fittings', label: 'Sanitary Fittings' },
      { key: 'railings', label: 'Railings' },
      { key: 'water_tanks', label: 'Water Tanks' },
      { key: 'plumbing', label: 'Plumbing' },
      { key: 'sewage_system', label: 'Sewage System' },
      { key: 'panel_board_transformer', label: 'Panel/Board Transformer' },
      { key: 'lift', label: 'Lift' }
    ];
  }

  return availableComponents;
}

/**
 * NEW METHOD 5: validateComponentForSubtype
 * Location: Add after getAvailableComponentsBySubtype
 * Purpose: Validate single component against structure type
 */
validateComponentForSubtype(componentType, structureSubtype, structureType) {
  const availableComponents = this.getAvailableComponentsBySubtype(structureSubtype, structureType);
  
  const isStructural = availableComponents.structural.some(c => c.key === componentType);
  const isNonStructural = availableComponents.non_structural.some(c => c.key === componentType);
  
  return {
    isValid: isStructural || isNonStructural,
    category: isStructural ? 'structural' : (isNonStructural ? 'non_structural' : null),
    availableComponents: availableComponents
  };
}

/**
 * NEW METHOD 6: validateComponentsForStructureType
 * Location: Add after validateComponentForSubtype
 * Purpose: Validate bulk components against structure type
 */
async validateComponentsForStructureType(structure, componentsData) {
  const structureSubtype = structure.structural_identity?.structure_subtype || 'rcc';
  const structureType = structure.structural_identity?.type_of_structure || 'residential';
  
  const errors = [];
  
  for (const structureData of componentsData) {
    const componentType = structureData.component_type;
    
    const validation = this.validateComponentForSubtype(
      componentType,
      structureSubtype,
      structureType
    );
    
    if (!validation.isValid) {
      errors.push({
        component_type: componentType,
        message: `Component type "${componentType}" is not available for ${structureSubtype.toUpperCase()} structures of type ${structureType}`
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    structureInfo: {
      subtype: structureSubtype,
      type: structureType
    }
  };
}

  async updateFlatCombinedRatings(req, res) {
    return this.saveFlatCombinedRatings(req, res);
  }

  // =================== LEGACY INDIVIDUAL RATINGS ===================
  async saveFlatStructuralRating(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { beams, columns, slab, foundation } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      const inspectionDate = new Date();
      
      flat.structural_rating = {
        beams: this.createRatingComponent(beams, inspectionDate),
        columns: this.createRatingComponent(columns, inspectionDate),
        slab: this.createRatingComponent(slab, inspectionDate),
        foundation: this.createRatingComponent(foundation, inspectionDate)
      };
      
      // Calculate average
      const ratings = [beams.rating, columns.rating, slab.rating, foundation.rating].filter(r => r);
      if (ratings.length > 0) {
        flat.structural_rating.overall_average = this.calculateAverage(ratings);
        flat.structural_rating.health_status = this.getHealthStatus(flat.structural_rating.overall_average);
        flat.structural_rating.assessment_date = inspectionDate;
      }
      
      // Update combined rating if non-structural exists
      this.updateFlatCombinedRating(flat);
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendSuccessResponse(res, 'Flat structural ratings saved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        flat_number: flat.flat_number,
        structural_rating: flat.structural_rating
      });

    } catch (error) {
      console.error('❌ Save flat structural rating error:', error);
      sendErrorResponse(res, 'Failed to save flat structural ratings', 500, error.message);
    }
  }


  /**
 * Check if floor has structural ratings
 * @param {Object} floor - Floor object from structure
 * @returns {Boolean} - True if floor has any structural ratings
 */
hasFloorStructuralRating(floor) {
  if (!floor.structural_rating) return false;
  
  return !!(
    (this.normalizeRatingComponents(floor.structural_rating.beams).length > 0) ||
    (this.normalizeRatingComponents(floor.structural_rating.columns).length > 0) ||
    (this.normalizeRatingComponents(floor.structural_rating.slab ?? floor.structural_rating.slabs).length > 0) ||
    (this.normalizeRatingComponents(floor.structural_rating.foundation ?? floor.structural_rating.foundations).length > 0)
  );
}


/**
 * Check if floor has non-structural ratings
 * @param {Object} floor - Floor object from structure
 * @returns {Boolean} - True if floor has any non-structural ratings
 */
hasFloorNonStructuralRating(floor) {
  if (!floor.non_structural_rating) return false;
  
  return Object.values(floor.non_structural_rating).some(value =>
    this.normalizeRatingComponents(value).length > 0
  );
}

  async getFlatStructuralRating(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      const defaultRating = { rating: null, condition_comment: '', photos: [] };
      
      sendSuccessResponse(res, 'Flat structural ratings retrieved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        flat_number: flat.flat_number,
        structural_rating: flat.structural_rating || {
          beams: defaultRating,
          columns: defaultRating,
          slab: defaultRating,
          foundation: defaultRating
        }
      });

    } catch (error) {
      console.error('❌ Get flat structural rating error:', error);
      sendErrorResponse(res, 'Failed to get flat structural ratings', 500, error.message);
    }
  }

  async updateFlatStructuralRating(req, res) {
    return this.saveFlatStructuralRating(req, res);
  }

  async saveFlatNonStructuralRating(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { 
        brick_plaster, doors_windows, flooring_tiles, electrical_wiring,
        sanitary_fittings, railings, water_tanks, plumbing,
        sewage_system, panel_board, lifts 
      } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      const inspectionDate = new Date();
      
      flat.non_structural_rating = {
        brick_plaster: this.createRatingComponent(brick_plaster, inspectionDate),
        doors_windows: this.createRatingComponent(doors_windows, inspectionDate),
        flooring_tiles: this.createRatingComponent(flooring_tiles, inspectionDate),
        electrical_wiring: this.createRatingComponent(electrical_wiring, inspectionDate),
        sanitary_fittings: this.createRatingComponent(sanitary_fittings, inspectionDate),
        railings: this.createRatingComponent(railings, inspectionDate),
        water_tanks: this.createRatingComponent(water_tanks, inspectionDate),
        plumbing: this.createRatingComponent(plumbing, inspectionDate),
        sewage_system: this.createRatingComponent(sewage_system, inspectionDate),
        panel_board: this.createRatingComponent(panel_board, inspectionDate),
        lifts: this.createRatingComponent(lifts, inspectionDate)
      };
      
      // Calculate average
      const ratings = [
        brick_plaster.rating, doors_windows.rating, flooring_tiles.rating, electrical_wiring.rating,
        sanitary_fittings.rating, railings.rating, water_tanks.rating, plumbing.rating,
        sewage_system.rating, panel_board.rating, lifts.rating
      ].filter(r => r);
      
      if (ratings.length > 0) {
        flat.non_structural_rating.overall_average = this.calculateAverage(ratings);
        flat.non_structural_rating.assessment_date = inspectionDate;
      }
      
      // Update combined rating if structural exists
      this.updateFlatCombinedRating(flat);
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendSuccessResponse(res, 'Flat non-structural ratings saved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        flat_number: flat.flat_number,
        non_structural_rating: flat.non_structural_rating
      });

    } catch (error) {
      console.error('❌ Save flat non-structural rating error:', error);
      sendErrorResponse(res, 'Failed to save flat non-structural ratings', 500, error.message);
    }
  }

  async getFlatNonStructuralRating(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      const defaultRating = { rating: null, condition_comment: '', photos: [] };
      
      sendSuccessResponse(res, 'Flat non-structural ratings retrieved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        flat_number: flat.flat_number,
        non_structural_rating: flat.non_structural_rating || {
          brick_plaster: defaultRating,
          doors_windows: defaultRating,
          flooring_tiles: defaultRating,
          electrical_wiring: defaultRating,
          sanitary_fittings: defaultRating,
          railings: defaultRating,
          water_tanks: defaultRating,
          plumbing: defaultRating,
          sewage_system: defaultRating,
          panel_board: defaultRating,
          lifts: defaultRating
        }
      });

    } catch (error) {
      console.error('❌ Get flat non-structural rating error:', error);
      sendErrorResponse(res, 'Failed to get flat non-structural ratings', 500, error.message);
    }
  }


  /**
 * Calculate averages for all non-structural component types
 * @param {Object} nonStructuralRating - Non-structural rating object with component type arrays
 * @returns {Object} - Object with averages for each component type
 */
calculateNonStructuralAverages(nonStructuralRating) {
  if (!nonStructuralRating) return {};
  
  const averages = {};
  
  Object.entries(nonStructuralRating).forEach(([type, components]) => {
    const normalizedComponents = this.normalizeRatingComponents(components);
    if (normalizedComponents.length > 0) {
      averages[type] = this.calculateComponentAverage(normalizedComponents);
    }
  });
  
  return averages;
}

/**
 * Count components with photos
 * @param {Object} floor - Floor object with structural and non-structural ratings
 * @returns {Number} - Total count of components that have photos
 */
countComponentsWithPhotos(floor) {
  let count = 0;
  
  // Count structural components with photos
  if (floor.structural_rating) {
    const structuralComponents = [
      ...this.normalizeRatingComponents(floor.structural_rating.beams),
      ...this.normalizeRatingComponents(floor.structural_rating.columns),
      ...this.normalizeRatingComponents(floor.structural_rating.slab ?? floor.structural_rating.slabs),
      ...this.normalizeRatingComponents(floor.structural_rating.foundation ?? floor.structural_rating.foundations)
    ];

    count += structuralComponents.filter(component =>
      component?.photo || (Array.isArray(component?.photos) && component.photos.length > 0)
    ).length;
  }
  
  // Count non-structural components with photos
  if (floor.non_structural_rating) {
    Object.values(floor.non_structural_rating).forEach(components => {
      const normalizedComponents = this.normalizeRatingComponents(components);
      count += normalizedComponents.filter(component =>
        component?.photo || (Array.isArray(component?.photos) && component.photos.length > 0)
      ).length;
    });
  }
  
  return count;
}

/**
 * Count components with rating 1-3
 * @param {Object} floor - Floor object with structural and non-structural ratings
 * @returns {Number} - Total count of components with rating 1-3
 */
countLowRatedComponents(floor) {
  let count = 0;
  
  // Count structural components with low ratings
  if (floor.structural_rating) {
    const structuralComponents = [
      ...this.normalizeRatingComponents(floor.structural_rating.beams),
      ...this.normalizeRatingComponents(floor.structural_rating.columns),
      ...this.normalizeRatingComponents(floor.structural_rating.slab ?? floor.structural_rating.slabs),
      ...this.normalizeRatingComponents(floor.structural_rating.foundation ?? floor.structural_rating.foundations)
    ];

    count += structuralComponents.filter(component => {
      const rating = Number(component?.rating);
      return !Number.isNaN(rating) && rating <= 3;
    }).length;
  }
  
  // Count non-structural components with low ratings
  if (floor.non_structural_rating) {
    Object.values(floor.non_structural_rating).forEach(components => {
      const normalizedComponents = this.normalizeRatingComponents(components);
      count += normalizedComponents.filter(component => {
        const rating = Number(component?.rating);
        return !Number.isNaN(rating) && rating <= 3;
      }).length;
    });
  }
  
  return count;
}

/**
 * Extract all images from floor ratings
 * @param {Object} floor - Floor object with structural and non-structural ratings
 * @returns {Object} - Object containing structural and non-structural images with summary
 */
extractFloorRatingImages(floor) {
  const images = {
    structural: [],
    non_structural: [],
    summary: {
      total_images: 0,
      structural_count: 0,
      non_structural_count: 0
    }
  };
  
  // Extract structural component images
  if (floor.structural_rating) {
    const structuralGroups = [
      { type: 'beams', components: this.normalizeRatingComponents(floor.structural_rating.beams) },
      { type: 'columns', components: this.normalizeRatingComponents(floor.structural_rating.columns) },
      { type: 'slab', components: this.normalizeRatingComponents(floor.structural_rating.slab ?? floor.structural_rating.slabs) },
      { type: 'foundation', components: this.normalizeRatingComponents(floor.structural_rating.foundation ?? floor.structural_rating.foundations) }
    ];

    structuralGroups.forEach(({ type, components }) => {
      components.forEach(component => {
        const photo = component?.photo || (Array.isArray(component?.photos) ? component.photos[0] : null);
        if (photo) {
          images.structural.push({
            component_type: type,
            component_name: component.name || component.component_name,
            component_id: component._id || component.component_id,
            rating: component.rating,
            photo,
            remarks: component.remarks || component.condition_comment,
            inspection_date: component.inspection_date
          });
          images.summary.structural_count++;
        }
      });
    });
  }
  
  // Extract non-structural component images
  if (floor.non_structural_rating) {
    Object.entries(floor.non_structural_rating).forEach(([type, components]) => {
      const normalizedComponents = this.normalizeRatingComponents(components);
      normalizedComponents.forEach(component => {
        const photo = component?.photo || (Array.isArray(component?.photos) ? component.photos[0] : null);
        if (photo) {
          images.non_structural.push({
            component_type: type,
            component_name: component.name || component.component_name,
            component_id: component._id || component.component_id,
            rating: component.rating,
            photo,
            remarks: component.remarks || component.condition_comment,
            inspection_date: component.inspection_date
          });
          images.summary.non_structural_count++;
        }
      });
    });
  }
  
  images.summary.total_images = images.summary.structural_count + images.summary.non_structural_count;
  
  return images;
}

  async updateFlatNonStructuralRating(req, res) {
    return this.saveFlatNonStructuralRating(req, res);
  }

  // =================== BULK OPERATIONS ===================
  async saveBulkRatings(req, res) {
    try {
      console.log('🚀 Starting bulk ratings save...');
      const { id } = req.params;
      const { floors } = req.body;
      
      console.log(`📊 Processing ${floors?.length || 0} floors for structure ${id}`);
      
      if (!floors || !Array.isArray(floors) || floors.length === 0) {
        return sendErrorResponse(res, 'Floors data is required and must be an array', 400);
      }
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      console.log(`👤 Found user: ${user.username}, structure: ${structure.structural_identity?.uid}`);
      
      let updatedFloors = 0;
      let updatedFlats = 0;
      let errors = [];
      
      // Process each floor in the request
      for (const floorData of floors) {
        const { floor_number, flats } = floorData;
        console.log(`🏢 Processing floor ${floor_number} with ${flats?.length || 0} flats`);
        
        if (!floor_number || !flats || !Array.isArray(flats)) {
          const error = `Invalid data for floor ${floor_number || 'unknown'}`;
          console.error(`❌ ${error}`);
          errors.push(error);
          continue;
        }
        
        // Find the floor in the structure
        const existingFloor = structure.geometric_details?.floors?.find(
          f => f.floor_number === floor_number
        );
        
        if (!existingFloor) {
          const error = `Floor ${floor_number} not found in structure`;
          console.error(`❌ ${error}`);
          errors.push(error);
          continue;
        }
        
        console.log(`✅ Found floor ${floor_number} with ${existingFloor.flats?.length || 0} existing flats`);
        
        // Process each flat in the floor
        for (const flatData of flats) {
          const { flat_number, structural_rating, non_structural_rating } = flatData;
          console.log(`🏠 Processing flat ${flat_number}`);
          
          if (!flat_number) {
            const error = `Flat number missing for floor ${floor_number}`;
            console.error(`❌ ${error}`);
            errors.push(error);
            continue;
          }
          
          // Find the flat in the floor
          const existingFlat = existingFloor.flats?.find(
            f => f.flat_number === flat_number
          );
          
          if (!existingFlat) {
            const error = `Flat ${flat_number} not found in floor ${floor_number}`;
            console.error(`❌ ${error}`);
            errors.push(error);
            continue;
          }
          
          console.log(`✅ Found flat ${flat_number}`);
          
          // Update structural ratings if provided
          if (structural_rating) {
            try {
              this.updateFlatRatings(existingFlat, 'structural_rating', structural_rating);
              console.log(`✅ Updated structural ratings for ${flat_number}`);
            } catch (error) {
              const errorMsg = `Error updating structural ratings for ${flat_number}: ${error.message}`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
          
          // Update non-structural ratings if provided
          if (non_structural_rating) {
            try {
              this.updateFlatRatings(existingFlat, 'non_structural_rating', non_structural_rating);
              console.log(`✅ Updated non-structural ratings for ${flat_number}`);
            } catch (error) {
              const errorMsg = `Error updating non-structural ratings for ${flat_number}: ${error.message}`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
          
          // Update flat combined rating
          this.updateFlatCombinedRating(existingFlat);
          
          updatedFlats++;
        }
        
        updatedFloors++;
      }
      
      // Save the structure
      structure.creation_info.last_updated_date = new Date();
      structure.status = 'ratings_in_progress';
      await user.save();
      console.log('💾 Structure saved successfully');
      
      // Calculate progress after updates
      const progress = this.calculateProgress(structure);
      
      const response = {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        updated_floors: updatedFloors,
        updated_flats: updatedFlats,
        progress: progress,
        errors: errors.length > 0 ? errors : undefined
      };
      
      if (errors.length > 0) {
        console.warn(`⚠️ Bulk ratings completed with ${errors.length} errors`);
        return sendSuccessResponse(res, 
          `Bulk ratings saved with ${errors.length} errors. Updated ${updatedFlats} flats across ${updatedFloors} floors.`, 
          response
        );
      }
      
      sendSuccessResponse(res, 
        `Bulk ratings saved successfully. Updated ${updatedFlats} flats across ${updatedFloors} floors.`, 
        response
      );

    } catch (error) {
      console.error('❌ Bulk ratings save error:', error);
      console.error('❌ Error stack:', error.stack);
      sendErrorResponse(res, 'Failed to save bulk ratings', 500, error.message);
    }
  }

  async getBulkRatings(req, res) {
    try {
      console.log('📊 Getting bulk ratings...');
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      if (!structure.geometric_details?.floors || structure.geometric_details.floors.length === 0) {
        return sendSuccessResponse(res, 'No floors found in structure', {
          structure_id: id,
          uid: structure.structural_identity?.uid,
          floors: []
        });
      }
      
      const floorsWithRatings = structure.geometric_details.floors.map(floor => ({
        floor_number: floor.floor_number,
        floor_label_name: floor.floor_label_name,
        total_flats: floor.flats ? floor.flats.length : 0,
        flats: floor.flats ? floor.flats.map(flat => ({
          flat_number: flat.flat_number,
          flat_type: flat.flat_type,
          area_sq_mts: flat.area_sq_mts,
          direction_facing: flat.direction_facing,
          occupancy_status: flat.occupancy_status,
          structural_rating: flat.structural_rating || this.getDefaultStructuralRating(),
          non_structural_rating: flat.non_structural_rating || this.getDefaultNonStructuralRating(),
          flat_overall_rating: flat.flat_overall_rating || null,
          has_structural_ratings: this.hasStructuralRating(flat),
          has_non_structural_ratings: this.hasNonStructuralRating(flat),
          flat_notes: flat.flat_notes
        })) : []
      }));
      
      sendSuccessResponse(res, 'Bulk ratings retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        total_floors: floorsWithRatings.length,
        total_flats: floorsWithRatings.reduce((sum, floor) => sum + floor.total_flats, 0),
        floors: floorsWithRatings
      });

    } catch (error) {
      console.error('❌ Bulk ratings get error:', error);
      sendErrorResponse(res, 'Failed to get bulk ratings', 500, error.message);
    }
  }

  async updateBulkRatings(req, res) {
    return this.saveBulkRatings(req, res);
  }

  // =================== HELPER METHODS ===================
 /**
 * Create rating component with ID and name
 * @param {Object} ratingData - Rating data from request
 * @param {Date} inspectionDate - Inspection date
 * @param {String} componentName - Name of the component (e.g., 'beams', 'columns')
 * @returns {Object|null} Rating component object
 */
/**
 * Create rating component with unique ID and display name
 * 
 * @param {Object} ratingData - Rating data from request body
 * @param {number} ratingData.rating - Rating value (1-5)
 * @param {string} ratingData.condition_comment - Condition description
 * @param {Array<string>} ratingData.photos - Array of photo URLs
 * @param {string} ratingData.inspector_notes - Inspector's notes
 * @param {string} ratingData.component_id - Custom component ID (optional)
 * @param {string} ratingData.component_name - Custom component name (optional)
 * 
 * @param {Date} inspectionDate - Date of inspection
 * @param {string} componentName - Component key name (e.g., 'beams', 'columns', 'brick_plaster')
 * 
 * @returns {Object|null} Rating component object with ID and name, or null if invalid
 * 
 * @example
 * // Example usage:
 * const beamRating = this.createRatingComponent(
 *   {
 *     rating: 4,
 *     condition_comment: "Good condition",
 *     photos: ["url1.jpg", "url2.jpg"],
 *     inspector_notes: "Minor repairs needed",
 *     component_id: "custom_beam_001", // Optional
 *     component_name: "Main Load Bearing Beams" // Optional
 *   },
 *   new Date(),
 *   'beams'
 * );
 * 
 * // Returns:
 * {
 *   component_id: "custom_beam_001",
 *   component_name: "Main Load Bearing Beams",
 *   rating: 4,
 *   condition_comment: "Good condition",
 *   inspection_date: "2024-01-15T10:30:00.000Z",
 *   photos: ["url1.jpg", "url2.jpg"],
 *   inspector_notes: "Minor repairs needed"
 * }
 */
createRatingComponent(ratingData, inspectionDate, componentName) {
  // Validate input - return null if no rating provided
  if (!ratingData || !ratingData.rating) {
    console.log(`⚠️  No rating data provided for component: ${componentName}`);
    return null;
  }

  // Validate rating value
  const rating = parseInt(ratingData.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    console.error(`❌ Invalid rating value for ${componentName}: ${ratingData.rating}`);
    return null;
  }

  // Generate unique component ID if not provided
  let componentId;
  if (ratingData.component_id && ratingData.component_id.trim() !== '') {
    // Use provided component ID (validate it's not too long)
    componentId = ratingData.component_id.trim().substring(0, 100);
    console.log(`✅ Using provided component ID for ${componentName}: ${componentId}`);
  } else {
    // Auto-generate unique component ID
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    componentId = `${componentName}_${timestamp}_${randomString}`;
    console.log(`🆔 Auto-generated component ID for ${componentName}: ${componentId}`);
  }

  // Generate display-friendly component name
  let displayName;
  if (ratingData.component_name && ratingData.component_name.trim() !== '') {
    // Use provided component name
    displayName = ratingData.component_name.trim().substring(0, 100);
    console.log(`✅ Using provided component name for ${componentName}: ${displayName}`);
  } else {
    // Auto-generate display name from component key
    // Convert snake_case to Title Case
    // Example: 'brick_plaster' → 'Brick Plaster'
    // Example: 'doors_windows' → 'Doors Windows'
    displayName = componentName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    console.log(`📝 Auto-generated component name for ${componentName}: ${displayName}`);
  }

  // Process photos array
  const photos = normalizePhotoList(ratingData.photos, ratingData.photo).slice(0, 50);
  if (photos.length > 0) {
    console.log(`📸 Added ${photos.length} photo(s) for ${componentName}`);
  }

  // Validate condition comment for low ratings
  const conditionComment = ratingData.condition_comment 
    ? ratingData.condition_comment.trim().substring(0, 1000) 
    : '';
  
  if (rating <= 3 && !conditionComment) {
    console.warn(`⚠️  Warning: Rating 1-3 for ${componentName} but no condition comment provided`);
  }

  // Validate photos requirement for all valid ratings
  if (rating >= 1 && rating <= 5 && photos.length === 0) {
    console.warn(`⚠️  Warning: Rating 1-5 for ${componentName} but no photos provided`);
  }

  // Process inspector notes
  const inspectorNotes = ratingData.inspector_notes 
    ? ratingData.inspector_notes.trim().substring(0, 2000) 
    : '';

  // Create and return the rating component object
  const ratingComponent = {
    component_id: componentId,
    component_name: displayName,
    rating: rating,
    photo: photos[0] || '',
    condition_comment: conditionComment,
    inspection_date: inspectionDate || new Date(),
    photos: photos,
    inspector_notes: inspectorNotes
  };

  console.log(`✅ Created rating component for ${componentName}:`, {
    component_id: componentId,
    component_name: displayName,
    rating: rating,
    photos_count: photos.length,
    has_comment: !!conditionComment,
    has_notes: !!inspectorNotes
  });

  return ratingComponent;
}
  
  calculateAverage(ratings) {
    const validRatings = ratings.filter(r => r && !isNaN(r));
    if (validRatings.length === 0) return null;
    
    const average = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
    return Math.round(average * 10) / 10;
  }
  
  getHealthStatus(average) {
    if (!average || isNaN(average)) return null;
    if (average >= 4) return 'Good';
    if (average >= 3) return 'Fair';
    if (average >= 2) return 'Poor';
    return 'Critical';
  }
  
  getPriority(average) {
    if (!average || isNaN(average)) return null;
    if (average >= 4) return 'Low';
    if (average >= 3) return 'Medium';
    if (average >= 2) return 'High';
    return 'Critical';
  }

 updateFlatRatings(flat, ratingType, ratingsData) {
  if (!flat[ratingType]) {
    flat[ratingType] = {};
  }
  
  const inspectionDate = new Date();
  console.log(`🔧 Updating ${ratingType} with ${Object.keys(ratingsData).length} components`);
  
  // ✅ FIXED: Update each component rating with IDs
  Object.keys(ratingsData).forEach(component => {
    const componentData = ratingsData[component];
    
    if (componentData && typeof componentData === 'object' && componentData.rating) {
      flat[ratingType][component] = this.createRatingComponent(componentData, inspectionDate, component);
      console.log(`  ✅ Updated ${component}: rating ${componentData.rating}`);
    }
  });

  // Calculate averages for the rating type
  if (ratingType === 'structural_rating') {
    const structuralRatings = ['beams', 'columns', 'slab', 'foundation']
      .map(comp => flat.structural_rating[comp]?.rating)
      .filter(r => r);
    if (structuralRatings.length > 0) {
      flat.structural_rating.overall_average = this.calculateAverage(structuralRatings);
      flat.structural_rating.health_status = this.getHealthStatus(flat.structural_rating.overall_average);
      flat.structural_rating.assessment_date = inspectionDate;
    }
  } else if (ratingType === 'non_structural_rating') {
    const nonStructuralComponents = [
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'
    ];
    const nonStructuralRatings = nonStructuralComponents
      .map(comp => flat.non_structural_rating[comp]?.rating)
      .filter(r => r);
    if (nonStructuralRatings.length > 0) {
      flat.non_structural_rating.overall_average = this.calculateAverage(nonStructuralRatings);
      flat.non_structural_rating.assessment_date = inspectionDate;
    }
  }
}

  updateFlatCombinedRating(flat) {
    if (flat.structural_rating?.overall_average && flat.non_structural_rating?.overall_average) {
      const structuralWeight = 0.7;
      const nonStructuralWeight = 0.3;
      
      const combinedScore = (flat.structural_rating.overall_average * structuralWeight) + 
                           (flat.non_structural_rating.overall_average * nonStructuralWeight);
      
      flat.flat_overall_rating = {
        combined_score: Math.round(combinedScore * 10) / 10,
        health_status: this.getHealthStatus(combinedScore),
        priority: this.getPriority(combinedScore),
        last_assessment_date: new Date()
      };
    }
  }

 getDefaultStructuralRating() {
  const defaultRating = { 
    component_id: null,
    component_name: null,
    rating: null, 
    condition_comment: '', 
    photos: [], 
    inspection_date: null 
  };
  return {
    beams: { ...defaultRating, component_name: 'Beams' },
    columns: { ...defaultRating, component_name: 'Columns' },
    slab: { ...defaultRating, component_name: 'Slab' },
    foundation: { ...defaultRating, component_name: 'Foundation' }
  };
}

 getDefaultNonStructuralRating() {
  const defaultRating = { 
    component_id: null,
    component_name: null,
    rating: null, 
    condition_comment: '', 
    photos: [], 
    inspection_date: null 
  };
  return {
    brick_plaster: { ...defaultRating, component_name: 'Brick & Plaster' },
    doors_windows: { ...defaultRating, component_name: 'Doors & Windows' },
    flooring_tiles: { ...defaultRating, component_name: 'Flooring & Tiles' },
    electrical_wiring: { ...defaultRating, component_name: 'Electrical Wiring' },
    sanitary_fittings: { ...defaultRating, component_name: 'Sanitary Fittings' },
    railings: { ...defaultRating, component_name: 'Railings' },
    water_tanks: { ...defaultRating, component_name: 'Water Tanks' },
    plumbing: { ...defaultRating, component_name: 'Plumbing' },
    sewage_system: { ...defaultRating, component_name: 'Sewage System' },
    panel_board: { ...defaultRating, component_name: 'Panel Board' },
    lifts: { ...defaultRating, component_name: 'Lifts' }
  };
}

  hasStructuralRating(flat) {
    return flat.structural_rating && 
           flat.structural_rating.beams?.rating &&
           flat.structural_rating.columns?.rating &&
           flat.structural_rating.slab?.rating &&
           flat.structural_rating.foundation?.rating;
  }

  hasNonStructuralRating(flat) {
    return flat.non_structural_rating &&
           flat.non_structural_rating.brick_plaster?.rating &&
           flat.non_structural_rating.doors_windows?.rating &&
           flat.non_structural_rating.flooring_tiles?.rating &&
           flat.non_structural_rating.electrical_wiring?.rating &&
           flat.non_structural_rating.sanitary_fittings?.rating &&
           flat.non_structural_rating.railings?.rating &&
           flat.non_structural_rating.water_tanks?.rating &&
           flat.non_structural_rating.plumbing?.rating &&
           flat.non_structural_rating.sewage_system?.rating &&
           flat.non_structural_rating.panel_board?.rating &&
           flat.non_structural_rating.lifts?.rating;
  }

  /**
 * Extract images from a flat's ratings with metadata
 * @param {Object} flat - Flat document
 * @param {Object} options - Extraction options
 * @returns {Array} Array of image objects with metadata
 */
extractFlatImages(flat, options = {}) {
  const images = [];
  const {
    includeStructureInfo = false,
    includeLocationInfo = false,
    structureId = null,
    structureNumber = null,
    floorNumber = null,
    floorLabel = null,
    flatNumber = null,
    flatType = null,
    imageType = null,
    component = null
  } = options;
  
  // Process structural rating images
  if (flat.structural_rating && (!imageType || imageType === 'structural')) {
    const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
    
    structuralComponents.forEach(comp => {
      if (flat.structural_rating[comp]?.photos?.length > 0 && 
          (!component || component === comp)) {
        
        flat.structural_rating[comp].photos.forEach((photoUrl, index) => {
          const imageData = {
            image_id: `structural_${comp}_${index}_${Date.now()}`,
            image_url: photoUrl,
            rating_type: 'structural',
            component: comp,
            rating: flat.structural_rating[comp].rating,
            condition_comment: flat.structural_rating[comp].condition_comment,
            inspector_notes: flat.structural_rating[comp].inspector_notes,
            uploaded_date: flat.structural_rating[comp].inspection_date || new Date(),
            flat_id: flat.flat_id,
            flat_number: flatNumber || flat.flat_number,
            flat_type: flatType || flat.flat_type
          };
          
          if (includeLocationInfo) {
            imageData.floor_number = floorNumber;
            imageData.floor_label = floorLabel;
          }
          
          if (includeStructureInfo) {
            imageData.structure_id = structureId;
            imageData.structure_number = structureNumber;
          }
          
          images.push(imageData);
        });
      }
    });
  }
  
  // Process non-structural rating images
  if (flat.non_structural_rating && (!imageType || imageType === 'non_structural')) {
    const nonStructuralComponents = [
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'
    ];
    
    nonStructuralComponents.forEach(comp => {
      if (flat.non_structural_rating[comp]?.photos?.length > 0 && 
          (!component || component === comp)) {
        
        flat.non_structural_rating[comp].photos.forEach((photoUrl, index) => {
          const imageData = {
            image_id: `non_structural_${comp}_${index}_${Date.now()}`,
            image_url: photoUrl,
            rating_type: 'non_structural',
            component: comp,
            rating: flat.non_structural_rating[comp].rating,
            condition_comment: flat.non_structural_rating[comp].condition_comment,
            inspector_notes: flat.non_structural_rating[comp].inspector_notes,
            uploaded_date: flat.non_structural_rating[comp].inspection_date || new Date(),
            flat_id: flat.flat_id,
            flat_number: flatNumber || flat.flat_number,
            flat_type: flatType || flat.flat_type
          };
          
          if (includeLocationInfo) {
            imageData.floor_number = floorNumber;
            imageData.floor_label = floorLabel;
          }
          
          if (includeStructureInfo) {
            imageData.structure_id = structureId;
            imageData.structure_number = structureNumber;
          }
          
          images.push(imageData);
        });
      }
    });
  }
  
  return images;
}


// =================== FLOOR-LEVEL RATINGS ===================
async saveFloorRatings(req, res) {
  try {
    const { id, floorId } = req.params;
    const { structural_rating, non_structural_rating } = req.body;

    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);

    const type = structure.structural_identity?.type_of_structure;
    const subtype = structure.structural_identity?.commercial_subtype;

    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) return sendErrorResponse(res, 'Floor not found', 404);

    // Check if floor ratings are allowed
    if (
      (type === 'commercial' && subtype === 'pure') ||
      (type === 'industrial') ||
      (type === 'commercial' && subtype === 'commercial_residential')
    ) {
      const inspectionDate = new Date();

      // ✅ FIXED: Structural ratings with component IDs and names
      if (structural_rating) {
        floor.structural_rating = {
          beams: this.createRatingComponent(structural_rating.beams, inspectionDate, 'beams'),
          columns: this.createRatingComponent(structural_rating.columns, inspectionDate, 'columns'),
          slab: this.createRatingComponent(structural_rating.slab, inspectionDate, 'slab'),
          foundation: this.createRatingComponent(structural_rating.foundation, inspectionDate, 'foundation'),
        };

        const ratings = [
          floor.structural_rating.beams?.rating,
          floor.structural_rating.columns?.rating,
          floor.structural_rating.slab?.rating,
          floor.structural_rating.foundation?.rating
        ].filter(r => r);

        if (ratings.length > 0) {
          floor.structural_rating.overall_average = this.calculateAverage(ratings);
          floor.structural_rating.health_status = this.getHealthStatus(floor.structural_rating.overall_average);
          floor.structural_rating.assessment_date = inspectionDate;
        }
      }

      // ✅ FIXED: Non-structural ratings with component IDs and names
      if (non_structural_rating) {
        floor.non_structural_rating = {
          walls: this.createRatingComponent(non_structural_rating.walls, inspectionDate, 'walls'),
          flooring: this.createRatingComponent(non_structural_rating.flooring, inspectionDate, 'flooring'),
          electrical_system: this.createRatingComponent(non_structural_rating.electrical_system, inspectionDate, 'electrical_system'),
          fire_safety: this.createRatingComponent(non_structural_rating.fire_safety, inspectionDate, 'fire_safety'),
        };

        const ratings = [
          floor.non_structural_rating.walls?.rating,
          floor.non_structural_rating.flooring?.rating,
          floor.non_structural_rating.electrical_system?.rating,
          floor.non_structural_rating.fire_safety?.rating
        ].filter(r => r);

        if (ratings.length > 0) {
          floor.non_structural_rating.overall_average = this.calculateAverage(ratings);
          floor.non_structural_rating.assessment_date = inspectionDate;
        }
      }

      // Combined floor rating
      if (floor.structural_rating?.overall_average && floor.non_structural_rating?.overall_average) {
        const combinedScore =
          (floor.structural_rating.overall_average * 0.7) +
          (floor.non_structural_rating.overall_average * 0.3);

        floor.floor_overall_rating = {
          combined_score: Math.round(combinedScore * 10) / 10,
          health_status: this.getHealthStatus(combinedScore),
          priority: this.getPriority(combinedScore),
          last_assessment_date: inspectionDate
        };
      }

      structure.creation_info.last_updated_date = new Date();
      structure.status = 'ratings_in_progress';
      await user.save();

      return sendSuccessResponse(res, 'Floor ratings saved successfully', {
        structure_id: id,
        floor_id: floorId,
        floor_number: floor.floor_number,
        floor_ratings: {
          structural_rating: floor.structural_rating,
          non_structural_rating: floor.non_structural_rating,
          floor_overall_rating: floor.floor_overall_rating
        }
      });
    }

    return sendErrorResponse(res, 'Floor ratings not allowed for this structure/floor type', 400);

  } catch (err) {
    console.error('❌ Floor ratings error:', err);
    sendErrorResponse(res, 'Failed to save floor ratings', 500, err.message);
  }
}


/**
 * Get complete floor ratings (structural + non-structural + overall)
 * @route GET /api/structures/:id/floors/:floorId/ratings
 * @access Private
 */
async getFloorRatings(req, res) {
  try {
    const { id, floorId } = req.params;
    const includeImages = req.query.include_images === 'true';
    
    console.log('📊 Getting floor ratings for floor:', floorId);
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const structuralBeams = this.normalizeRatingComponents(floor.structural_rating?.beams);
    const structuralColumns = this.normalizeRatingComponents(floor.structural_rating?.columns);
    const structuralSlabs = this.normalizeRatingComponents(
      floor.structural_rating?.slab ?? floor.structural_rating?.slabs
    );
    const structuralFoundations = this.normalizeRatingComponents(
      floor.structural_rating?.foundation ?? floor.structural_rating?.foundations
    );
    
    // Build complete floor ratings response
    const floorRatings = {
      structure_id: id,
      floor_id: floorId,
      floor_number: floor.floor_number,
      floor_label_name: floor.floor_label_name,
      floor_height: floor.floor_height,
      total_area_sq_mts: floor.total_area_sq_mts,
      
      // Structural ratings with all components
      structural_rating: {
        beams: structuralBeams,
        columns: structuralColumns,
        slabs: structuralSlabs,
        foundations: structuralFoundations,
        // Keep singular aliases for schema/backward compatibility
        slab: structuralSlabs,
        foundation: structuralFoundations,
        overall_average: floor.structural_rating?.overall_average ?? null,
        assessment_date: floor.structural_rating?.assessment_date ?? null,
        inspector_notes: floor.structural_rating?.inspector_notes || null,
        
        // Component averages
        averages: {
          beams: this.calculateComponentAverage(structuralBeams),
          columns: this.calculateComponentAverage(structuralColumns),
          slabs: this.calculateComponentAverage(structuralSlabs),
          foundations: this.calculateComponentAverage(structuralFoundations),
          slab: this.calculateComponentAverage(structuralSlabs),
          foundation: this.calculateComponentAverage(structuralFoundations)
        }
      },
      
      // Non-structural ratings with all component types
      non_structural_rating: {
        ...(floor.non_structural_rating || {}),
        overall_average: floor.non_structural_rating?.overall_average || null,
        assessment_date: floor.non_structural_rating?.assessment_date || null,
        inspector_notes: floor.non_structural_rating?.inspector_notes || null,
        
        // Component type averages
        averages: this.calculateNonStructuralAverages(floor.non_structural_rating)
      },
      
      // Overall floor rating
      floor_overall_rating: floor.floor_overall_rating || null,
      
      // Statistics
      statistics: {
        total_structural_components: 
          structuralBeams.length +
          structuralColumns.length +
          structuralSlabs.length +
          structuralFoundations.length,
        
        total_non_structural_components: 
          Object.values(floor.non_structural_rating || {})
            .reduce((sum, value) => {
              return sum + this.normalizeRatingComponents(value).length;
            }, 0),
        
        components_with_photos: this.countComponentsWithPhotos(floor),
        components_below_rating_3: this.countLowRatedComponents(floor),
        
        has_structural_ratings: this.hasFloorStructuralRating(floor),
        has_non_structural_ratings: this.hasFloorNonStructuralRating(floor),
        
        last_structural_update: floor.structural_rating?.assessment_date || null,
        last_non_structural_update: floor.non_structural_rating?.assessment_date || null
      }
    };
    
    // Extract images if requested
    if (includeImages) {
      floorRatings.images = this.extractFloorRatingImages(floor);
    }
    
    console.log('✅ Floor ratings retrieved successfully');
    
    sendSuccessResponse(res, 'Floor ratings retrieved successfully', floorRatings);
    
  } catch (error) {
    console.error('❌ Get floor ratings error:', error);
    sendErrorResponse(res, 'Failed to get floor ratings', 500, error.message);
  }
}



/**
 * Generate maintenance recommendations for a structure
 * @param {Object} structure - Structure document
 * @returns {Array} Array of maintenance recommendations
 */
async generateMaintenanceRecommendations(structure) {
  const recommendations = [];
  
  if (!structure.geometric_details?.floors) {
    return recommendations;
  }
  
  structure.geometric_details.floors.forEach(floor => {
    if (floor.flats) {
      floor.flats.forEach(flat => {
        // Check structural components
        if (flat.structural_rating) {
          const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
          
          structuralComponents.forEach(component => {
            const rating = flat.structural_rating[component];
            if (rating && rating.rating <= 2) {
              recommendations.push({
                type: 'Structural',
                priority: rating.rating === 1 ? 'Critical' : 'High',
                component: component.charAt(0).toUpperCase() + component.slice(1),
                location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                issue: rating.condition_comment || `${component} needs attention`,
                rating: rating.rating,
                urgency: rating.rating === 1 ? 'Immediate' : 'Within 30 days',
                estimated_cost: this.getEstimatedCost(component, rating.rating, 'structural'),
                recommended_action: this.getRecommendedAction(component, rating.rating, 'structural')
              });
            }
          });
        }
        
        // Check non-structural components
        if (flat.non_structural_rating) {
          const nonStructuralComponents = [
            'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
            'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
            'sewage_system', 'panel_board', 'lifts'
          ];
          
          nonStructuralComponents.forEach(component => {
            const rating = flat.non_structural_rating[component];
            if (rating && rating.rating <= 2) {
              recommendations.push({
                type: 'Non-Structural',
                priority: rating.rating === 1 ? 'High' : 'Medium',
                component: component.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                issue: rating.condition_comment || `${component.replace('_', ' ')} needs attention`,
                rating: rating.rating,
                urgency: rating.rating === 1 ? 'Within 15 days' : 'Within 60 days',
                estimated_cost: this.getEstimatedCost(component, rating.rating, 'non_structural'),
                recommended_action: this.getRecommendedAction(component, rating.rating, 'non_structural')
              });
            }
          });
        }
      });
    }
  });
  
  // Sort by priority and rating
  const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
  recommendations.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.rating - b.rating; // Lower rating = higher urgency
  });
  
  return recommendations;
}

/**
 * Get estimated cost for maintenance work
 * @param {string} component - Component name
 * @param {number} rating - Current rating
 * @param {string} type - 'structural' or 'non_structural'
 * @returns {Object} Cost estimate
 */
getEstimatedCost(component, rating, type) {
  // Base cost estimates in rupees (these should be configurable)
  const baseCosts = {
    structural: {
      beams: { 1: 50000, 2: 25000 },
      columns: { 1: 75000, 2: 35000 },
      slab: { 1: 60000, 2: 30000 },
      foundation: { 1: 100000, 2: 50000 }
    },
    non_structural: {
      brick_plaster: { 1: 15000, 2: 8000 },
      doors_windows: { 1: 25000, 2: 12000 },
      flooring_tiles: { 1: 20000, 2: 10000 },
      electrical_wiring: { 1: 30000, 2: 15000 },
      sanitary_fittings: { 1: 18000, 2: 9000 },
      railings: { 1: 12000, 2: 6000 },
      water_tanks: { 1: 40000, 2: 20000 },
      plumbing: { 1: 25000, 2: 12000 },
      sewage_system: { 1: 35000, 2: 18000 },
      panel_board: { 1: 15000, 2: 8000 },
      lifts: { 1: 200000, 2: 100000 }
    }
  };
  
  const cost = baseCosts[type]?.[component]?.[rating] || 10000;
  
  return {
    estimated_amount: cost,
    currency: 'INR',
    range: {
      min: Math.round(cost * 0.8),
      max: Math.round(cost * 1.2)
    }
  };
}

/**
 * Get recommended action for component maintenance
 * @param {string} component - Component name
 * @param {number} rating - Current rating
 * @param {string} type - 'structural' or 'non_structural'
 * @returns {string} Recommended action
 */
getRecommendedAction(component, rating, type) {
  const actions = {
    structural: {
      beams: {
        1: 'Immediate structural assessment and beam replacement/strengthening required',
        2: 'Detailed inspection and repair of cracks/deflection within 30 days'
      },
      columns: {
        1: 'Critical - Immediate structural engineer assessment required',
        2: 'Repair cracks and assess load-bearing capacity'
      },
      slab: {
        1: 'Major slab repair or replacement required immediately',
        2: 'Repair cracks and address deflection issues'
      },
      foundation: {
        1: 'Critical foundation repair required immediately',
        2: 'Foundation repair needed - address settlement issues'
      }
    },
    non_structural: {
      brick_plaster: {
        1: 'Complete replastering required',
        2: 'Repair cracks and repaint'
      },
      doors_windows: {
        1: 'Replace doors/windows completely',
        2: 'Repair hardware and improve sealing'
      },
      electrical_wiring: {
        1: 'Complete electrical system overhaul required',
        2: 'Upgrade wiring and replace faulty components'
      },
      plumbing: {
        1: 'Major plumbing renovation needed',
        2: 'Repair leaks and replace worn fixtures'
      }
    }
  };
  
  return actions[type]?.[component]?.[rating] || `${component.replace('_', ' ')} requires professional assessment`;
}

/**
 * Group structures by status for summary
 * @param {Array} structures - Array of structures
 * @returns {Object} Status counts
 */
getStructuresByStatus(structures) {
  const statusCounts = {};
  
  structures.forEach(structure => {
    const status = structure.status || 'draft';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  return statusCounts;
}

  // =================== STRUCTURE MANAGEMENT ===================
  async getStructureProgress(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const progress = this.calculateProgress(structure);
      
      sendSuccessResponse(res, 'Structure progress retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        status: structure.status,
        progress
      });

    } catch (error) {
      console.error('❌ Structure progress error:', error);
      sendErrorResponse(res, 'Failed to get structure progress', 500, error.message);
    }
  }

  calculateProgress(structure, options = {}) {
  const { includePercentage = false } = options;
  let progress = {
    location: false,
    administrative: false,
    geometric_details: false,
    floors_added: false,
    units_added: false, // Can be flats or blocks
    ratings_completed: false,
    overall_percentage: null
  };

const structureType = structure.structural_identity?.type_of_structure;

  // Check location
  if (structure.structural_identity?.structural_identity_number && structure.location?.coordinates?.latitude) {
    progress.location = true;
  }

  // Check administrative
  if (structure.administration?.client_name && structure.administration?.email_id) {
    progress.administrative = true;
  }

  // Check geometric details
  if (structure.geometric_details?.structure_width && structure.geometric_details?.structure_height) {
    progress.geometric_details = true;
  }

  // Check floors
  if (structure.geometric_details?.floors?.length > 0) {
    progress.floors_added = true;
    
    if (structureType === 'industrial') {
      // Check blocks for industrial
      const hasBlocks = structure.geometric_details.floors.some(floor => floor.blocks?.length > 0);
      if (hasBlocks) {
        progress.units_added = true;
        
        // Check if all blocks have ratings
        let allBlocksRated = true;
        for (const floor of structure.geometric_details.floors) {
          if (floor.blocks?.length > 0) {
            for (const block of floor.blocks) {
              if (!block.block_overall_rating?.combined_score) {
                allBlocksRated = false;
                break;
              }
            }
          }
          if (!allBlocksRated) break;
        }
        progress.ratings_completed = allBlocksRated;
      }
    } else {
      // Check flats for residential/commercial
      const hasFlats = structure.geometric_details.floors.some(floor => floor.flats?.length > 0);
      if (hasFlats) {
        progress.units_added = true;
        
        // Check if all flats have ratings (skip parking floors)
        let allFlatsRated = true;
        for (const floor of structure.geometric_details.floors) {
          if (!floor.is_parking_floor && floor.flats?.length > 0) {
            for (const flat of floor.flats) {
              if (!flat.flat_overall_rating?.combined_score) {
                allFlatsRated = false;
                break;
              }
            }
          }
          if (!allFlatsRated) break;
        }
        progress.ratings_completed = allFlatsRated;
      }
    }
  }

  // Calculate percentage only when explicitly requested (submit flows)
  if (includePercentage) {
    const completedSteps = Object.values(progress).filter(val => val === true).length;
    progress.overall_percentage = Math.round((completedSteps / 6) * 100);
  }

  return progress;
}

// Helper methods
generateBlockId() {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

  async submitStructure(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
      
      const progress = this.calculateProgress(structure, { includePercentage: true });
      
      if (progress.overall_percentage < 100) {
        return sendErrorResponse(res, 'Cannot submit incomplete structure', 400);
      }
      
      structure.status = 'submitted';
      structure.creation_info.last_updated_date = new Date();
      
      await user.save();
      
      sendSuccessResponse(res, 'Structure submitted successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        status: structure.status,
        submitted_at: structure.creation_info.last_updated_date
      });

    } catch (error) {
      console.error('❌ Structure submission error:', error);
      sendErrorResponse(res, 'Failed to submit structure', 500, error.message);
    }
  }

  /**
 * Get all structures for the authenticated user
 * @route GET /api/structures
 */
/**
 * Enhanced getAllStructures with workflow information
 * Replace the existing getAllStructures method in structureController.js
 */
// Add this to structureController.js - Enhanced getAllStructures method
// This ensures TE can see all submitted structures

/**
 * Enhanced getAllStructures with proper TE access to submitted structures
 * @route GET /api/structures
 * @access Private (All authenticated users)
 */
async getAllStructures(req, res) {
  try {
    console.log('📋 Getting all structures for user:', req.user.userId);
    console.log('🔐 User roles:', req.user.roles || [req.user.role]);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'creation_date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // ✅ Check if user has privileged access (AD, VE, TE, admin)
    const isPrivileged = hasPrivilegedAccess(req.user);
    const userRole = req.user.roles?.[0] || req.user.role;
    
    let structures = [];
    let ownerInfo = {}; // To track structure owners for privileged users
    
    // ✅ PRIVILEGED USERS: Fetch all structures from all users
    if (isPrivileged) {
      console.log('✅ Privileged user detected:', userRole);
      console.log('   User roles:', req.user.roles || [req.user.role]);
      
      // Get all users with their structures
      const allUsers = await User.find({ 
        'structures.0': { $exists: true } // Only users who have structures
      }).select('structures username email profile');
      
      console.log(`📊 Found ${allUsers.length} users with structures`);
      
      // Aggregate all structures with owner info
      allUsers.forEach(user => {
        if (user.structures && user.structures.length > 0) {
          user.structures.forEach(structure => {
            // ✅ FILTER FOR TE: Only show structures that TE should see
            // TE should see: submitted, under_testing, tested, rejected (from testing stage)
            if (userRole === 'TE') {
              const teRelevantStatuses = [
                'submitted',        // Ready for TE to start testing
                'under_testing',    // TE is currently testing
                'tested',          // TE completed testing
                'rejected'         // Any rejected (TE can review)
              ];
              
              // Skip structures not relevant to TE
              if (!teRelevantStatuses.includes(structure.status)) {
                return; // Skip this structure
              }
              
              console.log(`✅ TE viewing structure ${structure._id} with status: ${structure.status}`);
            }
            
            // ✅ FILTER FOR VE: Only show structures that VE should see
            if (userRole === 'VE') {
              const veRelevantStatuses = [
                'tested',          // Ready for VE to start validation
                'under_validation', // VE is currently validating
                'validated',       // VE completed validation
                'rejected'         // Any rejected (VE can review)
              ];
              
              if (!veRelevantStatuses.includes(structure.status)) {
                return; // Skip this structure
              }
              
              console.log(`✅ VE viewing structure ${structure._id} with status: ${structure.status}`);
            }
            
            // ✅ FILTER FOR AD: Only show structures that AD should see
            if (userRole === 'AD') {
              const adRelevantStatuses = [
                'validated',  // Ready for AD to approve
                'approved',   // AD already approved
                'rejected'    // Any rejected (AD can review)
              ];
              
              if (!adRelevantStatuses.includes(structure.status)) {
                return; // Skip this structure
              }
              
              console.log(`✅ AD viewing structure ${structure._id} with status: ${structure.status}`);
            }
            
            // Add structure with owner info
            const structureWithOwner = structure.toObject();
            structureWithOwner._ownerId = user._id;
            structureWithOwner._ownerUsername = user.username;
            structureWithOwner._ownerEmail = user.email;
            structures.push(structureWithOwner);
          });
        }
      });
      
      console.log(`📊 Total structures visible to ${userRole}: ${structures.length}`);
      
    } else {
      // ✅ REGULAR USERS (FE): Fetch only their own structures
      console.log('👤 Regular user - fetching only own structures');
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }
      
      structures = user.structures || [];
    }
    
    // Apply additional filters
    if (status) {
      structures = structures.filter(structure => structure.status === status);
      console.log(`🔍 Filtered by status '${status}': ${structures.length} structures`);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      structures = structures.filter(structure => 
        structure.structural_identity?.structural_identity_number?.toLowerCase().includes(searchLower) ||
        structure.structural_identity?.uid?.toLowerCase().includes(searchLower) ||
        structure.administration?.client_name?.toLowerCase().includes(searchLower) ||
        structure.structural_identity?.city_name?.toLowerCase().includes(searchLower) ||
        (isPrivileged && (
          structure._ownerUsername?.toLowerCase().includes(searchLower) ||
          structure._ownerEmail?.toLowerCase().includes(searchLower)
        ))
      );
    }
    
    // Sort structures
    structures.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'creation_date':
          aValue = a.creation_info?.created_date || new Date(0);
          bValue = b.creation_info?.created_date || new Date(0);
          break;
        case 'last_updated':
          aValue = a.creation_info?.last_updated_date || new Date(0);
          bValue = b.creation_info?.last_updated_date || new Date(0);
          break;
        case 'structure_number':
          aValue = a.structural_identity?.structural_identity_number || '';
          bValue = b.structural_identity?.structural_identity_number || '';
          break;
        case 'client_name':
          aValue = a.administration?.client_name || '';
          bValue = b.administration?.client_name || '';
          break;
        case 'owner':
          if (isPrivileged) {
            aValue = a._ownerUsername || '';
            bValue = b._ownerUsername || '';
          } else {
            aValue = a.creation_info?.created_date || new Date(0);
            bValue = b.creation_info?.created_date || new Date(0);
          }
          break;
        default:
          aValue = a.creation_info?.created_date || new Date(0);
          bValue = b.creation_info?.created_date || new Date(0);
      }
      
      if (aValue < bValue) return -1 * sortOrder;
      if (aValue > bValue) return 1 * sortOrder;
      return 0;
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStructures = structures.slice(startIndex, endIndex);
    
    // Format response data WITH WORKFLOW INFORMATION
    const structuresData = paginatedStructures.map(structure => {
      const progress = this.calculateProgress(structure);
      const totalFlats = structure.geometric_details?.floors?.reduce(
        (sum, floor) => sum + (floor.flats?.length || 0), 0
      ) || 0;
      
      // Calculate ratings summary
      let ratedFlats = 0;
      let avgStructuralRating = null;
      let avgNonStructuralRating = null;
      
      if (structure.geometric_details?.floors) {
        const allStructuralRatings = [];
        const allNonStructuralRatings = [];
        
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            floor.flats.forEach(flat => {
              if (flat.flat_overall_rating?.combined_score) {
                ratedFlats++;
              }
              if (flat.structural_rating?.overall_average) {
                allStructuralRatings.push(flat.structural_rating.overall_average);
              }
              if (flat.non_structural_rating?.overall_average) {
                allNonStructuralRatings.push(flat.non_structural_rating.overall_average);
              }
            });
          }
        });
        
        if (allStructuralRatings.length > 0) {
          avgStructuralRating = this.calculateAverage(allStructuralRatings);
        }
        if (allNonStructuralRatings.length > 0) {
          avgNonStructuralRating = this.calculateAverage(allNonStructuralRatings);
        }
      }
      
      // ✅ BUILD WORKFLOW STATUS DISPLAY
      const workflow = structure.workflow || {};
      let workflowInfo = {};
      
      if (workflow.submitted_by) {
        workflowInfo.submitted_by = {
          name: workflow.submitted_by.name,
          role: workflow.submitted_by.role,
          date: workflow.submitted_by.date,
          display: `Submitted by ${workflow.submitted_by.name} (${workflow.submitted_by.role})`
        };
      }
      
      if (workflow.tested_by) {
        workflowInfo.tested_by = {
          name: workflow.tested_by.name,
          role: workflow.tested_by.role,
          date: workflow.tested_by.date,
          display: `Tested by ${workflow.tested_by.name} (${workflow.tested_by.role})`,
          notes: workflow.tested_by.test_notes
        };
      }
      
      if (workflow.validated_by) {
        workflowInfo.validated_by = {
          name: workflow.validated_by.name,
          role: workflow.validated_by.role,
          date: workflow.validated_by.date,
          display: `Validated by ${workflow.validated_by.name} (${workflow.validated_by.role})`,
          notes: workflow.validated_by.validation_notes
        };
      }
      
      if (workflow.approved_by) {
        workflowInfo.approved_by = {
          name: workflow.approved_by.name,
          role: workflow.approved_by.role,
          date: workflow.approved_by.date,
          display: `Approved by ${workflow.approved_by.name} (${workflow.approved_by.role})`,
          notes: workflow.approved_by.approval_notes
        };
      }
      
      if (workflow.rejected_by) {
        workflowInfo.rejected_by = {
          name: workflow.rejected_by.name,
          role: workflow.rejected_by.role,
          date: workflow.rejected_by.date,
          display: `Rejected by ${workflow.rejected_by.name} (${workflow.rejected_by.role})`,
          reason: workflow.rejected_by.rejection_reason,
          stage: workflow.rejected_by.rejection_stage
        };
      }
      
      const structureData = {
        structure_id: structure._id,
        uid: structure.structural_identity?.uid,
        structural_identity_number: structure.structural_identity?.structural_identity_number,
        client_name: structure.administration?.client_name,
        location: {
          city_name: structure.structural_identity?.city_name,
          state_code: structure.structural_identity?.state_code,
          coordinates: structure.location?.coordinates
        },
        type_of_structure: structure.structural_identity?.type_of_structure,
        dimensions: {
          width: structure.geometric_details?.structure_width,
          length: structure.geometric_details?.structure_length,
          height: structure.geometric_details?.structure_height,
          floors: structure.geometric_details?.number_of_floors
        },
        status: structure.status,
        progress: progress,
        
        // ✅ WORKFLOW INFORMATION FOR DISPLAY
        workflow: workflowInfo,
        
        // Helper for frontend to quickly display status
        status_display: this.buildStatusDisplay(structure.status, workflowInfo),
        
        ratings_summary: {
          total_flats: totalFlats,
          rated_flats: ratedFlats,
          completion_percentage: totalFlats > 0 ? Math.round((ratedFlats / totalFlats) * 100) : 0,
          avg_structural_rating: avgStructuralRating,
          avg_non_structural_rating: avgNonStructuralRating,
          overall_health: avgStructuralRating ? this.getHealthStatus(avgStructuralRating) : null
        },
        timestamps: {
          created_date: structure.creation_info?.created_date,
          last_updated_date: structure.creation_info?.last_updated_date
        }
      };
      
      // Add owner info for privileged users
      if (isPrivileged && structure._ownerId) {
        structureData.owner = {
          user_id: structure._ownerId,
          username: structure._ownerUsername,
          email: structure._ownerEmail
        };
      }
      
      return structureData;
    });
    
    console.log(`📦 Returning ${structuresData.length} structures to ${userRole}`);
    
    sendPaginatedResponse(res, structuresData, page, limit, structures.length, 'Structures retrieved successfully');

  } catch (error) {
    console.error('❌ Get all structures error:', error);
    sendErrorResponse(res, 'Failed to retrieve structures', 500, error.message);
  }
}

/**
 * Helper: Build human-readable status display
 * This creates a summary like: "Status: Tested | Submitted by John (FE) | Tested by Sarah (TE)"
 */
buildStatusDisplay(status, workflowInfo) {
  const parts = [];
  
  // Add current status
  parts.push(`Status: ${status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
  
  // Add workflow stages
  if (workflowInfo.submitted_by) {
    parts.push(workflowInfo.submitted_by.display);
  }
  if (workflowInfo.tested_by) {
    parts.push(workflowInfo.tested_by.display);
  }
  if (workflowInfo.validated_by) {
    parts.push(workflowInfo.validated_by.display);
  }
  if (workflowInfo.approved_by) {
    parts.push(workflowInfo.approved_by.display);
  }
  if (workflowInfo.rejected_by) {
    parts.push(workflowInfo.rejected_by.display);
  }
  
  return parts.join(' | ');
}

// Don't forget to bind this in the constructor:
// this.buildStatusDisplay = this.buildStatusDisplay.bind(this);

/**
 * Get complete structure details by ID
 * @route GET /api/structures/:id
 */
async getStructureDetails(req, res) {
  try {
    console.log('🏢 Getting structure details for ID:', req.params.id);
    
    const { id } = req.params;
    const includeImages = req.query.include_images === 'true';
    const includeRatings = req.query.include_ratings !== 'false'; // Default true
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Calculate comprehensive metrics
    const progress = this.calculateProgress(structure);
    const recommendations = await this.generateMaintenanceRecommendations(structure);
    
    // Structure basic info
    const structureDetails = {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      structural_identity: structure.structural_identity || {},
      location: structure.location || {},
      administration: structure.administration || {},
      geometric_details: {
        number_of_floors: structure.geometric_details?.number_of_floors,
        structure_width: structure.geometric_details?.structure_width,
        structure_length: structure.geometric_details?.structure_length,
        structure_height: structure.geometric_details?.structure_height,
        total_area: structure.geometric_details?.structure_width && structure.geometric_details?.structure_length ? 
          structure.geometric_details.structure_width * structure.geometric_details.structure_length : null
      },
      status: structure.status,
      progress: progress,
      creation_info: structure.creation_info,
      
      // Statistics
      statistics: {
        total_floors: structure.geometric_details?.floors?.length || 0,
        total_flats: 0,
        rated_flats: 0,
        pending_ratings: 0,
        critical_issues: 0,
        high_priority_issues: 0
      },
      
      // Health summary
      health_summary: {
        overall_health_score: null,
        structural_health: null,
        non_structural_health: null,
        priority_level: null,
        last_assessment_date: null
      },
      
      // Floors and flats data
      floors: []
    };
    
    // Process floors and flats
    if (structure.geometric_details?.floors) {
      const allStructuralRatings = [];
      const allNonStructuralRatings = [];
      let lastAssessmentDate = null;
      
      structure.geometric_details.floors.forEach(floor => {
        const floorData = {
          floor_id: floor.floor_id,
          mongodb_id: floor._id,
          floor_number: floor.floor_number,
          floor_height: floor.floor_height,
          total_area_sq_mts: floor.total_area_sq_mts,
          floor_label_name: floor.floor_label_name,
          floor_notes: floor.floor_notes,
          
          // ✅ NEW: Add floor rating indicators
          has_floor_structural_ratings: this.hasFloorStructuralRating(floor),
          has_floor_non_structural_ratings: this.hasFloorNonStructuralRating(floor),
          
          flats: []
        };
        
        // ✅ NEW: Include floor ratings if requested
        if (includeRatings) {
          floorData.floor_structural_rating = floor.structural_rating || null;
          floorData.floor_non_structural_rating = floor.non_structural_rating || null;
          floorData.floor_overall_rating = floor.floor_overall_rating || null;
          
          // Add floor rating statistics
	          if (floor.structural_rating || floor.non_structural_rating) {
	            floorData.floor_statistics = {
	              structural_components: 
	                this.normalizeRatingComponents(floor.structural_rating?.beams).length +
	                this.normalizeRatingComponents(floor.structural_rating?.columns).length +
	                this.normalizeRatingComponents(floor.structural_rating?.slab ?? floor.structural_rating?.slabs).length +
	                this.normalizeRatingComponents(floor.structural_rating?.foundation ?? floor.structural_rating?.foundations).length,
	              
	              non_structural_components: 
	                Object.values(floor.non_structural_rating || {})
	                  .reduce((sum, value) => sum + this.normalizeRatingComponents(value).length, 0),
              
              structural_average: floor.structural_rating?.overall_average || null,
              non_structural_average: floor.non_structural_rating?.overall_average || null
            };
          }
        }
        
        if (floor.flats) {
          structureDetails.statistics.total_flats += floor.flats.length;
          
          floor.flats.forEach(flat => {
            const flatData = {
              flat_id: flat.flat_id,
              mongodb_id: flat._id,
              flat_number: flat.flat_number,
              flat_type: flat.flat_type,
              area_sq_mts: flat.area_sq_mts,
              direction_facing: flat.direction_facing,
              occupancy_status: flat.occupancy_status,
              flat_notes: flat.flat_notes,
              has_structural_ratings: this.hasStructuralRating(flat),
              has_non_structural_ratings: this.hasNonStructuralRating(flat)
            };
            
            // Include ratings if requested
            if (includeRatings) {
              flatData.structural_rating = flat.structural_rating || this.getDefaultStructuralRating();
              flatData.non_structural_rating = flat.non_structural_rating || this.getDefaultNonStructuralRating();
              flatData.flat_overall_rating = flat.flat_overall_rating || null;
              
              // Track ratings for statistics
              if (flat.flat_overall_rating?.combined_score) {
                structureDetails.statistics.rated_flats++;
                
                if (flat.flat_overall_rating.priority === 'Critical') {
                  structureDetails.statistics.critical_issues++;
                } else if (flat.flat_overall_rating.priority === 'High') {
                  structureDetails.statistics.high_priority_issues++;
                }
              }
              
              // Collect ratings for overall calculation
              if (flat.structural_rating?.overall_average) {
                allStructuralRatings.push(flat.structural_rating.overall_average);
                if (flat.structural_rating.assessment_date && 
                    (!lastAssessmentDate || flat.structural_rating.assessment_date > lastAssessmentDate)) {
                  lastAssessmentDate = flat.structural_rating.assessment_date;
                }
              }
              if (flat.non_structural_rating?.overall_average) {
                allNonStructuralRatings.push(flat.non_structural_rating.overall_average);
                if (flat.non_structural_rating.assessment_date && 
                    (!lastAssessmentDate || flat.non_structural_rating.assessment_date > lastAssessmentDate)) {
                  lastAssessmentDate = flat.non_structural_rating.assessment_date;
                }
              }
            }
            
            // Include images if requested
            if (includeImages) {
              flatData.images = this.extractFlatImages(flat);
            }
            
            floorData.flats.push(flatData);
          });
        }
        
        structureDetails.floors.push(floorData);
      });
      
      // Calculate overall health metrics
      if (allStructuralRatings.length > 0) {
        structureDetails.health_summary.structural_health = this.calculateAverage(allStructuralRatings);
      }
      if (allNonStructuralRatings.length > 0) {
        structureDetails.health_summary.non_structural_health = this.calculateAverage(allNonStructuralRatings);
      }
      
      // Calculate overall health score (70% structural, 30% non-structural)
      if (structureDetails.health_summary.structural_health && structureDetails.health_summary.non_structural_health) {
        const overallScore = (structureDetails.health_summary.structural_health * 0.7) + 
                           (structureDetails.health_summary.non_structural_health * 0.3);
        structureDetails.health_summary.overall_health_score = Math.round(overallScore * 10) / 10;
        structureDetails.health_summary.priority_level = this.getPriority(overallScore);
      }
      
      structureDetails.health_summary.last_assessment_date = lastAssessmentDate;
      structureDetails.statistics.pending_ratings = structureDetails.statistics.total_flats - structureDetails.statistics.rated_flats;
    }
    
    // Add maintenance recommendations summary
    structureDetails.maintenance_recommendations = {
      total_recommendations: recommendations.length,
      critical: recommendations.filter(r => r.priority === 'Critical').length,
      high: recommendations.filter(r => r.priority === 'High').length,
      medium: recommendations.filter(r => r.priority === 'Medium').length,
      recent_recommendations: recommendations.slice(0, 5) // Top 5 most critical
    };
    
    // Add remarks information
    const currentUser = await User.findById(req.user.userId);
    const userRole = this.hasRole(currentUser, 'FE') ? 'FE' : this.hasRole(currentUser, 'VE') ? 'VE' : null;
    
    structureDetails.remarks = {
      fe_remarks: structure.remarks?.fe_remarks || [],
      ve_remarks: structure.remarks?.ve_remarks || [],
      total_fe_remarks: (structure.remarks?.fe_remarks || []).length,
      total_ve_remarks: (structure.remarks?.ve_remarks || []).length,
      last_updated_by: structure.remarks?.last_updated_by || {},
      user_permissions: {
        can_view_remarks: userRole !== null,
        can_add_remarks: userRole !== null,
        can_edit_own_remarks: userRole !== null,
        user_role: userRole
      }
    };
    
    sendSuccessResponse(res, 'Structure details retrieved successfully', structureDetails);

  } catch (error) {
    console.error('❌ Get structure details error:', error);
    sendErrorResponse(res, 'Failed to retrieve structure details', 500, error.message);
  }
}

// =================== IMAGE MANAGEMENT APIs ===================

/**
 * Get all images for the authenticated user across all structures
 * @route GET /api/structures/images/all
 */
async getAllImages(req, res) {
  try {
    console.log('🖼️ Getting all images for user:', req.user.userId);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const imageType = req.query.type; // 'structural' or 'non_structural'
    const component = req.query.component; // specific component filter
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const allImages = [];
    
    // Extract images from all structures
    if (user.structures) {
      user.structures.forEach(structure => {
        if (structure.geometric_details?.floors) {
          structure.geometric_details.floors.forEach(floor => {
            if (floor.flats) {
              floor.flats.forEach(flat => {
                const images = this.extractFlatImages(flat, {
                  includeStructureInfo: true,
                  structureId: structure._id,
                  structureNumber: structure.structural_identity?.structural_identity_number,
                  floorNumber: floor.floor_number,
                  flatNumber: flat.flat_number,
                  imageType,
                  component
                });
                allImages.push(...images);
              });
            }
          });
        }
      });
    }
    
    // Sort by upload date (newest first)
    allImages.sort((a, b) => new Date(b.uploaded_date) - new Date(a.uploaded_date));
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = allImages.slice(startIndex, endIndex);
    
    // Group by structure for summary
    const imagesByStructure = {};
    allImages.forEach(image => {
      if (!imagesByStructure[image.structure_id]) {
        imagesByStructure[image.structure_id] = {
          structure_number: image.structure_number,
          total_images: 0,
          structural_images: 0,
          non_structural_images: 0
        };
      }
      imagesByStructure[image.structure_id].total_images++;
      if (image.rating_type === 'structural') {
        imagesByStructure[image.structure_id].structural_images++;
      } else {
        imagesByStructure[image.structure_id].non_structural_images++;
      }
    });
    
    sendPaginatedResponse(res, 'All images retrieved successfully', {
      images: paginatedImages,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: allImages.length,
        total_pages: Math.ceil(allImages.length / limit),
        has_next_page: endIndex < allImages.length,
        has_prev_page: page > 1
      },
      summary: {
        total_images: allImages.length,
        structural_images: allImages.filter(img => img.rating_type === 'structural').length,
        non_structural_images: allImages.filter(img => img.rating_type === 'non_structural').length,
        images_by_structure: imagesByStructure
      },
      filters: {
        type: imageType || 'all',
        component: component || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Get all images error:', error);
    sendErrorResponse(res, 'Failed to retrieve images', 500, error.message);
  }
}

/**
 * Get images for a specific structure
 * @route GET /api/structures/:id/images
 */
async getStructureImages(req, res) {
  try {
    console.log('🖼️ Getting images for structure:', req.params.id);
    
    const { id } = req.params;
    const imageType = req.query.type; // 'structural' or 'non_structural'
    const component = req.query.component; // specific component filter
    const floorNumber = req.query.floor; // specific floor filter
    const groupBy = req.query.group_by || 'component'; // 'component', 'floor', 'flat', 'date'
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const structureImages = [];
    
    // Extract images from the structure
    if (structure.geometric_details?.floors) {
      structure.geometric_details.floors.forEach(floor => {
        // Apply floor filter if specified
        if (floorNumber && floor.floor_number !== parseInt(floorNumber)) {
          return;
        }
        
        if (floor.flats) {
          floor.flats.forEach(flat => {
            const images = this.extractFlatImages(flat, {
              includeLocationInfo: true,
              floorNumber: floor.floor_number,
              floorLabel: floor.floor_label_name,
              flatNumber: flat.flat_number,
              flatType: flat.flat_type,
              imageType,
              component
            });
            structureImages.push(...images);
          });
        }
      });
    }
    
    // Group images based on groupBy parameter
    let groupedImages = {};
    
    switch (groupBy) {
      case 'floor':
        structureImages.forEach(image => {
          const key = `Floor ${image.floor_number}`;
          if (!groupedImages[key]) {
            groupedImages[key] = [];
          }
          groupedImages[key].push(image);
        });
        break;
        
      case 'flat':
        structureImages.forEach(image => {
          const key = `Floor ${image.floor_number} - Flat ${image.flat_number}`;
          if (!groupedImages[key]) {
            groupedImages[key] = [];
          }
          groupedImages[key].push(image);
        });
        break;
        
      case 'date':
        structureImages.forEach(image => {
          const date = new Date(image.uploaded_date).toISOString().split('T')[0];
          if (!groupedImages[date]) {
            groupedImages[date] = [];
          }
          groupedImages[date].push(image);
        });
        break;
        
      case 'component':
      default:
        structureImages.forEach(image => {
          const key = `${image.rating_type} - ${image.component}`;
          if (!groupedImages[key]) {
            groupedImages[key] = [];
          }
          groupedImages[key].push(image);
        });
        break;
    }
    
    // Convert to array format with metadata
    const groupedResult = Object.keys(groupedImages).map(groupKey => ({
      group_name: groupKey,
      total_images: groupedImages[groupKey].length,
      images: groupedImages[groupKey].sort((a, b) => new Date(b.uploaded_date) - new Date(a.uploaded_date))
    }));
    
    // Calculate summary statistics
    const summary = {
      total_images: structureImages.length,
      structural_images: structureImages.filter(img => img.rating_type === 'structural').length,
      non_structural_images: structureImages.filter(img => img.rating_type === 'non_structural').length,
      images_by_rating: {},
      latest_upload: structureImages.length > 0 ? Math.max(...structureImages.map(img => new Date(img.uploaded_date))) : null
    };
    
    // Group by rating levels
    [1, 2, 3, 4, 5].forEach(rating => {
      summary.images_by_rating[`rating_${rating}`] = structureImages.filter(img => img.rating === rating).length;
    });
    
    sendSuccessResponse(res, 'Structure images retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      structure_number: structure.structural_identity?.structural_identity_number,
      grouped_images: groupedResult,
      summary: summary,
      filters: {
        type: imageType || 'all',
        component: component || 'all',
        floor: floorNumber || 'all',
        grouped_by: groupBy
      }
    });

  } catch (error) {
    console.error('❌ Get structure images error:', error);
    sendErrorResponse(res, 'Failed to retrieve structure images', 500, error.message);
  }
}

/**
 * Get user-level image statistics and recent uploads
 * @route GET /api/structures/images/user-stats
 */
async getUserImageStats(req, res) {
  try {
    console.log('📊 Getting user image statistics:', req.user.userId);
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const stats = {
      total_images: 0,
      structural_images: 0,
      non_structural_images: 0,
      images_by_component: {},
      images_by_rating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      images_by_structure: {},
      recent_uploads: [],
      upload_timeline: {}
    };
    
    const allImages = [];
    
    // Process all structures
    if (user.structures) {
      user.structures.forEach(structure => {
        const structureKey = structure.structural_identity?.structural_identity_number || structure._id;
        stats.images_by_structure[structureKey] = {
          structure_id: structure._id,
          total: 0,
          structural: 0,
          non_structural: 0
        };
        
        if (structure.geometric_details?.floors) {
          structure.geometric_details.floors.forEach(floor => {
            if (floor.flats) {
              floor.flats.forEach(flat => {
                const images = this.extractFlatImages(flat, {
                  includeStructureInfo: true,
                  structureId: structure._id,
                  structureNumber: structureKey
                });
                
                images.forEach(image => {
                  stats.total_images++;
                  allImages.push(image);
                  
                  // Count by type
                  if (image.rating_type === 'structural') {
                    stats.structural_images++;
                    stats.images_by_structure[structureKey].structural++;
                  } else {
                    stats.non_structural_images++;
                    stats.images_by_structure[structureKey].non_structural++;
                  }
                  
                  stats.images_by_structure[structureKey].total++;
                  
                  // Count by component
                  if (!stats.images_by_component[image.component]) {
                    stats.images_by_component[image.component] = 0;
                  }
                  stats.images_by_component[image.component]++;
                  
                  // Count by rating
                  if (image.rating >= 1 && image.rating <= 5) {
                    stats.images_by_rating[image.rating]++;
                  }
                  
                  // Group by upload date for timeline
                  const uploadDate = new Date(image.uploaded_date).toISOString().split('T')[0];
                  if (!stats.upload_timeline[uploadDate]) {
                    stats.upload_timeline[uploadDate] = 0;
                  }
                  stats.upload_timeline[uploadDate]++;
                });
              });
            }
          });
        }
      });
    }
    
    // Get recent uploads (last 10)
    stats.recent_uploads = allImages
      .sort((a, b) => new Date(b.uploaded_date) - new Date(a.uploaded_date))
      .slice(0, 10)
      .map(image => ({
        image_url: image.image_url,
        component: image.component,
        rating_type: image.rating_type,
        rating: image.rating,
        structure_number: image.structure_number,
        location: `Floor ${image.floor_number}, Flat ${image.flat_number}`,
        uploaded_date: image.uploaded_date
      }));
    
    // Calculate percentages
    const imagePercentages = {
      structural_percentage: stats.total_images > 0 ? Math.round((stats.structural_images / stats.total_images) * 100) : 0,
      non_structural_percentage: stats.total_images > 0 ? Math.round((stats.non_structural_images / stats.total_images) * 100) : 0,
      critical_images_percentage: stats.total_images > 0 ? Math.round(((stats.images_by_rating[1] + stats.images_by_rating[2]) / stats.total_images) * 100) : 0
    };
    
    sendSuccessResponse(res, 'User image statistics retrieved successfully', {
      user_id: req.user.userId,
      username: user.username,
      total_structures: user.structures?.length || 0,
      image_statistics: stats,
      percentages: imagePercentages,
      summary: {
        most_documented_component: Object.keys(stats.images_by_component).reduce((a, b) => 
          stats.images_by_component[a] > stats.images_by_component[b] ? a : b, ''
        ),
        most_active_structure: Object.keys(stats.images_by_structure).reduce((a, b) => 
          stats.images_by_structure[a].total > stats.images_by_structure[b].total ? a : b, ''
        ),
        documentation_quality: stats.total_images > 0 ? 
          (stats.images_by_rating[4] + stats.images_by_rating[5]) / stats.total_images > 0.7 ? 'Good' :
          (stats.images_by_rating[4] + stats.images_by_rating[5]) / stats.total_images > 0.4 ? 'Fair' : 'Needs Improvement'
          : 'No Data'
      }
    });

  } catch (error) {
    console.error('❌ Get user image stats error:', error);
    sendErrorResponse(res, 'Failed to retrieve user image statistics', 500, error.message);
  }
}

  // =================== UTILITY METHODS FOR LEGACY SUPPORT ===================
  async getNextSequenceForLocation(stateCode, districtCode, cityName, locationCode) {
    try {
      const locationPrefix = this.structureNumberGenerator.getLocationPrefix(
        stateCode, districtCode, cityName, locationCode
      );
      
      const pipeline = [
        { $unwind: '$structures' },
        {
          $match: {
            'structures.structural_identity.structural_identity_number': { 
              $regex: `^${locationPrefix}` 
            }
          }
        },
        {
          $project: {
            sequence: { 
              $substr: ['$structures.structural_identity.structural_identity_number', 10, 5] 
            }
          }
        },
        {
          $group: {
            _id: null,
            maxSequence: { 
              $max: { $toInt: '$sequence' } 
            }
          }
        }
      ];
      
      const result = await User.aggregate(pipeline);
      const maxSequence = result.length > 0 ? result[0].maxSequence : 0;
      
      const nextSequence = maxSequence + 1;
      return this.structureNumberGenerator.formatSequenceNumber(nextSequence);
      
    } catch (error) {
      console.error('Error getting next sequence:', error);
      return this.structureNumberGenerator.generateTimestampSequence();
    }
  }

  async validateStructureNumber(req, res) {
    try {
      const { structural_identity_number } = req.body;
      
      if (!structural_identity_number || structural_identity_number.length !== 17) {
        return sendErrorResponse(res, 'Invalid structure number format', 400);
      }
      
      const parsed = this.structureNumberGenerator.parseStructuralIdentityNumber(structural_identity_number);
      const isDuplicate = await this.checkDuplicateStructureNumber(structural_identity_number);
      
      sendSuccessResponse(res, 'Structure number validation completed', {
        is_valid: true,
        is_duplicate: isDuplicate,
        parsed_components: parsed,
        formatted_display: `${parsed.state_code}-${parsed.district_code}-${parsed.city_code}-${parsed.location_code}-${parsed.structure_sequence}-${parsed.type_code}`
      });
      
    } catch (error) {
      console.error('❌ Structure number validation error:', error);
      sendErrorResponse(res, 'Structure number validation failed', 400, error.message);
    }
  }

  async checkDuplicateStructureNumber(structuralIdentityNumber) {
    try {
      const existingUser = await User.findOne({
        'structures.structural_identity.structural_identity_number': structuralIdentityNumber
      });
      
      return existingUser ? true : false;
    } catch (error) {
      console.error('Error checking duplicate structure number:', error);
      return false;
    }
  }

  async getLocationStructureStats(req, res) {
    try {
      const { state_code, district_code, city_name, location_code } = req.query;
      
      if (!state_code || !district_code) {
        return sendErrorResponse(res, 'State code and district code are required', 400);
      }
      
      let locationPrefix = this.structureNumberGenerator.getLocationPrefix(
        state_code, 
        district_code, 
        city_name || 'XXXX', 
        location_code || 'XX'
      );
      
      if (!city_name && !location_code) {
        locationPrefix = `${state_code.toUpperCase().padEnd(2, 'X')}${district_code.padStart(2, '0')}`;
      } else if (!location_code) {
        locationPrefix = locationPrefix.substring(0, 8);
      }
      
      const stats = await User.aggregate([
        { $unwind: '$structures' },
        {
          $match: {
            'structures.structural_identity.structural_identity_number': {
              $regex: `^${locationPrefix}`
            }
          }
        },
        {
          $group: {
            _id: null,
            total_structures: { $sum: 1 },
            by_type: {
              $push: '$structures.structural_identity.type_of_structure'
            },
            by_status: {
              $push: '$structures.status'
            }
          }
        }
      ]);
      
      const result = stats[0] || { total_structures: 0, by_type: [], by_status: [] };
      
      const typeCounts = {};
      const statusCounts = {};
      
      result.by_type.forEach(type => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      result.by_status.forEach(status => {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      let nextSequenceNumber = '00001';
      if (city_name && location_code) {
        nextSequenceNumber = await this.getNextSequenceForLocation(
          state_code, district_code, city_name, location_code
        );
      }
      
      sendSuccessResponse(res, 'Location structure statistics retrieved', {
        location: {
          state_code: state_code.toUpperCase(),
          district_code: district_code.padStart(2, '0'),
          city_code: city_name ? city_name.toUpperCase().padEnd(4, 'X').substring(0, 4) : 'ALL',
          location_code: location_code ? location_code.toUpperCase().padEnd(2, 'X').substring(0, 2) : 'ALL'
        },
        total_structures: result.total_structures,
        by_type: typeCounts,
        by_status: statusCounts,
        next_sequence_number: nextSequenceNumber
      });
      
    } catch (error) {
      console.error('❌ Location stats error:', error);
      sendErrorResponse(res, 'Failed to get location statistics', 500, error.message);
    }
  }

  // =================== UTILITY METHODS FOR ROLES ===================
  hasRole(user, requiredRole) {
    // Check if user has the required role in their roles array or primary role
    return user.roles?.includes(requiredRole) || user.role === requiredRole;
  }

  // Check role from request user object (which includes roles array)
  hasRoleFromRequest(req, requiredRole) {
    const userRoles = req.user.roles || [req.user.role];
    return userRoles.includes(requiredRole);
  }

  getUserFullName(user) {
    if (user.profile?.first_name || user.profile?.last_name) {
      return `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim();
    }
    return user.username;
  }


  // =================== NEW COMPONENT RATING METHODS ===================
// Add these methods to your StructureController class

/**
 * Save structural ratings for a flat
 * @route POST /structures/:id/flats/:flatId/structural
 */
async saveFlatStructuralComponents(req, res) {
  try {
    const { id, flatId } = req.params;
    const { component_type, components } = req.body;
    
    console.log(`📝 Saving structural components for flat ${flatId}, type: ${component_type}`);
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat across all floors
    let targetFlat = null;
    let targetFloor = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        targetFloor = floor;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Initialize structural_rating if not exists
    if (!targetFlat.structural_rating) {
      targetFlat.structural_rating = {};
    }
    
    // Validate component_type is structural
    const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
    if (!structuralComponents.includes(component_type)) {
      return sendErrorResponse(res, 'Invalid structural component type', 400);
    }
    
    // Save components array
    targetFlat.structural_rating[component_type] = components;
    
    // Calculate overall average for structural ratings
    this.calculateStructuralAverage(targetFlat);
    
    structure.creation_info.last_updated_date = new Date();
    structure.status = 'ratings_in_progress';
    await user.save();
    
    sendSuccessResponse(res, `Structural ${component_type} saved successfully`, {
      structure_id: id,
      flat_id: flatId,
      component_type,
      components_saved: components.length,
      structural_rating: targetFlat.structural_rating
    });
    
  } catch (error) {
    console.error('❌ Save flat structural components error:', error);
    sendErrorResponse(res, 'Failed to save structural components', 500, error.message);
  }
}

/**
 * Save non-structural ratings for a flat
 * @route POST /structures/:id/flats/:flatId/non-structural
 */
async saveFlatNonStructuralComponents(req, res) {
  try {
    const { id, flatId } = req.params;
    const { component_type, components } = req.body;
    
    console.log(`📝 Saving non-structural components for flat ${flatId}, type: ${component_type}`);
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    let targetFloor = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        targetFloor = floor;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Initialize non_structural_rating if not exists
    if (!targetFlat.non_structural_rating) {
      targetFlat.non_structural_rating = {};
    }
    
    // Validate component_type is non-structural
    const nonStructuralComponents = [
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'
    ];
    
    if (!nonStructuralComponents.includes(component_type)) {
      return sendErrorResponse(res, 'Invalid non-structural component type', 400);
    }
    
    // Save components array
    targetFlat.non_structural_rating[component_type] = components;
    
    // Calculate overall average for non-structural ratings
    this.calculateNonStructuralAverage(targetFlat);
    
    // Calculate combined rating if both structural and non-structural exist
    this.calculateCombinedRating(targetFlat);
    
    structure.creation_info.last_updated_date = new Date();
    structure.status = 'ratings_in_progress';
    await user.save();
    
    sendSuccessResponse(res, `Non-structural ${component_type} saved successfully`, {
      structure_id: id,
      flat_id: flatId,
      component_type,
      components_saved: components.length,
      non_structural_rating: targetFlat.non_structural_rating,
      flat_overall_rating: targetFlat.flat_overall_rating
    });
    
  } catch (error) {
    console.error('❌ Save flat non-structural components error:', error);
    sendErrorResponse(res, 'Failed to save non-structural components', 500, error.message);
  }
}

/**
 * Get structural components of specific type for a flat
 * @route GET /structures/:id/flats/:flatId/structural/:type
 */
async getFlatStructuralComponents(req, res) {
  try {
    const { id, flatId, type } = req.params;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    const components = targetFlat.structural_rating?.[type] || [];
    
    sendSuccessResponse(res, 'Structural components retrieved successfully', {
      structure_id: id,
      flat_id: flatId,
      component_type: type,
      components: components,
      total_components: components.length
    });
    
  } catch (error) {
    console.error('❌ Get flat structural components error:', error);
    sendErrorResponse(res, 'Failed to get structural components', 500, error.message);
  }
}

/**
 * Get non-structural components of specific type for a flat
 * @route GET /structures/:id/flats/:flatId/non-structural/:type
 */
async getFlatNonStructuralComponents(req, res) {
  try {
    const { id, flatId, type } = req.params;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    const components = targetFlat.non_structural_rating?.[type] || [];
    
    sendSuccessResponse(res, 'Non-structural components retrieved successfully', {
      structure_id: id,
      flat_id: flatId,
      component_type: type,
      components: components,
      total_components: components.length
    });
    
  } catch (error) {
    console.error('❌ Get flat non-structural components error:', error);
    sendErrorResponse(res, 'Failed to get non-structural components', 500, error.message);
  }
}

/**
 * Update a specific structural component instance
 * @route PATCH /structures/:id/flats/:flatId/structural/:componentId
 */
async updateFlatStructuralComponent(req, res) {
  try {
    const { id, flatId, componentId } = req.params;
    const updateData = req.body;
    
    console.log(`📝 Updating structural component ${componentId} for flat ${flatId}`);
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Find the component across all structural types
    let found = false;
    let componentType = null;
    const structuralTypes = ['beams', 'columns', 'slab', 'foundation'];
    
    for (const type of structuralTypes) {
      const components = targetFlat.structural_rating?.[type];
      if (components && Array.isArray(components)) {
        const componentIndex = components.findIndex(c => c._id === componentId);
        if (componentIndex !== -1) {
          // Update component
          Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
              components[componentIndex][key] = updateData[key];
            }
          });
          components[componentIndex].inspection_date = new Date();
          found = true;
          componentType = type;
          break;
        }
      }
    }
    
    if (!found) {
      return sendErrorResponse(res, 'Component not found', 404);
    }
    
    // Recalculate averages
    this.calculateStructuralAverage(targetFlat);
    this.calculateCombinedRating(targetFlat);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Structural component updated successfully', {
      structure_id: id,
      flat_id: flatId,
      component_id: componentId,
      component_type: componentType,
      updated_fields: Object.keys(updateData)
    });
    
  } catch (error) {
    console.error('❌ Update flat structural component error:', error);
    sendErrorResponse(res, 'Failed to update structural component', 500, error.message);
  }
}

/**
 * Update a specific non-structural component instance
 * @route PATCH /structures/:id/flats/:flatId/non-structural/:componentId
 */
async updateFlatNonStructuralComponent(req, res) {
  try {
    const { id, flatId, componentId } = req.params;
    const updateData = req.body;
    
    console.log(`📝 Updating non-structural component ${componentId} for flat ${flatId}`);
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Find the component across all non-structural types
    let found = false;
    let componentType = null;
    const nonStructuralTypes = [
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'
    ];
    
    for (const type of nonStructuralTypes) {
      const components = targetFlat.non_structural_rating?.[type];
      if (components && Array.isArray(components)) {
        const componentIndex = components.findIndex(c => c._id === componentId);
        if (componentIndex !== -1) {
          // Update component
          Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
              components[componentIndex][key] = updateData[key];
            }
          });
          components[componentIndex].inspection_date = new Date();
          found = true;
          componentType = type;
          break;
        }
      }
    }
    
    if (!found) {
      return sendErrorResponse(res, 'Component not found', 404);
    }
    
    // Recalculate averages
    this.calculateNonStructuralAverage(targetFlat);
    this.calculateCombinedRating(targetFlat);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Non-structural component updated successfully', {
      structure_id: id,
      flat_id: flatId,
      component_id: componentId,
      component_type: componentType,
      updated_fields: Object.keys(updateData)
    });
    
  } catch (error) {
    console.error('❌ Update flat non-structural component error:', error);
    sendErrorResponse(res, 'Failed to update non-structural component', 500, error.message);
  }
}

/**
 * Delete a specific structural component instance
 * @route DELETE /structures/:id/flats/:flatId/structural/:componentId
 */
async deleteFlatStructuralComponent(req, res) {
  try {
    const { id, flatId, componentId } = req.params;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Find and delete the component
    let found = false;
    let componentType = null;
    const structuralTypes = ['beams', 'columns', 'slab', 'foundation'];
    
    for (const type of structuralTypes) {
      const components = targetFlat.structural_rating?.[type];
      if (components && Array.isArray(components)) {
        const componentIndex = components.findIndex(c => c._id === componentId);
        if (componentIndex !== -1) {
          components.splice(componentIndex, 1);
          found = true;
          componentType = type;
          break;
        }
      }
    }
    
    if (!found) {
      return sendErrorResponse(res, 'Component not found', 404);
    }
    
    // Recalculate averages
    this.calculateStructuralAverage(targetFlat);
    this.calculateCombinedRating(targetFlat);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Structural component deleted successfully', {
      structure_id: id,
      flat_id: flatId,
      component_id: componentId,
      component_type: componentType
    });
    
  } catch (error) {
    console.error('❌ Delete flat structural component error:', error);
    sendErrorResponse(res, 'Failed to delete structural component', 500, error.message);
  }
}

/**
 * Delete a specific non-structural component instance
 * @route DELETE /structures/:id/flats/:flatId/non-structural/:componentId
 */
async deleteFlatNonStructuralComponent(req, res) {
  try {
    const { id, flatId, componentId } = req.params;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Find and delete the component
    let found = false;
    let componentType = null;
    const nonStructuralTypes = [
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'
    ];
    
    for (const type of nonStructuralTypes) {
      const components = targetFlat.non_structural_rating?.[type];
      if (components && Array.isArray(components)) {
        const componentIndex = components.findIndex(c => c._id === componentId);
        if (componentIndex !== -1) {
          components.splice(componentIndex, 1);
          found = true;
          componentType = type;
          break;
        }
      }
    }
    
    if (!found) {
      return sendErrorResponse(res, 'Component not found', 404);
    }
    
    // Recalculate averages
    this.calculateNonStructuralAverage(targetFlat);
    this.calculateCombinedRating(targetFlat);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Non-structural component deleted successfully', {
      structure_id: id,
      flat_id: flatId,
      component_id: componentId,
      component_type: componentType
    });
    
  } catch (error) {
    console.error('❌ Delete flat non-structural component error:', error);
    sendErrorResponse(res, 'Failed to delete non-structural component', 500, error.message);
  }
}

// =================== FLOOR-LEVEL RATING METHODS ===================

/**
 * Save structural ratings for a floor
 * @route POST /structures/:id/floors/:floorId/structural
 */
async saveFloorStructuralComponents(req, res) {
  try {
    const { id, floorId } = req.params;
    const { component_type, components } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Initialize structural_rating if not exists
    if (!floor.structural_rating) {
      floor.structural_rating = {};
    }
    
    // Save components
    floor.structural_rating[component_type] = components;
    
    // Calculate average
    this.calculateFloorStructuralAverage(floor);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, `Floor structural ${component_type} saved successfully`, {
      structure_id: id,
      floor_id: floorId,
      component_type,
      components_saved: components.length
    });
    
  } catch (error) {
    console.error('❌ Save floor structural components error:', error);
    sendErrorResponse(res, 'Failed to save floor structural components', 500, error.message);
  }
}

/**
 * Save non-structural ratings for a floor
 * @route POST /structures/:id/floors/:floorId/non-structural
 */
async saveFloorNonStructuralComponents(req, res) {
  try {
    const { id, floorId } = req.params;
    const { component_type, components } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Initialize non_structural_rating if not exists
    if (!floor.non_structural_rating) {
      floor.non_structural_rating = {};
    }
    
    // Save components
    floor.non_structural_rating[component_type] = components;
    
    // Calculate average
    this.calculateFloorNonStructuralAverage(floor);
    this.calculateFloorCombinedRating(floor);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, `Floor non-structural ${component_type} saved successfully`, {
      structure_id: id,
      floor_id: floorId,
      component_type,
      components_saved: components.length
    });
    
  } catch (error) {
    console.error('❌ Save floor non-structural components error:', error);
    sendErrorResponse(res, 'Failed to save floor non-structural components', 500, error.message);
  }
}

// Similar GET, PATCH, DELETE methods for floors...
// (Following same pattern as flats)

// =================== HELPER CALCULATION METHODS ===================

calculateStructuralAverage(flat) {
  if (!flat.structural_rating) return;
  
  const allRatings = [];
  const types = ['beams', 'columns', 'slab', 'foundation'];
  
  types.forEach(type => {
    const components = flat.structural_rating[type];
    if (components && Array.isArray(components)) {
      components.forEach(comp => {
        if (comp.rating) allRatings.push(comp.rating);
      });
    }
  });
  
  if (allRatings.length > 0) {
    const average = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    flat.structural_rating.overall_average = Math.round(average * 10) / 10;
    flat.structural_rating.health_status = this.getHealthStatus(average);
    flat.structural_rating.assessment_date = new Date();
  }
}

calculateComponentAverage(components) {
  const normalizedComponents = this.normalizeRatingComponents(components);
  if (normalizedComponents.length === 0) return null;
  
  const ratings = normalizedComponents
    .map(comp => Number(comp?.rating))
    .filter(rating => !Number.isNaN(rating) && rating > 0);
  
  if (ratings.length === 0) return null;
  
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

normalizeRatingComponents(components) {
  if (Array.isArray(components)) return components;
  if (components && typeof components === 'object') return [components];
  return [];
}

calculateNonStructuralAverage(flat) {
  if (!flat.non_structural_rating) return;
  
  const allRatings = [];
  const types = [
    'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
    'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
    'sewage_system', 'panel_board', 'lifts'
  ];
  
  types.forEach(type => {
    const components = flat.non_structural_rating[type];
    if (components && Array.isArray(components)) {
      components.forEach(comp => {
        if (comp.rating) allRatings.push(comp.rating);
      });
    }
  });
  
  if (allRatings.length > 0) {
    const average = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    flat.non_structural_rating.overall_average = Math.round(average * 10) / 10;
    flat.non_structural_rating.assessment_date = new Date();
  }
}

calculateCombinedRating(flat) {
  if (flat.structural_rating?.overall_average && flat.non_structural_rating?.overall_average) {
    const combinedScore = (flat.structural_rating.overall_average * 0.7) + 
                         (flat.non_structural_rating.overall_average * 0.3);
    
    flat.flat_overall_rating = {
      combined_score: Math.round(combinedScore * 10) / 10,
      health_status: this.getHealthStatus(combinedScore),
      priority: this.getPriority(combinedScore),
      last_assessment_date: new Date()
    };
  }
}

calculateFloorStructuralAverage(floor) {
  if (!floor.structural_rating) return;
  
  const allRatings = [];
  const types = ['beams', 'columns', 'slab', 'foundation'];
  
  types.forEach(type => {
    const components = floor.structural_rating[type];
    if (components && Array.isArray(components)) {
      components.forEach(comp => {
        if (comp.rating) allRatings.push(comp.rating);
      });
    }
  });
  
  if (allRatings.length > 0) {
    const average = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    floor.structural_rating.overall_average = Math.round(average * 10) / 10;
    floor.structural_rating.health_status = this.getHealthStatus(average);
    floor.structural_rating.assessment_date = new Date();
  }
}

calculateFloorNonStructuralAverage(floor) {
  if (!floor.non_structural_rating) return;
  
  const allRatings = [];
  const types = ['walls', 'flooring', 'electrical_system', 'fire_safety'];
  
  types.forEach(type => {
    const components = floor.non_structural_rating[type];
    if (components && Array.isArray(components)) {
      components.forEach(comp => {
        if (comp.rating) allRatings.push(comp.rating);
      });
    }
  });
  
  if (allRatings.length > 0) {
    const average = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    floor.non_structural_rating.overall_average = Math.round(average * 10) / 10;
    floor.non_structural_rating.assessment_date = new Date();
  }
}

calculateFloorCombinedRating(floor) {
  if (floor.structural_rating?.overall_average && floor.non_structural_rating?.overall_average) {
    const combinedScore = (floor.structural_rating.overall_average * 0.7) + 
                         (floor.non_structural_rating.overall_average * 0.3);
    
    floor.floor_overall_rating = {
      combined_score: Math.round(combinedScore * 10) / 10,
      health_status: this.getHealthStatus(combinedScore),
      priority: this.getPriority(combinedScore),
      last_assessment_date: new Date()
    };
  }
}

getHealthStatus(average) {
  if (!average || isNaN(average)) return null;
  if (average >= 4) return 'Good';
  if (average >= 3) return 'Fair';
  if (average >= 2) return 'Poor';
  return 'Critical';
}

getPriority(average) {
  if (!average || isNaN(average)) return null;
  if (average >= 4) return 'Low';
  if (average >= 3) return 'Medium';
  if (average >= 2) return 'High';
  return 'Critical';
}

  // =================== REMARKS MANAGEMENT ===================
  
  /**
   * Add a remark to a structure
   * @route POST /api/structures/:id/remarks
   * @access Private (FE, VE roles)
   */
async addRemark(req, res) {
  try {
    const { id } = req.params;
    const { text, remark_text } = req.body;

    const remarkText = text?.trim() || remark_text?.trim();
    if (!remarkText) {
      return sendErrorResponse(res, 'Remark text is required', 400);
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    // Determine the role
    const userRole = this.hasRoleFromRequest(req, 'FE')
      ? 'FE'
      : this.hasRoleFromRequest(req, 'VE')
      ? 'VE'
      : this.hasRoleFromRequest(req, 'TE')
      ? 'TE'
      : null;

    if (!userRole) {
      return sendErrorResponse(
        res,
        'Only FE, VE, and TE roles can add remarks',
        403
      );
    }

    const { structure } = await this.findStructureAcrossUsers(id);
    if (!structure) {
      return sendErrorResponse(res, 'Structure not found', 404);
    }

    // Initialize remarks if missing
    if (!structure.remarks) {
      structure.remarks = {
        fe_remarks: [],
        ve_remarks: [],
        te_remarks: [],
        last_updated_by: {}
      };
    }

    const authorName = this.getUserFullName(user);

    const newRemark = {
      text: remarkText,
      author_name: authorName,
      author_role: userRole,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Push to correct bucket
    if (userRole === 'FE') {
      structure.remarks.fe_remarks.push(newRemark);
    } else if (userRole === 'VE') {
      structure.remarks.ve_remarks.push(newRemark);
    } else {
      structure.remarks.te_remarks.push(newRemark);
    }

    // Set last updated information
    structure.remarks.last_updated_by = {
      role: userRole,
      name: authorName,
      date: new Date()
    };

    structure.creation_info.last_updated_date = new Date();

    await structure.save();

    // Get the last saved remark with MongoDB _id
    const savedRemark =
      userRole === 'FE'
        ? structure.remarks.fe_remarks.slice(-1)[0]
        : userRole === 'VE'
        ? structure.remarks.ve_remarks.slice(-1)[0]
        : structure.remarks.te_remarks.slice(-1)[0];

    sendSuccessResponse(res, 'Remark added successfully', {
      remark_id: savedRemark._id,
      text: savedRemark.text,
      created_at: savedRemark.created_at,
      updated_at: savedRemark.updated_at,
      author_name: savedRemark.author_name,
      author_role: savedRemark.author_role
    });

  } catch (error) {
    console.error('❌ Add remark error:', error);
    sendErrorResponse(res, 'Failed to add remark', 500, error.message);
  }
}





  // Add after the addRemark method in your controller:

async updateRemark(req, res) {
  try {
    const { id, remarkId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return sendErrorResponse(res, 'Updated text is required', 400);
    }

    const userRole = this.hasRoleFromRequest(req, 'FE')
      ? 'FE'
      : this.hasRoleFromRequest(req, 'VE')
      ? 'VE'
      : this.hasRoleFromRequest(req, 'TE')
      ? 'TE'
      : null;

    if (!userRole) {
      return sendErrorResponse(res, 'Only FE, VE, or TE can update remarks', 403);
    }

    const { structure } = await this.findStructureAcrossUsers(id);
    if (!structure) {
      return sendErrorResponse(res, 'Structure not found', 404);
    }

    const bucketName =
      userRole === 'FE'
        ? 'fe_remarks'
        : userRole === 'VE'
        ? 've_remarks'
        : 'te_remarks';

    const bucket = structure.remarks[bucketName];
    const remark = bucket.find(r => r._id.toString() === remarkId);

    if (!remark) {
      return sendErrorResponse(res, 'Remark not found', 404);
    }

    remark.text = text.trim();
    remark.updated_at = new Date();

    structure.remarks.last_updated_by = {
      role: userRole,
      name: req.user.fullName,
      date: new Date()
    };

    structure.creation_info.last_updated_date = new Date();

    await structure.save();

    sendSuccessResponse(res, 'Remark updated successfully', remark);

  } catch (error) {
    console.error('❌ Update remark error:', error);
    sendErrorResponse(res, 'Failed to update remark', 500, error.message);
  }
}



async getRemarks(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    // Allow FE, VE, TE to view remarks
    const userRole =
      this.hasRoleFromRequest(req, 'FE') ? 'FE' :
      this.hasRoleFromRequest(req, 'VE') ? 'VE' :
      this.hasRoleFromRequest(req, 'TE') ? 'TE' : null;

    if (!userRole) {
      return sendErrorResponse(
        res,
        'Only FE, VE and TE can view remarks',
        403
      );
    }

    const { structure } = await this.findStructureAcrossUsers(id);
    if (!structure) {
      return sendErrorResponse(res, 'Structure not found', 404);
    }

    // Initialize if missing
    const remarks = structure.remarks || {
      fe_remarks: [],
      ve_remarks: [],
      te_remarks: [],
      last_updated_by: {}
    };

    sendSuccessResponse(res, 'Remarks retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      fe_remarks: remarks.fe_remarks,
      ve_remarks: remarks.ve_remarks,
      te_remarks: remarks.te_remarks || [],
      total_fe_remarks: remarks.fe_remarks.length,
      total_ve_remarks: remarks.ve_remarks.length,
      total_te_remarks: (remarks.te_remarks || []).length,
      last_updated_by: remarks.last_updated_by
    });

  } catch (error) {
    console.error('❌ Get remarks error:', error);
    sendErrorResponse(res, 'Failed to retrieve remarks', 500, error.message);
  }
}


async deleteRemark(req, res) {
  try {
    const { id, remarkId } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const userRole = this.hasRoleFromRequest(req, 'FE') ? 'FE' : 
                     this.hasRoleFromRequest(req, 'VE') ? 'VE' : null;
    if (!userRole) {
      return sendErrorResponse(res, 'Only FE and VE can delete remarks', 403);
    }

    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    if (!structure.remarks) {
      return sendErrorResponse(res, 'No remarks found', 404);
    }

    const authorName = this.getUserFullName(user);
    let remarkFound = false;

    if (userRole === 'FE' && structure.remarks.fe_remarks) {
      const remark = structure.remarks.fe_remarks.id(remarkId);
      if (remark) {
        if (remark.author_name !== authorName) {
          return sendErrorResponse(res, 'You can only delete your own remarks', 403);
        }
        structure.remarks.fe_remarks.pull(remarkId);
        remarkFound = true;
      }
    } else if (userRole === 'VE' && structure.remarks.ve_remarks) {
      const remark = structure.remarks.ve_remarks.id(remarkId);
      if (remark) {
        if (remark.author_name !== authorName) {
          return sendErrorResponse(res, 'You can only delete your own remarks', 403);
        }
        structure.remarks.ve_remarks.pull(remarkId);
        remarkFound = true;
      }
    }

    if (!remarkFound) {
      return sendErrorResponse(res, 'Remark not found', 404);
    }

    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();

    sendSuccessResponse(res, 'Remark deleted successfully', {
      structure_id: id,
      deleted_remark_id: remarkId
    });

  } catch (error) {
    console.error('❌ Delete remark error:', error);
    sendErrorResponse(res, 'Failed to delete remark', 500, error.message);
  }
}



/**
 * Delete a structure (hard delete)
 * @route DELETE /api/structures/:id
 * @access Private (Owner or Admin)
 */
async deleteStructure(req, res) {
  try {
    const { id } = req.params;
    const { permanent = true } = req.query; // Default to hard delete
    
    console.log(`🗑️ Deleting structure ${id} (permanent: ${permanent})`);
    
    // Fetch the user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    // Find the structure index in the user's structures array
    const structureIndex = user.structures.findIndex(
      s => s._id.toString() === id
    );

    if (structureIndex === -1) {
      return sendErrorResponse(res, 'Structure not found', 404);
    }

    // Optional: permission check
    // if (user is not owner/admin) return sendErrorResponse(...);

    const structure = user.structures[structureIndex];

    if (permanent === 'true' || permanent === true) {
      // Hard delete: remove from array completely
      user.structures.splice(structureIndex, 1);
      await user.save();

      console.log(`✅ Structure ${id} permanently deleted`);

      return sendSuccessResponse(res, 'Structure permanently deleted', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        structure_number: structure.structural_identity?.structural_identity_number,
        deletion_type: 'permanent',
        deleted_at: new Date()
      });
    }

    // Optional: remove soft delete if you don't need it
    // Otherwise, keep your soft delete logic here
    // structure.status = 'deleted'; // <-- will fail if enum doesn't allow it

  } catch (error) {
    console.error('❌ Delete structure error:', error);
    sendErrorResponse(res, 'Failed to delete structure', 500, error.message);
  }
}




  // =================== NEW BULK COMPONENT RATING METHODS ===================
// Add these methods to the StructureController class body

/**
 * Save multiple structural component types for a flat in one request
 * @route POST /structures/:id/flats/:flatId/structural/bulk
 */
async saveFlatStructuralComponentsBulk(req, res) {
  try {
    const { id, flatId } = req.params;
    const { structures } = req.body;
    
    console.log(`📦 Saving multiple structural component types for flat ${flatId}`);
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    let targetFloor = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        targetFloor = floor;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Initialize structural_rating if not exists
    if (!targetFlat.structural_rating) {
      targetFlat.structural_rating = {};
    }
    
    const inspectionDate = new Date();
    let totalComponentsSaved = 0;
    const savedComponentTypes = [];
    
    // Process each component type
    structures.forEach(({ component_type, components }) => {
      // Validate it's a structural component
      const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
      if (!structuralComponents.includes(component_type)) {
        throw new Error(`Invalid structural component type: ${component_type}`);
      }
      
      // ✅ FIXED: Auto-generate component IDs if not provided
      const formattedComponents = components.map(comp => ({
        _id: comp._id || this.generateComponentId(component_type),  // Auto-generate if missing
        name: comp.name,
        rating: parseInt(comp.rating),
        photo: normalizePhotoList(comp.photos, comp.photo)[0] || '',
        photos: normalizePhotoList(comp.photos, comp.photo),
        condition_comment: comp.condition_comment,
        inspector_notes: comp.inspector_notes || '',
        inspection_date: inspectionDate
      }));
      
      // Save to flat
      targetFlat.structural_rating[component_type] = formattedComponents;
      totalComponentsSaved += formattedComponents.length;
      savedComponentTypes.push({
        component_type,
        count: formattedComponents.length,
        components: formattedComponents.map(c => ({ _id: c._id, name: c.name }))  // ✅ Include generated IDs
      });
    });
    
    // Calculate overall average
    this.calculateStructuralAverage(targetFlat);
    
    // Update combined rating if non-structural exists
    this.calculateCombinedRating(targetFlat);
    
    structure.creation_info.last_updated_date = new Date();
    structure.status = 'ratings_in_progress';
    await user.save();
    
    sendSuccessResponse(res, 'Structural components saved successfully', {
      structure_id: id,
      flat_id: flatId,
      total_components_saved: totalComponentsSaved,
      component_types_saved: savedComponentTypes,
      structural_rating: targetFlat.structural_rating,
      flat_overall_rating: targetFlat.flat_overall_rating
    });
    
  } catch (error) {
    console.error('❌ Save flat structural components bulk error:', error);
    sendErrorResponse(res, 'Failed to save structural components', 500, error.message);
  }
}

/**
 * Save multiple non-structural component types for a flat in one request
 */
async saveFlatNonStructuralComponentsBulk(req, res) {
  try {
    const { id, flatId } = req.params;
    const { structures } = req.body;
    
    console.log(`📦 Saving multiple non-structural component types for flat ${flatId}`);
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Find the flat
    let targetFlat = null;
    
    for (const floor of structure.geometric_details?.floors || []) {
      const flat = floor.flats?.find(f => f.flat_id === flatId);
      if (flat) {
        targetFlat = flat;
        break;
      }
    }
    
    if (!targetFlat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Initialize non_structural_rating if not exists
    if (!targetFlat.non_structural_rating) {
      targetFlat.non_structural_rating = {};
    }
    
    const inspectionDate = new Date();
    let totalComponentsSaved = 0;
    const savedComponentTypes = [];
    
    // Process each component type
    structures.forEach(({ component_type, components }) => {
      // Validate it's a non-structural component
      const nonStructuralComponents = [
        'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
        'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
        'sewage_system', 'panel_board', 'lifts'
      ];
      
      if (!nonStructuralComponents.includes(component_type)) {
        throw new Error(`Invalid non-structural component type: ${component_type}`);
      }
      
      // ✅ FIXED: Auto-generate component IDs if not provided
      const formattedComponents = components.map(comp => ({
        _id: comp._id || this.generateComponentId(component_type),  // Auto-generate if missing
        name: comp.name,
        rating: parseInt(comp.rating),
        photo: normalizePhotoList(comp.photos, comp.photo)[0] || '',
        photos: normalizePhotoList(comp.photos, comp.photo),
        condition_comment: comp.condition_comment,
        inspector_notes: comp.inspector_notes || '',
        inspection_date: inspectionDate
      }));
      
      // Save to flat
      targetFlat.non_structural_rating[component_type] = formattedComponents;
      totalComponentsSaved += formattedComponents.length;
      savedComponentTypes.push({
        component_type,
        count: formattedComponents.length,
        components: formattedComponents.map(c => ({ _id: c._id, name: c.name }))  // ✅ Include generated IDs
      });
    });
    
    // Calculate overall average
    this.calculateNonStructuralAverage(targetFlat);
    
    // Update combined rating
    this.calculateCombinedRating(targetFlat);
    
    structure.creation_info.last_updated_date = new Date();
    structure.status = 'ratings_in_progress';
    await user.save();
    
    sendSuccessResponse(res, 'Non-structural components saved successfully', {
      structure_id: id,
      flat_id: flatId,
      total_components_saved: totalComponentsSaved,
      component_types_saved: savedComponentTypes,
      non_structural_rating: targetFlat.non_structural_rating,
      flat_overall_rating: targetFlat.flat_overall_rating
    });
    
  } catch (error) {
    console.error('❌ Save flat non-structural components bulk error:', error);
    sendErrorResponse(res, 'Failed to save non-structural components', 500, error.message);
  }
}

/**
 * Get floor structural components
 */
async getFloorStructuralComponents(req, res) {
  try {
    const { id, floorId, type } = req.params;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const components = floor.structural_rating?.[type] || [];
    
    sendSuccessResponse(res, 'Floor structural components retrieved successfully', {
      structure_id: id,
      floor_id: floorId,
      component_type: type,
      components: components,
      total_components: components.length
    });
    
  } catch (error) {
    console.error('❌ Get floor structural components error:', error);
    sendErrorResponse(res, 'Failed to get floor structural components', 500, error.message);
  }
}

/**
 * Get floor non-structural components
 */
async getFloorNonStructuralComponents(req, res) {
  try {
    const { id, floorId, type } = req.params;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const components = floor.non_structural_rating?.[type] || [];
    
    sendSuccessResponse(res, 'Floor non-structural components retrieved successfully', {
      structure_id: id,
      floor_id: floorId,
      component_type: type,
      components: components,
      total_components: components.length
    });
    
  } catch (error) {
    console.error('❌ Get floor non-structural components error:', error);
    sendErrorResponse(res, 'Failed to get floor non-structural components', 500, error.message);
  }
}

/**
 * Save multiple structural component types for a floor
 */
/**
 * Save multiple structural component types for a floor (UPDATED WITH VALIDATION)
 * POST /api/structures/:id/floors/:floorId/structural/bulk
 */
async saveFloorStructuralComponentsBulk(req, res) {
  try {
    const { id, floorId } = req.params;
    const { structures } = req.body;

    console.log('📥 saveFloorStructuralComponentsBulk called');
    console.log('Structure ID:', id);
    console.log('Floor ID:', floorId);
    console.log('Structures data:', JSON.stringify(structures, null, 2));

    // ✅ Build a filename → Cloudinary URL map from uploaded files.
    //    upload.fields() sets req.files as an object: { photo: [...], photos: [...] }
    //    Flatten all fields into a single ordered array for sequential fallback.
    const uploadedFileMap = {};
    const uploadedFileQueue = []; // ordered Cloudinary URLs for sequential assignment
    if (req.files && typeof req.files === 'object') {
      const allFiles = Object.values(req.files).flat();
      console.log(`📸 ${allFiles.length} file(s) uploaded to Cloudinary`);
      allFiles.forEach(file => {
        const cloudinaryUrl = file.path || file.secure_url || (file.filename && `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${file.filename}`);
        if (cloudinaryUrl) {
          uploadedFileMap[file.originalname] = cloudinaryUrl;
          uploadedFileQueue.push(cloudinaryUrl);
          console.log(`   ✅ Mapped: ${file.originalname} → ${cloudinaryUrl}`);
        }
      });
    }
    let fileQueueIndex = 0; // tracks next unassigned file for sequential fallback

    // ✅ Helper: resolve a photo value to a Cloudinary URL.
    //    Priority: (1) already a remote URL → keep as-is
    //              (2) filename matches an uploaded file → use that URL
    //              (3) any non-empty placeholder → assign next uploaded file sequentially
    const resolvePhoto = (photoValue) => {
      if (typeof photoValue !== 'string' || !photoValue.trim()) return null;
      const trimmed = photoValue.trim();
      // Already a remote URL — keep it
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      // Exact filename match
      const basename = trimmed.split(/[\\/]/).pop();
      if (uploadedFileMap[basename]) return uploadedFileMap[basename];
      if (uploadedFileMap[trimmed]) return uploadedFileMap[trimmed];
      // Fallback: assign next uploaded file sequentially (handles filename mismatch)
      if (fileQueueIndex < uploadedFileQueue.length) {
        const url = uploadedFileQueue[fileQueueIndex];
        fileQueueIndex++;
        console.log(`   ⚡ Sequential fallback: "${trimmed}" → ${url}`);
        return url;
      }
      return null;
    };

    // Validate structures array exists
    if (!structures || structures.length === 0) {
      return sendErrorResponse(res, 400, 'No component structures provided');
    }
    
    // Find user and structure
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // ⭐ NEW: Validate components against structure subtype
    const validation = await this.validateComponentsForStructureType(structure, structures);
    
    if (!validation.isValid) {
      console.log('❌ Component validation failed:', validation.errors);
      return sendErrorResponse(res, 400, 'Invalid component types for this structure', {
        structure_subtype: validation.structureInfo.subtype,
        structure_type: validation.structureInfo.type,
        errors: validation.errors,
        message: 'The components you are trying to save are not valid for this structure type. Please select appropriate components.'
      });
    }
    
    console.log('✅ Component validation passed');
    
    // Find the floor
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      console.log('❌ Floor not found:', floorId);
      return sendErrorResponse(res, 404, 'Floor not found');
    }
    
    console.log('✅ Floor found:', floor.floor_label_name);
    
    // Initialize structural_rating if it doesn't exist
    if (!floor.structural_rating) {
      floor.structural_rating = {};
    }
    
    const inspectionDate = new Date();
    let totalComponentsSaved = 0;
    const savedComponentTypes = [];
    
    // Process each component type
    structures.forEach(({ component_type, components }) => {
      console.log(`📝 Processing component type: ${component_type}`);
      console.log(`   Components count: ${components.length}`);
      
      // Format components with auto-generated IDs if not provided
      const formattedComponents = components.map(comp => {
        const componentId = comp._id || this.generateComponentId(component_type);

        // ✅ Resolve all photo entries: swap filenames for Cloudinary URLs
        const rawPhotos = normalizePhotoList(comp.photos, comp.photo);
        const resolvedPhotos = rawPhotos
          .map(resolvePhoto)
          .filter(Boolean);

        console.log(`   📸 Component "${comp.name}" — raw photos: ${JSON.stringify(rawPhotos)} → resolved: ${JSON.stringify(resolvedPhotos)}`);
        
        return {
          _id: componentId,
          name: comp.name,
          rating: parseInt(comp.rating),
          photo: resolvedPhotos[0] || undefined,
          photos: resolvedPhotos.length > 0 ? resolvedPhotos : undefined,
          condition_comment: comp.condition_comment,
          inspector_notes: comp.inspector_notes || '',
          inspection_date: inspectionDate,
          // ⭐ NEW: Add distress fields if provided
          distress_dimensions: comp.distress_dimensions || undefined,
          repair_methodology: comp.repair_methodology || undefined,
          distress_types: normalizeDistressTypes(comp.distress_types),
          pdf_files: comp.pdf_files || undefined
        };
      });
      
      // Save components to floor
      floor.structural_rating[component_type] = formattedComponents;
      totalComponentsSaved += formattedComponents.length;
      
      savedComponentTypes.push({
        component_type,
        count: formattedComponents.length,
        components: formattedComponents.map(c => ({ 
          _id: c._id, 
          name: c.name,
          rating: c.rating,
          photo: c.photo || null,
          photos: c.photos || [],
          distress_types: (c.distress_types && c.distress_types[0]) || ''
        }))
      });

      console.log(`   ✅ Saved ${formattedComponents.length} components for ${component_type}`);
    });

    // Calculate averages
    console.log('📊 Calculating floor structural average...');
    this.calculateFloorStructuralAverage(floor);
    this.calculateFloorCombinedRating(floor);
    
    // Update structure metadata
    structure.creation_info.last_updated_date = new Date();
    
    console.log('💾 Saving to database...');
    await user.save();
    
    console.log('✅ Floor structural components saved successfully');
    console.log(`   Total components: ${totalComponentsSaved}`);
    console.log(`   Component types: ${savedComponentTypes.length}`);
    
    sendSuccessResponse(res, 200, {
      structure_id: id,
      floor_id: floorId,
      floor_label: floor.floor_label_name,
      total_components_saved: totalComponentsSaved,
      component_types_saved: savedComponentTypes,
      structural_rating: {
        overall_average: floor.structural_rating?.overall_average,
        health_status: floor.structural_rating?.health_status
      },
      message: 'Floor structural components saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Save floor structural components bulk error:', error);
    console.error('❌ Error stack:', error.stack);
    return sendErrorResponse(res, 500, 'Failed to save floor structural components', error.message);
  }
}

// =================== METHOD 2: saveFloorNonStructuralComponentsBulk ===================
// Location: Line ~5561
// Description: Save multiple non-structural component types for a floor

/**
 * Save multiple non-structural component types for a floor (UPDATED WITH VALIDATION)
 * POST /api/structures/:id/floors/:floorId/non-structural/bulk
 */
async saveFloorNonStructuralComponentsBulk(req, res) {
  try {
    const { id, floorId } = req.params;
    const { structures } = req.body;

    console.log('📥 saveFloorNonStructuralComponentsBulk called');
    console.log('Structure ID:', id);
    console.log('Floor ID:', floorId);
    console.log('Structures data:', JSON.stringify(structures, null, 2));

    // ✅ Build a filename → Cloudinary URL map from uploaded files.
    //    upload.fields() sets req.files as an object: { photo: [...], photos: [...] }
    //    Flatten all fields into a single ordered array for sequential fallback.
    const uploadedFileMap = {};
    const uploadedFileQueue = []; // ordered Cloudinary URLs for sequential assignment
    if (req.files && typeof req.files === 'object') {
      const allFiles = Object.values(req.files).flat();
      console.log(`📸 ${allFiles.length} file(s) uploaded to Cloudinary`);
      allFiles.forEach(file => {
        const cloudinaryUrl = file.path || file.secure_url || (file.filename && `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${file.filename}`);
        if (cloudinaryUrl) {
          uploadedFileMap[file.originalname] = cloudinaryUrl;
          uploadedFileQueue.push(cloudinaryUrl);
          console.log(`   ✅ Mapped: ${file.originalname} → ${cloudinaryUrl}`);
        }
      });
    }
    let fileQueueIndex = 0; // tracks next unassigned file for sequential fallback

    // ✅ Helper: resolve a photo value to a Cloudinary URL.
    //    Priority: (1) already a remote URL → keep as-is
    //              (2) filename matches an uploaded file → use that URL
    //              (3) any non-empty placeholder → assign next uploaded file sequentially
    const resolvePhoto = (photoValue) => {
      if (typeof photoValue !== 'string' || !photoValue.trim()) return null;
      const trimmed = photoValue.trim();
      // Already a remote URL — keep it
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      // Exact filename match
      const basename = trimmed.split(/[\\/]/).pop();
      if (uploadedFileMap[basename]) return uploadedFileMap[basename];
      if (uploadedFileMap[trimmed]) return uploadedFileMap[trimmed];
      // Fallback: assign next uploaded file sequentially (handles filename mismatch)
      if (fileQueueIndex < uploadedFileQueue.length) {
        const url = uploadedFileQueue[fileQueueIndex];
        fileQueueIndex++;
        console.log(`   ⚡ Sequential fallback: "${trimmed}" → ${url}`);
        return url;
      }
      return null;
    };

    // Validate structures array exists
    if (!structures || structures.length === 0) {
      return sendErrorResponse(res, 400, 'No component structures provided');
    }
    
    // Find user and structure
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // ⭐ NEW: Validate components against structure subtype
    const validation = await this.validateComponentsForStructureType(structure, structures);
    
    if (!validation.isValid) {
      console.log('❌ Component validation failed:', validation.errors);
      return sendErrorResponse(res, 400, 'Invalid component types for this structure', {
        structure_subtype: validation.structureInfo.subtype,
        structure_type: validation.structureInfo.type,
        errors: validation.errors,
        message: 'The components you are trying to save are not valid for this structure type. Please select appropriate components.'
      });
    }
    
    console.log('✅ Component validation passed');
    
    // Find the floor
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      console.log('❌ Floor not found:', floorId);
      return sendErrorResponse(res, 404, 'Floor not found');
    }
    
    console.log('✅ Floor found:', floor.floor_label_name);
    
    // Initialize non_structural_rating if it doesn't exist
    if (!floor.non_structural_rating) {
      floor.non_structural_rating = {};
    }
    
    const inspectionDate = new Date();
    let totalComponentsSaved = 0;
    const savedComponentTypes = [];
    
    // Process each component type
    structures.forEach(({ component_type, components }) => {
      console.log(`📝 Processing component type: ${component_type}`);
      console.log(`   Components count: ${components.length}`);
      
      // Format components with auto-generated IDs if not provided
      const formattedComponents = components.map(comp => {
        const componentId = comp._id || this.generateComponentId(component_type);

        // ✅ Resolve all photo entries: swap filenames for Cloudinary URLs
        const rawPhotos = normalizePhotoList(comp.photos, comp.photo);
        const resolvedPhotos = rawPhotos
          .map(resolvePhoto)
          .filter(Boolean);

        console.log(`   📸 Component "${comp.name}" — raw photos: ${JSON.stringify(rawPhotos)} → resolved: ${JSON.stringify(resolvedPhotos)}`);
        
        return {
          _id: componentId,
          name: comp.name,
          rating: parseInt(comp.rating),
          photo: resolvedPhotos[0] || undefined,
          photos: resolvedPhotos.length > 0 ? resolvedPhotos : undefined,
          condition_comment: comp.condition_comment,
          inspector_notes: comp.inspector_notes || '',
          inspection_date: inspectionDate,
          // ⭐ NEW: Add distress fields if provided
          distress_dimensions: comp.distress_dimensions || undefined,
          repair_methodology: comp.repair_methodology || undefined,
          distress_types: normalizeDistressTypes(comp.distress_types),
          pdf_files: comp.pdf_files || undefined
        };
      });
      
      // Save components to floor
      floor.non_structural_rating[component_type] = formattedComponents;
      totalComponentsSaved += formattedComponents.length;
      
      savedComponentTypes.push({
        component_type,
        count: formattedComponents.length,
        components: formattedComponents.map(c => ({ 
          _id: c._id, 
          name: c.name,
          rating: c.rating,
          photo: c.photo || null,
          photos: c.photos || [],
          distress_types: (c.distress_types && c.distress_types[0]) || ''
        }))
      });
      
      console.log(`   ✅ Saved ${formattedComponents.length} components for ${component_type}`);
    });
    
    // Calculate averages
    console.log('📊 Calculating floor non-structural average...');
    this.calculateFloorNonStructuralAverage(floor);
    this.calculateFloorCombinedRating(floor);
    
    // Update structure metadata
    structure.creation_info.last_updated_date = new Date();
    
    console.log('💾 Saving to database...');
    await user.save();
    
    console.log('✅ Floor non-structural components saved successfully');
    console.log(`   Total components: ${totalComponentsSaved}`);
    console.log(`   Component types: ${savedComponentTypes.length}`);
    
    sendSuccessResponse(res, 200, {
      structure_id: id,
      floor_id: floorId,
      floor_label: floor.floor_label_name,
      total_components_saved: totalComponentsSaved,
      component_types_saved: savedComponentTypes,
      non_structural_rating: {
        overall_average: floor.non_structural_rating?.overall_average
      },
      message: 'Floor non-structural components saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Save floor non-structural components bulk error:', error);
    console.error('❌ Error stack:', error.stack);
    return sendErrorResponse(res, 500, 'Failed to save floor non-structural components', error.message);
  }
}

/**
 * Save multiple structural component types for a block
 */
async saveBlockStructuralComponentsBulk(req, res) {
  try {
    const { id, floorId, blockId } = req.params;
    const { structures } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    if (structure.structural_identity?.type_of_structure !== 'industrial') {
      return sendErrorResponse(res, 'Block ratings are only for industrial structures', 400);
    }
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const block = floor.blocks?.find(b => b.block_id === blockId);
    if (!block) {
      return sendErrorResponse(res, 'Block not found', 404);
    }
    
    if (!block.structural_rating) {
      block.structural_rating = {};
    }
    
    const inspectionDate = new Date();
    let totalComponentsSaved = 0;
    const savedComponentTypes = [];
    
    structures.forEach(({ component_type, components }) => {
      // ✅ FIXED: Auto-generate component IDs if not provided
      const formattedComponents = components.map(comp => ({
        _id: comp._id || this.generateComponentId(component_type),  // Auto-generate if missing
        name: comp.name,
        rating: parseInt(comp.rating),
        photo: normalizePhotoList(comp.photos, comp.photo)[0] || '',
        photos: normalizePhotoList(comp.photos, comp.photo),
        condition_comment: comp.condition_comment,
        inspector_notes: comp.inspector_notes || '',
        inspection_date: inspectionDate
      }));
      
      block.structural_rating[component_type] = formattedComponents;
      totalComponentsSaved += formattedComponents.length;
      savedComponentTypes.push({
        component_type,
        count: formattedComponents.length,
        components: formattedComponents.map(c => ({ _id: c._id, name: c.name }))  // ✅ Include generated IDs
      });
    });
    
    this.calculateBlockStructuralAverage(block);
    this.calculateBlockCombinedRating(block);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Block structural components saved successfully', {
      structure_id: id,
      floor_id: floorId,
      block_id: blockId,
      total_components_saved: totalComponentsSaved,
      component_types_saved: savedComponentTypes
    });
    
  } catch (error) {
    console.error('❌ Save block structural components bulk error:', error);
    sendErrorResponse(res, 'Failed to save block structural components', 500, error.message);
  }
}

/**
 * Save multiple non-structural component types for a block
 */
async saveBlockNonStructuralComponentsBulk(req, res) {
  try {
    const { id, floorId, blockId } = req.params;
    const { structures } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    if (structure.structural_identity?.type_of_structure !== 'industrial') {
      return sendErrorResponse(res, 'Block ratings are only for industrial structures', 400);
    }
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const block = floor.blocks?.find(b => b.block_id === blockId);
    if (!block) {
      return sendErrorResponse(res, 'Block not found', 404);
    }
    
    if (!block.non_structural_rating) {
      block.non_structural_rating = {};
    }
    
    const inspectionDate = new Date();
    let totalComponentsSaved = 0;
    const savedComponentTypes = [];
    
    structures.forEach(({ component_type, components }) => {
      // ✅ FIXED: Auto-generate component IDs if not provided
      const formattedComponents = components.map(comp => ({
        _id: comp._id || this.generateComponentId(component_type),  // Auto-generate if missing
        name: comp.name,
        rating: parseInt(comp.rating),
        photo: normalizePhotoList(comp.photos, comp.photo)[0] || '',
        photos: normalizePhotoList(comp.photos, comp.photo),
        condition_comment: comp.condition_comment,
        inspector_notes: comp.inspector_notes || '',
        inspection_date: inspectionDate
      }));
      
      block.non_structural_rating[component_type] = formattedComponents;
      totalComponentsSaved += formattedComponents.length;
      savedComponentTypes.push({
        component_type,
        count: formattedComponents.length,
        components: formattedComponents.map(c => ({ _id: c._id, name: c.name }))  // ✅ Include generated IDs
      });
    });
    
    this.calculateBlockNonStructuralAverage(block);
    this.calculateBlockCombinedRating(block);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Block non-structural components saved successfully', {
      structure_id: id,
      floor_id: floorId,
      block_id: blockId,
      total_components_saved: totalComponentsSaved,
      component_types_saved: savedComponentTypes
    });
    
  } catch (error) {
    console.error('❌ Save block non-structural components bulk error:', error);
    sendErrorResponse(res, 'Failed to save block non-structural components', 500, error.message);
  }
}

// Helper calculation methods for blocks
calculateBlockStructuralAverage(block) {
  if (!block.structural_rating) return;
  
  const allRatings = [];
  const types = ['beams', 'columns', 'slab', 'foundation', 'roof_truss'];
  
  types.forEach(type => {
    const components = block.structural_rating[type];
    if (components && Array.isArray(components)) {
      components.forEach(comp => {
        if (comp.rating) allRatings.push(comp.rating);
      });
    }
  });
  
  if (allRatings.length > 0) {
    const average = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    block.structural_rating.overall_average = Math.round(average * 10) / 10;
    block.structural_rating.health_status = this.getHealthStatus(average);
    block.structural_rating.assessment_date = new Date();
  }
}

calculateBlockNonStructuralAverage(block) {
  if (!block.non_structural_rating) return;
  
  const allRatings = [];
  const types = [
    'walls_cladding', 'industrial_flooring', 'ventilation', 'electrical_system',
    'fire_safety', 'drainage', 'overhead_cranes', 'loading_docks'
  ];
  
  types.forEach(type => {
    const components = block.non_structural_rating[type];
    if (components && Array.isArray(components)) {
      components.forEach(comp => {
        if (comp.rating) allRatings.push(comp.rating);
      });
    }
  });
  
  if (allRatings.length > 0) {
    const average = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    block.non_structural_rating.overall_average = Math.round(average * 10) / 10;
    block.non_structural_rating.assessment_date = new Date();
  }
}

calculateBlockCombinedRating(block) {
  if (block.structural_rating?.overall_average && block.non_structural_rating?.overall_average) {
    const combinedScore = (block.structural_rating.overall_average * 0.7) + 
                         (block.non_structural_rating.overall_average * 0.3);
    
    block.block_overall_rating = {
      combined_score: Math.round(combinedScore * 10) / 10,
      health_status: this.getHealthStatus(combinedScore),
      priority: this.getPriority(combinedScore),
      last_assessment_date: new Date()
    };
  }
}

// Add these methods to your StructureController class in structureController.js

// =================== WORKFLOW STATUS METHODS ===================

/**
 * Submit structure for testing (FE only)
 * @route POST /api/structures/:id/submit-for-testing
 * @access Private (FE only)
 */
async submitForTesting(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Only FE can submit
    if (!this.hasRoleFromRequest(req, 'FE')) {
      return sendErrorResponse(res, 'Only Field Engineers can submit structures for testing', 403);
    }
    
    const { user: structureOwner, structure } = await this.findUserStructure(req.user.userId, id, req.user);
    
    // Update status and workflow
    structure.status = 'submitted';
    structure.workflow = structure.workflow || {};
    structure.workflow.submitted_by = {
      user_id: user._id,
      name: this.getUserFullName(user),
      email: user.email,
      role: 'FE',
      date: new Date()
    };
    
    if (notes) {
      structure.general_notes = notes;
    }
    
    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();
    
    console.log(`✅ Structure ${id} submitted for testing by ${user.username}`);
    
    sendSuccessResponse(res, 'Structure submitted for testing successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      status: structure.status,
      submitted_by: structure.workflow.submitted_by,
      submitted_at: structure.workflow.submitted_by.date
    });
    
  } catch (error) {
    console.error('❌ Submit for testing error:', error);
    sendErrorResponse(res, 'Failed to submit structure for testing', 500, error.message);
  }
}

/**
 * Start testing a structure (TE only)
 * @route POST /api/structures/:id/start-testing
 * @access Private (TE only)
 */
async startTesting(req, res) {
  try {
    const { id } = req.params;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Only TE can start testing
    if (!this.hasRoleFromRequest(req, 'TE')) {
      return sendErrorResponse(res, 'Only Test Engineers can start testing', 403);
    }
    
    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    // Check if structure is in submitted status
    if (structure.status !== 'submitted') {
      return sendErrorResponse(res, `Structure must be in 'submitted' status to start testing. Current status: ${structure.status}`, 400);
    }
    
    // Update status
    structure.status = 'under_testing';
    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();
    
    console.log(`✅ TE ${user.username} started testing structure ${id}`);
    
    sendSuccessResponse(res, 'Testing started successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      status: structure.status,
      testing_started_by: this.getUserFullName(user)
    });
    
  } catch (error) {
    console.error('❌ Start testing error:', error);
    sendErrorResponse(res, 'Failed to start testing', 500, error.message);
  }
}

/**
 * Complete testing and mark as tested (TE only)
 * @route POST /api/structures/:id/complete-testing
 * @access Private (TE only)
 */
async completeTesting(req, res) {
  try {
    const { id } = req.params;
    const { test_notes, status } = req.body; // status can be 'tested' or 'rejected'
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Only TE can complete testing
    if (!this.hasRoleFromRequest(req, 'TE')) {
      return sendErrorResponse(res, 'Only Test Engineers can complete testing', 403);
    }
    
    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    // Check if structure is under testing
    if (structure.status !== 'under_testing' && structure.status !== 'submitted') {
      return sendErrorResponse(res, `Structure must be under testing. Current status: ${structure.status}`, 400);
    }
    
    structure.workflow = structure.workflow || {};
    
    if (status === 'rejected') {
      // Reject the structure
      if (!req.body.rejection_reason) {
        return sendErrorResponse(res, 'Rejection reason is required', 400);
      }
      
      structure.status = 'rejected';
      structure.workflow.rejected_by = {
        user_id: user._id,
        name: this.getUserFullName(user),
        email: user.email,
        role: 'TE',
        date: new Date(),
        rejection_reason: req.body.rejection_reason,
        rejection_stage: 'testing'
      };
      
      console.log(`❌ Structure ${id} rejected by TE ${user.username}`);
    } else {
      // Mark as tested and ready for validation
      structure.status = 'tested';
      structure.workflow.tested_by = {
        user_id: user._id,
        name: this.getUserFullName(user),
        email: user.email,
        role: 'TE',
        date: new Date(),
        test_notes: test_notes || ''
      };
      
      console.log(`✅ Structure ${id} marked as tested by TE ${user.username}`);
    }
    
    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();
    
    sendSuccessResponse(res, status === 'rejected' ? 'Structure rejected' : 'Testing completed successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      status: structure.status,
      tested_by: structure.workflow.tested_by,
      rejected_by: structure.workflow.rejected_by
    });
    
  } catch (error) {
    console.error('❌ Complete testing error:', error);
    sendErrorResponse(res, 'Failed to complete testing', 500, error.message);
  }
}

/**
 * Start validation (VE only)
 * @route POST /api/structures/:id/start-validation
 * @access Private (VE only)
 */
async startValidation(req, res) {
  try {
    const { id } = req.params;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Only VE can start validation
    if (!this.hasRoleFromRequest(req, 'VE')) {
      return sendErrorResponse(res, 'Only Verification Engineers can start validation', 403);
    }
    
    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    // Check if structure is tested
    if (structure.status !== 'tested') {
      return sendErrorResponse(res, `Structure must be tested before validation. Current status: ${structure.status}`, 400);
    }
    
    structure.status = 'under_validation';
    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();
    
    console.log(`✅ VE ${user.username} started validating structure ${id}`);
    
    sendSuccessResponse(res, 'Validation started successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      status: structure.status
    });
    
  } catch (error) {
    console.error('❌ Start validation error:', error);
    sendErrorResponse(res, 'Failed to start validation', 500, error.message);
  }
}

/**
 * Complete validation (VE only)
 * @route POST /api/structures/:id/complete-validation
 * @access Private (VE only)
 */
async completeValidation(req, res) {
  try {
    const { id } = req.params;
    const { validation_notes, status } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Only VE can complete validation
    if (!this.hasRoleFromRequest(req, 'VE')) {
      return sendErrorResponse(res, 'Only Verification Engineers can complete validation', 403);
    }
    
    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    if (structure.status !== 'under_validation' && structure.status !== 'tested') {
      return sendErrorResponse(res, `Structure must be under validation. Current status: ${structure.status}`, 400);
    }
    
    structure.workflow = structure.workflow || {};
    
    if (status === 'rejected') {
      if (!req.body.rejection_reason) {
        return sendErrorResponse(res, 'Rejection reason is required', 400);
      }
      
      structure.status = 'rejected';
      structure.workflow.rejected_by = {
        user_id: user._id,
        name: this.getUserFullName(user),
        email: user.email,
        role: 'VE',
        date: new Date(),
        rejection_reason: req.body.rejection_reason,
        rejection_stage: 'validation'
      };
      
      console.log(`❌ Structure ${id} rejected by VE ${user.username}`);
    } else {
      structure.status = 'validated';
      structure.workflow.validated_by = {
        user_id: user._id,
        name: this.getUserFullName(user),
        email: user.email,
        role: 'VE',
        date: new Date(),
        validation_notes: validation_notes || ''
      };
      
      console.log(`✅ Structure ${id} validated by VE ${user.username}`);
    }
    
    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();
    
    sendSuccessResponse(res, status === 'rejected' ? 'Structure rejected' : 'Validation completed successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      status: structure.status,
      validated_by: structure.workflow.validated_by,
      rejected_by: structure.workflow.rejected_by
    });
    
  } catch (error) {
    console.error('❌ Complete validation error:', error);
    sendErrorResponse(res, 'Failed to complete validation', 500, error.message);
  }
}

/**
 * Approve structure (AD only)
 * @route POST /api/structures/:id/approve
 * @access Private (AD only)
 */
async approveStructure(req, res) {
  try {
    const { id } = req.params;
    const { approval_notes, status } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Only AD can approve
    if (!this.hasRoleFromRequest(req, 'AD')) {
      return sendErrorResponse(res, 'Only Administrators can approve structures', 403);
    }
    
    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    if (structure.status !== 'validated') {
      return sendErrorResponse(res, `Structure must be validated before approval. Current status: ${structure.status}`, 400);
    }
    
    structure.workflow = structure.workflow || {};
    
    if (status === 'rejected') {
      if (!req.body.rejection_reason) {
        return sendErrorResponse(res, 'Rejection reason is required', 400);
      }
      
      structure.status = 'rejected';
      structure.workflow.rejected_by = {
        user_id: user._id,
        name: this.getUserFullName(user),
        email: user.email,
        role: 'AD',
        date: new Date(),
        rejection_reason: req.body.rejection_reason,
        rejection_stage: 'approval'
      };
      
      console.log(`❌ Structure ${id} rejected by AD ${user.username}`);
    } else {
      structure.status = 'approved';
      structure.workflow.approved_by = {
        user_id: user._id,
        name: this.getUserFullName(user),
        email: user.email,
        role: 'AD',
        date: new Date(),
        approval_notes: approval_notes || ''
      };
      
      console.log(`✅ Structure ${id} approved by AD ${user.username}`);
    }
    
    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();
    
    sendSuccessResponse(res, status === 'rejected' ? 'Structure rejected' : 'Structure approved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      status: structure.status,
      approved_by: structure.workflow.approved_by,
      rejected_by: structure.workflow.rejected_by
    });
    
  } catch (error) {
    console.error('❌ Approve structure error:', error);
    sendErrorResponse(res, 'Failed to approve structure', 500, error.message);
  }
}

/**
 * Get workflow history for a structure
 * @route GET /api/structures/:id/workflow
 * @access Private (All authenticated users)
 */
async getWorkflowHistory(req, res) {
  try {
    const { id } = req.params;
    
    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    const workflow = structure.workflow || {};
    
    sendSuccessResponse(res, 'Workflow history retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      current_status: structure.status,
      workflow: {
        submitted: workflow.submitted_by || null,
        tested: workflow.tested_by || null,
        validated: workflow.validated_by || null,
        approved: workflow.approved_by || null,
        rejected: workflow.rejected_by || null
      },
      timeline: this.buildWorkflowTimeline(workflow, structure.status)
    });
    
  } catch (error) {
    console.error('❌ Get workflow history error:', error);
    sendErrorResponse(res, 'Failed to retrieve workflow history', 500, error.message);
  }
}

/**
 * Helper: Build workflow timeline
 */
buildWorkflowTimeline(workflow, currentStatus) {
  const timeline = [];
  
  if (workflow.submitted_by) {
    timeline.push({
      stage: 'Submitted',
      user: workflow.submitted_by.name,
      role: workflow.submitted_by.role,
      date: workflow.submitted_by.date,
      status: 'completed'
    });
  }
  
  if (workflow.tested_by) {
    timeline.push({
      stage: 'Tested',
      user: workflow.tested_by.name,
      role: workflow.tested_by.role,
      date: workflow.tested_by.date,
      notes: workflow.tested_by.test_notes,
      status: 'completed'
    });
  }
  
  if (workflow.validated_by) {
    timeline.push({
      stage: 'Validated',
      user: workflow.validated_by.name,
      role: workflow.validated_by.role,
      date: workflow.validated_by.date,
      notes: workflow.validated_by.validation_notes,
      status: 'completed'
    });
  }
  
  if (workflow.approved_by) {
    timeline.push({
      stage: 'Approved',
      user: workflow.approved_by.name,
      role: workflow.approved_by.role,
      date: workflow.approved_by.date,
      notes: workflow.approved_by.approval_notes,
      status: 'completed'
    });
  }
  
  if (workflow.rejected_by) {
    timeline.push({
      stage: 'Rejected',
      user: workflow.rejected_by.name,
      role: workflow.rejected_by.role,
      date: workflow.rejected_by.date,
      reason: workflow.rejected_by.rejection_reason,
      rejection_stage: workflow.rejected_by.rejection_stage,
      status: 'rejected'
    });
  }
  
  // Add current pending stage
  if (currentStatus === 'submitted') {
    timeline.push({ stage: 'Testing', status: 'pending' });
  } else if (currentStatus === 'under_testing') {
    timeline.push({ stage: 'Testing', status: 'in_progress' });
  } else if (currentStatus === 'tested') {
    timeline.push({ stage: 'Validation', status: 'pending' });
  } else if (currentStatus === 'under_validation') {
    timeline.push({ stage: 'Validation', status: 'in_progress' });
  } else if (currentStatus === 'validated') {
    timeline.push({ stage: 'Approval', status: 'pending' });
  }
  
  return timeline;
}

// Don't forget to bind these in the constructor!
// Add to constructor:
/*
this.submitForTesting = this.submitForTesting.bind(this);
this.startTesting = this.startTesting.bind(this);
this.completeTesting = this.completeTesting.bind(this);
this.startValidation = this.startValidation.bind(this);
this.completeValidation = this.completeValidation.bind(this);
this.approveStructure = this.approveStructure.bind(this);
this.getWorkflowHistory = this.getWorkflowHistory.bind(this);
this.buildWorkflowTimeline = this.buildWorkflowTimeline.bind(this);
*/


  // =================== END OF CLASS ===================
}

module.exports = new StructureController();