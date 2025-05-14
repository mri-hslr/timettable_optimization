import mongoose from "mongoose"
mongoose.connect("mongodb+srv://hslrsharmasingh:323112rm@cluster0.skwiapv.mongodb.net/timetable")
const Schema =mongoose.Schema
const objectid=mongoose.Types.ObjectId
const Teacher=new Schema({
    name:String
})
const Subject=new Schema({
    name:String
})
const Room=new Schema({
    name:String
})
const Time_slot=new Schema({
    time:Number
})
const Day=new Schema({
    Day:String
})
const timetable= new Schema({
    Subject:objectid,
    Teacher:objectid,
    Room:objectid,
    Time_slot:objectid,
    Day:objectid
})
export const Teachermodel=mongoose.model("Teacher",Teacher)
export const Subjectmodel=mongoose.model("Subject",Subject)
export const Roommodel=mongoose.model("Room",Room)
export const Time_slotmodel=mongoose.model("Time_slot",Time_slot)
export const Daymodel=mongoose.model("Day",Day)
export const timetablemodel=mongoose.model("timetable",timetable)