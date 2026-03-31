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

  googleId:{
    type:String
  },

  resetPasswordToken:{
    type:String
  },

  resetPasswordExpires:{
    type:Date
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
  }

},{ timestamps:true })


export const User = mongoose.model("User",userSchema)