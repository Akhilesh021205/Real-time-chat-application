import { DirectMessage } from "../Models/DirectMessage.js"

export const sendDM = async (req,res,next)=>{

 try{

  const {receiverId, content} = req.body

  const dm = new DirectMessage({
   sender:req.userId,
   receiver:receiverId,
   content
  })

  await dm.save()

  res.status(201).json({
   message:"DM sent",
   data:dm
  })

 }catch(err){
  next(err)
 }

}


export const getDMConversation = async (req,res,next)=>{

 try{

  const {userId} = req.params

  const messages = await DirectMessage.find({
   $or:[
    {sender:req.userId, receiver:userId},
    {sender:userId, receiver:req.userId}
   ]
  })
  .sort({createdAt:1})

  res.json(messages)

 }catch(err){
  next(err)
 }

}