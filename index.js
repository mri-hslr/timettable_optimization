import express from "express"
import mongoose from "mongoose";
import { Teachermodel,Time_slotmodel,Roommodel,timetablemodel, Subjectmodel, Daymodel } from "./db.js";
import {exec} from "child_process"
import { writeFile } from "fs/promises";
const app=express()
app.use(express.json())
app.post("/timetable",async function (req,res){
  const Teacher=req.body.Teacher;
  const Subject =req.body.Subject;
  const Room=req.body.Room;
  const Time_slot=req.body.Time_slot;
  const Day=req.body.Day;
  let variable1=await Teachermodel.findOne({name:Teacher})
  if(!variable1){
    variable1=await Teachermodel.create({
      name:Teacher
    })
  }
  let variable2=await Subjectmodel.findOne({name:Subject})
  if(!variable2){
    variable2=await Subjectmodel.create({
      name:Subject
    })
}
let variable3=await Roommodel.findOne({name:Room})
if(!variable3){
   variable3=await Roommodel.create({
    name:Room
  })
}
let variable4=await Time_slotmodel.findOne({time:Time_slot})
  if(!variable4){
    variable4=await Time_slotmodel.create({
      time:Time_slot
    })
  }  

  let variable5=await Daymodel.findOne({Day:Day})
  if(!variable5){
     variable5=await Daymodel.create({
      Day:Day
    })
  }

  const variable=await timetablemodel.create({
    Subject:variable2._id,
    Teacher:variable1._id,
    Room:variable3._id,
    Time_slot:variable4._id,
    Day:variable5._id
  })
  if(variable){
    res.json({
      message:"data stored"
    })
  }
})
app.post("/optimize_timetable",async function(req,res){
  console.log("route is working")
  try{
    const data=await timetablemodel.find()
      .populate("Teacher")
      .populate("Subject")
      .populate("Room")
      .populate("Time_slot")
      .populate("Day")
  
    const clean=data.map(item=>({
    Teacher: item.Teacher?.name ||"unknown",
      Subject: item.Subject?.name ||"unknown",
      Room: item.Room?.name||"unknown",
      Time: item.Time_slot?.time||"unknown",
      Day: item.Day?.Day||"unknown"
  }))
  console.log(clean)
   await writeFile("input.json", JSON.stringify(clean),"utf-8")
    exec("Rscript optimize.r input.json",(error,stdout,stderr)=>{
      if (error) {
        console.error("Error running R script:", error);
        return res.status(500).json({ error: "Optimization failed" });
      }
      if (stderr) {
        console.error("R script warning:", stderr);
      }
      try{
        const result = JSON.parse(stdout);
        return res.json({
          message: "Optimization successful",
          data: result
        });
      } catch (parseError) {
        console.error("Could not parse R output:", parseError.message);
        res.status(500).json({ error: "Invalid JSON from R script" });

      }
    })
  }
  catch(err){
    console.error("Error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
})

app.listen(3000)
