import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, UnknownContext } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { Thermostat } from './Thermostat';
import icomfort = require('icomfort');
import { getThermostatInfoResponse, iComfort, ThermostatInfo } from './types/iComfortTypes';
import { TemperatureUnits } from './types/params';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class LennoxIComfortPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory<UnknownContext>[] = [];
  name: string | undefined;
  username: string;
  password: string;

  icomfort: iComfort;
  service: any;
  temperatureUnit: any;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log = log;
    this.log.info('Finished initializing platform:', this.config.name);

    this.name = config.name;
    this.username = config.username;
    this.password = config.password;

    this.temperatureUnit = this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;

    this.icomfort = new icomfort({
      username: this.username,
      password: this.password,
    });

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      await this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory<UnknownContext>) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {

    // EXAMPLE ONLY
    // A real plugin you would discover accessories from the local network, cloud services
    // or a user-defined array in the platform config.
    // const devices = this.config.accessories;

    const devices = await this.icomfort.getSystemsInfo({
      userId: this.username,
    });


    const thermostatDetailsRequests = devices.Systems.map(d => {
      return this.icomfort.getThermostatInfoList({
        GatewaySN: d.Gateway_SN,
        TempUnit: 0,
      });
    });

    const thermostatDetailsResponses = await Promise.allSettled(thermostatDetailsRequests);

    if (thermostatDetailsResponses) {

      Array.prototype.forEach.call(thermostatDetailsResponses, (tStatInfo: PromiseSettledResult<getThermostatInfoResponse>) => {

        if (tStatInfo.status === 'fulfilled') {

          const thermostat: ThermostatInfo = tStatInfo.value.tStatInfo[0];

          const desiredTempUnit = thermostat.Pref_Temp_Units === TemperatureUnits.C
            ? this.Characteristic.TemperatureDisplayUnits.CELSIUS
            : this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;

          if (!(this.temperatureUnit === desiredTempUnit)) {
            this.temperatureUnit = desiredTempUnit;
          }

          const deviceMetaData = devices.Systems.find(d => d.Gateway_SN === thermostat.GatewaySN);

          thermostat.System_Name = deviceMetaData.System_Name;
          thermostat.deviceFirmware = deviceMetaData.Firmware_Ver;

          // generate a unique id for the accessory this should be generated from
          // something globally unique, but constant, for example, the device serial
          // number or MAC address
          const uuid = this.api.hap.uuid.generate(thermostat.GatewaySN);
          // see if an accessory with the same uuid has already been registered and restored from
          // the cached devices we stored in the `configureAccessory` method above
          const existingAccessory: PlatformAccessory<UnknownContext> | undefined =
            this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            // the accessory already exists
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

            // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
            // existingAccessory.context.device = device;
            // this.api.updatePlatformAccessories([existingAccessory]);

            // create the accessory handler for the restored accessory
            // this is imported from `platformAccessory.ts`
            new Thermostat(this, existingAccessory);

            // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
            // remove platform accessories when no longer present
            // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
            // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
          } else {
            // the accessory does not yet exist, so we need to create it
            this.log.info('Adding new accessory:', deviceMetaData.System_Name);

            // create a new accessory
            const accessory = new this.api.platformAccessory(deviceMetaData.System_Name, uuid);

            // // store a copy of the device object in the `accessory.context`
            // // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = thermostat;

            // // create the accessory handler for the newly create accessory
            // // this is imported from `platformAccessory.ts`
            new Thermostat(this, accessory);

            // // link the accessory to your platform
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }
      });
    }

    // loop over the discovered devices and register each one if it has not already been registered
  }
}
