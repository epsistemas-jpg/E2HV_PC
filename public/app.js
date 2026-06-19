const state = {
  equipos: [],
  mantenimientos: [],
  rotaciones: [],
  selectedEquipmentId: null,
  editing: {
    equipo: null,
    mantenimiento: null,
    rotacion: null
  },
  search: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const fields = {
  equipo: [
    ["codigo", "Codigo", "text"],
    ["nombre", "Nombre del equipo", "text"],
    ["categoria", "Categoria", "text"],
    ["criticidad", "Criticidad", "text"],
    ["estado", "Estado", "select", ["Activo", "En mantenimiento", "Inactivo", "Baja"]],
    ["marca", "Marca", "text"],
    ["modelo", "Modelo", "text"],
    ["serial", "Serial", "text"],
    ["procesador", "Procesador", "text"],
    ["disco", "Disco duro", "text"],
    ["memoria", "Memoria RAM", "text"],
    ["accesorios", "Accesorios", "text"],
    ["fechaAdquisicion", "Fecha de adquisicion", "date"],
    ["fechaPuestaMarcha", "Fecha puesta en marcha", "date"],
    ["proveedor", "Proveedor de compra", "text"],
    ["garantia", "Vigencia garantia", "text"],
    ["responsableGarantia", "Responsable garantia", "text"],
    ["telefonoGarantia", "Telefono garantia", "text"],
    ["ubicacion", "Ubicacion", "text"],
    ["responsableActual", "Responsable actual", "text"],
    ["cargoActual", "Cargo actual", "text"],
    ["foto", "Imagen del equipo", "text"],
    ["notas", "Notas", "textarea"]
  ],
  mantenimiento: [
    ["equipoId", "Equipo", "equipment"],
    ["fecha", "Fecha", "date"],
    ["orden", "Orden de compra o servicio", "text"],
    ["tipo", "Tipo", "select", ["MP", "MC", "Calibracion", "Verificacion", "Recarga", "PH"]],
    ["actividad", "Actividad", "text"],
    ["descripcion", "Descripcion realizada", "textarea"],
    ["observaciones", "Observaciones", "textarea"],
    ["responsable", "Responsable", "text"],
    ["certificadoCalibracion", "Certificado calibracion", "text"],
    ["certificadoPatron", "Certificado patron", "text"],
    ["repuesto", "Repuesto", "text"],
    ["costo", "Costo", "number"]
  ],
  rotacion: [
    ["equipoId", "Equipo", "equipment"],
    ["fechaAsignacion", "Fecha asignacion", "date"],
    ["personaAsignada", "Persona asignada", "text"],
    ["cargoAsignado", "Cargo", "text"],
    ["proyecto", "Proyecto", "text"],
    ["quienAsigna", "Quien asigna", "text"],
    ["cargoQuienAsigna", "Cargo quien asigna", "text"],
    ["fechaDevolucion", "Fecha devolucion", "date"],
    ["motivoDevolucion", "Motivo devolucion", "textarea"]
  ]
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    throw new Error("No se pudo completar la accion");
  }
  return response.json();
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 2400);
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function currency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function equipmentName(id) {
  const item = state.equipos.find((equipo) => equipo.id === id);
  return item ? `${item.codigo} - ${item.nombre}` : "Equipo no encontrado";
}

function filteredEquipos() {
  const term = state.search.toLowerCase();
  if (!term) return state.equipos;
  return state.equipos.filter((item) =>
    Object.values(item).join(" ").toLowerCase().includes(term)
  );
}

function renderForm(type, formSelector) {
  const form = $(formSelector);
  const current = state.editing[type] || {};
  const imageBlock = type === "equipo" ? `
    <div class="image-field">
      <div class="image-preview ${current.foto ? "has-image" : ""}" data-image-preview>
        ${current.foto ? `<img src="${current.foto}" alt="Foto del equipo">` : "<span>Foto del equipo</span>"}
      </div>
      <label class="file-control">
        Cargar imagen
        <input name="fotoArchivo" type="file" accept="image/*" data-photo-input>
      </label>
      <p>Puedes cargar una foto o pegar una URL en el campo de imagen.</p>
    </div>
  ` : "";

  form.innerHTML = imageBlock + fields[type].map(([name, label, inputType, options]) => {
    const value = current[name] || "";
    const wide = inputType === "textarea" || name === "foto" || name === "notas" || name === "descripcion" || name === "observaciones" || name === "motivoDevolucion";
    if (inputType === "select") {
      return `<label class="${wide ? "wide" : ""}">${label}<select name="${name}">${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select></label>`;
    }
    if (inputType === "equipment") {
      return `<label class="${wide ? "wide" : ""}">${label}<select name="${name}" required>${state.equipos.map((item) => `<option value="${item.id}" ${value === item.id ? "selected" : ""}>${item.codigo} - ${item.nombre}</option>`).join("")}</select></label>`;
    }
    if (inputType === "textarea") {
      return `<label class="wide">${label}<textarea name="${name}">${value}</textarea></label>`;
    }
    return `<label class="${wide ? "wide" : ""}">${label}<input name="${name}" type="${inputType}" value="${value}"></label>`;
  }).join("") + `
    <div class="form-actions">
      <button class="btn secondary" type="button" data-reset="${type}">Limpiar</button>
      <button class="btn primary" type="submit">Guardar</button>
    </div>
  `;
}

function formData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  delete data.fotoArchivo;
  return data;
}

function renderMetrics() {
  const active = state.equipos.filter((item) => item.estado === "Activo").length;
  const cost = state.mantenimientos.reduce((sum, item) => sum + Number(item.costo || 0), 0);
  $("#metrics").innerHTML = [
    ["Total equipos", state.equipos.length],
    ["Activos", active],
    ["Mantenimientos", state.mantenimientos.length],
    ["Rotaciones", state.rotaciones.length],
    ["Costo historico", currency(cost)]
  ].map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderDashboard() {
  $("#equipmentCards").innerHTML = filteredEquipos().map((item) => `
    <article class="equipment-card">
      <div class="equipment-thumb ${item.foto ? "has-image" : ""}">
        ${item.foto ? `<img src="${item.foto}" alt="Foto de ${item.nombre}">` : "<span>Sin foto</span>"}
      </div>
      <div>
        <strong>${item.codigo} · ${item.nombre}</strong>
        <div class="equipment-meta">${item.marca} ${item.modelo} · ${item.responsableActual || "Sin responsable"} · ${item.ubicacion || "Sin ubicacion"}</div>
      </div>
      <span class="status ${item.estado === "Activo" ? "" : "warning"}">${item.estado}</span>
    </article>
  `).join("") || empty("No hay equipos registrados.");

  $("#recentMaintenance").innerHTML = state.mantenimientos.slice(0, 6).map((item) => `
    <article class="activity-item">
      <strong>${formatDate(item.fecha)} · ${item.tipo}</strong>
      <span>${equipmentName(item.equipoId)}</span>
      <p>${item.descripcion || item.actividad || "Sin descripcion"}</p>
    </article>
  `).join("") || empty("No hay mantenimientos registrados.");
}

function renderTables() {
  $("#equipmentTable").innerHTML = filteredEquipos().map((item) => `
    <tr>
      <td><strong>${item.codigo}</strong></td>
      <td>${item.nombre}</td>
      <td>${item.marca} ${item.modelo}</td>
      <td>${item.responsableActual || "-"}</td>
      <td><span class="status ${item.estado === "Activo" ? "" : "warning"}">${item.estado}</span></td>
      <td>${actions("equipo", item.id)}</td>
    </tr>
  `).join("") || rowEmpty(6, "No hay equipos para mostrar.");

  $("#maintenanceTable").innerHTML = state.mantenimientos.map((item) => `
    <tr>
      <td>${formatDate(item.fecha)}</td>
      <td>${equipmentName(item.equipoId)}</td>
      <td>${item.tipo}</td>
      <td>${item.actividad}</td>
      <td>${item.responsable || "-"}</td>
      <td>${currency(item.costo)}</td>
      <td>${actions("mantenimiento", item.id)}</td>
    </tr>
  `).join("") || rowEmpty(7, "No hay mantenimientos registrados.");

  $("#rotationTable").innerHTML = state.rotaciones.map((item) => `
    <tr>
      <td>${formatDate(item.fechaAsignacion)}</td>
      <td>${equipmentName(item.equipoId)}</td>
      <td>${item.personaAsignada}</td>
      <td>${item.proyecto || "-"}</td>
      <td>${formatDate(item.fechaDevolucion)} ${item.motivoDevolucion ? `· ${item.motivoDevolucion}` : ""}</td>
      <td>${actions("rotacion", item.id)}</td>
    </tr>
  `).join("") || rowEmpty(6, "No hay rotaciones registradas.");
}

function actions(type, id) {
  return `<div class="row-actions">
    <button class="icon-btn" title="Editar" data-edit="${type}" data-id="${id}">Editar</button>
    <button class="icon-btn" title="Eliminar" data-delete="${type}" data-id="${id}">Borrar</button>
  </div>`;
}

function empty(message) {
  return `<div class="activity-item"><span>${message}</span></div>`;
}

function rowEmpty(columns, message) {
  return `<tr><td colspan="${columns}">${message}</td></tr>`;
}

function renderReportSelector() {
  const select = $("#reportEquipmentSelect");
  select.innerHTML = state.equipos.map((item) => `<option value="${item.id}">${item.codigo} - ${item.nombre}</option>`).join("");
  if (!state.selectedEquipmentId && state.equipos[0]) state.selectedEquipmentId = state.equipos[0].id;
  select.value = state.selectedEquipmentId || "";
}

function sheetRow(label, value) {
  return `<div class="sheet-row"><span>${label}</span><strong>${value || "-"}</strong></div>`;
}

function renderLifeSheet() {
  const equipo = state.equipos.find((item) => item.id === state.selectedEquipmentId) || state.equipos[0];
  if (!equipo) {
    $("#lifeSheet").innerHTML = empty("Registra un equipo para generar la hoja de vida.");
    return;
  }
  const mantenimientos = state.mantenimientos.filter((item) => item.equipoId === equipo.id);
  const rotaciones = state.rotaciones.filter((item) => item.equipoId === equipo.id);
  const equipmentPhoto = equipo.foto
    ? `<img src="${equipo.foto}" alt="Foto de ${equipo.nombre}">`
    : "<span>Espacio para imagen del equipo</span>";

  $("#lifeSheet").innerHTML = `
    <header class="sheet-head">
      <div class="sheet-logo"><strong>HVPC</strong><span>Gestion eficiente</span></div>
      <div class="sheet-title"><strong>HOJA DE VIDA DE EQUIPOS</strong></div>
      <div class="sheet-code">
        <div><span>Codigo:</span><strong>${equipo.codigo}</strong></div>
        <div><span>Version:</span><strong>01</strong></div>
        <div><span>Actualizado:</span><strong>${formatDate(new Date().toISOString().slice(0, 10))}</strong></div>
      </div>
    </header>
    <div class="sheet-section-title">1. DATOS DEL EQUIPO</div>
    <section class="sheet-equipment">
      <div class="sheet-grid">
        ${sheetRow("Nombre del equipo", equipo.nombre)}
        ${sheetRow("Codigo", equipo.codigo)}
        ${sheetRow("Fecha de adquisicion", formatDate(equipo.fechaAdquisicion))}
        ${sheetRow("Criticidad", equipo.criticidad)}
        ${sheetRow("Marca", equipo.marca)}
        ${sheetRow("Modelo", equipo.modelo)}
        ${sheetRow("Serial", equipo.serial)}
        ${sheetRow("Estado", equipo.estado)}
        ${sheetRow("Proveedor de compra", equipo.proveedor)}
        ${sheetRow("Garantia", equipo.garantia)}
        ${sheetRow("Responsable garantia", equipo.responsableGarantia)}
        ${sheetRow("Telefono garantia", equipo.telefonoGarantia)}
      </div>
      <div class="sheet-photo">${equipmentPhoto}</div>
    </section>
    <div class="sheet-section-title">2. CARACTERISTICAS TECNICAS</div>
    <section class="sheet-grid">
      ${sheetRow("Procesador", equipo.procesador)}
      ${sheetRow("Disco duro", equipo.disco)}
      ${sheetRow("Memoria RAM", equipo.memoria)}
      ${sheetRow("Accesorios", equipo.accesorios)}
      ${sheetRow("Ubicacion", equipo.ubicacion)}
      ${sheetRow("Responsable actual", equipo.responsableActual)}
    </section>
    <div class="sheet-section-title">3. ACTIVIDADES DE MANTENIMIENTO</div>
    <table class="sheet-table">
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Actividad</th><th>Descripcion</th><th>Responsable</th><th>Costo</th></tr></thead>
      <tbody>${mantenimientos.map((item) => `<tr><td>${formatDate(item.fecha)}</td><td>${item.tipo}</td><td>${item.actividad}</td><td>${item.descripcion}</td><td>${item.responsable}</td><td>${currency(item.costo)}</td></tr>`).join("") || rowEmpty(6, "Sin registros")}</tbody>
    </table>
    <div class="sheet-section-title">4. ROTACION DE EQUIPOS DE COMPUTO</div>
    <table class="sheet-table">
      <thead><tr><th>Fecha asignacion</th><th>Persona asignada</th><th>Cargo</th><th>Proyecto</th><th>Fecha devolucion</th><th>Motivo</th></tr></thead>
      <tbody>${rotaciones.map((item) => `<tr><td>${formatDate(item.fechaAsignacion)}</td><td>${item.personaAsignada}</td><td>${item.cargoAsignado}</td><td>${item.proyecto}</td><td>${formatDate(item.fechaDevolucion)}</td><td>${item.motivoDevolucion}</td></tr>`).join("") || rowEmpty(6, "Sin registros")}</tbody>
    </table>
  `;
}

function renderAll() {
  renderMetrics();
  renderDashboard();
  renderTables();
  renderReportSelector();
  renderLifeSheet();
  renderForm("equipo", "#equipmentForm");
  renderForm("mantenimiento", "#maintenanceForm");
  renderForm("rotacion", "#rotationForm");
  $("#equipmentFormTitle").textContent = state.editing.equipo ? "Editar equipo" : "Nuevo equipo";
  $("#maintenanceFormTitle").textContent = state.editing.mantenimiento ? "Editar mantenimiento" : "Nuevo mantenimiento";
  $("#rotationFormTitle").textContent = state.editing.rotacion ? "Editar rotacion" : "Nueva rotacion";
}

async function loadData() {
  const [equipos, mantenimientos, rotaciones] = await Promise.all([
    api("/api/equipos"),
    api("/api/mantenimientos"),
    api("/api/rotaciones")
  ]);
  state.equipos = equipos;
  state.mantenimientos = mantenimientos;
  state.rotaciones = rotaciones;
  if (!state.selectedEquipmentId && equipos[0]) state.selectedEquipmentId = equipos[0].id;
  renderAll();
}

async function save(type, resource, formSelector) {
  const data = formData($(formSelector));
  const current = state.editing[type];
  const path = current ? `/api/${resource}/${current.id}` : `/api/${resource}`;
  await api(path, {
    method: current ? "PUT" : "POST",
    body: JSON.stringify(data)
  });
  state.editing[type] = null;
  await loadData();
  toast("Registro guardado correctamente");
}

async function remove(type, resource, id) {
  const confirmed = confirm("Esta accion eliminara el registro seleccionado. Deseas continuar?");
  if (!confirmed) return;
  await api(`/api/${resource}/${id}`, { method: "DELETE" });
  state.editing[type] = null;
  await loadData();
  toast("Registro eliminado");
}

function setView(name) {
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${name}View`).classList.add("active");
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
}

function bindEvents() {
  $$(".nav-item").forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
  $$("[data-view-link]").forEach((item) => item.addEventListener("click", () => setView(item.dataset.viewLink)));
  $("#newEquipmentButton").addEventListener("click", () => {
    state.editing.equipo = null;
    setView("equipos");
    renderForm("equipo", "#equipmentForm");
  });
  $("#printButton").addEventListener("click", () => {
    setView("reporte");
    window.print();
  });
  $("#searchInput").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderDashboard();
    renderTables();
  });
  document.addEventListener("change", (event) => {
    const input = event.target.closest("[data-photo-input]");
    if (!input || !input.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      const form = input.closest("form");
      const photoInput = form.querySelector('input[name="foto"]');
      const preview = form.querySelector("[data-image-preview]");
      photoInput.value = reader.result;
      preview.classList.add("has-image");
      preview.innerHTML = `<img src="${reader.result}" alt="Foto del equipo">`;
    };
    reader.readAsDataURL(input.files[0]);
  });
  $("#reportEquipmentSelect").addEventListener("change", (event) => {
    state.selectedEquipmentId = event.target.value;
    renderLifeSheet();
  });
  $("#downloadReportButton").addEventListener("click", () => {
  // 1. Cambiamos visualmente a la pestaña del reporte
  setView("reporte");
  
  // 2. Esperamos 100 milisegundos a que el navegador dibuje la hoja de vida
  setTimeout(() => {
    // 3. Abrimos la ventana del sistema para Guardar como PDF o Imprimir
    window.print();
  }, 100);

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-${equipo?.codigo || "equipo"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  $("#equipmentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    save("equipo", "equipos", "#equipmentForm");
  });
  $("#maintenanceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    save("mantenimiento", "mantenimientos", "#maintenanceForm");
  });
  $("#rotationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    save("rotacion", "rotaciones", "#rotationForm");
  });

  document.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit]");
    const del = event.target.closest("[data-delete]");
    const reset = event.target.closest("[data-reset]");
    if (edit) {
      const type = edit.dataset.edit;
      const id = edit.dataset.id;
      const map = { equipo: state.equipos, mantenimiento: state.mantenimientos, rotacion: state.rotaciones };
      state.editing[type] = map[type].find((item) => item.id === id);
      renderAll();
    }
    if (del) {
      const type = del.dataset.delete;
      const resource = { equipo: "equipos", mantenimiento: "mantenimientos", rotacion: "rotaciones" }[type];
      remove(type, resource, del.dataset.id);
    }
    if (reset) {
      state.editing[reset.dataset.reset] = null;
      renderAll();
    }
  });
}

bindEvents();
loadData().catch((error) => toast(error.message));
