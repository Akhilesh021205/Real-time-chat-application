import mongoose from "mongoose"

const workspaceSchema = new mongoose.Schema({

 name:{
  type:String,
  required:true
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
 }

})

export const Workspace = mongoose.model("Workspace",workspaceSchema)