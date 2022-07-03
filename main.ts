/**
 * MakeCode extension for ESP8266 Wifi modules and VarIOT
 */
//% color=#009b5b icon="\uf1eb" block="ESP8266 VarIOT"
namespace ESP8266VarIOT {

    let wifi_connected: boolean = false
    let variot_connected: boolean = false
    let last_upload_successful: boolean = false

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200) serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("OK") || serial_str.includes("ALREADY CONNECTED")) {
                result = true
                break
            } else if (serial_str.includes("ERROR") || serial_str.includes("SEND FAIL")) {
                break
            }
            if (input.runningTime() - time > 30000) break
        }
        return result
    }

    /**
    * Initialize ESP8266 module and connect it to Wifi router
    */
    //% block="Initialize ESP8266|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID = %ssid|Wifi PW = %pw"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw
    export function connectWifi(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, ssid: string, pw: string) {
        wifi_connected = false
        variot_connected = false
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        sendAT("AT+RST", 1000) // reset
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        basic.pause(100)
    }

    /**
    * Connect to VarIOT and upload data. It would not upload anything if it failed to connect to Wifi or VarIOT.
    */
    //% block="Upload data to VarIOT|URL/IP = %ip|Port = %port|Endpoint = %endpoint|Label = %label|Value = %value"
    //% ip.defl=rpi4-variot
    //% port.defl=5000
    //% endpoint.defl=mongan
    //% label.defl=temp
    //% value.defl=45
    export function sendVarIOTTelemetry(ip: string, port: string, endpoint: string, label: string, value: number) {
        if (wifi_connected) {
            variot_connected = false
            sendAT("AT+CIPSTART=\"TCP\",\"" + ip + "\"," + port, 0) // connect to website server
            variot_connected = waitResponse()
            basic.pause(100)
            if (variot_connected) {
                last_upload_successful = false
                //let str: string = "POST /api/v1/" + write_api_key + "/telemetry" + "\r\n" + "Content-Type: application/json" + "\r\n\r\n" + "{\"" + label + "\": " + value + "}" + "\r\n\r\n"
                let str: string = "POST /" + endpoint + "\r\n" + "Content-Type: application/json" + "\r\n\r\n" + "{\"" + label + "\": " + value + "}" + "\r\n\r\n"
                sendAT("AT+CIPSEND=" + str.length)
                sendAT(str, 0) // upload data
                last_upload_successful = waitResponse()
                basic.pause(100)
                sendAT("AT+CIPCLOSE") // close TCP connection
            }
        }
    }

    /**
    * Wait between uploads
    */
    //% block="Wait %delay ms"
    //% delay.min=0 delay.defl=5000
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Wifi connected ?"
    export function isWifiConnected() {
        return wifi_connected
    }

    /**
    * Check if ESP8266 successfully connected to VarIOT
    */
    //% block="VarIOT connected ?"
    export function isVarIOTConnected() {
        return variot_connected
    }

    /**
    * Check if ESP8266 successfully uploaded data to VarIOT
    */
    //% block="Last data upload successful ?"
    export function isLastUploadSuccessful() {
        return last_upload_successful
    }

}
