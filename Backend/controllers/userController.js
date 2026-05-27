import { User } from "../Models/user.js";
import { Workspace } from "../Models/workspace.js";
import mongoose from "mongoose";
import { getCache, setCache, clearCachePrefix } from "../utils/cache.js";

const displayUsername = (user) => {
  if (user?.username) return user.username;
  const emailName = String(user?.email || "").split("@")[0].trim();
  return emailName || "User";
};

export const getUsers = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { workspaceId } = req.query;
    const cacheKey = `users:directory:${userId}:${workspaceId || "all"}`;

    const cachedUsers = await getCache(cacheKey);
    if (cachedUsers) {
      return res.json(cachedUsers);
    }

    const queryConditions = [
      { owner: userId },
      { members: userId },
      { admins: userId }
    ];

    if (workspaceId) {
      // Find the specific workspace first to ensure user has access
      const specificWorkspace = await Workspace.findOne({
        _id: workspaceId,
        $or: queryConditions
      }).select("members owner admins sharedWorkspaces");

      if (!specificWorkspace) {
        return res.status(403).json({ message: "Access denied to this workspace" });
      }

      // We only care about this specific workspace and its connected workspaces
      var workspaces = [specificWorkspace];
    } else {
      // Find all workspaces where current user is a member
      var workspaces = await Workspace.find({
        $or: queryConditions
      }).select("members owner admins sharedWorkspaces");
    }

    // Collect all unique member IDs from own workspaces
    const memberIds = new Set();
    const sharedWorkspaceIds = new Set();

    workspaces.forEach(ws => {
      if (ws.owner) memberIds.add(ws.owner.toString());
      ws.members.forEach(id => memberIds.add(id.toString()));
      ws.admins.forEach(id => memberIds.add(id.toString()));
      ws.sharedWorkspaces.forEach(id => sharedWorkspaceIds.add(id.toString()));
    });

    // If there are shared workspaces, get their members too
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

    // Remove self from the list
    memberIds.delete(userId);

    const users = await User.find({
      _id: { $in: Array.from(memberIds) }
    }).select("-password");

    const result = users.map((user) => ({
      ...user.toObject(),
      username: displayUsername(user),
    }));

    await setCache(cacheKey, result, 300); // 5 minutes TTL

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    const userId = req.userId;

    // Reuse the logic from getUsers but with filter
    const workspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { members: userId },
        { admins: userId }
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

    const filter = {
      _id: { $in: Array.from(memberIds), $ne: userId },
      username: { $regex: query || "", $options: "i" },
    };

    const users = await User.find(filter).select("_id username profilePic status email");

    res.json(users.map((user) => ({
      ...user.toObject(),
      username: displayUsername(user),
    })));
  } catch (err) {
    next(err);
  }
};
