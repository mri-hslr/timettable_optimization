library(jsonlite)
args <- commandArgs(trailingOnly = TRUE)
if (length(args) == 0) {
  stop("No input schedule provided")
}
input_schedule <- fromJSON(args[1])
parent1 <- input_schedule
classes <- length(parent1)
slots <- 5
generate_schedule<-function() {
  return(sample(1:slots, classes, replace = TRUE))
}
fitness<-function(schedule){
  return(length(schedule)-length(unique(schedule)))
}
crossover<-function(parent1,parent2){
  point<-sample(2:(classes-1),1)
  child<-c(parent1[1:point],parent2[point+1:classes])
  return(child)
}
mutate<-function(child,mutation_rate =0.1){
  for(i in 1:classes){
    if(runif(1)<mutation_rate){
      child[i]<-sample(1:slots,1)
    }
  }
  return (child)
}
parent1<-input_schedule;
parent2<-generate_schedule();

for(i in 1:20){
  child<-crossover(parent1,parent2)
  child<-mutate(child)
  f_child<-fitness(child)
  f_parent1<-fitness(parent1)
  f_parent2<-fitness(parent2)
  if(f_child<f_parent1|| f_child<f_parent2){
    if(f_parent1>f_parent2){
      parent2<-child
    }
    else{
     parent1<-child
    }
  }
 
}
if (fitness(parent1) < fitness(parent2)) {
  final <- parent1
} else {
  final <- parent2
}

cat(toJSON(list(
  optimizedSchedule = final,
  fitness = fitness(final)
), auto_unbox = TRUE))
