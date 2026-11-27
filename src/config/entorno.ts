// Variables de entorno que usa la API. Se leen una sola vez al arrancar para
// que un valor faltante truene de inmediato y no a la mitad de una petición.

import { MODOS_INSTANCIA, type ModoInstancia } from "../tipos/contrato.ts";

function leer(nombre: string, porDefecto?: string): string {
  const valor = process.env[nombre] ?? porDefecto;
  if (valor === undefined || valor === "") {
    throw new Error(`Falta la variable de entorno ${nombre} (ver .env.example)`);
  }
  return valor;
}

// Better Auth firma las sesiones con este secreto; uno corto se puede adivinar.
function leerSecreto(nombre: string): string {
  const valor = leer(nombre);
  if (valor.length < 32) {
    throw new Error(`${nombre} debe tener al menos 32 caracteres (ver .env.example)`);
  }
  return valor;
}

const puerto = Number(leer("PUERTO", "3000"));

// Decisión 0018: los administradores no se guardan en la base, se nombran aquí. Sin
// la variable no hay ninguno y los cursos se aprueban como antes, en la base.
function leerCorreos(nombre: string): string[] {
  return (process.env[nombre] ?? "")
    .split(",")
    .map((correo) => correo.trim().toLowerCase())
    .filter(Boolean);
}

function leerModoInstancia(): ModoInstancia {
  const valor = (process.env.MODO_INSTANCIA ?? "comunidad").trim();
  if ((MODOS_INSTANCIA as readonly string[]).includes(valor)) {
    return valor as ModoInstancia;
  }
  return "comunidad";
}

export const entorno = {
  puerto,
  // orígenes que pueden llamar a la API desde el navegador, separados por coma
  origenesPermitidos: leer("ORIGENES_PERMITIDOS", "http://localhost:5173").split(","),
  urlBaseDatos: leer("DATABASE_URL"),
  secretoAuth: leerSecreto("SECRETO_AUTH"),
  // URL pública de esta API; Better Auth la usa para sus cookies
  urlApi: leer("URL_API", `http://localhost:${puerto}`),
  // correos de quienes aprueban cursos desde "Mi panel", separados por coma
  correosAdministradores: leerCorreos("CORREOS_ADMINISTRADORES"),
  // F16 (decisión 0020): modo de instancia (comunidad u organización self-hosted)
  modoInstancia: leerModoInstancia(),
  nombreInstancia: (process.env.NOMBRE_INSTANCIA ?? "Brote").trim() || "Brote",
  slugOrganizacionFija: (process.env.ORGANIZACION_INSTANCIA ?? "").trim() || null,
};
