import { Channel } from "../Models/channel.js";
import { Workspace } from "../Models/workspace.js";
import { User } from "../Models/user.js";
import Message from "../Models/Message.js";
import { getCache, setCache, delCache, clearCachePrefix } from "../utils/cache.js";

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

// Returns active DM users (those with whom the user has exchanged at least one message)
export const getActiveDMs = async (req, res, next) => {
  try {
    const userId = req.userId;

    // Find all messages where the user is sender or receiver (and it's a DM)
    const dmMessages = await Message.find({
      $or: [
        { sender: userId, receiver: { $exists: true, $ne: null } },
        { receiver: userId }
      ]
    }).select("sender receiver");

    const activeUserIds = new Set();
    dmMessages.forEach(msg => {
      if (msg.sender && msg.sender.toString() !== userId) {
        activeUserIds.add(msg.sender.toString());
      }
      if (msg.receiver && msg.receiver.toString() !== userId) {
        activeUserIds.add(msg.receiver.toString());
      }
    });

    // Also include self if they have self-DMs
    const hasSelfDm = dmMessages.some(msg => 
      msg.sender?.toString() === userId && msg.receiver?.toString() === userId
    );
    if (hasSelfDm) activeUserIds.add(userId);

    const activeUsers = await User.find({ _id: { $in: Array.from(activeUserIds) } })
      .select("username email profilePic status");

    // Format like channels to match sidebar structure: map to pseudo-channels
    const formattedDMs = activeUsers.map(u => ({
      _id: [userId, u._id.toString()].sort().join("_"), // roomId
      isDM: true,
      members: [u] // Include the other user as the member
    }));

    res.json(formattedDMs);
  } catch (err) {
    next(err);
  }
};

export const createChannel = async (req, res, next) => {
  try {
    const { name, workspaceId, isPrivate } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    let members = [req.userId];

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
      members,
      isDM: false,
      isPrivate: !!isPrivate,
    });

    await channel.save();
    await channel.populate("members", "username email profilePic status");

    await clearCachePrefix("user:channels:");

    // 📣 Notify all added members via Socket.io if possible
    // (The frontend will need to handle this to update the sidebar for other users)
    if (workspaceId) {
      req.io.to(workspaceId).emit("channelCreated", channel);
    }

    res.status(201).json(channel);
  } catch (err) {
    next(err);
  }
};

export const addMembers = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { userIds, emails } = req.body;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    let resolvedIds = [...(userIds || [])];

    if (emails && Array.isArray(emails) && emails.length > 0) {
      const foundUsers = await User.find({ email: { $in: emails } });
      foundUsers.forEach((u) => {
        if (!resolvedIds.includes(u._id.toString())) {
          resolvedIds.push(u._id.toString());
        }
      });
    }

    resolvedIds.forEach((id) => {
      if (!channel.members.some((m) => m.toString() === id.toString())) {
        channel.members.push(id);
      }
    });

    await channel.save();
    await channel.populate("members", "username email profilePic status");

    await clearCachePrefix("user:channels:");

    res.json(channel);
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
      await clearCachePrefix("user:channels:");
    }

    await channel.populate("members", "username email profilePic status");
    res.json(channel);
  } catch (err) {
    next(err);
  }
};

export const getChannels = async (req, res, next) => {
  try {
    const userId = req.userId;
    const cacheKey = `user:channels:${userId}`;

    const cachedChannels = await getCache(cacheKey);
    if (cachedChannels) {
      return res.json(cachedChannels);
    }

    // 🔍 Find workspaces where the user is a member or owner
    const userWorkspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    }).select("_id");
    
    const workspaceIds = userWorkspaces.map(w => w._id);

    // Return channels where:
    // 1. It's public and in the user's workspace
    // 2. OR the user is a specific member (for private channels)
    // 3. OR the user created it
    const channels = await Channel.find({
      isDM: false,
      $or: [
        { workspace: { $in: workspaceIds }, isPrivate: false },
        { workspace: { $in: workspaceIds }, isPrivate: true, members: userId },
        { createdBy: userId },
        { members: userId }
      ],
    })
    .populate("members", "username email profilePic status")
    .sort({ name: 1 });

    await setCache(cacheKey, channels, 300); // 5 minutes TTL

    res.json(channels);
  } catch (err) {
    next(err);
  }
};

// Browse ALL public channels so any user can discover and join them
export const browseChannels = async (req, res, next) => {
  try {
    const userId = req.userId;

    const channels = await Channel.find({ isDM: false, isPrivate: false })
      .populate("createdBy", "username")
      .sort({ name: 1 });

    // Annotate each channel with whether the current user is already a member
    const annotated = channels.map((ch) => ({
      ...ch.toObject(),
      isMember:
        ch.members.some((m) => m.toString() === userId) ||
        ch.createdBy?._id?.toString() === userId,
      memberCount: ch.members.length,
    }));

    res.json(annotated);
  } catch (err) {
    next(err);
  }
};

// Get or generate channel invite code
export const getChannelInviteCode = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    // Generate code if missing
    if (!channel.inviteCode) {
      const crypto = await import('crypto');
      channel.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      await channel.save();
    }

    res.json({ inviteCode: channel.inviteCode });
  } catch (err) {
    next(err);
  }
};

// Regenerate channel invite code (creates a new one every time)
export const regenerateChannelInviteCode = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const crypto = await import('crypto');
    channel.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    await channel.save();

    res.json({ inviteCode: channel.inviteCode });
  } catch (err) {
    next(err);
  }
};


// Join channel (and its workspace if not in it) by invite code
export const joinChannelByCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: "Invite code is required" });

    const channel = await Channel.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!channel) return res.status(404).json({ message: "Invalid channel invite code" });

    // If channel is part of a workspace, make sure the user is in that workspace
    let workspace = null;
    if (channel.workspace) {
      workspace = await Workspace.findById(channel.workspace);
      if (workspace) {
        const isInWorkspace =
          workspace.owner.toString() === req.userId ||
          workspace.members.some((m) => m.toString() === req.userId);

        if (!isInWorkspace) {
          workspace.members.push(req.userId);
          await workspace.save();
          await delCache(`workspace:members:${workspace._id}`);
        }
      }
    }

    if (!channel.members.some((m) => m.toString() === req.userId)) {
      channel.members.push(req.userId);
      await channel.save();
      await clearCachePrefix("user:channels:");
    }

    await channel.populate("members", "username email profilePic status");

    res.json({
      message: "Successfully joined channel",
      channel,
      workspace
    });
  } catch (err) {
    next(err);
  }
};