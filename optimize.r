library(jsonlite)

# Read input JSON file
args <- commandArgs(trailingOnly = TRUE)
if (length(args) == 0) stop("No input schedule provided")

input_schedule <- fromJSON(args[1], simplifyVector = FALSE)


# Number of sessions
classes <- length(input_schedule)
slots <- 5  # You can adjust this based on your slot system

# Fitness function: penalize teacher/room/subject clashes
fitness <- function(schedule, sessions) {
  clashes <- 0
  len <- min(length(schedule), length(sessions))  # ensure safe bounds

  for (i in 1:(len - 1)) {
    for (j in (i + 1):len) {
      if (!is.na(schedule[i]) && !is.na(schedule[j]) && identical(schedule[i], schedule[j])) {
        same_teacher <- sessions[[i]]$Teacher == sessions[[j]]$Teacher
        same_room <- sessions[[i]]$Room == sessions[[j]]$Room
        same_subject <- sessions[[i]]$Subject == sessions[[j]]$Subject
        if (same_teacher || same_room || same_subject) {
          clashes <- clashes + 1
        }
      }
    }
  }
  return(clashes)
}


# Genetic algorithm components
generate_schedule <- function() {
  sample(1:slots, classes, replace = TRUE)
}

crossover <- function(p1, p2) {
  point <- sample(2:(classes - 1), 1)
  c(p1[1:point], p2[(point + 1):classes])
}

mutate <- function(child, mutation_rate = 0.1) {
  for (i in 1:classes) {
    if (runif(1) < mutation_rate) {
      child[i] <- sample(1:slots, 1)
    }
  }
  return(child)
}

# Initialize parents
parent1 <- generate_schedule()
parent2 <- generate_schedule()

# Evolution loop
for (i in 1:30) {
  child <- crossover(parent1, parent2)
  child <- mutate(child)
  f_child <- fitness(child, input_schedule)
  f_p1 <- fitness(parent1, input_schedule)
  f_p2 <- fitness(parent2, input_schedule)

  if (f_child < f_p1 || f_child < f_p2) {
    if (f_p1 > f_p2) {
      parent1 <- child
    } else {
      parent2 <- child
    }
  }
}

# Choose best solution
final <- if (fitness(parent1, input_schedule) < fitness(parent2, input_schedule)) parent1 else parent2

# Map slot numbers to input schedule
mapped <- lapply(1:classes, function(i) {
  input_schedule[[i]]$Slot <- final[i]
  input_schedule[[i]]
})

# Return results as JSON
cat(toJSON(list(
  fitness = fitness(final, input_schedule),
  optimizedSchedule = mapped
), auto_unbox = TRUE, pretty = TRUE))
