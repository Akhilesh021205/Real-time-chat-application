import express from "express";
import { getUsers, searchUsers } from "../controllers/userController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Apply verifyToken to all routes
router.use(verifyToken);

/* GET USERS (Shared Workspace Members) */
router.get("/", getUsers);

/* SEARCH USERS */
router.get("/search", searchUsers);

export default router;