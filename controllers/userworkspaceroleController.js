const {
    getWorkspaceRoles,
    assignRole,
    updateUserRole,
    removeUserFromWorkspace
} = require('./roleController');

// Aliases to expose a dedicated controller for user-workspace-role mappings
const getMembers = (req, res) => getWorkspaceRoles(req, res);
const addMember = (req, res) => assignRole(req, res);
const updateMemberRole = (req, res) => updateUserRole(req, res);
const removeMember = (req, res) => removeUserFromWorkspace(req, res);

module.exports = {
    getMembers,
    addMember,
    updateMemberRole,
    removeMember
};


