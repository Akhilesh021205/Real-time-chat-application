import { Workspace } from "../Models/workspace.js"
import { User } from "../Models/user.js"

export const createWorkspace = async (req, res, next) => {
  try {
    const { name } = req.body;

    const workspace = new Workspace({
      name,
      owner: req.userId,
      members: [req.userId],
    });

    await workspace.save();

    res.status(201).json({
      message: "Workspace created",
      workspace,
    });
  } catch (err) {
    next(err);
  }
};

export const inviteToWorkspace = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const workspace = await Workspace.findOne({
      $or: [{ owner: req.userId }, { members: req.userId }],
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return res.status(404).json({ message: "User not found" });
    }

    if (workspace.members.includes(userToInvite._id)) {
      return res.status(400).json({ message: "User already invited" });
    }

    workspace.members.push(userToInvite._id);
    await workspace.save();

    res.json({ message: "User invited", workspace });
  } catch (err) {
    next(err);
  }
};

export const getUserWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.userId },
        { members: req.userId },
        { admins: req.userId }
      ]
    }).populate("owner members admins", "username email profileImage status");

    if (workspaces.length === 0) {
      const user = await User.findById(req.userId);
      if (user) {
        const newWs = await Workspace.create({
          name: `${user.username}'s Workspace`,
          owner: user._id,
          members: [user._id],
        });
        const populatedWs = await Workspace.findById(newWs._id).populate("owner members admins", "username email profileImage status");
        return res.json([populatedWs]);
      }
    }

    res.json(workspaces);
  } catch (err) {
    next(err);
  }
};

export const updateWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    if (workspace.owner.toString() !== req.userId && !workspace.admins.includes(req.userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (name) workspace.name = name;
    // Note: description field is currently not in Schema but let's allow it if added
    await workspace.save();

    res.json(workspace);
  } catch (err) {
    next(err);
  }
};

export const removeWorkspaceMember = async (req, res, next) => {
  try {
    const { workspaceId, userIdToRemove } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    // Only owner can remove members
    if (workspace.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Only owner can remove members" });
    }

    if (workspace.owner.toString() === userIdToRemove) {
      return res.status(400).json({ message: "Owner cannot be removed" });
    }

    workspace.members = workspace.members.filter(m => m.toString() !== userIdToRemove);
    await workspace.save();

    res.json({ message: "Member removed", workspace });
  } catch (err) {
    next(err);
  }
};
