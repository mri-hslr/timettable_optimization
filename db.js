import mongoose from "mongoose";

mongoose.connect("mongodb+srv://hslrsharmasingh:323112rm@cluster0.skwiapv.mongodb.net/timetable");

const Schema = mongoose.Schema;
const objectId = mongoose.Types.ObjectId;

const Teacher = new Schema({ name: String });
const Subject = new Schema({ name: String });
const Room = new Schema({ name: String });
const TimeSlot = new Schema({ time: String }); // Keep as String for "9:00-10:00"
const Day = new Schema({ Day: String });

const Timetable = new Schema({
  Subject: { type: objectId, ref: "Subject" },
  Teacher: { type: objectId, ref: "Teacher" },
  Room: { type: objectId, ref: "Room" },
  Time_slot: { type: objectId, ref: "Time_slot" },
  Day: { type: objectId, ref: "Day" },
});

export const Teachermodel = mongoose.model("Teacher", Teacher);
export const Subjectmodel = mongoose.model("Subject", Subject);
export const Roommodel = mongoose.model("Room", Room);
export const Time_slotmodel = mongoose.model("Time_slot", TimeSlot);
export const Daymodel = mongoose.model("Day", Day);
export const timetablemodel = mongoose.model("timetable", Timetable);
