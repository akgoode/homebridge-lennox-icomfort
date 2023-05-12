import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { LennoxIComfortPlatform } from './platform';
import { TemperatureUnits } from './types/config';
import { ThermostatInfo } from './types/iComfortTypes';

export class Thermostat {
  private service: Service;

  gatewaySN: any;
  targetHeatingCoolingState: any;


  constructor(
    private readonly platform: LennoxIComfortPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    const thermostat = accessory.context.device;
    this.gatewaySN = thermostat.GatewaySN;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Name, thermostat.System_Name);

    this.service = this.accessory.getService(this.platform.Service.Thermostat)
      || this.accessory.addService(this.platform.Service.Thermostat);


    this.service.setCharacteristic(this.platform.Characteristic.Name, thermostat.System_Name);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.handleCurrentHeatingCoolingStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.handleTargetHeatingCoolingStateGet.bind(this))
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.handleTargetTemperatureGet.bind(this))
      .onSet(this.handleTargetTemperatureSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.handleTemperatureDisplayUnitsGet.bind(this))
      .onSet(this.handleTemperatureDisplayUnitsSet.bind(this));
  }

  _logInfo(...args: string[]) {
    const logger = this.platform.log;
    logger.info(`Thermostat ${this.gatewaySN} ${args.join(' ')}`);
  }

  _logDebug(...args: string[]) {
    const logger = this.platform.log;
    logger.debug(`Thermostat ${this.gatewaySN} ${args.join(' ')}`);
  }

  _getThermostatBySN(thermostat: ThermostatInfo) {
    return thermostat.GatewaySN === this.gatewaySN;
  }

  _fetchThermostatInfo(): Promise<ThermostatInfo> {
    return this.platform.icomfort.getThermostatInfoList({
      GatewaySN: this.gatewaySN,
      TempUnit: 0,
    }).then(res => {
      return res.tStatInfo.find(this._getThermostatBySN.bind(this)) as ThermostatInfo;
    });
  }

  async handleCurrentHeatingCoolingStateGet(): Promise<number | any> {
    this._logDebug('Triggered GET CurrentHeatingCoolingState');
    try {
      const thermostat: ThermostatInfo = await this._fetchThermostatInfo();

      let currentState = 0;
      if (thermostat.System_Status === 0) {
        currentState = this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
      } else if (thermostat.System_Status === 1) {
        currentState = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if (thermostat.System_Status === 2) {
        currentState = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      }

      return currentState;

    } catch (e) {
      return e;
    }
  }


  /**
   * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
   */
  async handleTargetHeatingCoolingStateGet(): Promise<number | any> {
    this._logDebug('Triggered GET TargetHeatingCoolingState');

    // set this to a valid value for TargetHeatingCoolingState
    const currentValue = this.platform.Characteristic.TargetHeatingCoolingState.OFF;

    try {
      const thermostat: ThermostatInfo = await this._fetchThermostatInfo();

      let targetHeatingCoolingState = 0;

      if (thermostat.Operation_Mode === 0) {
        targetHeatingCoolingState =
          this.platform.Characteristic.TargetHeatingCoolingState.OFF;
      } else if (thermostat.Operation_Mode === 1) {
        targetHeatingCoolingState =
          this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
      } else if (thermostat.Operation_Mode === 2) {
        targetHeatingCoolingState =
          this.platform.Characteristic.TargetHeatingCoolingState.COOL;
      } else if (thermostat.Operation_Mode === 3) {
        targetHeatingCoolingState =
          this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
      }

      this._logDebug(`Setting target heating/cooling state to ${targetHeatingCoolingState}`);
      return targetHeatingCoolingState;

    } catch (e) {
      return e;
    }


    return currentValue;
  }

  /**
   * Handle requests to set the "Target Heating Cooling State" characteristic
   */
  handleTargetHeatingCoolingStateSet(value) {
    this._logDebug('Triggered SET TargetHeatingCoolingState:', value);
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  async handleCurrentTemperatureGet(): Promise<number> {
    this._logDebug('Triggered GET CurrentTemperature');

    const thermostat: ThermostatInfo = await this._fetchThermostatInfo();

    // set this to a valid value for CurrentTemperature
    const temp = thermostat.Indoor_Temp;
    this._logDebug(`Setting temperature for ${this.gatewaySN} to ${temp}`);
    return fToC(temp);
  }


  /**
   * Handle requests to get the current value of the "Target Temperature" characteristic
   */
  async handleTargetTemperatureGet() {
    this._logDebug('Triggered GET TargetTemperature');

    // set this to a valid value for TargetTemperature
    const thermostat = await this._fetchThermostatInfo();

    let targetTemperature = 0;
    if (thermostat.Operation_Mode === 0) {
      targetTemperature = thermostat.Cool_Set_Point;
    } else if (thermostat.Operation_Mode === 1) {
      targetTemperature = thermostat.Heat_Set_Point;
    } else if (thermostat.Operation_Mode === 2) {
      targetTemperature = thermostat.Cool_Set_Point;
    } else if (thermostat.Operation_Mode === 3) {
      targetTemperature = thermostat.Indoor_Temp;
    }
    this._logDebug('getTargetTemperature: ' + targetTemperature);
    return fToC(targetTemperature);
  }

  /**
   * Handle requests to set the "Target Temperature" characteristic
   */
  handleTargetTemperatureSet(value) {
    this._logDebug('Triggered SET TargetTemperature:', value);
  }

  /**
   * Handle requests to get the current value of the "Temperature Display Units" characteristic
   */
  handleTemperatureDisplayUnitsGet() {
    this._logDebug('Triggered GET TemperatureDisplayUnits');

    const { FAHRENHEIT, CELSIUS } = this.platform.Characteristic.TemperatureDisplayUnits;

    const configValue = this.platform.temperatureUnit;

    if (configValue && configValue === TemperatureUnits.C) {
      return CELSIUS;
    } else {
      return FAHRENHEIT;
    }

  }

  /**
   * Handle requests to set the "Temperature Display Units" characteristic
   */
  handleTemperatureDisplayUnitsSet(value) {
    this._logDebug('Triggered SET TemperatureDisplayUnits:', value);
  }

}

function cToF(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

// function to convert Farenheit to Celcius
function fToC(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9);
}