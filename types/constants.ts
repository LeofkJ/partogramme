/**
 * @description
 * This file contains all the constants used in the application
 */

// Constants for the Tables of the graph page
export const tableTitles = [
  "Température de la mère",
  "Tension artérielle Systolique de la mère",
  "Tension artérielle Diastolique de la mère",
  "Pouls de la mère",
  "Fréquence des contractions",
  "Durée des contractions de la mère",
  "Liquide Amniotique",
]

export const liquidStates = {
  INTACT: "INTACT",
  CLAIR: "CLAIR", 
  MECONIAL: "MECONIAL",
  SANG:"SANG",
  PUREE_DE_POIS: "PURÉE DE POIS",
};

export const partogrammeStates = {
  ADMITTED: "ADMIS",
  IN_PROGRESS: "TRAVAIL EN COURS",
  TRANSFERRED: "TRANSFÉRÉ",
  WORK_FINISHED: "TRAVAIL TERMINÉ",
}

// Function to get a value based on rank
export function getValueByRank(data:any, rank:any) {
  const enumValues = Object.values(data);
  if (rank >= 0 && rank < enumValues.length) {
    return enumValues[rank];
  } else {
    return undefined; // Rank out of range
  }
}

// Function to get the enum based on a string
export function getEnumByString(data: any, inputString:any) {
  for (const enumKey in data) {
    if (data[enumKey] === inputString) {
      return enumKey;
    }
  }
  return null; // String not found in the enum
}

// Function to get the string based on an enum value
export function getStringByEnum(LiquidState: any, enumValue:any) {
  return LiquidState[enumValue] || null;
}
