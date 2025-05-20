#!/usr/bin/env Rscript

# Load required libraries
library(jsonlite)
library(dplyr)
library(lubridate)

# Get command line arguments
args <- commandArgs(trailingOnly = TRUE)

# Check if three arguments were provided
if (length(args) != 3) {
  cat(jsonlite::toJSON(list(error = "Three arguments required: group_by, view, start_date")))
  quit(status = 1)
}

# Parse arguments
group_by <- args[1]
view <- args[2]
start_date_str <- args[3]

# Safely parse date with error handling
tryCatch({
  # Try to parse the date with explicit format - yyyy-mm-dd
  start_date <- as.Date(start_date_str, format = "%Y-%m-%d")
  
  if (is.na(start_date)) {
    stop("Invalid date format. Please use YYYY-MM-DD format.")
  }
}, error = function(e) {
  cat(jsonlite::toJSON(list(error = paste("Date parsing error:", e$message))))
  quit(status = 1)
})

# Read CSV file
sessions <- tryCatch({
  read.csv("sessions.csv", stringsAsFactors = FALSE)
}, error = function(e) {
  cat(jsonlite::toJSON(list(error = paste("Error reading sessions.csv:", e$message))))
  quit(status = 1)
})

# Transform data based on view type
if (view == "weekly") {
  # Calculate the day of week for each session
  # Assuming 'date' contains weekday names like "Monday", "Tuesday", etc.
  # If 'date' is an actual date, use: sessions$weekday <- weekdays(as.Date(sessions$date))
  sessions$weekday <- sessions$date  # Assuming date already contains weekday names
  
  # Group by the chosen grouping factor and weekday
  if (group_by == "teacher") {
    result <- sessions %>%
      group_by(teacherId, weekday) %>%
      summarise(sessions = list(data.frame(
        time = NA,  # Assuming time_slot would be here in real data
        subject = subjectId,
        room = roomId,
        stringsAsFactors = FALSE
      ))) %>%
      tidyr::pivot_wider(names_from = weekday, values_from = sessions) %>%
      as.data.frame()
    
    # Convert to a named list structure as expected by the frontend
    summary_data <- lapply(1:nrow(result), function(i) {
      teacher_data <- as.list(result[i, ])
      names(teacher_data) <- colnames(result)
      return(teacher_data)
    })
    names(summary_data) <- result$teacherId
    
  } else if (group_by == "subject") {
    result <- sessions %>%
      group_by(subjectId, weekday) %>%
      summarise(sessions = list(data.frame(
        time = NA,
        teacher = teacherId,
        room = roomId,
        stringsAsFactors = FALSE
      ))) %>%
      tidyr::pivot_wider(names_from = weekday, values_from = sessions) %>%
      as.data.frame()
    
    summary_data <- lapply(1:nrow(result), function(i) {
      subject_data <- as.list(result[i, ])
      names(subject_data) <- colnames(result)
      return(subject_data)
    })
    names(summary_data) <- result$subjectId
    
  } else if (group_by == "room") {
    result <- sessions %>%
      group_by(roomId, weekday) %>%
      summarise(sessions = list(data.frame(
        time = NA,
        subject = subjectId,
        teacher = teacherId,
        stringsAsFactors = FALSE
      ))) %>%
      tidyr::pivot_wider(names_from = weekday, values_from = sessions) %>%
      as.data.frame()
    
    summary_data <- lapply(1:nrow(result), function(i) {
      room_data <- as.list(result[i, ])
      names(room_data) <- colnames(result)
      return(room_data)
    })
    names(summary_data) <- result$roomId
  }
  
} else if (view == "daily") {
  # For daily view, we'll create a simplified structure
  if (group_by == "teacher") {
    summary_data <- lapply(split(sessions, sessions$teacherId), function(teacher_sessions) {
      list(
        time = NA,
        subject = paste(unique(teacher_sessions$subjectId), collapse = ", "),
        room = paste(unique(teacher_sessions$roomId), collapse = ", ")
      )
    })
  } else if (group_by == "subject") {
    summary_data <- lapply(split(sessions, sessions$subjectId), function(subject_sessions) {
      list(
        time = NA,
        teacher = paste(unique(subject_sessions$teacherId), collapse = ", "),
        room = paste(unique(subject_sessions$roomId), collapse = ", ")
      )
    })
  } else if (group_by == "room") {
    summary_data <- lapply(split(sessions, sessions$roomId), function(room_sessions) {
      list(
        time = NA,
        subject = paste(unique(room_sessions$subjectId), collapse = ", "),
        teacher = paste(unique(room_sessions$teacherId), collapse = ", ")
      )
    })
  }
}

# Convert summary data to JSON and print to stdout
cat(jsonlite::toJSON(summary_data, auto_unbox = TRUE))