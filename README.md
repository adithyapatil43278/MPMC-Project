# Gesture-Based Lock (converted from Hand-Eye Coordination Test)

This project has been converted into a gesture-based lock. Move your hand over the sensor (or use the mouse) to move the on-screen ball. The screen is divided into 5 vertical zones labeled 1-4 and C (Cancel). Dwell inside a zone for 5 seconds to register the digit or cancel. The password is 5 digits long and defaults to 12341.

Configuration:
- Update `lock.password` (string or list of digits) and `lock.dwell_seconds` in `config.json`.

Controls:
- F11 to toggle fullscreen
- G to toggle Arduino glitch filter

If Arduino is not connected, the mouse controls the ball.

An advanced **MPMC (Microprocessor & Microcontroller) project** that creates an interactive hand-eye coordination assessment system for elderly individuals using **Arduino distance sensors** and **Python/Pygame**.

## Features

### 🎮 **Dual Control System**
- **Arduino Distance Sensor**: Primary control using HC-SR04 ultrasonic sensor (5-30cm range)
- **Mouse Control**: Automatic fallback when Arduino is not available
- **Real-time Response**: Ultra-low latency ball movement (< 15ms)

### 🏥 **Medical Assessment**
- **Structured Testing**: 3 rounds of 5 seconds each (configurable)
- **Objective Scoring**: Time-in-target percentage with performance categories
- **Results Analysis**: EXCELLENT (>85%), GOOD (>50%), FAILED (<50%)
- **Data Logging**: Optional debug logging for detailed analysis

### 🎨 **Professional Interface**
- **Multiple Themes**: OG Blue, Dark, Lavender color schemes
- **Fullscreen Support**: Toggle between fullscreen and windowed modes
- **Team Credits**: Project team member display with photos
- **Status Indicators**: Real-time Arduino connection monitoring

### 🔧 **Advanced Features**
- **Auto-Installation**: Automatically installs required packages on first run
- **Glitch Protection**: Configurable noise filtering (1-4cm threshold)
- **Adaptive Averaging**: Real-time smoothing without startup delays
- **High-Speed Communication**: 115200 baud Arduino connection
- **Debug Window**: Live sensor data visualization

## Project Structure

```
Elderly_Hand-Eye_Coordination_Test/
├── main.py                    # Main application with auto-installation
├── arduino_controller.py     # Arduino communication & sensor processing
├── graphics_renderer.py      # UI rendering & game logic
├── config.json              # Configuration settings & preferences
├── distance_sensor/
│   └── distance_sensor.ino   # Arduino sketch for HC-SR04 sensor
├── Assets/
│   ├── VIT_Logo.png          # University logo
│   └── [Team member photos]  # Team member images
└── README.md                 # This documentation
```

## Installation & Setup

### 🚀 **Automatic Installation**
The application now **automatically installs required packages** on first run!

1. **Download/Clone** the project
2. **Run the application**:
   ```bash
   python main.py
   ```
3. **Packages auto-install**: The system will automatically detect and install:
   - `pygame>=2.0.0` (for graphics and user interface)
   - `pyserial>=3.0.0` (for Arduino communication)

### 📟 **Arduino Setup** (Optional - for sensor control)
1. **Connect HC-SR04** ultrasonic sensor:
   - VCC → 5V
   - GND → GND  
   - Trig → Digital Pin 9
   - Echo → Digital Pin 10

2. **Upload Arduino sketch**:
   - Open `distance_sensor/distance_sensor.ino` in Arduino IDE
   - Select your board (Arduino UNO)
   - Select COM port (preferably COM3)
   - Upload the sketch

3. **Sensor placement**: Position sensor on right side of screen, detecting hand movement in 5-30cm range

### 🔧 **Manual Installation** (Fallback)
If auto-installation fails, manually install packages:
```bash
pip install pygame>=2.0.0 pyserial>=3.0.0
```

## How to Use

### 🎯 **Starting the Test**
1. **Launch application**: `python main.py`
2. **Check Arduino status**: Green "Connected" indicator if sensor detected
3. **Select theme**: Choose from OG, Dark, or Lavender themes
4. **Toggle fullscreen**: Use checkbox or F11 key
5. **Click "Begin Test"**: Start the coordination assessment

### 🕹️ **During Testing**
- **With Arduino**: Move hand between 5-30cm from sensor
- **With Mouse**: Move mouse left-right to control ball
- **Objective**: Keep blue ball inside green target zone
- **Duration**: 3 rounds × 5 seconds each (configurable)

### 📊 **Results & Analysis**
- **Individual scores**: Time-in-target for each round
- **Overall performance**: Average percentage and assessment
- **Performance categories**: 
  - EXCELLENT: >85% accuracy
  - GOOD: 50-85% accuracy  
  - FAILED: <50% accuracy

## Configuration

### ⚙️ **Customizable Settings** (config.json)
```json
{
  "timing": {
    "game_duration": 5.0,     // Test duration per round
    "num_games": 3            // Number of test rounds
  },
  "arduino": {
    "glitch_protection": {
      "enabled": true,
      "max_distance_change_cm": 2.0  // Sensor noise filtering
    }
  },
  "display": {
    "fps": 120,               // Higher FPS for smoother response
    "fullscreen": true        // Default display mode
  }
}
```

### 🎚️ **Runtime Controls**
- **F11**: Toggle fullscreen mode
- **G**: Toggle glitch protection on/off
- **R**: Restart test (during results screen)
- **Theme Dropdown**: Switch color schemes
- **Debug Window**: View live sensor data

## Hardware Requirements

### 🖥️ **Computer**
- **OS**: Windows, macOS, or Linux
- **Python**: 3.7 or higher
- **RAM**: 512MB minimum
- **USB Port**: For Arduino connection (optional)

### 🔌 **Arduino Setup** (Optional)
- **Arduino UNO** or compatible board
- **HC-SR04** ultrasonic distance sensor
- **USB cable** for computer connection
- **Jumper wires** for sensor connections

## Technical Specifications

### 📡 **Communication**
- **Baud Rate**: 115200 (high-speed)
- **Data Format**: `D:25` (optimized for speed)
- **Update Rate**: 500 readings/second from Arduino
- **Latency**: <15ms total system delay

### 🎮 **Performance**
- **Frame Rate**: 120 FPS for smooth visuals
- **Averaging**: 2-point adaptive averaging for noise reduction
- **Smoothing**: Minimal smoothing for maximum responsiveness
- **Glitch Filtering**: Configurable threshold (1-4cm)

## Troubleshooting

### ❌ **Installation Issues**
```
Problem: Auto-installation fails
Solution: Run manually: pip install pygame pyserial
```

### 🔌 **Arduino Connection**
```
Problem: Arduino not detected
Solutions:
1. Check USB cable connection
2. Verify COM port (Device Manager)
3. Upload Arduino sketch
4. Try different USB port
```

### 📊 **Performance Issues**
```
Problem: Laggy ball movement
Solutions:
1. Close other applications
2. Reduce FPS in config.json
3. Disable debug logging
4. Use windowed mode
```

## Development Team

**MPMC Project - VIT University**
- **Meit Vikrant Sant**: Software Development & System Architecture
- **Aarush Vardhan**: Software Development & UI Design
- **Mohit Mishra**: Hardware Development & Arduino Programming  
- **Brown Shubham**: Hardware Development & Sensor Integration

## License

Apache License Version 2.0 - See project files for details.

---

*This project demonstrates the integration of microcontroller technology with real-world healthcare applications, showcasing both hardware interfacing and software development skills in a practical medical assessment tool.*
