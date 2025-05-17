library(jsonlite)
library(writexl)
library(rmarkdown)

timetable <- read.csv("dataset.csv")

dir.create("exports", showWarnings = FALSE)

write_json(timetable, "exports/timetable.json", pretty = TRUE)
write.csv(timetable, "exports/timetable.csv", row.names = FALSE)

rmd_content <- paste0(
  "---\n",
  "title: \"Exported Timetable\"\n",
  "output: pdf_document\n",
  "---\n\n",
  "```{r, echo=FALSE}\n",
  "knitr::kable(read.csv(\"../dataset.csv\"))\n",
  "```"
)

writeLines(rmd_content, "exports/timetable_export.Rmd")

rmarkdown::render("exports/timetable_export.Rmd", output_file = "timetable.pdf", output_dir = "exports")

cat("Timetable exported to exports/timetable.csv, .json and .pdf\n")
