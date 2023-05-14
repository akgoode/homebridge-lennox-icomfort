import { Service, PlatformAccessory } from 'homebridge';

import { LennoxIComfortPlatform } from './platform';
import { TemperatureUnits } from './types/config';
import { ThermostatInfo, UpdateThresholdRequest, ValidHeatCoolSetPointState } from './types/iComfortTypes';

const heatingCoolingStates = [
  'OFF',
  'HEAT',
  'COOL',
  'AUTO',
];

const homekitToIComfortStates = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
};

export class Thermostat {
  private service: Service;

  gatewaySN: string;
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
    logger.info(`[${this.gatewaySN}] ${this.accessory.context.device.System_Name} ${args.join(' ')}`);
  }

  _logDebug(...args: string[]) {
    const logger = this.platform.log;
    logger.debug(`[${this.gatewaySN}] ${this.accessory.context.device.System_Name} ${args.join(' ')}`);
  }

  _getThermostatBySN(thermostat: ThermostatInfo) {
    return thermostat.GatewaySN === this.gatewaySN;
  }

  _fetchThermostatInfo(): Promise<ThermostatInfo> {
    this._logDebug('Fetching thermostat data');
    return this.platform.icomfort.getThermostatInfoList({
      GatewaySN: this.gatewaySN,
      TempUnit: 0,
    }).then(res => {
      const thermostat = res.tStatInfo.find(this._getThermostatBySN.bind(this)) as ThermostatInfo;
      this._logDebug(JSON.stringify(thermostat));
      return thermostat;
    });
  }

  _setThermostatInfo(newSettings: ThermostatInfo): Promise<number> {
    this._logDebug('Setting thermostat data');
    return this.platform.icomfort.setThermostatInfo(newSettings);
  }

  _getValidHeatingCoolingSetPoints(thermostat: ThermostatInfo, targetTemperature: number): ValidHeatCoolSetPointState {

    const { Heat_Set_Point, Cool_Set_Point, Operation_Mode } = thermostat;

    this._logDebug(targetTemperature + '');

    const validState = {
      Cool_Set_Point,
      Heat_Set_Point,
    };

    if (Operation_Mode === 0) {
      this._logDebug('Operation mode OFF');
    }
    // heat
    else if (Operation_Mode === 1) {
      validState.Heat_Set_Point = targetTemperature;
      if (Cool_Set_Point < targetTemperature + 3) {
        validState.Cool_Set_Point = targetTemperature + 3;
      }

    }
    // cool
    else if (Operation_Mode === 2) {
      validState.Cool_Set_Point = targetTemperature;
      if (Heat_Set_Point > targetTemperature - 3) {
        validState.Heat_Set_Point = targetTemperature - 3;
      }
    }
    // auto
    else if (Operation_Mode === 3) {
      this._logDebug(`Operation mode is ${heatingCoolingStates[3]}, not required`);

    }

    this._logDebug(JSON.stringify(validState));
    return validState;

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

      this._logInfo(`Current heating/cooling state: ${heatingCoolingStates[currentState]}`);

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

      this._logInfo(`Target heating/cooling state: ${heatingCoolingStates[targetHeatingCoolingState]}`);
      return targetHeatingCoolingState;

    } catch (e) {
      return e;
    }
  }

  /**
   * Handle requests to set the "Target Heating Cooling State" characteristic
   */
  async handleTargetHeatingCoolingStateSet(value): Promise<void | any> {
    this._logDebug('Triggered SET TargetHeatingCoolingState:', value);

    try {
      const thermostat: ThermostatInfo = await this._fetchThermostatInfo();

      const newSettings = { ...thermostat };

      newSettings.Operation_Mode = homekitToIComfortStates[value];

      this._logDebug(`Cool: ${newSettings.Cool_Set_Point} Heat: ${newSettings.Heat_Set_Point}`);

      await this._setThermostatInfo(newSettings);
      this._logInfo(`Setting target heating/cooling state to ${heatingCoolingStates[value]} (${homekitToIComfortStates[value]})`);
    } catch (e) {
      this.platform.log.error(e as string);
      return e;
    }
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  async handleCurrentTemperatureGet(): Promise<string> {
    this._logDebug('Triggered GET CurrentTemperature');

    const thermostat: ThermostatInfo = await this._fetchThermostatInfo();

    // set this to a valid value for CurrentTemperature
    const temp = thermostat.Indoor_Temp;
    this._logInfo(`Current temperature: ${temp}F ${fToC(temp)}C`);
    return fToC(temp);
  }


  /**
   * Handle requests to get the current value of the "Target Temperature" characteristic
   */
  async handleTargetTemperatureGet() {
    this._logDebug('Triggered GET TargetTemperature');

    const thermostat = await this._fetchThermostatInfo();
    const { Indoor_Temp, Cool_Set_Point, Heat_Set_Point, Operation_Mode } = thermostat;

    let targetTemperature = Indoor_Temp;
    if (Operation_Mode === 1) {
      targetTemperature = Heat_Set_Point;
    } else if (Operation_Mode === 2) {
      targetTemperature = Cool_Set_Point;
    } else if (Operation_Mode === 3) {

      if (Indoor_Temp > Cool_Set_Point) {
        targetTemperature = Cool_Set_Point;
      } else if (Indoor_Temp < Heat_Set_Point) {
        targetTemperature = Heat_Set_Point;
      }
    }
    this._logInfo(`Target temperature: ${targetTemperature}F ${fToC(targetTemperature)}C`);
    return fToC(targetTemperature);
  }

  /**
   * Handle requests to set the "Target Temperature" characteristic
   */
  async handleTargetTemperatureSet(value): Promise<void | any> {
    this._logDebug('Triggered SET TargetTemperature:', value);
    try {
      const thermostat = await this._fetchThermostatInfo();

      const valueInF = cToF(value);

      const validSetPoints = this._getValidHeatingCoolingSetPoints(thermostat, valueInF);

      this._logDebug(JSON.stringify(validSetPoints));

      if (thermostat.Operation_Mode !== 3) {


        const newSettings = { ...thermostat, ...validSetPoints };
        await this._setThermostatInfo(newSettings);
        this._logInfo(
          `Setting target temperature ${heatingCoolingStates[newSettings.Operation_Mode]}: ${cToF(value)}F ${value}C`);
      } else {
        this._logDebug(`Operation mode is ${heatingCoolingStates[3]}, not setting target temperature.`);
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
      const thresholdInCelsius = fToC(heatThreshold);
      this._logInfo(`Current heating threshold: ${heatThreshold}F ${thresholdInCelsius}C`);

      return fToC(heatThreshold);
    } catch (e) {
      return e;
    }
  }

  async handleHeatingThresholdTemperatureSet(value): Promise<number | any> {
    try {
      const thermostat = await this._fetchThermostatInfo();

      this._logDebug('Heating threshold new temp ', value);
      const { Cool_Set_Point, Heat_Set_Point } = thermostat;


      const valueInF = cToF(value);
      if (valueInF !== Heat_Set_Point) {

        const newOptions: UpdateThresholdRequest = {
          Heat_Set_Point: cToF(value),
        };
        let newCoolPoint = Cool_Set_Point;
        if (Cool_Set_Point - valueInF < 3) {
          newCoolPoint = valueInF + 3;
          newOptions.Cool_Set_Point = newCoolPoint;
          this._logInfo(`Cooling threshold within 3 degress of heating threshold, adjusting cooling threshold to ${newCoolPoint}`);
        }
        const newSettings = { ...thermostat, ...newOptions };
        await this._setThermostatInfo(newSettings);
        if (newCoolPoint !== Cool_Set_Point) {
          this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature).updateValue(fToC(newCoolPoint));
        }
        `Setting heating threshold temperature to ${valueInF}`;
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
      this._logInfo(`Current cooling threshold: ${coolThreshold}F ${thresholdInCelsius}C`);
      return thresholdInCelsius;
    } catch (e) {
      return e;
    }
  }

  async handleCoolingThresholdTemperatureSet(value): Promise<number | any> {
    try {
      const thermostat = await this._fetchThermostatInfo();

      this._logDebug('Heating threshold new temp ', value);

      const { Cool_Set_Point, Heat_Set_Point } = thermostat;


      const valueInF = cToF(value);
      if (valueInF !== Cool_Set_Point) {

        const newOptions: UpdateThresholdRequest = {
          Cool_Set_Point: cToF(value),
        };
        let newHeatPoint = Heat_Set_Point;
        if (valueInF - Heat_Set_Point < 3) {
          newHeatPoint = valueInF - 3;
          newOptions.Heat_Set_Point = newHeatPoint;
          this._logInfo(`Heating threshold within 3 degress of cooling threshold, adjusting heating threshold to ${newHeatPoint}`);
        }
        const newSettings = { ...thermostat, ...newOptions };
        await this._setThermostatInfo(newSettings);
        if (newHeatPoint !== Heat_Set_Point) {
          this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature).updateValue(fToC(newHeatPoint));
        }
        this._logInfo(`Setting cooling threshold temperature to ${valueInF}`);
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
      this._logInfo(`Current relative humidity: ${humidity}%`);

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