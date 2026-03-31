import express from "express"
import { createWorkspace, inviteToWorkspace, getUserWorkspaces, updateWorkspace, removeWorkspaceMember } from "../controllers/workspaceController.js"
import { verifyToken } from "../middleware/verifyToken.js"

const router = express.Router()

router.post("/create", verifyToken, createWorkspace)
router.post("/invite", verifyToken, inviteToWorkspace)
router.get("/user", verifyToken, getUserWorkspaces)
router.put("/update/:workspaceId", verifyToken, updateWorkspace)
router.post("/remove-member", verifyToken, removeWorkspaceMember)

export default router