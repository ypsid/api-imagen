import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logFilePath() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return path.join(LOG_DIR, `migracion-${ym}.log`);
}

export function logMigracion(text) {
  ensureDir();
  const file = logFilePath();
  fs.appendFileSync(file, text + "\n", "utf8");
}
export function formatearEjecucion({
  inicio,
  fin,
  duracionMs,
  estado,
  totalLibros,
  ok,
  warning,
  error,
  resultados,
  errorMsg,
}) {
  const lines = [];

  lines.push("=================================================");
  lines.push(`🕒 Inicio : ${inicio.toISOString()}`);
  lines.push(`🕓 Fin    : ${fin.toISOString()}`);
  lines.push(`⏱️ Duración: ${duracionMs} ms`);
  lines.push(`📌 Estado : ${estado.toUpperCase()}`);
  lines.push(`📚 Libros : total=${totalLibros}, ok=${ok}, warning=${warning}, error=${error}`);

  if (errorMsg) {
    lines.push(`❌ Error global: ${errorMsg}`);
  }

  lines.push("---- Detalle por libro ----");

  for (const r of resultados ?? []) {
    lines.push(
      `• Libro ${r.id} | ${r.nombre} | ${r.tipo} | ${r.estado.toUpperCase()} | fichas OK ${r.fichasOk}/${r.totalFichas}`
    );

    if (r.mensaje) {
      lines.push(`  ↳ ${r.mensaje}`);
    }

    if (r.codigo) {
      lines.push(`  ↳ Código: ${JSON.stringify(r.codigo)}`);
    }
  }

  lines.push(""); // línea en blanco
  return lines.join("\n");
}
