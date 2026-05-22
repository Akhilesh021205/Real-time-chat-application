import express from "express";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  clearAllNotifications 
} from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getNotifications);
router.put("/mark-read/all", markAllAsRead);
router.put("/mark-read/:notificationId", markAsRead);
router.delete("/clear-all", clearAllNotifications);
router.delete("/:notificationId", deleteNotification);

export default router;
