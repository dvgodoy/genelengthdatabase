const rowsPerPage = 50;
let allData = [];
let filteredData = [];
let currentChromosome = "";
let currentPage = 1;
let currentSort = { col: null, dir: 1 };

const geneTableBody = document.querySelector("#geneTable tbody");
const chromosomeFilter = document.getElementById("chromosomeFilter");
const searchInput = document.getElementById("searchInput");
const downloadBtn = document.getElementById("downloadBtn");
const paginationDiv = document.getElementById("pagination");
const tableHeaders = document.querySelectorAll("#geneTable th");

const ZIP_FILE = "database/gene_length_database.zip";
const CSV_FILE_NAME = "genes.csv"; // Inside the ZIP

fetch(ZIP_FILE)
  .then(res => res.arrayBuffer())
  .then(JSZip.loadAsync)
  .then(zip => zip.file(CSV_FILE_NAME).async("string"))
  .then((csv) => {
    const lines = csv.trim().split("\n");
    const rows = lines.slice(3); // skip header
    allData = rows.map(r => {
      const [sq, chromosome, geneID, geneName, geneType, st, t, ml, mean, med, max] = r.split(",");
      return {
        seq: +sq,
        chromosome,
        geneID,
        geneName,
        geneType,
        start: +st,
        transcripts: +t,
        mergedLength: +ml,
        meanLength: +mean,
        medianLength: +med,
        maxLength: +max
      };
    });
    populateChromosomeFilter();
  });

function populateChromosomeFilter() {
  const chromosomes = Array.from(
    new Set(allData.map(d => d.chromosome)).add("All")
  ).sort((a, b) => {
    if (!isNaN(a) && !isNaN(b)) return +a - +b;
    if (a === "X") return 1e6;
    if (b === "X") return -1e6;
    if (a === "Y") return 1e7;
    if (b === "Y") return -1e7;
    if (a.toUpperCase().startsWith("M")) return 1e8;
    if (b.toUpperCase().startsWith("M")) return -1e8;
    if (a === "All") return 1e9;
    return a.localeCompare(b);
  });

  chromosomes.forEach(chr => {
    const opt = document.createElement("option");
    opt.value = chr;
    opt.textContent = chr;
    chromosomeFilter.appendChild(opt);
  });

  chromosomeFilter.value = 'chr1';
  currentChromosome = 'chr1'
  filterAndRender();
}

function renderTable() {
  const start = (currentPage - 1) * rowsPerPage;
  const pageData = filteredData.slice(start, start + rowsPerPage);

  geneTableBody.innerHTML = "";
  for (const row of pageData) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.seq}</td>
      <td>${row.chromosome}</td>
      <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=${row.geneID}" target="_blank">${row.geneID}</a></td>
      <td>${row.geneName}</td>
      <td>${row.geneType}</td>
      <td>${row.start}</td>
      <td>${row.transcripts}</td>
      <td>${row.mergedLength}</td>
      <td>${row.meanLength}</td>
      <td>${row.medianLength}</td>
      <td>${row.maxLength}</td>
    `;
    geneTableBody.appendChild(tr);
  }

  renderPagination(currentPage, (page) => {
    currentPage = page;
    renderTable();
  });
}

function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
}

function renderPagination(currentPage, onClick) {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  paginationDiv.innerHTML = "";

  function createBtn(label, page, disabled = false) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener("click", () => onClick(page));
    paginationDiv.appendChild(btn);
  }

  function addPage(page) {
    const btn = document.createElement("button");
    btn.textContent = page;
    btn.className = page === currentPage ? "active" : "";
    btn.addEventListener("click", () => onClick(page));
    paginationDiv.appendChild(btn);
  }

  function addEllipsis() {
    const span = document.createElement("span");
    span.textContent = "…";
    span.className = "ellipsis";
    paginationDiv.appendChild(span);
  }

  // Navigation buttons
  createBtn("« First", 1, currentPage === 1);
  createBtn("‹ Prev", currentPage - 1, currentPage === 1);

  const pages = [];

  // Always show first page
  pages.push(1);

  // Left ellipsis
  if (currentPage > 5) pages.push("...");

  // Middle range
  for (let i = currentPage - 2; i <= currentPage + 2; i++) {
    if (i > 1 && i < totalPages) pages.push(i);
  }

  // Right ellipsis
  if (currentPage < totalPages - 4) pages.push("...");

  // Always show last page
  if (totalPages > 1) pages.push(totalPages);

  // Render
  pages.forEach(p => {
    if (p === "...") {
      addEllipsis();
    } else {
      addPage(p);
    }
  });

  // Navigation buttons
  createBtn("Next ›", currentPage + 1, currentPage === totalPages);
  createBtn("Last »", totalPages, currentPage === totalPages);

  // Keyboard nav
  document.onkeydown = function (e) {
    if (e.key === "ArrowLeft" && currentPage > 1) onClick(currentPage - 1);
    if (e.key === "ArrowRight" && currentPage < totalPages) onClick(currentPage + 1);
  };  
}

function filterAndRender() {
  const search = searchInput.value.toLowerCase();

  filteredData = allData.filter(row => {
    const matchesChromosome = (currentChromosome === "All") || (row.chromosome === currentChromosome);
    const matchesSearch =
      !search ||
      row.geneID.toLowerCase().includes(search) ||
      row.geneName.toLowerCase().includes(search) ||
      row.geneType.toLowerCase().includes(search);
    return matchesChromosome && matchesSearch;
  });

  sortData();
  currentPage = 1;
  renderTable();
}

function sortData() {
  if (!currentSort.col) return;
  const col = currentSort.col;
  const dir = currentSort.dir;

  filteredData.sort((a, b) => {
    if (typeof a[col] === "number") return (a[col] - b[col]) * dir;
    return a[col].localeCompare(b[col]) * dir;
  });
}

chromosomeFilter.addEventListener("change", () => {
  currentChromosome = chromosomeFilter.value;
  filterAndRender();
});

searchInput.addEventListener("input", filterAndRender);

downloadBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = "https://raw.githubusercontent.com/dvgodoy/genelengthdatabase/refs/heads/main/database/gene_length_database.zip";
  a.download = "gene_length_database.zip";
  a.click();
});

tableHeaders.forEach(th => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    if (currentSort.col === col) {
      currentSort.dir *= -1;
    } else {
      currentSort.col = col;
      currentSort.dir = 1;
    }
    tableHeaders.forEach(h => h.classList.remove("sort-asc", "sort-desc"));
    th.classList.add(currentSort.dir === 1 ? "sort-asc" : "sort-desc");
    sortData();
    renderTable();
  });
});
