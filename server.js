const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");
const multer = require("multer");

// ==============================
// CONEXIÓN MYSQL
// ==============================

const pool = mysql.createPool({
    host: "localhost",
    port: 3307,
    user: "root",
    password: "12345",
    database: "tiproyect_invpc",
    waitForConnections: true,
    connectionLimit: 10
});

// ==============================
// CONFIGURACIÓN DEL SERVIDOR
// ==============================

const PORT = 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, UPLOADS_DIR);

    },

    filename: function (req, file, cb) {

        const extension = path.extname(file.originalname);

        const nombreTemporal = Date.now() + extension;

        cb(null, nombreTemporal);

    }

});


const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        const permitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (permitidos.includes(file.mimetype)) {

            cb(null, true);

        } else {

            cb(new Error(
                "Solo se permiten imágenes JPG, PNG o WEBP"
            ));

        }

    }

});


function computerToJson(row) {

    return {

        id: String(row.idComputer),

        codigo: row.Ccodigo || "",

        nombre: `${row.marca || ""} ${row.modelo || ""}`.trim(),

        categoria: row.Cgrupo || "",
        criticidad: "",
        estado: row.estado || "",

        marca: row.marca || "",
        modelo: row.modelo || "",
        serial: row.serial || "",

        procesador: row.procesador || "",
        disco: row.DiscoDuro || "",
        memoria: row.ram || "",

        accesorios: "",

        fechaAdquisicion: formatDate(row.fechaDeCompra),
        fechaPuestaMarcha: "",

        proveedor: row.proveedor || "",
        garantia: row.garantia || "",

        responsableGarantia: "",
        telefonoGarantia: row.telGarantia || "",

        responsableActual: row.Usuario || "",
        cargoActual: "",

        foto: "",

        ubicacion: row.ubicacion || "",

        notas: ""

    };

}
// ==============================
// report_pc => mantenimientos
// ==============================

function maintenanceToJson(row) {

    return {

        id: String(row.idReportPc),

        equipoId: String(row.idPc),
        serial: row.serial || "",

        fecha: formatDate(row.fecha),

        orden: row.workOrder || "",

        tipo: row.typeOfMaintenance || "",

        actividad: row.workPerformed || "",

        descripcion: row.observations || "",

        observaciones: "",

        responsable: row.responsable || "",

        certificadoCalibracion: "",

        certificadoPatron: "",

        repuesto: row.replacement || "",

        costo: Number(row.cost || 0)
    };
}


// ==============================
// historial_pc => rotaciones
// ==============================

function rotationToJson(row) {

    return {

        id: String(row.id),

        equipoId: String(row.idPc),
        serial: row.serial || "",

        fechaAsignacion: formatDate(row.fecha),

        personaAsignada: row.nNuevo || "",

        cargoAsignado: row.cargo || "",

        proyecto: row.proyecto || "",

        quienAsigna: row.asignador || "",

        cargoQuienAsigna: row.cargoasignador || "",

        fechaDevolucion: formatDate(row.fechadevolucion),

        motivoDevolucion: row.razon || ""
    };
}


// ==============================
// FORMATEO FECHA
// ==============================

function formatDate(value) {

    if (!value)
        return "";

    const date = new Date(value);

    if (isNaN(date))
        return "";

    return date.toISOString()
        .split("T")[0];
}


// ==============================
// RESPUESTAS HTTP
// ==============================

function send(res, status, data) {

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(data));
}


function notFound(res) {

    send(res, 404, {
        error: "Recurso no encontrado"
    });
}


// ==============================
// LEER DATOS DEL BODY
// ==============================

async function readBody(req) {

    const chunks = [];

    for await (const chunk of req) {

        chunks.push(chunk);

    }

    if (!chunks.length)
        return {};

    return JSON.parse(
        Buffer
            .concat(chunks)
            .toString()
    );
}


// =================================
// CRUD EQUIPOS (cv_computers)
// =================================

async function getEquipos() {

    const [rows] = await pool.query(
        "SELECT * FROM cv_computers ORDER BY idComputer DESC"
    );

    return rows.map(computerToJson);
}

async function createEquipo(data) {

    const sql = `
    INSERT INTO cv_computers
    (
        marca,
        ubicacion,
        modelo,
        serial,
        fechaDeCompra,
        ram,
        DiscoDuro,
        procesador,
        estado,
        Usuario,
        Cgrupo,
        proveedor,
        garantia,
        telGarantia,
        img
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        data.marca,
        data.ubicacion,
        data.modelo,
        data.serial,
        data.fechaAdquisicion,
        data.memoria,
        data.disco,
        data.procesador,
        data.estado,
        data.responsableActual,
        data.categoria,
        data.proveedor,
        data.garantia,
        data.telefonoGarantia,
        data.foto
    ];

    const [result] = await pool.query(
        sql,
        values
    );

    const [row] = await pool.query(
        "SELECT * FROM cv_computers WHERE idComputer=?",
        [result.insertId]
    );

    return computerToJson(row[0]);

}

async function updateEquipo(id, data) {
    console.log("ID:", id);
    console.log("DATA:", data);

    const sql = `
    UPDATE cv_computers SET
        Ccodigo=?,
        marca=?,
        ubicacion=?,
        modelo=?,
        serial=?,
        fechaDeCompra=?,
        ram=?,
        DiscoDuro=?,
        procesador=?,
        estado=?,
        Usuario=?,
        Cgrupo=?,
        proveedor=?,
        garantia=?,
        telGarantia=?

    WHERE idComputer=?
    `;

    await pool.query(sql, [
        data.codigo,
        data.marca,
        data.ubicacion,
        data.modelo,
        data.serial,
        data.fechaAdquisicion,
        data.memoria,
        data.disco,
        data.procesador,
        data.estado,
        data.responsableActual,
        data.categoria,
        data.proveedor,
        data.garantia,
        data.telefonoGarantia,
        id

    ]);

    const [row] = await pool.query(
        "SELECT * FROM cv_computers WHERE idComputer=?",
        [id]
    );

    return computerToJson(row[0]);

}

async function deleteEquipo(id) {

    // Eliminamos primero sus registros relacionados
    await pool.query(
        "DELETE FROM report_pc WHERE idPc=?",
        [id]
    );

    await pool.query(
        "DELETE FROM historial_pc WHERE idPc=?",
        [id]
    );


    const [result] = await pool.query(
        "DELETE FROM cv_computers WHERE idComputer=?",
        [id]
    );

    return result.affectedRows > 0;
}



// =================================
// CRUD MANTENIMIENTOS (report_pc)
// =================================


async function getMantenimientos() {

    const [rows] = await pool.query(
        "SELECT * FROM report_pc ORDER BY fecha DESC"
    );

    return rows.map(maintenanceToJson);
}



async function createMantenimiento(data) {

    const sql = `
    INSERT INTO report_pc
    (
        fecha,
        workOrder,
        workPerformed,
        typeOfMaintenance,
        replacement,
        cost,
        observations,
        idPc,
        responsable
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;


    const values = [
        data.fecha,
        data.orden,
        data.actividad,
        data.tipo,
        data.repuesto,
        data.costo,
        data.descripcion,
        data.equipoId,
        data.responsable
    ];


    const [result] = await pool.query(sql, values);


    const [row] = await pool.query(
        "SELECT * FROM report_pc WHERE idReportPc=?",
        [result.insertId]
    );


    return maintenanceToJson(row[0]);
}



async function updateMantenimiento(id, data) {


    const sql = `
    UPDATE report_pc SET

        fecha=?,
        workOrder=?,
        workPerformed=?,
        typeOfMaintenance=?,
        replacement=?,
        cost=?,
        observations=?,
        idPc=?,
        responsable=?

    WHERE idReportPc=?
    `;


    await pool.query(sql, [

        data.fecha,
        data.orden,
        data.actividad,
        data.tipo,
        data.repuesto,
        data.costo,
        data.descripcion,
        data.equipoId,
        data.responsable,
        id

    ]);


    const [row] = await pool.query(
        "SELECT * FROM report_pc WHERE idReportPc=?",
        [id]
    );


    return maintenanceToJson(row[0]);

}



async function deleteMantenimiento(id) {

    const [result] = await pool.query(
        "DELETE FROM report_pc WHERE idReportPc=?",
        [id]
    );

    return result.affectedRows > 0;

}



// =================================
// CRUD ROTACIONES (historial_pc)
// =================================


async function getRotaciones() {

    const [rows] = await pool.query(
        "SELECT * FROM historial_pc ORDER BY fecha DESC"
    );

    return rows.map(rotationToJson);
}
// =================================
// CONTINUACIÓN CRUD ROTACIONES
// =================================

async function createRotacion(data) {

    const sql = `
    INSERT INTO historial_pc
    (
        idPc,
        nNuevo,
        cargo,
        proyecto,
        fecha,
        razon,
        fechadevolucion,
        asignador,
        cargoasignador
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;


    const values = [
        data.equipoId,
        data.personaAsignada,
        data.cargoAsignado,
        data.proyecto,
        data.fechaAsignacion,
        data.motivoDevolucion,
        data.fechaDevolucion,
        data.quienAsigna,
        data.cargoQuienAsigna
    ];


    const [result] = await pool.query(sql, values);


    const [row] = await pool.query(
        "SELECT * FROM historial_pc WHERE id=?",
        [result.insertId]
    );


    return rotationToJson(row[0]);
}


async function updateRotacion(id, data) {


    const sql = `
    UPDATE historial_pc SET

        idPc=?,
        nNuevo=?,
        cargo=?,
        proyecto=?,
        fecha=?,
        razon=?,
        fechadevolucion=?,
        asignador=?,
        cargoasignador=?

    WHERE id=?
    `;


    await pool.query(sql, [

        data.equipoId,
        data.personaAsignada,
        data.cargoAsignado,
        data.proyecto,
        data.fechaAsignacion,
        data.motivoDevolucion,
        data.fechaDevolucion,
        data.quienAsigna,
        data.cargoQuienAsigna,
        id

    ]);


    const [row] = await pool.query(
        "SELECT * FROM historial_pc WHERE id=?",
        [id]
    );


    return rotationToJson(row[0]);
}


async function deleteRotacion(id) {


    const [result] = await pool.query(
        "DELETE FROM historial_pc WHERE id=?",
        [id]
    );


    return result.affectedRows > 0;
}


// =================================
// ARCHIVOS ESTÁTICOS
// =================================


const MIME = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
};


async function serveFile(req, res) {

    let filePath = req.url === "/"
        ? "index.html"
        : req.url;


    let fullPath;


    // Si es una imagen, buscar en uploads
    if (filePath.startsWith("/uploads/")) {

        fullPath = path.join(
            ROOT,
            filePath
        );

    } else {

        // Archivos normales del frontend
        fullPath = path.join(
            PUBLIC_DIR,
            filePath
        );
    }


    try {

        const content = await fs.readFile(fullPath);

        const ext = path.extname(fullPath);

        res.writeHead(200, {
            "Content-Type": MIME[ext] || "application/octet-stream"
        });

        res.end(content);

    } catch (error) {

        console.log("Archivo no encontrado:", fullPath);

        notFound(res);

    }
}
// =================================
// SUBIR IMÁGENES DE EQUIPOS
// =================================

async function uploadImage(req, res) {

    return new Promise((resolve, reject) => {

        upload.single("imagen")(req, res, async function (error) {

            if (error) {

                return reject(error);

            }

            try {

                if (!req.file) {

                    return reject(
                        new Error("No se recibió ninguna imagen")
                    );

                }


                const idComputer = req.body.idComputer;


                if (!idComputer) {

                    return reject(
                        new Error("Falta el ID del computador")
                    );

                }


                // Buscar el código del equipo
                const [rows] = await pool.query(
                    "SELECT Codigo FROM cv_computers WHERE idComputer = ?",
                    [idComputer]
                );


                if (!rows.length) {

                    return reject(
                        new Error("El computador no existe")
                    );

                }


                const codigo = rows[0].Codigo;


                const extension = path.extname(
                    req.file.originalname
                );


                const nuevoNombre =
                    codigo + extension;


                const rutaNueva = path.join(
                    UPLOADS_DIR,
                    nuevoNombre
                );


                // Renombrar archivo
                await fs.rename(
                    req.file.path,
                    rutaNueva
                );


                const rutaDB =
                    "/uploads/" + nuevoNombre;


                // Guardar ruta en MySQL
                await pool.query(
                    `
                    UPDATE cv_computers
                    SET img = ?
                    WHERE idComputer = ?
                    `,
                    [
                        rutaDB,
                        idComputer
                    ]
                );


                resolve({
                    success: true,
                    imagen: rutaDB
                });


            } catch (err) {

                reject(err);

            }

        });

    });

}

// =================================
// MANEJO DE RUTAS API
// =================================


async function handleApi(req, res) {

    const url = new URL(req.url, `http://${req.headers.host}`);

    const parts = url.pathname.split("/").filter(Boolean);


    const resource = parts[1];
    const id = parts[2];

    // Ruta para subir imágenes
    if (
        req.method === "POST" &&
        url.pathname === "/api/upload"
    ) {

        try {

            const result = await uploadImage(req, res);

            return send(
                res,
                200,
                result
            );

        } catch (error) {

            console.error(error);

            return send(
                res,
                500,
                {
                    error: error.message
                }
            );

        }

    }


    const resources = {

        equipos: {
            get: getEquipos,
            post: createEquipo,
            put: updateEquipo,
            delete: deleteEquipo
        },


        mantenimientos: {
            get: getMantenimientos,
            post: createMantenimiento,
            put: updateMantenimiento,
            delete: deleteMantenimiento
        },


        rotaciones: {
            get: getRotaciones,
            post: createRotacion,
            put: updateRotacion,
            delete: deleteRotacion
        }

    };


    const item = resources[resource];


    if (!item) {
        return notFound(res);
    }


    try {


        if (req.method === "GET") {

            return send(
                res,
                200,
                await item.get()
            );

        }


        const body = await readBody(req);


        if (req.method === "POST") {

            return send(
                res,
                201,
                await item.post(body)
            );

        }


        if (req.method === "PUT") {

            return send(
                res,
                200,
                await item.put(id, body)
            );

        }


        if (req.method === "DELETE") {


            return send(
                res,
                200,
                {
                    success: await item.delete(id)
                }
            );

        }


        notFound(res);


    } catch (error) {


        console.error(error);


        send(
            res,
            500,
            {
                error: "Error interno del servidor",
                detail: error.message
            }
        );

    }

}


// =================================
// SERVIDOR HTTP
// =================================


const server = http.createServer(async (req, res) => {


    if (req.url.startsWith("/api/")) {

        return handleApi(req, res);

    }


    return serveFile(req, res);

});


// =================================
// INICIO
// =================================


async function start() {

    try {


        const connection = await pool.getConnection();

        console.log(
            "✅ Conectado a MySQL: tiproyect_invpc"
        );

        connection.release();


        server.listen(PORT, () => {

            console.log(
                `🚀 Servidor iniciado en http://localhost:${PORT}`
            );

        });


    } catch (error) {


        console.error(
            "❌ Error conectando MySQL"
        );

        console.error(error);

    }

}


start();