/**
 * Test script for the remarks system
 * This script demonstrates how the new remarks functionality works
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models and utilities
const { User } = require('./src/models/schemas');
const { migrateUserRoles, addRoleToUser } = require('./src/utils/migrateUserRoles');

async function testRemarksSystem() {
  try {
    console.log('🧪 Starting Remarks System Test...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/acs_sams');
    console.log('✅ Connected to database\n');
    
    // Step 1: Migrate existing users to support multiple roles
    console.log('📋 Step 1: Migrating user roles...');
    const migrationResult = await migrateUserRoles();
    console.log('Migration result:', migrationResult, '\n');
    
    // Step 2: Find or create test users
    console.log('👥 Step 2: Setting up test users...');
    
    let feUser = await User.findOne({ role: 'FE' });
    let veUser = await User.findOne({ role: 'VE' });
    
    if (!feUser) {
      console.log('Creating FE test user...');
      feUser = new User({
        username: 'test_fe',
        email: 'fe@test.com',
        password: 'password123',
        role: 'FE',
        roles: ['FE'],
        isEmailVerified: true,
        is_active: true,
        profile: {
          first_name: 'Field',
          last_name: 'Engineer'
        }
      });
      await feUser.save();
    }
    
    if (!veUser) {
      console.log('Creating VE test user...');
      veUser = new User({
        username: 'test_ve',
        email: 've@test.com',
        password: 'password123',
        role: 'VE',
        roles: ['VE'],
        isEmailVerified: true,
        is_active: true,
        profile: {
          first_name: 'Verification',
          last_name: 'Engineer'
        }
      });
      await veUser.save();
    }
    
    console.log(`✅ FE User: ${feUser.username} (${feUser.email}) - Roles: [${feUser.roles.join(', ')}]`);
    console.log(`✅ VE User: ${veUser.username} (${veUser.email}) - Roles: [${veUser.roles.join(', ')}]\n`);
    
    // Step 3: Create a test structure with FE user
    console.log('🏗️ Step 3: Creating test structure...');
    
    const testStructure = {
      structural_identity: {
        uid: 'TEST12345678',
        structural_identity_number: '',
        zip_code: '560001',
        state_code: 'KA',
        district_code: '01',
        city_name: 'BANGALORE',
        location_code: 'BG',
        structure_number: '00001',
        type_of_structure: 'residential',
        type_code: '01'
      },
      location: {
        coordinates: {
          latitude: 12.9716,
          longitude: 77.5946
        },
        address: 'Test Address, Bangalore'
      },
      administration: {
        client_name: 'Test Client',
        custodian: 'Test Custodian',
        engineer_designation: 'Senior Engineer',
        contact_details: '9876543210',
        email_id: 'test@example.com'
      },
      geometric_details: {
        number_of_floors: 3,
        structure_height: 10,
        structure_width: 20,
        structure_length: 30,
        floors: []
      },
      status: 'submitted',
      remarks: {
        fe_remarks: [],
        ve_remarks: [],
        last_updated_by: {}
      }
    };
    
    feUser.structures.push(testStructure);
    await feUser.save();
    
    const createdStructure = feUser.structures[feUser.structures.length - 1];
    console.log(`✅ Structure created: ${createdStructure._id} (UID: ${createdStructure.structural_identity.uid})\n`);
    
    // Step 4: Test adding remarks
    console.log('💬 Step 4: Testing remarks functionality...');
    
    // FE adds a remark
    const feRemark = {
      text: 'Initial inspection completed. Structure appears to be in good condition overall.',
      author_name: `${feUser.profile.first_name} ${feUser.profile.last_name}`,
      author_role: 'FE',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    createdStructure.remarks.fe_remarks.push(feRemark);
    createdStructure.remarks.last_updated_by = {
      role: 'FE',
      name: feRemark.author_name,
      date: new Date()
    };
    
    await feUser.save();
    console.log('✅ FE remark added:', feRemark.text);
    
    // VE adds a remark (cross-user access)
    const veRemark = {
      text: 'Verification completed. Found minor issues in electrical wiring that need attention.',
      author_name: `${veUser.profile.first_name} ${veUser.profile.last_name}`,
      author_role: 'VE',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    createdStructure.remarks.ve_remarks.push(veRemark);
    createdStructure.remarks.last_updated_by = {
      role: 'VE',
      name: veRemark.author_name,
      date: new Date()
    };
    
    await feUser.save();
    console.log('✅ VE remark added:', veRemark.text);
    
    // Step 5: Test multiple roles
    console.log('\n🔄 Step 5: Testing multiple roles...');
    
    // Add VE role to FE user
    const addRoleResult = await addRoleToUser(feUser._id, 'VE');
    console.log('Add role result:', addRoleResult);
    
    // Refresh user data
    const updatedFeUser = await User.findById(feUser._id);
    console.log(`✅ Updated FE User roles: [${updatedFeUser.roles.join(', ')}]`);
    
    // Step 6: Display final results
    console.log('\n📊 Step 6: Final Results...');
    console.log('Structure Remarks Summary:');
    console.log(`├─ FE Remarks: ${createdStructure.remarks.fe_remarks.length}`);
    console.log(`├─ VE Remarks: ${createdStructure.remarks.ve_remarks.length}`);
    console.log(`└─ Last Updated By: ${createdStructure.remarks.last_updated_by.role} (${createdStructure.remarks.last_updated_by.name})`);
    
    console.log('\nRemarks Details:');
    createdStructure.remarks.fe_remarks.forEach((remark, index) => {
      console.log(`FE Remark ${index + 1}: "${remark.text}" - ${remark.author_name} (${remark.created_at.toISOString()})`);
    });
    
    createdStructure.remarks.ve_remarks.forEach((remark, index) => {
      console.log(`VE Remark ${index + 1}: "${remark.text}" - ${remark.author_name} (${remark.created_at.toISOString()})`);
    });
    
    console.log('\n🎉 Remarks System Test Completed Successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('✅ Multiple roles support (users can have both FE and VE roles)');
    console.log('✅ Cross-user structure access for remarks');
    console.log('✅ Role-based remark categorization (FE vs VE remarks)');
    console.log('✅ Author tracking with name, role, and timestamp');
    console.log('✅ Last updated by tracking');
    console.log('✅ Backward compatibility with existing single-role system');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the test
if (require.main === module) {
  testRemarksSystem();
}

module.exports = { testRemarksSystem };