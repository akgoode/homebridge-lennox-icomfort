
<p align="left">
<a href="https://www.lennoxicomfort.com">
<img src="./assets/lennox-icomfort-logo.png" width="70%">
</a>

</p>


# Lennox iComfort Thermostats

This plugin is designed to support non-homekit supported iComfort Thermostats.  The list of currently supported thermostats is:

- Wifi Thermostat

### Configuration

Configuration requires 3 values:
- Username: This is the username required to sign into https://www.myicomfort.com
- Password: This is the password for the same login
- Temperature Units: Only supports F right now.  Leave it at F.

### What is there today:
- All the features for a base thermostat implementation in Homebridge
    - Get Current Temperature
    - Get Current Operating Mode (OFF/COOL/HEAT/AUTO)
    - Get/Set Target Operating Mode (OFF/COOL/HEAT)
    - Get/Set Target Temperature
    - Get/Set Target Cooling Threshold
    - Get/Set Target Heating Threshold
- Heating/cooling thresholds
- Automatically sets the heating or cooling threshold to 3 degrees lower or higher than the other threshold IF set to within 3 degrees.

### Roadmap:
- Zone Support


### Dependencies
- icomfort - https://www.npmjs.com/package/icomfort