const structureController = require('./src/controllers/structureController');

// Stub findUserStructure before calling
structureController.findUserStructure = async function(userId, id, requestUser) {
  return {
    user: { username: 'tester', _id: '123' },
    structure: {
      _id: id,
      structural_identity: { type_of_structure: 'residential' },
      geometric_details: {
        floors: [{ floor_id: 'floor_1', floor_number: 1, floor_label_name: 'F1', flats: [] }]
      }
    }
  };
};

// Create dummy request and response
const req = { params: { id: 'struct1', floorId: 'floor_1' }, user: { userId: '123', roles: ['FE'] }, body: {} };
const res = {
  status(code) {
    this.code = code;
    return this;
  },
  json(obj) {
    console.log('RES JSON', this.code, JSON.stringify(obj, null, 2));
  }
};

(async () => {
  try {
    await structureController.saveFloorRatings(req, res);
    console.log('saveFloorRatings executed');
  } catch (err) {
    console.error('Error executing saveFloorRatings', err);
  }
})();
