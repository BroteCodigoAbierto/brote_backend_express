// Variables de entorno que usa la API. Se leen una sola vez al arrancar para
// que un valor faltante truene de inmediato y no a la mitad de una petición.

function leer(nombre: string, porDefecto?: string): string {
  const valor = process.env[nombre] ?? porDefecto;
  if (valor === undefined || valor === "") {
    throw new Error(`Falta la variable de entorno ${nombre} (ver .env.example)`);
  }
  return valor;
}

export const entorno = {
  puerto: Number(leer("PUERTO", "3000")),
  // orígenes que pueden llamar a la API desde el navegador, separados por coma
  origenesPermitidos: leer("ORIGENES_PERMITIDOS", "http://localhost:5173").split(","),
};
