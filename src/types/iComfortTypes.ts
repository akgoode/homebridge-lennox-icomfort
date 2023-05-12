import { RequestParams } from './params';

type BaseResponse = {
  ReturnStatus: string;
};

export type getSystemsInfoResponse = BaseResponse & {
  Systems: any;
};

export type ThermostatInfo = {
  deviceFirmware: any;
  Away_Mode: number;
  Central_Zoned_Away: number;
  ConnectionStatus: string;
  Cool_Set_Point: number;
  DateTime_Mark: string;
  Fan_Mode: number;
  GMT_To_Local: number;
  GatewaySN: string;
  Golden_Table_Updated: boolean;
  Heat_Set_Point: number;
  Indoor_Humidity: number;
  Indoor_Temp: number;
  Operation_Mode: number;
  Pref_Temp_Units: string;
  Program_Schedule_Mode: string;
  Program_Schedule_Selection: number;
  System_Status: number;
  Zone_Enabled: number;
  Zone_Name: string;
  Zone_Number: number;
  Zones_Installed: number;
  System_Name?: string;
};

export type getThermostatInfoResponse = BaseResponse & {
  tStatInfo: ThermostatInfo[];
};

export type ValidateUserResponse = {
  msg_code: string;
  msg_desc: string;
};

export interface iComfort {
  getBuildingsInfo: (params: RequestParams) => Promise<BaseResponse>;
  getGatewayInfo: (params: RequestParams) => Promise<BaseResponse>;
  getGatewaysAlerts: (params: RequestParams) => Promise<BaseResponse>;
  getSystemsInfo: (params: RequestParams) => Promise<getSystemsInfoResponse>;
  getThermostatInfoList: (params: RequestParams) => Promise<getThermostatInfoResponse>;
  getThermostatLookupInfo: (params: RequestParams) => Promise<BaseResponse>;
  getThermostatScheduleInfo: (params: RequestParams) => Promise<BaseResponse>;
  validateUser: (params: RequestParams) => Promise<ValidateUserResponse>;
  setThermostatInfo: (settings: ThermostatInfo) => Promise<any>;
}

