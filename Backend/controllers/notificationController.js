import { Notification } from "../Models/Notification.js";

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .populate("sender", "username profilePic")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndDelete(notificationId);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.userId }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

export const clearAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.userId });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    next(err);
  }
};
