import { Service, PlatformAccessory } from 'homebridge';

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
      .setCharacteristic(this.platform.Characteristic.Name, thermostat.System_Name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.gatewaySN)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, thermostat.deviceFirmware)
      .setCharacteristic(this.platform.Characteristic.Model, 'iComfort Thermostat')
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Lennox');

    this.service = this.accessory.getService(this.platform.Service.Thermostat)
      || this.accessory.addService(this.platform.Service.Thermostat);


    this.service.setCharacteristic(this.platform.Characteristic.Name, thermostat.System_Name);


    // required
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
      .onGet(this.handleTemperatureDisplayUnitsGet.bind(this));
    //optional
    this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
      .onGet(this.handleHeatingThresholdTemperatureGet.bind(this))
      .onSet(this.handleHeatingThresholdTemperatureSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .onGet(this.handleCoolingThresholdTemperatureGet.bind(this))
      .onSet(this.handleCoolingThresholdTemperatureSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.handleCurrentRelativeHumidityGet.bind(this));


  }

  _logInfo(...args: string[]) {
    const logger = this.platform.log;
    logger.info(`[Thermostat] ${this.accessory.context.device.System_Name} (${this.gatewaySN}) ${args.join(' ')}`);
  }

  _logDebug(...args: string[]) {
    const logger = this.platform.log;
    logger.debug(`[Thermostat] ${this.accessory.context.device.System_Name} (${this.gatewaySN}) ${args.join(' ')}`);
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

  _setThermostatInfo(newSettings: ThermostatInfo): Promise<any> {
    return this.platform.icomfort.setThermostatInfo(newSettings);
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

      this._logDebug(`Getting current heating/cooling state: ${currentState}`);

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

      this._logDebug(`Getting target heating/cooling state: ${targetHeatingCoolingState}`);
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
  async handleCurrentTemperatureGet(): Promise<string> {
    this._logDebug('Triggered GET CurrentTemperature');

    const thermostat: ThermostatInfo = await this._fetchThermostatInfo();

    // set this to a valid value for CurrentTemperature
    const temp = thermostat.Indoor_Temp;
    this._logDebug(`Getting current temperature: ${temp}`);
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
    this._logDebug(`Getting target temperature: ${targetTemperature}`);
    return fToC(targetTemperature);
  }

  /**
   * Handle requests to set the "Target Temperature" characteristic
   */
  async handleTargetTemperatureSet(value): Promise<void | any> {
    this._logDebug('Triggered SET TargetTemperature:', value);
    try {
      const thermostat = await this._fetchThermostatInfo();

      const newOptions = { ...thermostat };
      if (thermostat.Operation_Mode === 0) {
        newOptions.Cool_Set_Point = cToF(value);
      } else if (thermostat.Operation_Mode === 1) {
        newOptions.Heat_Set_Point = cToF(value);
      } else if (thermostat.Operation_Mode === 2) {
        newOptions.Cool_Set_Point = cToF(value);

      }

      if (thermostat.Operation_Mode !== 3) {
        const newSettings = { ...thermostat, newOptions };
        this._setThermostatInfo(newSettings);
        this._logDebug(
          'setTargetTemperature: ' +
          newSettings.Operation_Mode +
          ' : ' +
          cToF(value),
        );
      }

    } catch (e) {
      return e;
    }
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

  async handleHeatingThresholdTemperatureGet(): Promise<number | any> {
    try {
      const thermostat = await this._fetchThermostatInfo();

      const heatThreshold = thermostat.Heat_Set_Point;
      this._logDebug(`Getting Heating threshold ${heatThreshold}`);

      return fToC(heatThreshold);
    } catch (e) {
      return e;
    }
  }

  async handleHeatingThresholdTemperatureSet(value): Promise<number | any> {
    try {
      const thermostat = await this._fetchThermostatInfo();

      this._logDebug('Heating threshold new temp ', value);
      if (cToF(value) !== thermostat.Heat_Set_Point) {
        const newOptions = {
          Heat_Set_Point: cToF(value),
        };
        const newSettings = { ...thermostat, ...newOptions };
        await this._setThermostatInfo(newSettings);

        this._logInfo('setHeatingThresholdTemperature: ' + cToF(value));
      } else {
        this._logDebug('Heating threshold hasnt changed');
      }
    } catch (e) {
      return e;
    }
  }

  async handleCoolingThresholdTemperatureGet(): Promise<number | any> {
    try {
      const thermostat = await this._fetchThermostatInfo();

      const coolThreshold = thermostat.Cool_Set_Point;

      const thresholdInCelsius = fToC(coolThreshold);
      this._logDebug(`Cool threshold comparison: Thermostat value: ${coolThreshold} ConvertedValue: ${thresholdInCelsius}`);
      return thresholdInCelsius;
    } catch (e) {
      return e;
    }
  }

  async handleCoolingThresholdTemperatureSet(value): Promise<number | any> {
    try {
      const thermostat = await this._fetchThermostatInfo();

      this._logDebug('Heating threshold new temp ', value);

      if (cToF(value) !== thermostat.Cool_Set_Point) {
        const newOptions = {
          Cool_Set_Point: cToF(value),
        };
        const newSettings = { ...thermostat, ...newOptions };
        await this._setThermostatInfo(newSettings);
        this._logInfo('setCoolingThresholdTemperature: ' + cToF(value));
      } else {
        this._logDebug('Cooling threshold hasnt changed');
      }
    } catch (e) {
      return e;
    }
  }

  async handleCurrentRelativeHumidityGet(): Promise<number | any> {
    try {
      const thermostat = await this._fetchThermostatInfo();

      const humidity = thermostat.Indoor_Humidity;
      this._logDebug(`Getting current relative humidity: ${humidity}`);

      return humidity;
    } catch (e) {
      return e;
    }
  }

}

function cToF(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

// function to convert Farenheit to Celcius
function fToC(fahrenheit: number): string {
  return (((fahrenheit - 32) * 5) / 9).toFixed(2);
}