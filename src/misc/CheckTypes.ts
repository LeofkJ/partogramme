import { Database } from '../../types/supabase';
import { BabyDescent } from '../store/GraphData/BabyDescent/babyDescentStore';
import { BabyHeartFrequency } from '../store/GraphData/BabyHeartFrequency/babyHeartFrequencyStore';
import { Dilation } from '../store/GraphData/Dilatation/dilatationStore';
import { AmnioticLiquid } from '../store/TableData/AmnioticLiquid/amnioticLiquidStore';
import { MotherSystolicBloodPressure } from '../store/TableData/MotherSystolicBloodPressure/motherSystolicBloodPressureStore';
import { MotherDiastolicBloodPressure } from '../store/TableData/MotherDiastolicBloodPressure/motherDiastolicBloodPressureStore';
import { MotherContractionsFrequency } from '../store/TableData/MotherContractionsFrequency/motherContractionsFrequencyStore';
import { MotherContractionDuration } from '../store/TableData/MotherContractionDuration/MotherContractionDurationStore';
import { MotherHeartFrequency } from '../store/TableData/MotherHeartFrequency/motherHeartFrequencyStore';
import { MotherTemperature } from '../store/TableData/MotherTemperature/motherTemperatureStore';
import { data_t } from '../store/partogramme/partogrammeStore';
/**
 *Contain fuynction that can valiudates types
 */
export const isTableData = (obj: data_t) => {
  if ((obj instanceof MotherSystolicBloodPressure) ||
    (obj instanceof MotherDiastolicBloodPressure) ||
    (obj instanceof MotherContractionsFrequency) ||
    (obj instanceof MotherContractionDuration) ||
    (obj instanceof MotherHeartFrequency) ||
    (obj instanceof MotherTemperature) ||
    (obj instanceof AmnioticLiquid)
    ) {
    return true;
  } else {
    return false;
  }
};

export const isGraphData = (obj: data_t) => {
  if ((obj instanceof BabyDescent) ||
    (obj instanceof BabyHeartFrequency) ||
    (obj instanceof Dilation)
    ) {
    return true;
  } else {
    return false;
  }
};

export function isLiquidState(input: string): input is Database['public']['Enums']['LiquidState'] {
  return (
    input === 'INTACT' ||
    input === 'CLAIR' ||
    input === 'MECONIAL' ||
    input === 'SANG'
  );
}