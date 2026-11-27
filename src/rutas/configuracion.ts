import { Router } from "express";
import { entorno } from "../config/entorno.ts";
import type { RespuestaConfiguracion } from "../tipos/contrato.ts";

// Configuración pública de la instancia (decisión 0020): permite que los clientes
// sepan si están hablando con la comunidad abierta o con un despliegue self-hosted
// dedicado a una escuela u organización.
export const rutasConfiguracion = Router();

rutasConfiguracion.get("/", (_req, res) => {
  const respuesta: RespuestaConfiguracion = {
    configuracion: {
      modoInstancia: entorno.modoInstancia,
      nombreInstancia: entorno.nombreInstancia,
      slugOrganizacionFija: entorno.slugOrganizacionFija,
    },
  };
  res.json(respuesta);
});
