import express from "express";
import mongoose from "mongoose";
import { Teachermodel, Time_slotmodel, Roommodel, timetablemodel, Subjectmodel, Daymodel } from "./db.js";
import { exec } from "child_process";
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors"


// These two lines define __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors())
app.post("/timetable", async function (req, res) {
  const Teacher = req.body.Teacher;
  const Subject = req.body.Subject;
  const Room = req.body.Room;
  const Time_slot = req.body.Time_slot;
  const Day = req.body.Day;

  let variable1 = await Teachermodel.findOne({ name: Teacher });
  if (!variable1) {
    variable1 = await Teachermodel.create({
      name: Teacher,
    });
  }

  let variable2 = await Subjectmodel.findOne({ name: Subject });
  if (!variable2) {
    variable2 = await Subjectmodel.create({
      name: Subject,
    });
  }

  let variable3 = await Roommodel.findOne({ name: Room });
  if (!variable3) {
    variable3 = await Roommodel.create({
      name: Room,
    });
  }

  let variable4 = await Time_slotmodel.findOne({ time: Time_slot });
  if (!variable4) {
    variable4 = await Time_slotmodel.create({
      time: Time_slot,
    });
  }

  let variable5 = await Daymodel.findOne({ Day: Day });
  if (!variable5) {
    variable5 = await Daymodel.create({
      Day: Day,
    });
  }

  const variable = await timetablemodel.create({
    Subject: variable2._id,
    Teacher: variable1._id,
    Room: variable3._id,
    Time_slot: variable4._id,
    Day: variable5._id,
  });

  if (variable) {
    res.json({
      message: "data stored",
    });
  }
});

// genetic algo api call


// summariser api call
// Updated summary endpoint for your Express app

app.post("/summary", async (req, res) => {
  const {
    group_by = "teacher",
    view = "weekly",
    start_date = new Date().toISOString().slice(0, 10),
  } = req.body;

  console.log(`Received summary request: group_by=${group_by}, view=${view}, start_date=${start_date}`);

  try {
    const sessions = await timetablemodel
      .find()
      .populate("Teacher")
      .populate("Subject")
      .populate("Room")
      .populate("Time_slot")
      .populate("Day");

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ error: "No timetable sessions found" });
    }

    // Log the first session to debug what data structure we're working with

    const csvData = sessions.map((s) => ({
      teacherId: s.Teacher?.name || "unknown",
      subjectId: s.Subject?.name || "unknown",
      roomId: s.Room?.name || "unknown",
      date: s.Day?.Day || "unknown",
      time: s.Time_slot?.time || "unknown"
    }));

    const csvRows = ["teacherId,subjectId,roomId,date,time"];
    for (const row of csvData) {
      csvRows.push(`${row.teacherId},${row.subjectId},${row.roomId},${row.date},${row.time}`);
    }

    // Write CSV with newline at the end
    const csvPath = path.join(__dirname, "sessions.csv");
    await writeFile(csvPath, csvRows.join("\n") + "\n");

    // Make sure the date is in YYYY-MM-DD format
    let formattedDate = start_date;
    if (start_date) {
      try {
        // Try to parse the date to ensure it's valid
        const dateObj = new Date(start_date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().slice(0, 10);
        } else {
          console.warn("Invalid date format received:", start_date);
        }
      } catch (dateErr) {
        console.error("Error formatting date:", dateErr);
      }
    }

    console.log(`Running R script with: group_by=${group_by}, view=${view}, start_date=${formattedDate}`);

    // Get the path to the R script
    const rScriptPath = path.join(__dirname, "summarize.R");
    
    // Make the R script executable (for Unix-like systems)
    try {
      await new Promise((resolve, reject) => {
        exec(`chmod +x "${rScriptPath}"`, (error) => {
          if (error) {
            console.warn("Could not make R script executable:", error);
          }
          resolve();
        });
      });
    } catch (chmodErr) {
      console.warn("Error in chmod operation:", chmodErr);
    }

    // Execute the R script with proper arguments
    exec(
      `Rscript "${rScriptPath}" "${group_by}" "${view}" "${formattedDate}"`,
      { timeout: 10000, encoding: "utf-8" },
      (error, stdout, stderr) => {
        if (stderr) {
          console.warn("R stderr:", stderr);
        }
        
        if (error) {
          console.error("Error running R script:", error.message);
          return res.status(500).json({ 
            error: "Failed to generate summary", 
            details: error.message,
            command: `Rscript "${rScriptPath}" "${group_by}" "${view}" "${formattedDate}"`
          });
        }

        try {
          const result = JSON.parse(stdout);
          return res.json(result);
        } catch (parseErr) {
          return res.status(500).json({ 
            error: "Invalid output from R script", 
            raw: stdout,
            parseError: parseErr.message 
          });
        }
      }
    );
  } catch (e) {
    console.error("Error in summary endpoint:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/optimize_timetable", async function (req, res) {
  console.log("route is working");
  try {
    const sessions = await timetablemodel
      .find()
      .populate("Teacher")
      .populate("Subject")
      .populate("Room")
      .populate("Time_slot")
      .populate("Day");
    console.log(sessions);
    const jsonData = sessions.map((s) => ({
      Teacher: s.Teacher?.name || "unknown",
      Subject: s.Subject?.name || "unknown",
      Room: s.Room?.name || "unknown",
    }));
    console.log(jsonData);

    const inputPath = path.join(__dirname, "input_schedule.json");
    fs.writeFileSync(inputPath, JSON.stringify(jsonData));
    console.log("Wrote input_schedule.json");

    const rScriptPath = path.join(__dirname, "optimize.R");

    exec(
      `Rscript "${rScriptPath}" "${inputPath}"`,
      { timeout: 10000, encoding: "utf-8" },
      (error, stdout, stderr) => {
        console.log("STDOUT:", stdout);
        console.error("STDERR:", stderr);
        if (error) {
          console.error("Error running R script:", error);
          return res.status(500).json({ error: "Failed to optimize schedule" });
        }
        try {
          const result = JSON.parse(stdout);
          return res.json(result);
        } catch (parseErr) {
          console.error("Error parsing R script output:", parseErr);
          return res.status(500).json({ error: "Invalid R script output", raw: stdout });
        }
      }
    );
  } catch (error) {
    console.error("Error optimizing timetable:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3500, () => {
  console.log("Server is running");
});
