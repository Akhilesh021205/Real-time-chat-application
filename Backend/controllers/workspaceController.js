import { Workspace } from "../Models/workspace.js"
import { User } from "../Models/user.js"
import { Channel } from "../Models/channel.js"
import Message from "../Models/Message.js"
import { Notification } from "../Models/Notification.js"

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
    const { email, workspaceId } = req.body; // can be email OR username
    if (!email) return res.status(400).json({ message: "Email or username required" });

    const accessFilter = {
      $or: [
        { owner: req.userId },
        { members: req.userId },
        { admins: req.userId },
      ],
    };

    const workspace = workspaceId
      ? await Workspace.findOne({ _id: workspaceId, ...accessFilter })
      : await Workspace.findOne(accessFilter);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (!workspace.inviteCode) {
      const crypto = await import("crypto");
      workspace.inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      await workspace.save();
    }

    // Search by email OR username (case-insensitive)
    const userToInvite = await User.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { username: { $regex: new RegExp(`^${email.trim()}$`, "i") } },
      ],
    });

    if (!userToInvite) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't invite yourself
    if (userToInvite._id.toString() === req.userId) {
      return res.status(400).json({ message: "You are already in this workspace" });
    }

    if (workspace.members.some((m) => m.toString() === userToInvite._id.toString())) {
      return res.status(400).json({ message: "User is already a member" });
    }

    // 🔥 We NO LONGER add the user immediately. 
    // They must join via the invite link/code or accept the invitation.

    // Create a notification for the invited user
    const notification = await Notification.create({
      recipient: userToInvite._id,
      sender: req.userId,
      type: "invite",
      content: `invited you to join **${workspace.name}**. Use code: ${workspace.inviteCode}`,
      context: "Workspace Invite",
      link: `/join/${workspace.inviteCode}`
    });
    const populatedNotification = await notification.populate("sender", "username profilePic");
    req.io?.to(`user:${userToInvite._id}`).emit("notificationCreated", populatedNotification);

    res.json({ 
      message: `Invitation sent to ${userToInvite.username}. they will need to join using the workspace code or link.`, 
      workspace 
    });
  } catch (err) {
    next(err);
  }
};

// Search users by username or email prefix (for the invite typeahead)
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);

    const query = q.trim();

    // If it's a potential email, allow searching globally for invitation
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);

    if (isEmail) {
      const users = await User.find({
        email: query.toLowerCase(),
        _id: { $ne: req.userId }
      }).select("username email profilePic status").limit(5);
      return res.json(users);
    }

    // Otherwise, restrict search to users who share a workspace (for privacy)
    // Find shared workspace members
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.userId },
        { members: req.userId },
        { admins: req.userId }
      ]
    }).select("members owner admins sharedWorkspaces");

    const memberIds = new Set();
    const sharedWorkspaceIds = new Set();

    workspaces.forEach(ws => {
      if (ws.owner) memberIds.add(ws.owner.toString());
      ws.members.forEach(id => memberIds.add(id.toString()));
      ws.admins.forEach(id => memberIds.add(id.toString()));
      ws.sharedWorkspaces.forEach(id => sharedWorkspaceIds.add(id.toString()));
    });

    if (sharedWorkspaceIds.size > 0) {
      const sharedWs = await Workspace.find({
        _id: { $in: Array.from(sharedWorkspaceIds) }
      }).select("members owner admins");

      sharedWs.forEach(ws => {
        if (ws.owner) memberIds.add(ws.owner.toString());
        ws.members.forEach(id => memberIds.add(id.toString()));
        ws.admins.forEach(id => memberIds.add(id.toString()));
      });
    }

    const users = await User.find({
      _id: { $in: Array.from(memberIds), $ne: req.userId },
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("username email profilePic status")
      .limit(10);

    res.json(users);
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

    // Sort workspaces so that the user's owned workspace comes first
    workspaces.sort((a, b) => {
      const aIsOwner = a.owner?._id?.toString() === req.userId.toString() || a.owner?.toString() === req.userId.toString();
      const bIsOwner = b.owner?._id?.toString() === req.userId.toString() || b.owner?.toString() === req.userId.toString();
      if (aIsOwner && !bIsOwner) return -1;
      if (!aIsOwner && bIsOwner) return 1;
      return 0;
    });

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

export const getPendingInvitations = async (req, res, next) => {
  try {
    // Note: Invitation system not yet fully implemented in DB schema.
    // This is a placeholder to prevent the server from crashing.
    res.json([]);
  } catch (err) {
    next(err);
  }
};

export const joinWorkspaceByCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: "Invite code is required" });

    const code = inviteCode.trim().toUpperCase();
    const workspace = await Workspace.findOne({
      inviteCode: { $regex: new RegExp(`^${code}$`, "i") },
    });
    if (!workspace) return res.status(404).json({ message: "Invalid invite code" });

    const uid = req.userId.toString();
    const alreadyMember =
      workspace.owner?.toString() === uid ||
      workspace.members.some((m) => m.toString() === uid) ||
      workspace.admins.some((a) => a.toString() === uid);

    if (!alreadyMember) {
      workspace.members.push(req.userId);
      await workspace.save();
    }

    const populated = await Workspace.findById(workspace._id)
      .populate("owner", "username email profilePic status")
      .populate("members", "username email profilePic status")
      .populate("admins", "username email profilePic status");

    res.json({
      message: alreadyMember
        ? "You are already a member of this workspace"
        : "Successfully joined workspace",
      workspace: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const getWorkspaceInviteCode = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const uid = req.userId.toString();
    const isInWorkspace =
      workspace.owner?.toString() === uid ||
      workspace.members.some((m) => m.toString() === uid) ||
      workspace.admins.some((a) => a.toString() === uid);

    if (!isInWorkspace) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Generate code if missing
    if (!workspace.inviteCode) {
      const crypto = await import('crypto');
      workspace.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      await workspace.save();
    }

    res.json({ inviteCode: workspace.inviteCode });
  } catch (err) {
    next(err);
  }
};

export const connectWorkspaces = async (req, res, next) => {
  try {
    const { workspaceId, targetWorkspaceId } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    // Only owner or admin can connect
    if (workspace.owner.toString() !== req.userId && !workspace.admins.includes(req.userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const targetWorkspace = await Workspace.findById(targetWorkspaceId);
    if (!targetWorkspace) return res.status(404).json({ message: "Target workspace not found" });

    // Prevent duplicates
    if (workspace.sharedWorkspaces.includes(targetWorkspaceId)) {
      return res.status(400).json({ message: "Workspaces already connected" });
    }

    workspace.sharedWorkspaces.push(targetWorkspaceId);
    await workspace.save();

    // Mutual connection (Slack Connect usually requires both sides to agree, but for simplicity let's do it here)
    if (!targetWorkspace.sharedWorkspaces.includes(workspaceId)) {
      targetWorkspace.sharedWorkspaces.push(workspaceId);
      await targetWorkspace.save();
    }

    res.json({ message: "Workspaces connected (Slack Connect)", workspace });
  } catch (err) {
    next(err);
  }
};

export const deleteWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const ownerId =
      workspace.owner?._id?.toString() || workspace.owner?.toString();
    if (ownerId !== req.userId.toString()) {
      return res.status(403).json({ message: "Only the workspace owner can delete this workspace" });
    }

    // Find all channels in this workspace
    const channels = await Channel.find({ workspace: workspaceId });
    const channelIds = channels.map((c) => c._id);

    // Delete messages in those channels
    if (channelIds.length > 0) {
      await Message.deleteMany({ channel: { $in: channelIds } });
    }

    // Delete channels
    await Channel.deleteMany({ workspace: workspaceId });

    // Delete workspace
    await Workspace.findByIdAndDelete(workspaceId);

    // Optional: Also remove this workspace from users' `sharedWorkspaces`
    await Workspace.updateMany(
      { sharedWorkspaces: workspaceId },
      { $pull: { sharedWorkspaces: workspaceId } }
    );

    res.json({ message: "Workspace deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const leaveWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Owner cannot leave their own workspace (they should delete it instead)
    if (workspace.owner.toString() === req.userId) {
      return res.status(400).json({ message: "As the owner, you cannot leave this workspace. You must delete it instead." });
    }

    // Remove user from members and admins
    await Workspace.findByIdAndUpdate(
      workspaceId,
      {
        $pull: { 
          members: req.userId,
          admins: req.userId
        }
      },
      { new: true }
    );

    res.json({ message: "Left workspace successfully" });
  } catch (err) {
    next(err);
  }
};

// Get all members of a workspace (owner + members + admins), with status
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId)
      .populate("owner", "username email profilePic status")
      .populate("members", "username email profilePic status")
      .populate("admins", "username email profilePic status");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check requester is in the workspace
    const isInWorkspace =
      workspace.owner?._id?.toString() === req.userId ||
      workspace.members.some(m => m._id.toString() === req.userId) ||
      workspace.admins.some(a => a._id.toString() === req.userId);

    if (!isInWorkspace) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Merge unique members: owner + members + admins
    const seen = new Set();
    const all = [];
    const addIfNew = (user) => {
      if (!user) return;
      const id = (user._id || user).toString();
      if (!seen.has(id)) {
        seen.add(id);
        all.push(user);
      }
    };
    addIfNew(workspace.owner);
    workspace.members.forEach(addIfNew);
    workspace.admins.forEach(addIfNew);

    res.json(all);
  } catch (err) {
    next(err);
  }
};
