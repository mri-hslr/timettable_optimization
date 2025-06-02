#!/usr/bin/env Rscript

# Load required libraries
suppressMessages({
  library(jsonlite)
  library(dplyr)
  library(tidyr)
  library(lubridate)
})

# Get command line arguments
args <- commandArgs(trailingOnly = TRUE)

if (length(args) != 3) {
  cat(toJSON(list(error = "Three arguments required: group_by, view, start_date")))
  quit(status = 1)
}

group_by <- args[1]
view <- args[2]
start_date_str <- args[3]

# Validate date
tryCatch({
  start_date <- as.Date(start_date_str, format = "%Y-%m-%d")
  if (is.na(start_date)) stop("Invalid date format. Use YYYY-MM-DD.")
}, error = function(e) {
  cat(toJSON(list(error = e$message)))
  quit(status = 1)
})

# Load sessions
sessions <- tryCatch({
  read.csv("sessions.csv", stringsAsFactors = FALSE)
}, error = function(e) {
  cat(toJSON(list(error = paste("Could not read sessions.csv:", e$message))))
  quit(status = 1)
})

# Check for essential columns
required_cols <- c("teacherId", "subjectId", "roomId", "time_slot")
missing_cols <- setdiff(required_cols, names(sessions))
if (length(missing_cols) > 0) {
  cat(toJSON(list(error = paste("Missing required columns in CSV:", paste(missing_cols, collapse = ", ")))))
  quit(status = 1)
}

# Handle weekday assignment
if ("day" %in% colnames(sessions)) {
  sessions$weekday <- sessions$day
} else if ("date" %in% colnames(sessions)) {
  sessions$weekday <- ifelse(sessions$date == "unknown", NA, 
                            paste0(toupper(substr(sessions$date, 1, 1)), 
                                   substr(sessions$date, 2, nchar(sessions$date))))
} else {
  cat(toJSON(list(error = "Missing 'day' or 'date' column to determine weekday.")))
  quit(status = 1)
}

# Standardize weekday order
all_days <- c("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
sessions$weekday <- factor(sessions$weekday, levels = all_days)

# Generate summary data
summary_data <- NULL

tryCatch({

  if (view == "weekly") {

    if (group_by == "teacher") {
      result <- sessions %>%
        group_by(teacherId, weekday) %>%
        summarise(sessions = list(data.frame(
          time = time_slot,
          subject = subjectId,
          room = roomId,
          stringsAsFactors = FALSE
        )), .groups = "drop") %>%
        pivot_wider(names_from = weekday, values_from = sessions)

      # Ensure all weekdays exist
      for (i in 1:nrow(result)) {
        for (day in all_days) {
          if (!(day %in% names(result))) {
            result[[day]] <- vector("list", length = nrow(result))
          } else if (is.null(result[[day]][[i]])) {
            result[[day]][[i]] <- list()
          }
        }
      }

      summary_data <- lapply(1:nrow(result), function(i) {
        as.list(result[i, ])
      })
      names(summary_data) <- result$teacherId

    } else if (group_by == "subject") {
      result <- sessions %>%
        group_by(subjectId, weekday) %>%
        summarise(sessions = list(data.frame(
          time = time_slot,
          teacher = teacherId,
          room = roomId,
          stringsAsFactors = FALSE
        )), .groups = "drop") %>%
        pivot_wider(names_from = weekday, values_from = sessions)

      # Ensure all weekdays exist
      for (i in 1:nrow(result)) {
        for (day in all_days) {
          if (!(day %in% names(result))) {
            result[[day]] <- vector("list", length = nrow(result))
          } else if (is.null(result[[day]][[i]])) {
            result[[day]][[i]] <- list()
          }
        }
      }

      summary_data <- lapply(1:nrow(result), function(i) {
        as.list(result[i, ])
      })
      names(summary_data) <- result$subjectId

    } else if (group_by == "room") {
      result <- sessions %>%
        group_by(roomId, weekday) %>%
        summarise(sessions = list(data.frame(
          time = time_slot,
          subject = subjectId,
          teacher = teacherId,
          stringsAsFactors = FALSE
        )), .groups = "drop") %>%
        pivot_wider(names_from = weekday, values_from = sessions)

      # Ensure all weekdays exist
      for (i in 1:nrow(result)) {
        for (day in all_days) {
          if (!(day %in% names(result))) {
            result[[day]] <- vector("list", length = nrow(result))
          } else if (is.null(result[[day]][[i]])) {
            result[[day]][[i]] <- list()
          }
        }
      }

      summary_data <- lapply(1:nrow(result), function(i) {
        as.list(result[i, ])
      })
      names(summary_data) <- result$roomId
    }

  } else if (view == "daily") {

    if (group_by == "teacher") {
      summary_data <- lapply(split(sessions, sessions$teacherId), function(df) {
        list(
          time = paste(unique(df$time_slot), collapse = ", "),
          subject = paste(unique(df$subjectId), collapse = ", "),
          room = paste(unique(df$roomId), collapse = ", ")
        )
      })
    } else if (group_by == "subject") {
      summary_data <- lapply(split(sessions, sessions$subjectId), function(df) {
        list(
          time = paste(unique(df$time_slot), collapse = ", "),
          teacher = paste(unique(df$teacherId), collapse = ", "),
          room = paste(unique(df$roomId), collapse = ", ")
        )
      })
    } else if (group_by == "room") {
      summary_data <- lapply(split(sessions, sessions$roomId), function(df) {
        list(
          time = paste(unique(df$time_slot), collapse = ", "),
          subject = paste(unique(df$subjectId), collapse = ", "),
          teacher = paste(unique(df$teacherId), collapse = ", ")
        )
      })
    }

  } else {
    stop("Invalid view. Must be 'weekly' or 'daily'.")
  }
# Load ggplot2 for plotting
suppressMessages(library(ggplot2))

# Create a bar chart of session count per weekday
tryCatch({
  plot_data <- sessions %>%
    filter(!is.na(weekday)) %>%
    count(weekday) %>%
    mutate(weekday = factor(weekday, levels = all_days))

  p <- ggplot(plot_data, aes(x = weekday, y = n, fill = weekday)) +
    geom_bar(stat = "identity", show.legend = FALSE) +
    labs(
      title = "Number of Sessions per Weekday",
      x = "Weekday",
      y = "Number of Sessions"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5),
      axis.text.x = element_text(angle = 45, hjust = 1)
    )

  ggsave("sessions_plot.png", plot = p, width = 8, height = 5)
}, error = function(e) {
  message("Plotting failed: ", e$message)
})

  cat(toJSON(summary_data, auto_unbox = TRUE))

}, error = function(e) {
  cat(toJSON(list(error = paste("Error generating summary:", e$message))))
  quit(status = 1)
})
