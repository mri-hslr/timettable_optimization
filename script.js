document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById("timetableForm");
    const summaryButton = document.getElementById("summaryButton");
    const optimizeButton = document.getElementById("optimizeButton");
    const startDateInput = document.getElementById("startDate");
    const output = document.getElementById("output");
    const plotSection = document.getElementById("plotSection");
    const sessionPlot = document.getElementById("sessionPlot");
  
    initializeStartDate(startDateInput);
  
    if (form) form.addEventListener("submit", handleFormSubmit);
    if (summaryButton) summaryButton.addEventListener("click", getSummary);
    if (optimizeButton) optimizeButton.addEventListener("click", optimizeTimetable);
  
    // Fade in output container on content update
    const observer = new MutationObserver(() => {
      if (output) {
        output.style.opacity = 0;
        setTimeout(() => {
          output.style.opacity = 1;
        }, 100);
      }
    });
    if (output) {
      observer.observe(output, { childList: true });
    }
  
    window.addEventListener("beforeunload", () => {
      console.log("Page is reloading!");
    });
  });
  
  function initializeStartDate(input) {
    if (input) {
      input.valueAsDate = new Date();
    }
  }
  
  async function handleFormSubmit(event) {
    event.preventDefault();
  
    const form = event.target;
    const formData = new FormData(form);
    const data = {
      Teacher: formData.get("teacher"),
      Subject: formData.get("subject"),
      Room: formData.get("room"),
      Time_slot: formData.get("time_slot"),
      Day: formData.get("day"),
    };
  
    setButtonsDisabled(true);
  
    try {
      const response = await sendPostRequest("http://localhost:3500/timetable", data);
  
      if (response.ok) {
        showSuccessMessage("Entry saved successfully!");
        form.reset();
      } else {
        showErrorMessage(response.error || "Failed to save entry");
      }
    } catch (error) {
      showErrorMessage(`Error submitting schedule: ${error.message}`);
    } finally {
      setButtonsDisabled(false);
    }
  }
  
  async function getSummary(event) {
    event.preventDefault();
  
    const groupBy = document.getElementById("groupBy").value;
    const viewType = document.getElementById("viewType").value;
    const startDate = document.getElementById("startDate").value || new Date().toISOString().slice(0, 10);
  
    const payload = {
      group_by: groupBy,
      view: viewType,
      start_date: startDate,
    };
  
    const plotSection = document.getElementById("plotSection");
    const sessionPlot = document.getElementById("sessionPlot");
  
    setButtonsDisabled(true);
  
    try {
      const response = await sendPostRequest("http://localhost:3500/summary", payload);
  
      if (!response.ok || !response.data || Object.keys(response.data).length === 0) {
        showErrorMessage(response.error || "No summary data available. Please add some schedule entries first.");
        if (plotSection) plotSection.style.display = "none";
        return;
      }
  
      renderSummary(response.data, groupBy, viewType);
  
      if (plotSection && sessionPlot) {
        plotSection.style.display = "block";
        const src = "sessions_plot.png";
        sessionPlot.src = `${src}?t=${new Date().getTime()}`; // cache busting
      }
    } catch (error) {
      showErrorMessage(`Error fetching summary: ${error.message}`);
      if (plotSection) plotSection.style.display = "none";
    } finally {
      setButtonsDisabled(false);
    }
  }
  
  async function optimizeTimetable() {
    setButtonsDisabled(true);
  
    try {
      const response = await sendPostRequest("http://localhost:3500/optimize_timetable");
  
      if (response.ok) {
        showSuccessMessage("Optimization successful!");
        renderOptimizedSchedule(response.data.optimizedSchedule);
      } else {
        showErrorMessage(response.error || "Optimization failed");
      }
    } catch (error) {
      showErrorMessage(`Error optimizing timetable: ${error.message}`);
    } finally {
      setButtonsDisabled(false);
    }
  }
  
  async function sendPostRequest(url, data = {}) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  
    const result = await response.json();
    return { ok: response.ok, data: result, error: result.error };
  }
  
  function renderSummary(data, groupBy, viewType) {
    const output = document.getElementById("output");
    if (!output) return;
  
    output.innerHTML = "";
    const container = document.createElement("div");
  
    Object.keys(data).forEach(key => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "teacher-card";
  
      let innerHTML = `<div class="teacher-header">${capitalizeFirstLetter(groupBy)}: ${key}</div>`;
  
      if (viewType === "weekly") {
        Object.keys(data[key]).forEach(day => {
          const dayData = data[key][day];
          if (Array.isArray(dayData)) {
            innerHTML += `<div class="day-schedule"><strong>${capitalizeFirstLetter(day)}:</strong><ul>`;
            dayData.forEach(entry => {
              innerHTML += formatScheduleEntry(entry);
            });
            innerHTML += `</ul></div>`;
          } else {
            innerHTML += `<div class="day-schedule"><strong>${capitalizeFirstLetter(day)}:</strong> ${JSON.stringify(dayData)}</div>`;
          }
        });
      } else {
        if (Array.isArray(data[key])) {
          innerHTML += `<div class="day-schedule"><ul>`;
          data[key].forEach(entry => {
            innerHTML += formatScheduleEntry(entry);
          });
          innerHTML += `</ul></div>`;
        } else {
          innerHTML += `<div class="day-schedule">${JSON.stringify(data[key])}</div>`;
        }
      }
  
      itemDiv.innerHTML = innerHTML;
      container.appendChild(itemDiv);
    });
  
    output.appendChild(container);
  }
  
  function renderOptimizedSchedule(schedule) {
    const output = document.getElementById("output");
    if (!output) return;
  
    output.innerHTML = `<div class="teacher-header">Optimized Timetable</div>`;
    const list = document.createElement("ul");
    list.className = "optimized-schedule-list";
  
    schedule.forEach(entry => {
      const li = document.createElement("li");
      li.className = "optimized-entry";
      li.innerHTML = `
        <strong>Teacher:</strong> ${entry.Teacher || "N/A"} <br />
        <strong>Subject:</strong> ${entry.Subject || "N/A"} <br />
        <strong>Room:</strong> ${entry.Room || "N/A"} <br />
        <strong>Slot:</strong> ${entry.Slot || "N/A"}
      `;
      list.appendChild(li);
    });
  
    output.appendChild(list);
  }
  
  function formatScheduleEntry(entry) {
    const subject = entry.Subject || entry.subject || "N/A";
    const time = entry.Time_slot || entry.time_slot || entry.time || "N/A";
    const room = entry.Room || entry.room || "N/A";
    const teacher = entry.Teacher || entry.teacher || "N/A";
  
    return `<li>
      <strong>Subject:</strong> ${subject} <br />
      <strong>Time:</strong> ${time} <br />
      <strong>Room:</strong> ${room} <br />
      <strong>Teacher:</strong> ${teacher}
    </li>`;
  }
  
  function showSuccessMessage(message) {
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = `<div class="success">${message}</div>`;
    }
  }
  
  function showErrorMessage(message) {
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = `<div class="error">${message}</div>`;
    }
  }
  
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  function setButtonsDisabled(disabled) {
    const buttons = document.querySelectorAll("button");
    buttons.forEach(btn => btn.disabled = disabled);
  }
  