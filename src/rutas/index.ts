import { Router } from "express";
import { rutasCuentas } from "./cuentas.ts";
import { rutasCursos } from "./cursos.ts";
import { rutasEditor } from "./editor.ts";
import { rutasPing } from "./ping.ts";
import { rutasSesiones } from "./sesiones.ts";
import { rutasUsuarios } from "./usuarios.ts";

// Aquí se monta cada grupo de rutas nuevo, una línea por recurso.
export const rutas = Router();

rutas.use("/ping", rutasPing);
rutas.use("/cuentas", rutasCuentas);
rutas.use("/sesiones", rutasSesiones);
rutas.use("/usuarios", rutasUsuarios);
rutas.use("/cursos", rutasCursos);
rutas.use("/editor", rutasEditor);
