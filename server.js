const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

async function ensureDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const seed = {
      equipos: [
        {
          id: crypto.randomUUID(),
          codigo: "E2PC0004",
          nombre: "Equipo administrativo oficina e2",
          categoria: "Equipo de Computo",
          criticidad: "2",
          estado: "Activo",
          marca: "HP",
          modelo: "7483AM7",
          serial: "MJ62953",
          procesador: "Core 2 Quad 2.6 GHz",
          disco: "250 GB",
          memoria: "3.2 GB",
          accesorios: "Cargador",
          fechaAdquisicion: "2009-07-15",
          fechaPuestaMarcha: "2009-07-15",
          proveedor: "NA",
          garantia: "3 Anos",
          responsableGarantia: "LENOVO",
          telefonoGarantia: "018009123021",
          ubicacion: "e2 Oficina",
          responsableActual: "Brayan Torres",
          cargoActual: "Auxiliar Administrativo y de Sistemas",
          foto: "",
          notas: "Equipo de diagnostico y medicion usado como referencia historica."
        }
      ],
      mantenimientos: [
        {
          id: crypto.randomUUID(),
          equipoId: null,
          fecha: "2023-07-07",
          orden: "-",
          tipo: "MP",
          actividad: "Preventivo",
          descripcion: "Escaneo de antivirus, eliminacion de archivos temporales y liberacion de espacio.",
          observaciones: "Equipo queda operativo.",
          responsable: "Brayan Torres",
          certificadoCalibracion: "",
          certificadoPatron: "",
          repuesto: "-",
          costo: 0
        }
      ],
      rotaciones: [
        {
          id: crypto.randomUUID(),
          equipoId: null,
          fechaAsignacion: "2022-09-29",
          personaAsignada: "Jorge Lambano",
          cargoAsignado: "Ing. Auxiliar I",
          proyecto: "e2 Oficina",
          quienAsigna: "Brayan Torres",
          cargoQuienAsigna: "Auxiliar Administrativo y de Sistemas",
          fechaDevolucion: "2022-09-29",
          motivoDevolucion: "Devolucion"
        }
      ]
    };
    seed.mantenimientos[0].equipoId = seed.equipos[0].id;
    seed.rotaciones[0].equipoId = seed.equipos[0].id;
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDatabase();
  return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
}

async function writeDb(db) {
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

function send(res, status, data, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(contentType.includes("application/json") ? JSON.stringify(data) : data);
}

function notFound(res) {
  send(res, 404, { error: "Recurso no encontrado" });
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function normalizeEquipment(input) {
  return {
    codigo: String(input.codigo || "").trim(),
    nombre: String(input.nombre || "").trim(),
    categoria: String(input.categoria || "Equipo de Computo").trim(),
    criticidad: String(input.criticidad || "").trim(),
    estado: String(input.estado || "Activo").trim(),
    marca: String(input.marca || "").trim(),
    modelo: String(input.modelo || "").trim(),
    serial: String(input.serial || "").trim(),
    procesador: String(input.procesador || "").trim(),
    disco: String(input.disco || "").trim(),
    memoria: String(input.memoria || "").trim(),
    accesorios: String(input.accesorios || "").trim(),
    fechaAdquisicion: String(input.fechaAdquisicion || "").trim(),
    fechaPuestaMarcha: String(input.fechaPuestaMarcha || "").trim(),
    proveedor: String(input.proveedor || "").trim(),
    garantia: String(input.garantia || "").trim(),
    responsableGarantia: String(input.responsableGarantia || "").trim(),
    telefonoGarantia: String(input.telefonoGarantia || "").trim(),
    ubicacion: String(input.ubicacion || "").trim(),
    responsableActual: String(input.responsableActual || "").trim(),
    cargoActual: String(input.cargoActual || "").trim(),
    foto: String(input.foto || "").trim(),
    notas: String(input.notas || "").trim()
  };
}

function normalizeMaintenance(input) {
  return {
    equipoId: String(input.equipoId || "").trim(),
    fecha: String(input.fecha || "").trim(),
    orden: String(input.orden || "").trim(),
    tipo: String(input.tipo || "MP").trim(),
    actividad: String(input.actividad || "Preventivo").trim(),
    descripcion: String(input.descripcion || "").trim(),
    observaciones: String(input.observaciones || "").trim(),
    responsable: String(input.responsable || "").trim(),
    certificadoCalibracion: String(input.certificadoCalibracion || "").trim(),
    certificadoPatron: String(input.certificadoPatron || "").trim(),
    repuesto: String(input.repuesto || "").trim(),
    costo: Number(input.costo || 0)
  };
}

function normalizeRotation(input) {
  return {
    equipoId: String(input.equipoId || "").trim(),
    fechaAsignacion: String(input.fechaAsignacion || "").trim(),
    personaAsignada: String(input.personaAsignada || "").trim(),
    cargoAsignado: String(input.cargoAsignado || "").trim(),
    proyecto: String(input.proyecto || "").trim(),
    quienAsigna: String(input.quienAsigna || "").trim(),
    cargoQuienAsigna: String(input.cargoQuienAsigna || "").trim(),
    fechaDevolucion: String(input.fechaDevolucion || "").trim(),
    motivoDevolucion: String(input.motivoDevolucion || "").trim()
  };
}

async function handleApi(req, res, pathname) {
  const db = await readDb();
  const parts = pathname.split("/").filter(Boolean);
  const resource = parts[1];
  const id = parts[2];
  const collections = {
    equipos: normalizeEquipment,
    mantenimientos: normalizeMaintenance,
    rotaciones: normalizeRotation
  };

  if (pathname === "/api/dashboard") {
    const active = db.equipos.filter((item) => item.estado.toLowerCase() === "activo").length;
    const maintenanceCost = db.mantenimientos.reduce((sum, item) => sum + Number(item.costo || 0), 0);
    send(res, 200, {
      totalEquipos: db.equipos.length,
      equiposActivos: active,
      mantenimientos: db.mantenimientos.length,
      rotaciones: db.rotaciones.length,
      costoMantenimiento: maintenanceCost
    });
    return;
  }

  if (!collections[resource]) {
    notFound(res);
    return;
  }

  if (req.method === "GET") {
    if (id) {
      const item = db[resource].find((entry) => entry.id === id);
      item ? send(res, 200, item) : notFound(res);
      return;
    }
    send(res, 200, db[resource]);
    return;
  }

  if (req.method === "POST") {
    const body = await parseBody(req);
    const item = { id: crypto.randomUUID(), ...collections[resource](body), creadoEn: new Date().toISOString() };
    db[resource].unshift(item);
    await writeDb(db);
    send(res, 201, item);
    return;
  }

  if (req.method === "PUT" && id) {
    const index = db[resource].findIndex((entry) => entry.id === id);
    if (index === -1) {
      notFound(res);
      return;
    }
    const body = await parseBody(req);
    db[resource][index] = {
      ...db[resource][index],
      ...collections[resource](body),
      actualizadoEn: new Date().toISOString()
    };
    await writeDb(db);
    send(res, 200, db[resource][index]);
    return;
  }

  if (req.method === "DELETE" && id) {
    const before = db[resource].length;
    db[resource] = db[resource].filter((entry) => entry.id !== id);
    if (resource === "equipos") {
      db.mantenimientos = db.mantenimientos.filter((entry) => entry.equipoId !== id);
      db.rotaciones = db.rotaciones.filter((entry) => entry.equipoId !== id);
    }
    await writeDb(db);
    send(res, before === db[resource].length ? 404 : 200, { ok: before !== db[resource].length });
    return;
  }

  send(res, 405, { error: "Metodo no permitido" });
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(file);
  } catch {
    notFound(res);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }
    await serveStatic(req, res, pathname);
  } catch (error) {
    send(res, 500, { error: "Error interno", detail: error.message });
  }
});

ensureDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`HVPC listo en http://localhost:${PORT}`);
  });
});
