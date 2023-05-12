export enum TemperatureUnits {
    F = '0',
    C = '1'
}

export type RequestParams = {

    CANCEL_AWAY_FLAG?: number;
    GatewaySN?: string;
    LANGUAGE_NBR?: string;
    NAME?: string;
    TempUnit?: number;
    TEMPERATURE?: TemperatureUnits;
    userId?: string;
    ZONE_ID?: string;
    FAN_MODE?: string;
    PROGRAM_SCHEDULE_MODE?: string;
    PROGRAM_SCHEDULE_ID?: string;
    OPERATION_MODE?: string;
};