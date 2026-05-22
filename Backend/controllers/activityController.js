import Message from "../Models/Message.js";
import { Notification } from "../Models/Notification.js";
import { User } from "../Models/user.js";
export const getActivityFeed = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("username");
    if (!user) return res.status(404).json({ message: "User not found" });

    const items = [];
    const seen = new Set();

    const push = (entry) => {
      const key = entry.id;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(entry);
    };

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "username profilePic")
      .sort({ createdAt: -1 })
      .limit(40);

    notifications.forEach((n) => {
      push({
        id: `notif-${n._id}`,
        type: n.type === "dm" ? "dm" : n.type === "mention" ? "mention" : n.type === "thread" ? "thread" : "all",
        title: n.sender?.username || "System",
        preview: n.content,
        context: n.context || "",
        createdAt: n.createdAt,
        read: n.read,
        link: n.link,
        sender: n.sender,
        isApp: false,
        source: "notification",
        rawId: n._id,
      });
    });

    const dmMessages = await Message.find({
      $or: [{ receiver: userId }, { sender: userId, receiver: userId }],
      receiver: { $exists: true, $ne: null },
    })
      .populate("sender", "username profilePic")
      .populate("receiver", "username")
      .sort({ createdAt: -1 })
      .limit(50);

    dmMessages.forEach((m) => {
      const isSlackbot =
        m.sender?.username === "Slackbot" ||
        m.receiver?.toString() === "slackbot" ||
        m.sender?._id?.toString() === "slackbot";
      const otherId =
        m.sender?._id?.toString() === userId
          ? m.receiver?.toString()
          : m.sender?._id?.toString();
      if (!otherId) return;

      push({
        id: `dm-${m._id}`,
        type: "dm",
        title: isSlackbot ? "Slackbot" : m.sender?.username || "User",
        preview: m.content || "(attachment)",
        context: isSlackbot ? "App" : "Direct message",
        createdAt: m.createdAt,
        read: m.readBy?.some((id) => id.toString() === userId) ?? false,
        link: isSlackbot ? "/chat/slackbot" : `/chat/${otherId}`,
        sender: m.sender,
        isApp: isSlackbot,
        source: "message",
        rawId: m._id,
      });
    });

    if (user.username) {
      const mentionRegex = new RegExp(`@${user.username}\\b`, "i");
      const mentions = await Message.find({
        content: mentionRegex,
        channel: { $ne: null },
        sender: { $ne: userId },
      })
        .populate("sender", "username profilePic")
        .populate("channel", "name")
        .sort({ createdAt: -1 })
        .limit(25);

      mentions.forEach((m) => {
        push({
          id: `mention-${m._id}`,
          type: "mention",
          title: m.sender?.username || "User",
          preview: m.content,
          context: m.channel?.name ? `#${m.channel.name}` : "Channel",
          createdAt: m.createdAt,
          read: m.readBy?.some((id) => id.toString() === userId) ?? false,
          link: m.channel ? `/chat/${m.channel._id}` : null,
          sender: m.sender,
          isApp: false,
          source: "message",
          rawId: m._id,
        });
      });
    }

    const myMessageIds = await Message.find({ sender: userId })
      .select("_id")
      .limit(200);
    const ids = myMessageIds.map((m) => m._id);

    if (ids.length > 0) {
      const replies = await Message.find({
        parentMessage: { $in: ids },
        sender: { $ne: userId },
      })
        .populate("sender", "username profilePic")
        .populate("channel", "name")
        .sort({ createdAt: -1 })
        .limit(25);

      replies.forEach((m) => {
        push({
          id: `thread-${m._id}`,
          type: "thread",
          title: m.sender?.username || "User",
          preview: m.content,
          context: m.channel?.name ? `Thread in #${m.channel.name}` : "Thread reply",
          createdAt: m.createdAt,
          read: m.readBy?.some((id) => id.toString() === userId) ?? false,
          link: m.channel ? `/chat/${m.channel._id}` : null,
          sender: m.sender,
          isApp: false,
          source: "message",
          rawId: m._id,
        });
      });
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(items.slice(0, 80));
  } catch (err) {
    next(err);
  }
};
