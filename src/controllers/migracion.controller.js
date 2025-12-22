import utils from "../utils/utils.js";
function resumenDesdeRespuesta(data) {
  const mensajes = Array.isArray(data?.mensajes) ? data.mensajes : [];

  // caso “no hay pendientes”
  if (mensajes.length === 0) {
    return {
      estado: "warning",
      ok: false,
      warning: true,
      error: false,
      totalFichas: 0,
      fichasOk: 0,
      fichasError: 0,
      mensaje: data?.message ?? "No se migraron fichas (sin pendientes o salteadas)",
    };
  }

  const fichasOk = mensajes.filter(utils.mensajeEsOk).length;
  const fichasError = mensajes.length - fichasOk;

  if (fichasOk === 0 && fichasError > 0) {
    return {
      estado: "error",
      ok: false,
      warning: false,
      error: true,
      totalFichas: mensajes.length,
      fichasOk,
      fichasError,
      mensaje: `Migración fallida: OK ${fichasOk}/${mensajes.length}, ERROR ${fichasError}/${mensajes.length}`,
    };
  }

  if (fichasError > 0) {
    // migró algunas, fallaron otras -> podés llamarlo "warning" o "error"
    return {
      estado: "warning",
      ok: false,
      warning: true,
      error: false,
      totalFichas: mensajes.length,
      fichasOk,
      fichasError,
      mensaje: `Migración parcial: OK ${fichasOk}/${mensajes.length}, ERROR ${fichasError}/${mensajes.length}`,
    };
  }

  return {
    estado: "ok",
    ok: true,
    warning: false,
    error: false,
    totalFichas: mensajes.length,
    fichasOk,
    fichasError: 0,
    mensaje: `Migración OK: ${fichasOk}/${mensajes.length}`,
  };
}

const procesarLibros = async (librosAProcesar) => {
  const resultados = [];

  for (const libro of librosAProcesar) {
    const base = {
      id: libro?.id ?? null,
      nombre: libro?.nombre ?? null,
      tipo: libro?.tipoLibro?.nombre ?? null,
    };

    if (!base.id) {
      resultados.push({
        ...base,
        estado: "error",
        ok: false,
        warning: false,
        error: true,
        mensaje: "Libro sin id",
      });
      continue;
    }

    try {
      let data;
      if (base.tipo === "Cronologico") {
        data = await utils.migrarCronologico(base.id, base.nombre);
      } else if (base.tipo === "Matricula") {
        data = await utils.migrarMatricula(base.id, base.nombre);
      } else {
        resultados.push({
          ...base,
          estado: "warning",
          ok: false,
          warning: true,
          error: false,
          mensaje: `Tipo no soportado: ${base.tipo}`,
        });
        continue;
      }

      const resumen = resumenDesdeRespuesta(data);
      if (resumen.estado === "ok") {
        try {
          const marcado = await utils.migrarLibroPorId(base.id);
          // podés guardar algo de respuesta
          resultados.push({
            ...base,
            ...resumen,
            libroMarcadoMigrado: true,
            marcadoRespuesta: marcado ?? null,
            codigo: data?.codigo ?? null,
          });
        } catch (e) {
          // migración OK pero no se pudo marcar estado => warning
          resultados.push({
            ...base,
            estado: "warning",
            ok: false,
            warning: true,
            error: false,
            ...resumen,
            libroMarcadoMigrado: false,
            mensaje: `Migración OK pero falló marcar libro como migrado: ${e?.message ?? String(e)}`,
            codigo: data?.codigo ?? null,
          });
        }
        continue;
      }
    } catch (err) {
      resultados.push({
        ...base,
        estado: "error",
        ok: false,
        warning: false,
        error: true,
        mensaje: err?.message ?? String(err),
      });
    }
  }

  return resultados;
};

const librosMigrados = async (req, res) => {
  try {
    const libros = await utils.librosPorMigrar();

    if (!Array.isArray(libros) || libros.length === 0) {
      return res.status(200).json({
        message: "No hay libros para migrar",
        totalLibros: 0,
        ok: 0,
        warning: 0,
        error: 0,
        resultados: [],
      });
    }

    const resultados = await procesarLibros(libros);

    const ok = resultados.filter(r => r.estado === "ok").length;
    const warning = resultados.filter(r => r.estado === "warning").length;
    const error = resultados.filter(r => r.estado === "error").length;

    return res.status(200).json({
      message: "Proceso finalizado",
      totalLibros: resultados.length,
      ok,
      warning,
      error,
      resultados,
    });
  } catch (err) {
    console.error("❌ Error en /api/migracion/libros:", err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
};


export default { librosMigrados };
