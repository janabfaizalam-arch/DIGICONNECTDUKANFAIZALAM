/**
 * Which build of the Print Station this is.
 *
 * Printed on startup and shown on the settings page for one reason: a shop
 * owner sent screenshot after screenshot of a failure that had already been
 * fixed, because nothing on screen said which version was running and the
 * Downloads folder held four copies with identical names. The version answers
 * that in the first line of the log.
 *
 * Bump it whenever the program's behaviour changes.
 */
export const PRINT_STATION_VERSION = "1.3.1";
