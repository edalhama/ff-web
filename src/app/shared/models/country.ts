/** País, con el nombre en el idioma de la petición. */
export interface Country {
  id: number;
  code: string;
  fifa_code: string | null;
  name: string;
}
