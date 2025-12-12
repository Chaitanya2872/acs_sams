const mongoose = require('mongoose');
const { User } = require('./src/models/schemas');

const user = new User({
  username:'testuser1',
  email:'test1@example.com',
  password:'password',
  roles:['FE'],
  role:'FE',
  structures: [{
    structural_identity:{ uid:'ABCDEFGH' },
    geometric_details: {
      floors: [{
        floor_id:'F1',
        floor_number:1,
        floor_label_name:'L1',
        flats:[{
          flat_id:'flat-1',
          flat_number:'1',
          structural_rating: {
            beams: [{ _id:'b1', name:'Beam 1', rating:3, photo:'test.jpg', condition_comment:'Needs repair', inspector_notes:'' } ]
          }
        }]
      }]
    }
  }]
});

try {
  const err = user.validateSync();
  if(err){
    console.log('Validation error', err.message);
    console.log(JSON.stringify(err.errors, null, 2));
  } else {
    console.log('Validation passed');
  }
} catch (e) {
  console.error('Validation exception', e);
}
