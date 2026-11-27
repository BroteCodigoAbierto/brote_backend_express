import { Router } from "express";
import { esAdministrador, sesionOpcional, usuarioOpcionalDe } from "../middleware/sesion.ts";
import { traerImagen } from "../servicios/imagenes.ts";
import { TIPO_MIME_IMAGEN } from "../tipos/contrato.ts";

// Los bytes de una imagen de un curso (spec F13; brote_specs, contracts/api.md de F13). Una
// imagen nunca cambia (otro archivo es otra imagen), así que la caché es de un año. Con
// nosniff y esa CSP, un archivo raro nunca se abre como página (research de F13, punto 3).
export const rutasImagenes = Router();

rutasImagenes.get<{ idImagen: string }>("/:idImagen", sesionOpcional, async (req, res) => {
  const usuario = usuarioOpcionalDe(res);
  const clave = typeof req.query.clave === "string" ? req.query.clave : null;
  const { datos, formato, huella } = await traerImagen(
    usuario?.id ?? null,
    req.params.idImagen,
    usuario ? esAdministrador(usuario) : false,
    clave,
  );
  res.set({
    "Content-Type": TIPO_MIME_IMAGEN[formato],
    "Cache-Control": "private, max-age=31536000, immutable",
    ETag: `"${huella}"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  if (req.fresh) {
    res.status(304).end();
    return;
  }
  res.send(datos);
});
