import { sameId } from "./ids.js";

export function getWorkspaceOwnerId(workspace) {
  if (!workspace?.owner) return null;
  return workspace.owner._id ?? workspace.owner;
}

export function isWorkspaceOwner(workspace, userId) {
  if (!workspace || userId == null) return false;
  return sameId(getWorkspaceOwnerId(workspace), userId);
}
