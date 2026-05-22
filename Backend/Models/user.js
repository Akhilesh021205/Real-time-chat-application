import mongoose from "mongoose"

const userSchema = new mongoose.Schema({

  username:{
    type:String,
    required:true
  },

  email:{
    type:String,
    required:true,
    unique:true
  },

  password:{
    type:String,
    required:false
  },

  profilePic:{
    type:String,
    default:""
  },

  aboutMe:{
    type:String,
    default:""
  },

  googleId:{
    type:String
  },

  resetPasswordToken:{
    type:String
  },

  resetPasswordExpires:{
    type:Date
  },

  resetOTP: {
    type: String,
  },

  resetOTPExpires: {
    type: Date,
  },

  savedMessages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  ],

  status: {
    type: String,
    enum: ["active", "away", "dnd", "offline"],
    default: "offline",
  },

  customStatus: {
    text: { type: String, default: "" },
    emoji: { type: String, default: "" },
  },

  starredChannels: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
  ],

  starredDMs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  sidebarSections: [
    {
      name: { type: String, required: true },
      items: [{ type: String }], // Array of IDs (channels or user IDs)
    },
  ],

},{ timestamps:true })


export const User = mongoose.model("User",userSchema)