import mongoose from "mongoose"
import crypto from "crypto"

const workspaceSchema = new mongoose.Schema({

 name:{
  type:String,
  required:true
 },

 image: {
  type: String,
  default: ""
 },

 owner:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },

 members:[
  {
   type:mongoose.Schema.Types.ObjectId,
   ref:"User"
  }
 ],

 admins: [
  {
   type: mongoose.Schema.Types.ObjectId,
   ref: "User",
  }
 ],

 createdAt:{
  type:Date,
  default:Date.now
 },

 inviteCode: {
  type: String,
  unique: true,
  sparse: true,
  default: () => crypto.randomBytes(4).toString('hex').toUpperCase()
 },

 sharedWorkspaces: [
  {
   type: mongoose.Schema.Types.ObjectId,
   ref: "Workspace"
  }
 ]

})

export const Workspace = mongoose.model("Workspace",workspaceSchema)