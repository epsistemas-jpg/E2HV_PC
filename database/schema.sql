CREATE TABLE IF NOT EXISTS equipos (
  id VARCHAR(36) PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL,
  nombre VARCHAR(180) NOT NULL,
  categoria VARCHAR(120) DEFAULT 'Equipo de Computo',
  criticidad VARCHAR(20),
  estado VARCHAR(60) DEFAULT 'Activo',
  marca VARCHAR(120),
  modelo VARCHAR(120),
  serial VARCHAR(120),
  procesador VARCHAR(180),
  disco VARCHAR(120),
  memoria VARCHAR(120),
  accesorios VARCHAR(255),
  fecha_adquisicion DATE,
  fecha_puesta_marcha DATE,
  proveedor VARCHAR(180),
  garantia VARCHAR(120),
  responsable_garantia VARCHAR(180),
  telefono_garantia VARCHAR(80),
  ubicacion VARCHAR(180),
  responsable_actual VARCHAR(180),
  cargo_actual VARCHAR(180),
  foto LONGTEXT,
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_equipos_codigo (codigo)
);

CREATE TABLE IF NOT EXISTS mantenimientos (
  id VARCHAR(36) PRIMARY KEY,
  equipo_id VARCHAR(36) NOT NULL,
  fecha DATE,
  orden VARCHAR(120),
  tipo VARCHAR(60),
  actividad VARCHAR(160),
  descripcion TEXT,
  observaciones TEXT,
  responsable VARCHAR(180),
  certificado_calibracion VARCHAR(160),
  certificado_patron VARCHAR(160),
  repuesto VARCHAR(180),
  costo DECIMAL(12, 2) DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mantenimientos_equipo
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rotaciones (
  id VARCHAR(36) PRIMARY KEY,
  equipo_id VARCHAR(36) NOT NULL,
  fecha_asignacion DATE,
  persona_asignada VARCHAR(180),
  cargo_asignado VARCHAR(180),
  proyecto VARCHAR(180),
  quien_asigna VARCHAR(180),
  cargo_quien_asigna VARCHAR(180),
  fecha_devolucion DATE,
  motivo_devolucion TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rotaciones_equipo
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
    ON DELETE CASCADE
);
