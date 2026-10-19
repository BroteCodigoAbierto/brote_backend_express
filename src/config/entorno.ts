// Variables de entorno que usa la API. Se leen una sola vez al arrancar para
// que un valor faltante truene de inmediato y no a la mitad de una petición.

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

export const entorno = {
  puerto,
  // orígenes que pueden llamar a la API desde el navegador, separados por coma
  origenesPermitidos: leer("ORIGENES_PERMITIDOS", "http://localhost:5173").split(","),
  urlBaseDatos: leer("DATABASE_URL"),
  secretoAuth: leerSecreto("SECRETO_AUTH"),
  // URL pública de esta API; Better Auth la usa para sus cookies
  urlApi: leer("URL_API", `http://localhost:${puerto}`),
};
