
<p align="left">
<a href="https://www.lennoxicomfort.com">
<img src="./assets/lennox-icomfort-logo.png" width="70%">
</a>

</p>


# Lennox iComfort Thermostats

This plugin is designed to support non-homekit supported iComfort Thermostats.  The existing plugin depends upon all thermostats being configured with zones to work, so I created this using the current TS template and so that it will work with thermostats as individual accessories.  Down the line I will consider adding more features like zone control.

The list of currently supported thermostats is:

- Wifi Thermostat

### Configuration

Configuration requires 3 values:
- Username: This is the username required to sign into https://www.myicomfort.com
- Password: This is the password for the same login
- Temperature Units: Only supports F right now.  Leave it at F.

It is best to run this in a child bridge until I have more users and understand what issues there are.  No slowdowns so far.

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
- Temperature Unit Switching
- More device support

### Dependencies
- icomfort - https://www.npmjs.com/package/icomfort

### Feedback
All feedback is welcome.  Please submit any issues to https://github.com/akgoode/homebridge-lennox-icomfort/issues