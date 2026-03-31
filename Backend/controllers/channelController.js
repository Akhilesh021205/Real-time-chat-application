import { Channel } from "../Models/channel.js";
import { Workspace } from "../Models/workspace.js";

export const createOrGetDM = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // 🔍 Check if DM already exists
    let channel = await Channel.findOne({
      isDM: true,
      members: { $all: [currentUserId, userId], $size: 2 },
    });

    // 🆕 Create if not exists
    if (!channel) {
      channel = new Channel({
        isDM: true,
        members: [currentUserId, userId],
        name: "DM",
      });

      await channel.save();
    }

    res.json(channel);
  } catch (err) {
    next(err);
  }
};

export const createChannel = async (req, res, next) => {
  try {
    const { name, workspaceId } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }

      const isMember =
        workspace.owner.toString() === req.userId ||
        workspace.members.some((m) => m.toString() === req.userId);

      if (!isMember) {
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    const channel = new Channel({
      name,
      workspace: workspaceId || null,
      createdBy: req.userId,
      members: [req.userId],
      isDM: false,
    });

    await channel.save();
    res.status(201).json(channel);
  } catch (err) {
    next(err);
  }
};

export const joinChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel || channel.isDM) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const workspace = channel.workspace
      ? await Workspace.findById(channel.workspace)
      : null;

    if (workspace) {
      const isInWorkspace =
        workspace.owner.toString() === req.userId ||
        workspace.members.some((m) => m.toString() === req.userId);

      if (!isInWorkspace) {
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    if (!channel.members.some((m) => m.toString() === req.userId)) {
      channel.members.push(req.userId);
      await channel.save();
    }

    res.json(channel);
  } catch (err) {
    next(err);
  }
};

export const getChannels = async (req, res, next) => {
  try {
    // Return all workspace channels where user is member or owner
    const userId = req.userId;

    const channels = await Channel.find({
      isDM: false,
      $or: [{ createdBy: userId }, { members: userId }],
    }).sort({ name: 1 });
    res.json(channels);
  } catch (err) {
    next(err);
  }
};