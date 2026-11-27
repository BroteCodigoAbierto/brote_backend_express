import { Router } from "express";
import { esAdministrador, sesionOpcional, usuarioOpcionalDe } from "../middleware/sesion.ts";
import { traerAudio } from "../servicios/audios.ts";
import { TIPO_MIME_AUDIO } from "../tipos/contrato.ts";

// Los bytes de un audio de un curso (spec F14; brote_specs, contracts/api.md de F14), con las
// cabeceras de las imágenes de F13: un audio nunca cambia, así que la caché es de un año, y
// con nosniff y esa CSP un archivo raro nunca se abre como página. Sin Range: los dos
// clientes traen el audio completo antes de reproducirlo (research de F14, punto 6).
export const rutasAudios = Router();

rutasAudios.get<{ idAudio: string }>("/:idAudio", sesionOpcional, async (req, res) => {
  const usuario = usuarioOpcionalDe(res);
  const clave = typeof req.query.clave === "string" ? req.query.clave : null;
  const { datos, formato, huella } = await traerAudio(
    usuario?.id ?? null,
    req.params.idAudio,
    usuario ? esAdministrador(usuario) : false,
    clave,
  );
  res.set({
    "Content-Type": TIPO_MIME_AUDIO[formato],
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
