const http = require("http");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");

const mysql = require("mysql2/promise");

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const USE_MYSQL = (process.env.DB_DRIVER || "mysql").toLowerCase() === "mysql";

const mysqlConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tiproyect_invpc",
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
  namedPlaceholders: true
};

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

let pool = null;
let storageMode = "json";

const resourceConfig = {
  equipos: {
    table: "equipos",
    normalize: normalizeEquipment,
    columns: [
      "codigo",
      "nombre",
      "categoria",
      "criticidad",
      "estado",
      "marca",
      "modelo",
      "serial",
      "procesador",
      "disco",
      "memoria",
      "accesorios",
      "fechaAdquisicion",
      "fechaPuestaMarcha",
      "proveedor",
      "garantia",
      "responsableGarantia",
      "telefonoGarantia",
      "ubicacion",
      "responsableActual",
      "cargoActual",
      "foto",
      "notas"
    ],
    dbColumns: {
      fechaAdquisicion: "fecha_adquisicion",
      fechaPuestaMarcha: "fecha_puesta_marcha",
      responsableGarantia: "responsable_garantia",
      telefonoGarantia: "telefono_garantia",
      responsableActual: "responsable_actual",
      cargoActual: "cargo_actual"
    }
  },
  mantenimientos: {
    table: "mantenimientos",
    normalize: normalizeMaintenance,
    columns: [
      "equipoId",
      "fecha",
      "orden",
      "tipo",
      "actividad",
      "descripcion",
      "observaciones",
      "responsable",
      "certificadoCalibracion",
      "certificadoPatron",
      "repuesto",
      "costo"
    ],
    dbColumns: {
      equipoId: "equipo_id",
      certificadoCalibracion: "certificado_calibracion",
      certificadoPatron: "certificado_patron"
    }
  },
  rotaciones: {
    table: "rotaciones",
    normalize: normalizeRotation,
    columns: [
      "equipoId",
      "fechaAsignacion",
      "personaAsignada",
      "cargoAsignado",
      "proyecto",
      "quienAsigna",
      "cargoQuienAsigna",
      "fechaDevolucion",
      "motivoDevolucion"
    ],
    dbColumns: {
      equipoId: "equipo_id",
      fechaAsignacion: "fecha_asignacion",
      personaAsignada: "persona_asignada",
      cargoAsignado: "cargo_asignado",
      quienAsigna: "quien_asigna",
      cargoQuienAsigna: "cargo_quien_asigna",
      fechaDevolucion: "fecha_devolucion",
      motivoDevolucion: "motivo_devolucion"
    }
  }
};

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fsSync.existsSync(envPath)) return;
  const lines = fsSync.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}

function uuid() {
  return crypto.randomUUID();
}

function sqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toDbColumn(config, field) {
  return config.dbColumns[field] || field;
}

function toSqlValue(value) {
  return value === "" ? null : value;
}

function rowToEquipment(row) {
  return {
    id: row.id,
    codigo: row.codigo || "",
    nombre: row.nombre || "",
    categoria: row.categoria || "",
    criticidad: row.criticidad || "",
    estado: row.estado || "",
    marca: row.marca || "",
    modelo: row.modelo || "",
    serial: row.serial || "",
    procesador: row.procesador || "",
    disco: row.disco || "",
    memoria: row.memoria || "",
    accesorios: row.accesorios || "",
    fechaAdquisicion: sqlDate(row.fecha_adquisicion),
    fechaPuestaMarcha: sqlDate(row.fecha_puesta_marcha),
    proveedor: row.proveedor || "",
    garantia: row.garantia || "",
    responsableGarantia: row.responsable_garantia || "",
    telefonoGarantia: row.telefono_garantia || "",
    ubicacion: row.ubicacion || "",
    responsableActual: row.responsable_actual || "",
    cargoActual: row.cargo_actual || "",
    foto: row.foto || "",
    notas: row.notas || ""
  };
}

function rowToMaintenance(row) {
  return {
    id: row.id,
    equipoId: row.equipo_id || "",
    fecha: sqlDate(row.fecha),
    orden: row.orden || "",
    tipo: row.tipo || "",
    actividad: row.actividad || "",
    descripcion: row.descripcion || "",
    observaciones: row.observaciones || "",
    responsable: row.responsable || "",
    certificadoCalibracion: row.certificado_calibracion || "",
    certificadoPatron: row.certificado_patron || "",
    repuesto: row.repuesto || "",
    costo: Number(row.costo || 0)
  };
}

function rowToRotation(row) {
  return {
    id: row.id,
    equipoId: row.equipo_id || "",
    fechaAsignacion: sqlDate(row.fecha_asignacion),
    personaAsignada: row.persona_asignada || "",
    cargoAsignado: row.cargo_asignado || "",
    proyecto: row.proyecto || "",
    quienAsigna: row.quien_asigna || "",
    cargoQuienAsigna: row.cargo_quien_asigna || "",
    fechaDevolucion: sqlDate(row.fecha_devolucion),
    motivoDevolucion: row.motivo_devolucion || ""
  };
}

const rowMappers = {
  equipos: rowToEquipment,
  mantenimientos: rowToMaintenance,
  rotaciones: rowToRotation
};

async function ensureJsonDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(seedData(), null, 2), "utf8");
  }
}

async function readJsonDb() {
  await ensureJsonDatabase();
  return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
}

async function writeJsonDb(db) {
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

function seedData() {
  const equipoId = uuid();
  return {
    equipos: [
      {
        id: equipoId,
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
        id: uuid(),
        equipoId,
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
        id: uuid(),
        equipoId,
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
}

async function initMySql() {
  const schema = await fs.readFile(path.join(ROOT, "database", "schema.sql"), "utf8");
  const admin = await mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    multipleStatements: true
  });
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();

  pool = mysql.createPool(mysqlConfig);
  await pool.query(schema);

  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM equipos");
  if (total === 0) {
    await seedMySql();
  }
  storageMode = "mysql";
}

async function seedMySql() {
  const seed = seedData();
  for (const equipo of seed.equipos) await createMySql("equipos", equipo);
  for (const mantenimiento of seed.mantenimientos) await createMySql("mantenimientos", mantenimiento);
  for (const rotacion of seed.rotaciones) await createMySql("rotaciones", rotacion);
}

async function initializeStorage() {
  if (USE_MYSQL) {
    try {
      await initMySql();
      console.log(`Base de datos MySQL conectada: ${mysqlConfig.database}`);
      return;
    } catch (error) {
      console.warn(`No se pudo conectar a MySQL (${error.message}). Usando JSON local.`);
    }
  }
  await ensureJsonDatabase();
  storageMode = "json";
}

async function readAll(resource) {
  if (storageMode === "mysql") return readAllMySql(resource);
  const db = await readJsonDb();
  return db[resource] || [];
}

async function readOne(resource, id) {
  if (storageMode === "mysql") return readOneMySql(resource, id);
  const db = await readJsonDb();
  return (db[resource] || []).find((entry) => entry.id === id) || null;
}

async function createItem(resource, input) {
  const config = resourceConfig[resource];
  const item = { id: uuid(), ...config.normalize(input), creadoEn: new Date().toISOString() };
  if (storageMode === "mysql") return createMySql(resource, item);
  const db = await readJsonDb();
  db[resource].unshift(item);
  await writeJsonDb(db);
  return item;
}

async function updateItem(resource, id, input) {
  const config = resourceConfig[resource];
  const values = config.normalize(input);
  if (storageMode === "mysql") return updateMySql(resource, id, values);

  const db = await readJsonDb();
  const index = db[resource].findIndex((entry) => entry.id === id);
  if (index === -1) return null;
  db[resource][index] = { ...db[resource][index], ...values, actualizadoEn: new Date().toISOString() };
  await writeJsonDb(db);
  return db[resource][index];
}

async function deleteItem(resource, id) {
  if (storageMode === "mysql") return deleteMySql(resource, id);

  const db = await readJsonDb();
  const before = db[resource].length;
  db[resource] = db[resource].filter((entry) => entry.id !== id);
  if (resource === "equipos") {
    db.mantenimientos = db.mantenimientos.filter((entry) => entry.equipoId !== id);
    db.rotaciones = db.rotaciones.filter((entry) => entry.equipoId !== id);
  }
  await writeJsonDb(db);
  return before !== db[resource].length;
}

async function dashboardData() {
  const [equipos, mantenimientos, rotaciones] = await Promise.all([
    readAll("equipos"),
    readAll("mantenimientos"),
    readAll("rotaciones")
  ]);
  return {
    totalEquipos: equipos.length,
    equiposActivos: equipos.filter((item) => item.estado.toLowerCase() === "activo").length,
    mantenimientos: mantenimientos.length,
    rotaciones: rotaciones.length,
    costoMantenimiento: mantenimientos.reduce((sum, item) => sum + Number(item.costo || 0), 0),
    almacenamiento: storageMode
  };
}

async function readAllMySql(resource) {
  const config = resourceConfig[resource];
  const orderBy = {
    equipos: "creado_en DESC",
    mantenimientos: "fecha DESC, creado_en DESC",
    rotaciones: "fecha_asignacion DESC, creado_en DESC"
  };
  const order = orderBy[resource];
  const [rows] = await pool.query(`SELECT * FROM ${config.table} ORDER BY ${order}`);
  return rows.map(rowMappers[resource]);
}

async function readOneMySql(resource, id) {
  const config = resourceConfig[resource];
  const [rows] = await pool.query(`SELECT * FROM ${config.table} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? rowMappers[resource](rows[0]) : null;
}

async function createMySql(resource, item) {
  const config = resourceConfig[resource];
  const columns = ["id", ...config.columns].map((field) => toDbColumn(config, field));
  const values = ["id", ...config.columns].map((field) => toSqlValue(item[field]));
  const placeholders = columns.map(() => "?").join(", ");
  await pool.query(`INSERT INTO ${config.table} (${columns.join(", ")}) VALUES (${placeholders})`, values);
  return readOneMySql(resource, item.id);
}

async function updateMySql(resource, id, item) {
  const config = resourceConfig[resource];
  const assignments = config.columns.map((field) => `${toDbColumn(config, field)} = ?`).join(", ");
  const values = config.columns.map((field) => toSqlValue(item[field]));
  const [result] = await pool.query(
    `UPDATE ${config.table} SET ${assignments}, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, id]
  );
  return result.affectedRows ? readOneMySql(resource, id) : null;
}

async function deleteMySql(resource, id) {
  const config = resourceConfig[resource];
  const [result] = await pool.query(`DELETE FROM ${config.table} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
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
  const parts = pathname.split("/").filter(Boolean);
  const resource = parts[1];
  const id = parts[2];

  if (pathname === "/api/dashboard") {
    send(res, 200, await dashboardData());
    return;
  }

  if (pathname === "/api/status") {
    send(res, 200, {
      almacenamiento: storageMode,
      baseDatos: storageMode === "mysql" ? mysqlConfig.database : "data/db.json"
    });
    return;
  }

  if (!resourceConfig[resource]) {
    notFound(res);
    return;
  }

  if (req.method === "GET") {
    const data = id ? await readOne(resource, id) : await readAll(resource);
    data ? send(res, 200, data) : notFound(res);
    return;
  }

  if (req.method === "POST") {
    const body = await parseBody(req);
    send(res, 201, await createItem(resource, body));
    return;
  }

  if (req.method === "PUT" && id) {
    const body = await parseBody(req);
    const item = await updateItem(resource, id, body);
    item ? send(res, 200, item) : notFound(res);
    return;
  }

  if (req.method === "DELETE" && id) {
    const deleted = await deleteItem(resource, id);
    send(res, deleted ? 200 : 404, { ok: deleted });
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

initializeStorage().then(() => {
  server.listen(PORT, () => {
    console.log(`HVPC listo en http://localhost:${PORT}`);
    console.log(`Almacenamiento activo: ${storageMode}`);
  });
});
