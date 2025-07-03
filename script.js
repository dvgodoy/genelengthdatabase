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

const URL_FILE = "https://github.com/dvgodoy/genelengthdatabase/raw/refs/heads/main/database/genes.csv";
const CSV_FILE_NAME = "genes.csv"; // Inside the ZIP

fetch(URL_FILE)
  .then((res) => res.text())
  .then((csv) => {
    const lines = csv.trim().split("\n");
    const rows = lines.slice(3); // skip header
    allData = rows.map(r => {
      const [seq, chromosome, geneID, geneName, t, ml, mean, med, max] = r.split(",");
      return {
        seq,
        chromosome,
        geneID,
        geneName,
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
    new Set(allData.map(d => d.chromosome))
  ).sort((a, b) => {
    if (!isNaN(a) && !isNaN(b)) return +a - +b;
    if (a === "X") return 1e6;
    if (b === "X") return -1e6;
    if (a === "Y") return 1e7;
    if (b === "Y") return -1e7;
    if (a.toUpperCase().startsWith("M")) return 1e8;
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
      <td>${row.transcripts}</td>
      <td>${row.mergedLength}</td>
      <td>${row.meanLength}</td>
      <td>${row.medianLength}</td>
      <td>${row.maxLength}</td>
    `;
    geneTableBody.appendChild(tr);
  }

  renderPagination();
}

function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
}

function renderPagination() {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  paginationDiv.innerHTML = "";

  size = totalPages.toString().length;
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = pad(i, size);
    if (i === currentPage) {
      btn.style.fontWeight = "bold";
    }
    btn.addEventListener("click", () => {
      currentPage = i;
      renderTable();
    });
    paginationDiv.appendChild(btn);
  }
}

function filterAndRender() {
  const search = searchInput.value.toLowerCase();

  filteredData = allData.filter(row => {
    const matchesChromosome = row.chromosome === currentChromosome;
    const matchesSearch =
      !search ||
      row.geneID.toLowerCase().includes(search) ||
      row.geneName.toLowerCase().includes(search);
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
  a.href = "https://github.com/dvgodoy/genelengthdatabase/raw/refs/heads/main/database/gene_length_database.zip";
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
