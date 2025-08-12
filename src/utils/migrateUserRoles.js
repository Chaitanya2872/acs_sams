const { User } = require('../models/schemas');

/**
 * Migration script to update existing users with roles array
 * This ensures backward compatibility while supporting multiple roles
 */
async function migrateUserRoles() {
  try {
    console.log('🔄 Starting user roles migration...');
    
    // Find all users that don't have a roles array or have an empty roles array
    const usersToUpdate = await User.find({
      $or: [
        { roles: { $exists: false } },
        { roles: { $size: 0 } },
        { roles: null }
      ]
    });
    
    console.log(`📊 Found ${usersToUpdate.length} users to migrate`);
    
    let updatedCount = 0;
    
    for (const user of usersToUpdate) {
      try {
        // Set roles array to include the current primary role
        if (user.role && !user.roles?.includes(user.role)) {
          user.roles = user.roles || [];
          if (!user.roles.includes(user.role)) {
            user.roles.push(user.role);
          }
          
          await user.save();
          updatedCount++;
          
          console.log(`✅ Updated user ${user.username} (${user.email}) - Role: ${user.role} -> Roles: [${user.roles.join(', ')}]`);
        }
      } catch (error) {
        console.error(`❌ Failed to update user ${user.username}:`, error.message);
      }
    }
    
    console.log(`🎉 Migration completed! Updated ${updatedCount} users`);
    return { success: true, updated: updatedCount, total: usersToUpdate.length };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add additional role to a user
 */
async function addRoleToUser(userId, newRole) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Initialize roles array if it doesn't exist
    if (!user.roles) {
      user.roles = [user.role];
    }
    
    // Add new role if not already present
    if (!user.roles.includes(newRole)) {
      user.roles.push(newRole);
      await user.save();
      
      console.log(`✅ Added role ${newRole} to user ${user.username}`);
      return { success: true, user: user.username, roles: user.roles };
    } else {
      console.log(`ℹ️ User ${user.username} already has role ${newRole}`);
      return { success: true, user: user.username, roles: user.roles, message: 'Role already exists' };
    }
    
  } catch (error) {
    console.error('❌ Failed to add role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove role from a user
 */
async function removeRoleFromUser(userId, roleToRemove) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Don't remove the primary role
    if (user.role === roleToRemove) {
      throw new Error('Cannot remove primary role. Change primary role first.');
    }
    
    // Remove role from roles array
    if (user.roles && user.roles.includes(roleToRemove)) {
      user.roles = user.roles.filter(role => role !== roleToRemove);
      await user.save();
      
      console.log(`✅ Removed role ${roleToRemove} from user ${user.username}`);
      return { success: true, user: user.username, roles: user.roles };
    } else {
      console.log(`ℹ️ User ${user.username} doesn't have role ${roleToRemove}`);
      return { success: true, user: user.username, roles: user.roles, message: 'Role not found' };
    }
    
  } catch (error) {
    console.error('❌ Failed to remove role:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  migrateUserRoles,
  addRoleToUser,
  removeRoleFromUser
};