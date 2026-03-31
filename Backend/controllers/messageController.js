import Message from "../Models/Message.js";
import { Channel } from "../Models/channel.js";

const isChannelMember = (channel, userId) => {
  if (!channel) return false;
  const uid = userId?.toString?.();
  const isOwner = channel.createdBy?.toString?.() === uid;
  const isMember = (channel.members || []).some(
    (m) => m?.toString?.() === uid
  );
  return isOwner || isMember;
};

const buildRoomId = (userIdA, userIdB) => {
  if (!userIdA || !userIdB) return null;
  return [userIdA.toString(), userIdB.toString()].sort().join("_");
};

/* SEND MESSAGE */
export const sendMessage = async (req, res, next) => {
  try {
    const { content, channelId, receiverId, attachment } = req.body;

    if (!content && !attachment) {
      return res.status(400).json({ message: "Content or attachmant is required" });
    }

    let roomId;
    let messagePayload = { content: content || "", sender: req.userId, attachment };

    // Direct message
    if (receiverId) {
      roomId = buildRoomId(req.userId, receiverId);
      if (!roomId) {
        return res.status(400).json({ message: "Invalid receiver" });
      }

      messagePayload = {
        ...messagePayload,
        receiver: receiverId,
        roomId,
      };
    } else {
      // Channel message
      const channel = await Channel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      if (!isChannelMember(channel, req.userId)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      roomId = channelId;
      messagePayload = {
        ...messagePayload,
        channel: channelId,
        roomId,
      };
    }

    const message = await Message.create(messagePayload);
    const populatedMessage = await message.populate("sender", "username");

    // Emit to the room for both channels + DMs
    req.io.to(roomId).emit("newMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (err) {
    next(err);
  }
};

/* GET DM MESSAGES */
export const getDMMessages = async (req, res, next) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.userId;

    if (!receiverId) {
      return res.status(400).json({ message: "Missing receiverId" });
    }

    const roomId = buildRoomId(senderId, receiverId);
    if (!roomId) {
      return res.status(400).json({ message: "Invalid receiverId" });
    }

    const messages = await Message.find({ roomId })
      .populate("sender", "username")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

/* GET CHANNEL MESSAGES */
export const getChannelMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!isChannelMember(channel, req.userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({
      $or: [{ channel: channelId }, { roomId: channelId }],
    })
      .populate("sender", "username")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

/* REPLY TO MESSAGE */
export const replyToMessage = async (req, res, next) => {
  try {
    const { content, parentMessageId, channelId } = req.body;

    if (!content || !parentMessageId || !channelId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!isChannelMember(channel, req.userId)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const reply = await Message.create({
      content,
      sender: req.userId,
      channel: channelId,
      parentMessage: parentMessageId,
    });

    const populatedReply = await reply.populate("sender", "username");

    // ✅ Emit to channel room
    req.io.to(channelId).emit("newReply", populatedReply);

    res.status(201).json(populatedReply);
  } catch (err) {
    next(err);
  }
};

/* GET THREAD */
export const getThreadReplies = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const replies = await Message.find({
      parentMessage: messageId,
    })
      .populate("sender", "username")
      .sort({ createdAt: 1 });

    res.json(replies);
  } catch (err) {
    next(err);
  }
};

/* EDIT MESSAGE */
export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not permitted to edit this message" });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const populatedMessage = await message.populate("sender", "username");

    // Emit the edit to the room (channel or DM room)
    const roomId = message.roomId || message.channel?.toString();
    if (roomId) {
      req.io.to(roomId).emit("messageEdited", populatedMessage);
    }

    res.json(populatedMessage);
  } catch (err) {
    next(err);
  }
};

/* TOGGLE PIN */
export const togglePin = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Assuming user has access if they can see the message. For robust apps, check channel membership.
    message.isPinned = !message.isPinned;
    await message.save();

    const populatedMessage = await message.populate("sender", "username");

    // Emit event
    const roomId = message.roomId || message.channel?.toString();
    if (roomId) {
      req.io.to(roomId).emit("messageUpdated", populatedMessage);
    }

    res.json(populatedMessage);
  } catch (err) {
    next(err);
  }
};

import { User } from "../Models/user.js";

/* TOGGLE SAVE MESSAGE */
export const toggleSave = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const user = await User.findById(req.userId);

    const savedIndex = user.savedMessages.indexOf(messageId);
    if (savedIndex > -1) {
      user.savedMessages.splice(savedIndex, 1);
    } else {
      user.savedMessages.push(messageId);
    }

    await user.save();
    res.json({ savedMessages: user.savedMessages });
  } catch (err) {
    next(err);
  }
};

/* MARK ROOM AS READ */
export const markRoomAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID required" });
    }

    await Message.updateMany(
      { roomId, readBy: { $ne: req.userId } },
      { $push: { readBy: req.userId } }
    );

    res.json({ message: "Marked as read" });
  } catch (err) {
    next(err);
  }
};

/* TOGGLE REACTION */
export const toggleReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Find if the emoji already exists in reactions
    const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

    if (reactionIndex > -1) {
      // Check if user already reacted with this emoji
      const userIndex = message.reactions[reactionIndex].users.indexOf(req.userId);
      
      if (userIndex > -1) {
        // Remove the user
        message.reactions[reactionIndex].users.splice(userIndex, 1);
        
        // If no users left, remove the emoji entirely
        if (message.reactions[reactionIndex].users.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      } else {
        // Add the user
        message.reactions[reactionIndex].users.push(req.userId);
      }
    } else {
      // Create new reaction for this emoji
      message.reactions.push({ emoji, users: [req.userId] });
    }

    await message.save();

    const populatedMessage = await message.populate("sender", "username");

    // Emit the reaction update to the room
    const roomId = message.roomId || message.channel?.toString();
    if (roomId) {
      req.io.to(roomId).emit("messageReacted", populatedMessage);
    }

    res.json(populatedMessage);
  } catch (err) {
    next(err);
  }
};