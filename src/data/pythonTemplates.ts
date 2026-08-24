import { PumpParameters, SerialSettings } from '../types';

export function generatePythonDriver(params: PumpParameters, serial: SerialSettings): string {
  const diameter = params.useCustomDiameter ? params.customDiameterMm : params.customDiameterMm;
  
  return `"""
=============================================================================
KD Scientific Legato 270 Syringe Pump Python Control Library
Device: KD Scientific Legato 270 (Push/Pull Continuous Syringe Pump)
Interface: USB Virtual COM Port (RS-232 ASCII Protocol)
Author: Lab Automation Script Generator
=============================================================================
Requirements:
    pip install pyserial
=============================================================================
"""

import time
import sys
import serial
import serial.tools.list_ports


class Legato270Pump:
    """
    Controller for KD Scientific Legato 270 Push/Pull Syringe Pump.
    Implements full ASCII command set, prompt status decoding, and 
    continuous cycling logic.
    """

    # Prompt Status Map returned as the last character of responses
    PROMPT_MAP = {
        ':': 'STOPPED',
        '>': 'INFUSING',
        '<': 'WITHDRAWING',
        '*': 'PAUSED',
        'T*': 'TARGET_REACHED',
        '!': 'ALARM_STALL',
        'O': 'OUT_OF_RANGE',
        '?': 'SYNTAX_ERROR'
    }

    def __init__(self, port='${serial.port}', baudrate=${serial.baudRate}, address=${serial.address}, timeout=${serial.timeout}):
        """
        Initialize serial connection parameters.
        
        :param port: COM port name (e.g. 'COM3' on Windows, '/dev/ttyUSB0' on Linux)
        :param baudrate: Baud rate (default 115200 or 9600, 8-N-1)
        :param address: Pump address (0-99, 0 is default standalone)
        :param timeout: Serial read timeout in seconds
        """
        self.port = port
        self.baudrate = baudrate
        self.address = address
        self.timeout = timeout
        self.ser = None
        self.last_prompt = ':'
        self.last_status_str = 'STOPPED'

    def connect(self):
        """Open the serial connection and initialize communication."""
        try:
            print(f"[*] Connecting to KD Scientific Legato 270 on {self.port} @ {self.baudrate} bps...")
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=self.timeout
            )
            # Clear input/output buffers
            self.ser.reset_input_buffer()
            self.ser.reset_output_buffer()
            time.sleep(0.2)

            # Disable command echo to keep response buffers clean
            self.send_command("echo off")
            
            # Query pump version
            ver = self.send_command("ver")
            print(f"[+] Connected successfully! Device info: {ver}")
            return True
        except serial.SerialException as e:
            print(f"[!] Serial connection error on {self.port}: {e}")
            self.list_available_ports()
            return False

    def close(self):
        """Safely halt the pump and close the serial port."""
        if self.ser and self.ser.is_open:
            try:
                self.stop()
            except Exception:
                pass
            self.ser.close()
            print("[*] Serial port closed.")

    @staticmethod
    def list_available_ports():
        """Helper to scan and print connected COM/USB serial ports."""
        print("[i] Available serial ports:")
        ports = serial.tools.list_ports.comports()
        for p in ports:
            print(f"    - {p.device}: {p.description} [{p.hwid}]")
        if not ports:
            print("    (No serial ports detected. Check USB cable connection)")

    def send_command(self, cmd: str, timeout: float = None) -> str:
        """
        Send an ASCII command to the pump and parse response and prompt.
        
        :param cmd: ASCII command string (e.g. 'irun', 'irate 2.5 ml/min')
        :return: Clean response string from the pump
        """
        if not self.ser or not self.ser.is_open:
            raise ConnectionError("Serial port is not connected.")

        # Prefix pump address if address > 0
        formatted_cmd = f"{self.address:02d}{cmd}" if self.address > 0 else cmd
        formatted_cmd = formatted_cmd.strip() + "\\r"

        self.ser.reset_input_buffer()
        self.ser.write(formatted_cmd.encode('ascii'))
        time.sleep(0.05)

        # Read response lines until prompt is received
        response_lines = []
        start_time = time.time()
        read_timeout = timeout or self.timeout

        while (time.time() - start_time) < read_timeout:
            raw_line = self.ser.readline().decode('ascii', errors='ignore').strip()
            if not raw_line:
                continue

            # Check if this line is or ends with a prompt character
            # Format: '00:>' or ':' or '00:T*'
            for p_code in ['T*', ':', '>', '<', '*', '!', 'O', '?']:
                if raw_line.endswith(p_code):
                    self.last_prompt = p_code
                    self.last_status_str = self.PROMPT_MAP.get(p_code, 'UNKNOWN')
                    
                    # Remove prompt from line payload if needed
                    cleaned = raw_line[:-len(p_code)].strip()
                    if cleaned and not cleaned.endswith(':'):
                        response_lines.append(cleaned)
                    return "\\n".join(response_lines).strip()

            response_lines.append(raw_line)

        return "\\n".join(response_lines).strip()

    # -------------------------------------------------------------------------
    # Configuration Commands
    # -------------------------------------------------------------------------
    def set_diameter(self, diameter_mm: float):
        """Set syringe inside diameter in mm (e.g. 14.5 for 10ml BD)."""
        resp = self.send_command(f"diameter {diameter_mm:.3f}")
        print(f"[+] Syringe diameter set to: {diameter_mm:.3f} mm -> {resp}")
        return resp

    def set_infuse_rate(self, rate: float, unit: str = "ml/min"):
        """Set infusion rate. Units: ml/min, ml/hr, ul/min, ul/hr, nl/min, nl/hr."""
        resp = self.send_command(f"irate {rate} {unit}")
        print(f"[+] Infusion rate set: {rate} {unit}")
        return resp

    def set_withdraw_rate(self, rate: float, unit: str = "ml/min"):
        """Set withdrawal rate."""
        resp = self.send_command(f"wrate {rate} {unit}")
        print(f"[+] Withdrawal rate set: {rate} {unit}")
        return resp

    def set_target_volume(self, volume: float, unit: str = "ml"):
        """Set target dispense volume per stroke."""
        resp = self.send_command(f"tvolume {volume} {unit}")
        print(f"[+] Target volume set: {volume} {unit}")
        return resp

    def clear_target_volume(self):
        """Clear target volume (runs indefinitely until stop command)."""
        resp = self.send_command("ctvolume")
        print("[+] Target volume cleared (continuous mode).")
        return resp

    def clear_volumes(self):
        """Reset accumulated delivered volume counters to zero."""
        return self.send_command("cvolume")

    # -------------------------------------------------------------------------
    # Motion Control Commands
    # -------------------------------------------------------------------------
    def infuse(self):
        """Start infusing (forward stroke)."""
        return self.send_command("irun")

    def withdraw(self):
        """Start withdrawing (reverse/refill stroke)."""
        return self.send_command("wrun")

    def stop(self):
        """Halt pump motor immediately."""
        return self.send_command("stop")

    def pause(self):
        """Pause pumping."""
        return self.send_command("pause")

    def resume(self):
        """Resume pumping after pause."""
        return self.send_command("restart")

    # -------------------------------------------------------------------------
    # Status & Telemetry
    # -------------------------------------------------------------------------
    def get_status(self) -> str:
        """Poll fast prompt status."""
        self.send_command("poll")
        return self.last_status_str

    def get_infused_volume(self) -> str:
        """Query accumulated infused volume."""
        return self.send_command("ivolume")

    def get_withdrawn_volume(self) -> str:
        """Query accumulated withdrawn volume."""
        return self.send_command("wvolume")

    def wait_for_target(self, poll_interval: float = 0.5):
        """
        Block and poll pump until target volume is reached or motor stops.
        """
        print("[*] Waiting for target volume delivery...")
        while True:
            status = self.get_status()
            sys.stdout.write(f"\\r[>] State: {status:<15} | Infused: {self.get_infused_volume():<12}")
            sys.stdout.flush()

            if status in ['TARGET_REACHED', 'STOPPED']:
                print(f"\\n[+] Stroke finished! Final State: {status}")
                break
            elif status in ['ALARM_STALL', 'OUT_OF_RANGE']:
                print(f"\\n[!] Pump Error / Stall Detected: {status}")
                break
            time.sleep(poll_interval)
`;
}

export function generateContinuousPushPullScript(params: PumpParameters, serial: SerialSettings): string {
  const diameter = params.useCustomDiameter ? params.customDiameterMm : params.customDiameterMm;
  const cyclesText = params.cycles === 0 ? "Infinite Continuous Loop (Ctrl+C to stop)" : `${params.cycles} bidirectional cycles`;

  return `"""
=============================================================================
KD Scientific Legato 270 - Continuous Push/Pull Cycling Automation
=============================================================================
This script configures the Legato 270 for continuous, non-pulsatile liquid delivery.
In a Push/Pull setup with check valves:
- Stroke A (Infuse): Syringe 1 infuses into target system; Syringe 2 withdraws from reservoir.
- Stroke B (Withdraw): Syringe 2 infuses into target system; Syringe 1 withdraws from reservoir.
- Result: Continuous unbroken flow to downstream application.
=============================================================================
"""

import time
import sys
from legato270 import Legato270Pump

# User Configuration
PORT = '${serial.port}'
BAUDRATE = ${serial.baudRate}
DIAMETER_MM = ${diameter.toFixed(2)}  # ${params.syringeBrand} - ${params.syringeSize}
INFUSE_RATE = ${params.infuseRate}
INFUSE_UNIT = '${params.infuseUnit}'
WITHDRAW_RATE = ${params.withdrawRate}
WITHDRAW_UNIT = '${params.withdrawUnit}'
STROKE_VOLUME = ${params.targetVolume}
STROKE_UNIT = '${params.targetVolumeUnit}'
MAX_CYCLES = ${params.cycles}  # 0 = continuous until manual interrupt
VALVE_SWITCH_DELAY = ${params.cycleDelaySec}  # Settling delay between reversals (seconds)


def run_continuous_push_pull():
    pump = Legato270Pump(port=PORT, baudrate=BAUDRATE)
    
    if not pump.connect():
        print("[!] Could not connect to Legato 270. Exiting.")
        return

    try:
        print("\\n=== Configuring Legato 270 Parameters ===")
        pump.stop()
        pump.set_diameter(DIAMETER_MM)
        pump.set_infuse_rate(INFUSE_RATE, INFUSE_UNIT)
        pump.set_withdraw_rate(WITHDRAW_RATE, WITHDRAW_UNIT)
        pump.set_target_volume(STROKE_VOLUME, STROKE_UNIT)
        pump.clear_volumes()

        print(f"\\n=== Starting Continuous Push/Pull Delivery ===")
        print(f"Target Mode: ${cyclesText}")
        print(f"Stroke Volume: {STROKE_VOLUME} {STROKE_UNIT}")
        print(f"Flow Rate: {INFUSE_RATE} {INFUSE_UNIT}")
        print("Press Ctrl+C at any time to safely halt pump.\\n")

        cycle_count = 0
        total_delivered_ml = 0.0

        while True:
            cycle_count += 1
            print(f"\\n------------------------------------------------------------")
            print(f"[*] Starting Cycle #{cycle_count} - Phase 1: Forward Stroke (Infuse A / Refill B)")
            print(f"------------------------------------------------------------")
            
            # Phase 1: Forward Stroke (Infuse)
            pump.infuse()
            pump.wait_for_target(poll_interval=0.4)
            
            if VALVE_SWITCH_DELAY > 0:
                time.sleep(VALVE_SWITCH_DELAY)

            print(f"[*] Starting Cycle #{cycle_count} - Phase 2: Reverse Stroke (Infuse B / Refill A)")
            
            # Phase 2: Reverse Stroke (Withdraw)
            pump.withdraw()
            pump.wait_for_target(poll_interval=0.4)

            if VALVE_SWITCH_DELAY > 0:
                time.sleep(VALVE_SWITCH_DELAY)

            if MAX_CYCLES > 0 and cycle_count >= MAX_CYCLES:
                print(f"\\n[+] Completed requested {MAX_CYCLES} cycles successfully!")
                break

    except KeyboardInterrupt:
        print("\\n\\n[!] Execution interrupted by user. Halting pump motor safely...")
    finally:
        pump.stop()
        print(f"[i] Final Delivered Summary:")
        print(f"    - Infused Total:  {pump.get_infused_volume()}")
        print(f"    - Withdrawn Total: {pump.get_withdrawn_volume()}")
        pump.close()
        print("[+] Done.")


if __name__ == '__main__':
    run_continuous_push_pull()
`;
}

export function generateQuickTestScript(params: PumpParameters, serial: SerialSettings): string {
  const diameter = params.useCustomDiameter ? params.customDiameterMm : params.customDiameterMm;

  return `"""
=============================================================================
Quick 20-Line Serial Test for KD Scientific Legato 270
=============================================================================
"""
import time
import serial

PORT = '${serial.port}'
BAUDRATE = ${serial.baudRate}

print(f"Connecting to KD Scientific Legato on {PORT}...")
ser = serial.Serial(PORT, baudrate=BAUDRATE, bytesize=8, parity='N', stopbits=1, timeout=1.0)
time.sleep(0.2)

def send(cmd):
    ser.write((cmd + "\\r").encode('ascii'))
    time.sleep(0.1)
    res = ser.read_all().decode('ascii', errors='ignore').strip()
    print(f"TX: {cmd:<20} | RX: {res}")
    return res

try:
    send("echo off")          # Turn off command echo
    send("ver")               # Check firmware identity
    send("diameter ${diameter.toFixed(2)}")  # Syringe diameter in mm
    send("irate ${params.infuseRate} ${params.infuseUnit}") # Set flow rate
    send("tvolume 0.5 ml")    # Set test volume
    send("irun")              # Start forward test stroke
    
    print("Running test stroke for 3 seconds...")
    time.sleep(3)
    
    send("poll")              # Query status
    send("ivolume")           # Check delivered volume
    send("stop")              # Stop pump
    print("Test finished successfully.")
finally:
    ser.close()
`;
}
