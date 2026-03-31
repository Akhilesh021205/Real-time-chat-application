import express from "express"
import { verifyToken } from "../middleware/verifyToken.js"

const router = express.Router()

router.get("/profile", verifyToken, (req,res)=>{

 res.json({
  message:"Protected route accessed",
  userId:req.userId
 })

})

export default router