import express from "express"
import {
  createWorkspace,
  inviteToWorkspace,
  getUserWorkspaces,
  updateWorkspace,
  removeWorkspaceMember,
  searchUsers,
  getPendingInvitations,
  joinWorkspaceByCode,
  getWorkspaceInviteCode,
  connectWorkspaces,
  deleteWorkspace,
  leaveWorkspace,
  getWorkspaceMembers,
} from "../controllers/workspaceController.js"
import { verifyToken } from "../middleware/verifyToken.js"

const router = express.Router()

router.post("/create", verifyToken, createWorkspace)
router.post("/invite", verifyToken, inviteToWorkspace)
router.get("/user", verifyToken, getUserWorkspaces)
router.get("/search-users", verifyToken, searchUsers)
router.get("/invitations/pending", verifyToken, getPendingInvitations)
router.post("/join-by-code", verifyToken, joinWorkspaceByCode)
router.get("/:workspaceId/invite-code", verifyToken, getWorkspaceInviteCode)
router.get("/:workspaceId/members", verifyToken, getWorkspaceMembers)
router.put("/update/:workspaceId", verifyToken, updateWorkspace)
router.post("/remove-member", verifyToken, removeWorkspaceMember)
router.post("/connect-workspaces", verifyToken, connectWorkspaces)
router.delete("/:workspaceId", verifyToken, deleteWorkspace)
router.post("/:workspaceId/leave", verifyToken, leaveWorkspace)

export default router