/**
 * @file script.js
 * @description This file contains the JavaScript code for the frontend of the talk2docs application.
 * It handles user interactions, manages the UI, and communicates with the backend API.
 */

/**
 * @constant {string} BASE_URL
 * @description The base URL for the backend API.
 */

/**
 * @function parseMarkdownText
 * @description Parses markdown text into HTML using the `marked` library.
 * @param {string} text - The markdown text to parse.
 * @returns {string} The HTML representation of the markdown text.
 */

/**
 * @function showPage
 * @description Displays the content for a specific page in the application.
 * It updates the active navigation link and renders the appropriate HTML content.
 * @param {string} page - The name of the page to display (e.g., "ask_question", "ingest_multiple", "image").
 */

/**
 * @function setupFileInputListener
 * @description Sets up an event listener for a file input element to handle file selection and display a list of selected files.
 * It also provides functionality to delete files from the selection.
 * @param {string} inputId - The ID of the file input element.
 * @param {string} listId - The ID of the element where the list of selected files will be displayed.
 */

/**
 * @async
 * @function uploadMultipleFiles
 * @description Uploads multiple files to the backend for ingestion, along with a tenant ID.
 * It validates the input, constructs a FormData object, and sends a POST request to the `/ingest-multiple-files` endpoint.
 * It also handles the response from the server and displays the results in the UI.
 */

/**
 * @async
 * @function submitQuestion
 * @description Submits a question to the backend for processing, along with a tenant ID.
 * It validates the input, sends a POST request to the `/ask-stream` endpoint, and streams the response to the UI.
 * It also handles errors and displays the results in the UI.
 */

/**
 * @function cancelRequest
 * @description Cancels the current question request if one is in progress.
 * It aborts the fetch request and updates the UI to indicate that the request has been cancelled.
 */

/**
 * @async
 * @function processImages
 * @description Processes images by sending them to the backend along with a query.
 * It validates the input, constructs a FormData object, and sends a POST request to the `/ask-image` endpoint.
 * It also handles the response from the server and displays the results and image previews in the UI.
 */

/**
 * @function cancelImageRequest
 * @description Cancels the current image processing request if one is in progress.
 * It aborts the fetch request and updates the UI to indicate that the request has been cancelled.
 */

/**
 * @var {boolean} gk_isXlsx
 * @description A global variable to indicate if the file being processed is an XLSX file.
 */

/**
 * @var {object} gk_xlsxFileLookup
 * @description A global object to store the lookup for XLSX files.
 */

/**
 * @var {object} gk_fileData
 * @description A global object to store the file data.
 */

/**
 * @function filledCell
 * @description Checks if a cell is filled (not empty or null).
 * @param {any} cell - The cell to check.
 * @returns {boolean} True if the cell is filled, false otherwise.
 */

/**
 * @function loadFileData
 * @description Loads file data from a global store, handling XLSX files differently by parsing them and converting them to CSV.
 * @param {string} filename - The name of the file to load.
 * @returns {string} The file data as a string (CSV for XLSX files, or the original data for other files).
 */
const BASE_URL = "http://127.0.0.1:8001";

function parseMarkdownText(text) {
  return marked.parse(text);
}

function showPage(page) {
  const navLinks = document.querySelectorAll(".navbar a");
  navLinks.forEach((link) => link.classList.remove("active"));
  document.querySelector(`.navbar a[href="#${page}"]`).classList.add("active");

  const content = document.getElementById("content");
  content.innerHTML = "";

  if (page === "ask_question") {
    content.innerHTML = `
            <h2>Ask a Question</h2>
            <br>
            <input type="text" id="ask_tenant" placeholder="Tenant ID">
            <textarea id="query" placeholder="Your Question" rows="4"></textarea>
            <button type="button" id="submit_btn" onclick="submitQuestion()">Submit</button>
            <button onclick="cancelRequest()">Stop</button>
            <div id="question_result" class="result"></div>
        `;
  } else if (page === "ingest_multiple") {
    content.innerHTML = `
            <h2>Upload Documents for Ingestion</h2>
            <br>
            <input type="text" id="multi_file_tenant" placeholder="Tenant ID">
            <br>
            <div class="custom-file-upload">
                <label for="multi_file_upload" class="file-upload-button">
                    <span>Choose Files</span>
                </label>
                <input type="file" id="multi_file_upload" accept=".pdf,.txt,.docx,.doc" multiple>
                <div id="file-list" class="file-list"></div>
            </div>
            <br>
            <button type="button" onclick="uploadMultipleFiles()">Upload</button>
            <div id="multi_file_result"></div>
        `;
    setupFileInputListener("multi_file_upload", "file-list");
  } else if (page === "image") {
    content.innerHTML = `
            <h2>Image Processing</h2>
            <br>
            <div class="input-group">
                <input type="text" id="image_query" placeholder="Ask a question about the images">
            </div>
            <div class="custom-file-upload">
                <label for="image_upload" class="file-upload-button">
                    <span>Choose Images</span>
                </label>
                <input type="file" id="image_upload" accept=".jpg,.jpeg,.png" multiple>
                <div id="image-file-list" class="file-list"></div>
            </div>
            <br>
            <div class="button-group">
                <button type="button" class="upload-button" onclick="processImages()">Upload</button>
                <button type="button" class="cancel-button" onclick="cancelImageRequest()">Stop</button>
            </div>
            <br>
            <div id="image_results">
                <div id="image_preview_container"></div>
                <div id="image_analysis_results"></div>
            </div>
        `;
    setupFileInputListener("image_upload", "image-file-list");
  }
}

function setupFileInputListener(inputId, listId) {
  const fileInput = document.getElementById(inputId);
  const fileList = document.getElementById(listId);
  let selectedFiles = [];

  function updateFileList() {
    fileList.innerHTML = "";
    if (selectedFiles.length === 0) {
      fileList.innerHTML = "<p>No files selected</p>";
      return;
    }

    const ul = document.createElement("ul");
    selectedFiles.forEach((file, index) => {
      const li = document.createElement("li");
      const fileInfo = document.createElement("span");
      fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(
        2
      )} KB)`;
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✖";
      deleteBtn.className = "delete-file";
      deleteBtn.onclick = () => {
        selectedFiles.splice(index, 1);
        updateFileList();
        // Update file input
        const newFileList = new DataTransfer();
        selectedFiles.forEach((f) => newFileList.items.add(f));
        fileInput.files = newFileList.files;
      };
      li.appendChild(fileInfo);
      li.appendChild(deleteBtn);
      ul.appendChild(li);
    });
    fileList.appendChild(ul);
  }

  fileInput.addEventListener("change", () => {
    selectedFiles = Array.from(fileInput.files);
    updateFileList();
  });
}

async function uploadMultipleFiles() {
  const tenantId = document.getElementById("multi_file_tenant").value;
  const fileInput = document.getElementById("multi_file_upload");
  const resultDiv = document.getElementById("multi_file_result");

  if (!tenantId || !fileInput.files.length) {
    resultDiv.innerHTML =
      '<br><div class="alert warning">Please provide Tenant ID and select at least one file.</div>';
    return;
  }

  // Allowed file extensions
  const allowedExtensions = ["pdf", "doc", "docx", "txt"];
  for (const file of fileInput.files) {
    const fileExt = file.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      resultDiv.innerHTML = `<br><div class="alert error">Unsupported file type: ${file.name}. Allowed formats are .pdf, .doc, .docx, .txt</div>`;
      return;
    }
  }

  const formData = new FormData();
  formData.append("tenantId", tenantId);
  for (const file of fileInput.files) {
    formData.append("files", file);
  }

  try {
    resultDiv.innerHTML = '<div class="loader"></div>';
    const response = await fetch(`${BASE_URL}/ingest-multiple-files`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (response.ok) {
      let html = `<br><div class="alert success">${data.message}</div>`;
      html += `<p>Total Chunks Created: ${data.total_chunks || 0}</p>`;
      if (data.errors?.length) {
        html += `<div class="alert error">Some errors occurred:</div><p>${data.errors.join(
          ", "
        )}</p>`;
      }
      resultDiv.innerHTML = html;
    } else {
      resultDiv.innerHTML = `<div class="alert error">${data.error || "Something went wrong."
        }</div>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<div class="alert error">Error: ${error.message}</div>`;
  }
}

async function submitQuestion() {
  cancelRequest(); // Cancel any previous request
  const tenantId = document.getElementById("ask_tenant").value.trim();
  const query = document.getElementById("query").value.trim();
  const resultDiv = document.getElementById("question_result");

  if (!tenantId || !query) {
    resultDiv.innerHTML =
      '<div class="alert warning">Please provide both Tenant ID and Question.</div>';
    return;
  }

  if (window.currentRequest) {
    window.currentRequest.abort();
  }
  window.currentRequest = new AbortController();

  try {
    resultDiv.innerHTML = '<div class="loader"></div>'; // Show loading spinner

    const response = await fetch(`${BASE_URL}/ask-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, tenantId }),
    });
    console.log(response);

    if (!response.ok || !response.body) {
      throw new Error(`Server error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullResponse = "";
    let displayResponse = "";

    resultDiv.innerHTML =
      '<div class="alert success" id="streaming-output">▌</div>';
    const outputDiv = document.getElementById("streaming-output");
    console.log("Starting to read stream...");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      fullResponse += chunk;

      displayResponse = parseMarkdownText(fullResponse); // Or simply use `cleaned` directly
      outputDiv.innerHTML = `<div class="alert success">${displayResponse} ▌</div>`;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    // Final output (without ▌)
    outputDiv.innerHTML = `<div class="alert success">${displayResponse}</div>`;
  } catch (error) {
    resultDiv.innerHTML = `<div class="alert error">Error: ${error.message}</div>`;
    console.error("Fetch error:", error);
  }
}

// Add cancel functionality
function cancelRequest() {
  if (window.currentRequest) {
    window.currentRequest.abort();
    document.getElementById("question_result").innerHTML =
      '<div class="alert warning">Request cancelled</div>';
  }
}

async function processImages() {
  // Cancel any previous image request
  cancelImageRequest();

  const query = document.getElementById("image_query").value.trim();
  const fileInput = document.getElementById("image_upload");
  const resultsDiv = document.getElementById("image_analysis_results");
  const previewContainer = document.getElementById("image_preview_container");

  // Validation
  if (!query) {
    resultsDiv.innerHTML =
      '<div class="alert warning">Please enter your question.</div>';
    return;
  }

  if (!fileInput.files || fileInput.files.length === 0) {
    resultsDiv.innerHTML =
      '<div class="alert warning">Please select at least one image.</div>';
    return;
  }

  // Allowed image extensions
  const allowedExtensions = ["jpg", "jpeg", "png"];

  // Validate selected image file types
  for (let i = 0; i < fileInput.files.length; i++) {
    const file = fileInput.files[i];
    const extension = file.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      resultsDiv.innerHTML = `<br><div class="alert error">Unsupported file type: ${file.name}. Only .jpg, .jpeg, and .png files are allowed.</div>`;
      return;
    }
  }

  // Setup abort controller for cancellation
  if (window.currentImageRequest) {
    window.currentImageRequest.abort();
  }
  window.currentImageRequest = new AbortController();

  // Clear previous results
  resultsDiv.innerHTML = "";
  previewContainer.innerHTML = "";

  // Show loading state (same as submitQuestion)
  resultsDiv.innerHTML = '<div class="loader"></div>';

  try {
    resultsDiv.innerHTML = '<div class="loader"></div>';
    // Create FormData for multiple files
    const formData = new FormData();
    formData.append("query", query);

    // Add all selected files
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append("images", fileInput.files[i]);

      // Create image preview
      const file = fileInput.files[i];
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.maxWidth = "200px";
        img.style.maxHeight = "200px";
        img.style.margin = "5px";
        img.style.border = "1px solid #ddd";
        img.style.borderRadius = "4px";
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    }

    // Send request with streaming response
    const response = await fetch("/ask-image", {
      method: "POST",
      body: formData,
      signal: window.currentImageRequest.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Handle streaming response (similar to submitQuestion)
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullResponse = "";
    let displayResponse = "";

    // Initialize streaming output with cursor
    resultsDiv.innerHTML =
      '<div class="alert success" id="image-streaming-output">▌</div>';
    const outputDiv = document.getElementById("image-streaming-output");
    console.log("Starting to read image stream...");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;

      // Use the same parseMarkdownText function as submitQuestion
      displayResponse = parseMarkdownText(fullResponse);
      outputDiv.innerHTML = `<div class="alert success">${displayResponse} ▌</div>`;

      // Small delay for smooth streaming effect
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    // Final output (without cursor)
    outputDiv.innerHTML = `<div class="alert success">${displayResponse}</div>`;
  } catch (error) {
    if (error.name === "AbortError") {
      resultsDiv.innerHTML =
        '<div class="alert warning">Image processing cancelled</div>';
    } else {
      console.error("Error processing images:", error);
      resultsDiv.innerHTML = `<div class="alert error">Error: ${error.message}</div>`;
    }
  }
}

function cancelImageRequest() {
  if (window.currentImageRequest) {
    window.currentImageRequest.abort();
    document.getElementById("image_analysis_results").innerHTML =
      '<div class="alert warning">Image processing cancelled</div>';
  }
}

var gk_isXlsx = false;
var gk_xlsxFileLookup = {};
var gk_fileData = {};
function filledCell(cell) {
  return cell !== "" && cell != null;
}

function loadFileData(filename) {
  if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
    try {
      var workbook = XLSX.read(gk_fileData[filename], { type: "base64" });
      var firstSheetName = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[firstSheetName];

      // Convert sheet to JSON to filter blank rows
      var jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        blankrows: false,
        defval: "",
      });
      // Filter out blank rows (rows where all cells are empty, null, or undefined)
      var filteredData = jsonData.filter((row) => row.some(filledCell));

      // Heuristic to find the header row by ignoring rows with fewer filled cells than the next row
      var headerRowIndex = filteredData.findIndex(
        (row, index) =>
          row.filter(filledCell).length >=
          filteredData[index + 1]?.filter(filledCell).length
      );
      // Fallback
      if (headerRowIndex === -1 || headerRowIndex > 25) {
        headerRowIndex = 0;
      }

      // Convert filtered JSON back to CSV
      var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex)); // Create a new sheet from filtered array of arrays
      csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
      return csv;
    } catch (e) {
      console.error(e);
      return "";
    }
  }
  return gk_fileData[filename] || "";
}

// Initialize with default page
showPage("ask_question");
